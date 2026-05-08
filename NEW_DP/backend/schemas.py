from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any, Dict
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str

class UserCreate(BaseModel):
    username: str
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    class Config:
        from_attributes = True

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class DatasetResponse(BaseModel):
    id: int
    filename: str
    file_size_bytes: int
    row_count: Optional[int] = None
    col_count: Optional[int] = None
    columns: Optional[List[str]] = None
    created_at: datetime
    project_id: Optional[int] = None
    class Config:
        from_attributes = True


class ProjectSnapshotResponse(BaseModel):
    id: int
    project_id: int
    label: str
    created_at: datetime
    snapshot_json: Optional[str] = None

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    action: str
    target_type: str
    target_id: Optional[int] = None
    details: Optional[str] = None
    created_at: datetime
    username: Optional[str] = None

class ProfilingJobResponse(BaseModel):
    id: int
    dataset_id: int
    status: str
    report_data: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    class Config:
        from_attributes = True

class RuleConfig(BaseModel):
    # Tolerate forward-compatible extras (e.g. UI-only fields like `note`)
    # so older deployments don't 422 when the frontend evolves.
    model_config = ConfigDict(extra="ignore")

    mode: str
    pattern: Optional[str] = ""
    replace: Optional[str] = ""
    case: Optional[str] = "UPPERCASE"
    length_mode: Optional[str] = "Exact"
    min_length: Optional[int] = 0
    max_length: Optional[int] = 50
    exact_length: Optional[int] = 10

class QualityRunRequest(BaseModel):
    rules: dict[str, List[RuleConfig]]

class QualityRunSummary(BaseModel):
    dataset_id: int
    total_processed: int
    total_rejected: int
    cleaned_file_path: str
    rejected_file_path: str

class QualityAISuggestRequest(BaseModel):
    column: str
    prompt: str

class QualityAISuggestResponse(BaseModel):
    mode: str
    pattern: Optional[str] = ""
    replace: Optional[str] = ""
    case: Optional[str] = "UPPERCASE"
    explanation: str

class ExactMatchRequest(BaseModel):
    columns: Optional[List[str]] = None
    keep: str = "first"

class FuzzyMatchRequest(BaseModel):
    columns: List[str]
    threshold: float = 85.0
    algorithm: str = "rapidfuzz"

class CombinedMatchRequest(BaseModel):
    exact_columns: List[str]
    fuzzy_columns: List[str]
    threshold: float = 85.0
    algorithm: str = "rapidfuzz"

class DuplicateGroupResponse(BaseModel):
    group_id: int
    indices: List[int]
    values: List[dict]
    match_type: str
    similarity_score: Optional[float] = None
    key_columns: List[str]
    representative_value: Optional[str] = None

class DuplicatesExportRequest(BaseModel):
    groups: List[DuplicateGroupResponse]

class MergeGroupsRequest(BaseModel):
    groups: List[DuplicateGroupResponse]

class DuplicateCombinedResponse(BaseModel):
    exact: List[DuplicateGroupResponse]
    fuzzy: List[DuplicateGroupResponse]

class CompareRequest(BaseModel):
    dataset_id_a: int
    dataset_id_b: int
    columns: Optional[List[str]] = None
    skip: int = 0
    limit: int = 50

class CompareRowValue(BaseModel):
    val: Any
    is_modified: bool = False
    is_missing: bool = False

class CompareResultRow(BaseModel):
    row_idx: int
    data_a: Dict[str, CompareRowValue]
    data_b: Dict[str, CompareRowValue]
    is_new_in_b: bool = False
    is_removed_in_b: bool = False

class CompareResponse(BaseModel):
    total_modified_cells: int
    added_rows: int
    removed_rows: int
    common_columns: List[str]
    results: List[CompareResultRow]
    total_common_rows: int

class RuleSetCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rules_json: str # JSON string of dq_config

class RuleSetResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    rules_json: str
    created_at: datetime
    updated_at: datetime
    class Config:
        from_attributes = True
