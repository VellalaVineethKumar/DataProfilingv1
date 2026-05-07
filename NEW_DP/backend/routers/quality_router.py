import os
import re
import json
import logging
import unicodedata
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import pandas as pd
import numpy as np

import database, db_models, schemas, auth
from routers.profiling_router import _load_file  # reuse file loader
from core.ai_logic import generate_quality_rule_suggestion

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/quality", tags=["quality"])

@router.get("/columns/{dataset_id}")
def get_columns_sample(
    dataset_id: int, 
    db: Session = Depends(database.get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    dataset = db.query(db_models.Dataset).filter(
        db_models.Dataset.id == dataset_id, 
        db_models.Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        df = _load_file(dataset.filepath)
        # Get head 5
        sample_df = df.head(5).astype(str).fillna("")
        
        columns = df.columns.tolist()
        sample_data = {
            col: sample_df[col].tolist() for col in columns
        }
        
        return {
            "columns": columns,
            "samples": sample_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _apply_rule(val: str, rule: schemas.RuleConfig) -> str:
    """Returns the modified string, or '[REJECT]' if validation fails."""
    mode = rule.mode
    pattern = rule.pattern or ""
    
    if mode == "Clean":
        if pattern:
            return re.sub(pattern, '', val)
    elif mode == "Replace":
        if pattern:
            return re.sub(pattern, rule.replace or "", val)
    elif mode == "Extract":
        if pattern:
            matches = re.findall(pattern, val)
            return ''.join(matches) if matches else "[REJECT]"
    elif mode == "Validate":
        if pattern:
            return val if re.match(pattern, val) else "[REJECT]"
    elif mode == "Case":
        if rule.case == "UPPERCASE":
            return val.upper()
        elif rule.case == "lowercase":
            return val.lower()
        elif rule.case == "Title Case":
            return val.title()
    elif mode == "Length":
        length_mode = rule.length_mode
        val_len = len(val)
        
        if length_mode == "Exact" and val_len != rule.exact_length:
            return "[REJECT]"
        elif length_mode == "Minimum" and val_len < rule.min_length:
            return "[REJECT]"
        elif length_mode == "Maximum" and val_len > rule.max_length:
            return "[REJECT]"
        elif length_mode == "Range" and (val_len < rule.min_length or val_len > rule.max_length):
            return "[REJECT]"
    return val

@router.post("/run/{dataset_id}", response_model=schemas.QualityRunSummary)
def run_quality_rules(
    dataset_id: int, 
    request: schemas.QualityRunRequest,
    db: Session = Depends(database.get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    dataset = db.query(db_models.Dataset).filter(
        db_models.Dataset.id == dataset_id, 
        db_models.Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        df = _load_file(dataset.filepath)
        total_rows = len(df)
        
        # Keep track of indices that are rejected
        rejected_indices = set()
        
        # For each column that has rules
        for col_name, rules in request.rules.items():
            if col_name not in df.columns or not rules:
                continue
                
            # Convert to string to safely apply regex operations
            df[col_name] = df[col_name].astype(str)
            
            for index, value in df[col_name].items():
                current_val = value
                
                # Apply rules sequentially
                for rule in rules:
                    current_val = _apply_rule(current_val, rule)
                    if current_val == "[REJECT]":
                        break
                        
                if current_val == "[REJECT]":
                    rejected_indices.add(index)
                else:
                    df.at[index, col_name] = current_val

        # Separate clean vs rejected
        rejected_indices_list = list(rejected_indices)
        rejected_df = df.loc[rejected_indices_list]
        clean_df = df.drop(index=rejected_indices_list)
        
        # Save output files
        base_dir = os.path.dirname(dataset.filepath)
        filename_no_ext = os.path.splitext(dataset.filename)[0]
        
        cleaned_path = os.path.join(base_dir, f"{filename_no_ext}_cleaned.csv")
        rejected_path = os.path.join(base_dir, f"{filename_no_ext}_rejected.csv")
        
        clean_df.to_csv(cleaned_path, index=False)
        if not rejected_df.empty:
            rejected_df.to_csv(rejected_path, index=False)
            
        logger.info(f"Quality run complete for dataset {dataset_id}: {total_rows} processed, {len(rejected_df)} rejected")
            
        return schemas.QualityRunSummary(
            dataset_id=dataset.id,
            total_processed=total_rows,
            total_rejected=len(rejected_df),
            cleaned_file_path=cleaned_path,
            rejected_file_path=rejected_path if not rejected_df.empty else ""
        )
        
    except Exception as e:
        logger.error(f"Error executing quality rules for dataset {dataset_id}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preview/{dataset_id}")
def get_quality_preview(
    dataset_id: int,
    type: str = Query(..., pattern="^(cleaned|rejected)$"),
    db: Session = Depends(database.get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    dataset = db.query(db_models.Dataset).filter(
        db_models.Dataset.id == dataset_id, 
        db_models.Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    base_dir = os.path.dirname(dataset.filepath)
    filename_no_ext = os.path.splitext(dataset.filename)[0]
    
    file_path = os.path.join(base_dir, f"{filename_no_ext}_{type}.csv")
    
    if not os.path.exists(file_path):
        return {"columns": [], "rows": []}
        
    try:
        df = pd.read_csv(file_path, nrows=100)
        # Convert to list of dicts for the MUI DataGrid
        # Add a unique "id" for each row as required by DataGrid
        rows = df.fillna("").to_dict(orient="records")
        for i, row in enumerate(rows):
            row["id"] = i
            
        return {
            "columns": df.columns.tolist(),
            "rows": rows
        }
    except Exception as e:
        return {"columns": [], "rows": [], "error": str(e)}

@router.get("/download/{dataset_id}")
def download_quality_file(
    dataset_id: int,
    type: str = Query(..., pattern="^(cleaned|rejected)$"),
    db: Session = Depends(database.get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    dataset = db.query(db_models.Dataset).filter(
        db_models.Dataset.id == dataset_id, 
        db_models.Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    base_dir = os.path.dirname(dataset.filepath)
    filename_no_ext = os.path.splitext(dataset.filename)[0]
    
    file_path = os.path.join(base_dir, f"{filename_no_ext}_{type}.csv")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    return FileResponse(
        path=file_path, 
        filename=f"{filename_no_ext}_{type}.csv",
        media_type="text/csv"
    )
@router.post("/ai-suggest/{dataset_id}", response_model=schemas.QualityAISuggestResponse)
def get_ai_quality_suggestion(
    dataset_id: int,
    request: schemas.QualityAISuggestRequest,
    db: Session = Depends(database.get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    dataset = db.query(db_models.Dataset).filter(
        db_models.Dataset.id == dataset_id,
        db_models.Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        df = _load_file(dataset.filepath)
        if request.column not in df.columns:
            raise HTTPException(status_code=400, detail="Column not found")
            
        sample_values = df[request.column].dropna().astype(str).head(20).tolist()
        suggestion = generate_quality_rule_suggestion(request.column, sample_values, request.prompt)
        
        return schemas.QualityAISuggestResponse(**suggestion)
    except Exception as e:
        logger.error(f"AI Suggestion Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/standardize-columns/{dataset_id}")
def standardize_column_names(
    dataset_id: int,
    case_type: str = Query(..., pattern="^(snake_case|camelCase|PascalCase|lower|upper|kebab-case)$"),
    db: Session = Depends(database.get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    dataset = db.query(db_models.Dataset).filter(
        db_models.Dataset.id == dataset_id,
        db_models.Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        df = _load_file(dataset.filepath)
        
        def to_case(name: str):
            if case_type == 'snake_case':
                return re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower().replace(' ', '_').replace('-', '_').replace('.', '_').replace('__', '_')
            elif case_type == 'camelCase':
                parts = re.split(r'[_\s\-.]', name)
                return parts[0].lower() + "".join(p.capitalize() for p in parts[1:])
            elif case_type == 'PascalCase':
                parts = re.split(r'[_\s\-.]', name)
                return "".join(p.capitalize() for p in parts)
            elif case_type == 'lower':
                return name.lower()
            elif case_type == 'upper':
                return name.upper()
            elif case_type == 'kebab-case':
                return name.lower().replace(' ', '-').replace('_', '-')
            return name

        new_columns = [to_case(c) for c in df.columns]
        df.columns = new_columns
        df.to_csv(dataset.filepath, index=False)
        
        # Update metadata
        dataset.columns_json = json.dumps(new_columns)
        db.commit()
        
        return {"message": f"Standardized columns to {case_type}", "columns": new_columns}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/remove-outliers/{dataset_id}")
def remove_outliers(
    dataset_id: int,
    columns: List[str],
    method: str = Query("iqr", pattern="^(iqr|zscore)$"),
    db: Session = Depends(database.get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    dataset = db.query(db_models.Dataset).filter(
        db_models.Dataset.id == dataset_id,
        db_models.Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        df = _load_file(dataset.filepath)
        
        before = len(df)
        for col in columns:
            if col not in df.columns: continue
            if not pd.api.types.is_numeric_dtype(df[col]): continue
            
            if method == 'iqr':
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower = Q1 - 1.5 * IQR
                upper = Q3 + 1.5 * IQR
                df = df[(df[col] >= lower) & (df[col] <= upper) | df[col].isnull()]
            else: # zscore
                std = df[col].std()
                if std == 0 or pd.isna(std): continue
                z_scores = np.abs((df[col] - df[col].mean()) / std)
                df = df[z_scores < 3]
        
        removed = before - len(df)
        df.to_csv(dataset.filepath, index=False)
        return {"message": f"Removed {removed} outliers using {method}", "rows_removed": removed}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/auto-fix/{dataset_id}")
def auto_fix_dataset(
    dataset_id: int,
    dry_run: bool = Query(False, description="If true, compute changes without writing to disk (preview mode)"),
    db: Session = Depends(database.get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    """
    Run intelligent auto-fix on the dataset.

    When dry_run=true, returns a structured preview of what WOULD change without
    modifying the file. The frontend uses this to obtain explicit human approval
    before committing changes to the source data.

    When dry_run=false, applies the same fixes and writes them to disk.
    """
    dataset = db.query(db_models.Dataset).filter(
        db_models.Dataset.id == dataset_id,
        db_models.Dataset.user_id == current_user.id
    ).first()

    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        df = _load_file(dataset.filepath)
        original_columns = df.columns.tolist()

        operations = []
        # Structured preview for the UI — counts + samples per operation
        preview: Dict[str, Any] = {
            "duplicates_removed": 0,
            "missing_filled": [],          # [{column, count, fill_value}]
            "whitespace_cleaned": [],      # [{column, count, samples: [{before, after}]}]
            "columns_renamed": [],         # [{old, new}]
            "total_rows_before": len(df),
            "total_rows_after": 0,
        }

        # 1. Remove exact duplicates
        before_dupes = len(df)
        df = df.drop_duplicates(keep='first')
        removed = before_dupes - len(df)
        if removed > 0:
            preview["duplicates_removed"] = removed
            operations.append(f"Removed {removed} duplicates")

        # 2. Handle missing and clean text
        for col in df.columns:
            # Missing values
            missing_count = int(df[col].isnull().sum())
            if missing_count > 0:
                if pd.api.types.is_numeric_dtype(df[col]):
                    fill_value = df[col].median() if abs(df[col].skew()) > 2 else df[col].mean()
                else:
                    mode_val = df[col].mode()
                    fill_value = mode_val[0] if not mode_val.empty else "UNKNOWN"
                df[col] = df[col].fillna(fill_value)
                preview["missing_filled"].append({
                    "column": str(col),
                    "count": missing_count,
                    "fill_value": str(fill_value),
                })

            # Clean string columns
            if pd.api.types.is_string_dtype(df[col]):
                before_series = df[col].astype(str)
                stripped = before_series.str.strip()
                normalized = stripped.apply(
                    lambda x: ''.join(c for c in unicodedata.normalize('NFD', str(x))
                                      if unicodedata.category(c) != 'Mn') if pd.notna(x) else x
                )
                changed_mask = before_series != normalized
                changed_count = int(changed_mask.sum())
                if changed_count > 0:
                    samples = []
                    for idx in before_series.index[changed_mask][:3]:
                        samples.append({
                            "before": str(before_series.loc[idx])[:80],
                            "after": str(normalized.loc[idx])[:80],
                        })
                    preview["whitespace_cleaned"].append({
                        "column": str(col),
                        "count": changed_count,
                        "samples": samples,
                    })
                df[col] = normalized

        # 3. Standardize names to snake_case
        new_cols = [re.sub(r'(?<!^)(?=[A-Z])', '_', str(col)).lower().replace(' ', '_').replace('-', '_').replace('.', '_').replace('__', '_')
                    for col in df.columns]
        for old, new in zip(original_columns, new_cols):
            if str(old) != str(new):
                preview["columns_renamed"].append({"old": str(old), "new": str(new)})

        df.columns = new_cols
        preview["total_rows_after"] = len(df)

        # Build a human-readable summary list (used by both preview & apply paths)
        if preview["missing_filled"]:
            total_missing = sum(item["count"] for item in preview["missing_filled"])
            operations.append(f"Filled {total_missing} missing values across {len(preview['missing_filled'])} columns")
        if preview["whitespace_cleaned"]:
            total_ws = sum(item["count"] for item in preview["whitespace_cleaned"])
            operations.append(f"Cleaned whitespace/accents in {total_ws} cells across {len(preview['whitespace_cleaned'])} columns")
        if preview["columns_renamed"]:
            operations.append(f"Renamed {len(preview['columns_renamed'])} columns to snake_case")

        if dry_run:
            # Preview only — DO NOT modify file or DB
            return {
                "dry_run": True,
                "message": "Auto-fix preview ready for review",
                "operations": operations,
                "preview": preview,
                "new_columns": new_cols,
            }

        # Commit changes to disk
        df.to_csv(dataset.filepath, index=False)
        dataset.columns_json = json.dumps(new_cols)
        db.commit()

        return {
            "dry_run": False,
            "message": "Auto-fix complete",
            "operations": operations,
            "preview": preview,
            "new_columns": new_cols,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from utils.text_processing import AdvancedTitleCase
from core.audit_log import log_action

@router.post("/standardize-text/{dataset_id}")
def standardize_text(
    dataset_id: int,
    columns: List[str],
    case: str = Query(..., pattern="^(lower|upper|title|sentence|capitalize)$"),
    style: str = "apa",
    db: Session = Depends(database.get_db),
    current_user: db_models.User = Depends(auth.get_current_user)
):
    dataset = db.query(db_models.Dataset).filter(
        db_models.Dataset.id == dataset_id,
        db_models.Dataset.user_id == current_user.id
    ).first()
    
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
        
    try:
        df = _load_file(dataset.filepath)
        
        for col in columns:
            if col not in df.columns: continue
            
            if case == 'lower':
                df[col] = df[col].astype(str).str.lower()
            elif case == 'upper':
                df[col] = df[col].astype(str).str.upper()
            elif case == 'title':
                df[col] = df[col].apply(lambda x: AdvancedTitleCase.convert(x, style=style) if pd.notna(x) else x)
            elif case == 'sentence':
                df[col] = df[col].apply(lambda x: AdvancedTitleCase.convert(x, style='sentence') if pd.notna(x) else x)
            elif case == 'capitalize':
                df[col] = df[col].astype(str).str.capitalize()

        df.to_csv(dataset.filepath, index=False)
        
        log_action(db, current_user.id, "STANDARDIZE", "DATASET", dataset.id, f"Standardized {len(columns)} columns to {case} ({style})")
        
        return {"message": f"Standardized {len(columns)} columns to {case}"}
    except Exception as e:
        logger.error(f"Standardization failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
