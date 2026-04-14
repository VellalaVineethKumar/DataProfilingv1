"""FastAPI REST server for the Data Profiler engine.

Run with:
    uvicorn api.server:app --host 0.0.0.0 --port 8000

Endpoints:
    POST /profile/upload    -- Upload a file and get a profiling report
    POST /profile/query     -- Run profiling on a SQL query result
    GET  /health            -- Health check
    GET  /audit             -- Retrieve audit log entries
"""

from __future__ import annotations

import io
import json
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="Data Profiler API",
    description="REST API for automated data profiling and quality assessment",
    version="1.0.0",
)


# ---------- models --------------------------------------------------------

class ProfileSummary(BaseModel):
    """Condensed profiling result for a single column."""

    column_name: str
    dtype: str
    total_rows: int
    null_count: int
    null_percentage: float
    unique_count: int
    unique_percentage: float
    risk_level: str
    risk_score: int


class DatasetReport(BaseModel):
    """Top-level profiling report."""

    filename: str
    total_rows: int
    total_columns: int
    overall_score: float
    missing_percentage: float
    columns: List[ProfileSummary]


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    timestamp: str


# ---------- routes --------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """Simple health / readiness probe."""
    return HealthResponse(status="ok", timestamp=datetime.now().isoformat())


@app.post("/profile/upload", response_model=DatasetReport)
async def profile_upload(file: UploadFile = File(...)) -> DatasetReport:
    """Upload a CSV/Excel/Parquet file and receive a profiling report."""
    suffix = Path(file.filename or "data.csv").suffix.lower()
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        df = _load_file(tmp_path, suffix)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {exc}")

    return _run_profiling(df, file.filename or "upload")


@app.get("/audit")
def audit_log(limit: int = Query(50, ge=1, le=1000)) -> List[Dict[str, Any]]:
    """Return the most recent audit log entries."""
    try:
        from core.audit_log import get_recent_logs

        return get_recent_logs(limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


# ---------- helpers -------------------------------------------------------

def _load_file(path: str, suffix: str) -> pd.DataFrame:
    """Load a file into a DataFrame based on extension."""
    if suffix in (".csv", ".txt", ".tsv"):
        sep = "\t" if suffix == ".tsv" else ","
        return pd.read_csv(path, sep=sep, low_memory=False)
    if suffix in (".xlsx", ".xls"):
        return pd.read_excel(path)
    if suffix in (".parquet", ".pq"):
        return pd.read_parquet(path)
    if suffix == ".json":
        return pd.read_json(path)
    if suffix == ".jsonl":
        return pd.read_json(path, lines=True)
    if suffix in (".feather", ".ftr"):
        return pd.read_feather(path)
    raise ValueError(f"Unsupported file type: {suffix}")


def _run_profiling(df: pd.DataFrame, filename: str) -> DatasetReport:
    """Run the profiling engine and build the response model."""
    from core.profiler import DataProfilerEngine

    engine = DataProfilerEngine(df, filename)
    engine.profile(fast_mode=True)

    col_summaries: List[ProfileSummary] = []
    for col_name, profile in engine.column_profiles.items():
        col_summaries.append(
            ProfileSummary(
                column_name=profile.column_name,
                dtype=profile.dtype,
                total_rows=profile.total_rows,
                null_count=profile.null_count,
                null_percentage=round(profile.null_percentage, 2),
                unique_count=profile.unique_count,
                unique_percentage=round(profile.unique_percentage, 2),
                risk_level=getattr(profile, "risk_level", "Low"),
                risk_score=getattr(profile, "risk_score", 0),
            )
        )

    qr = engine.quality_report
    return DatasetReport(
        filename=filename,
        total_rows=len(df),
        total_columns=len(df.columns),
        overall_score=round(getattr(qr, "overall_score", 0), 2),
        missing_percentage=round(getattr(qr, "missing_percentage", 0), 2),
        columns=col_summaries,
    )
