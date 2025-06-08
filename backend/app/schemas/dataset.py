from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime

class ColumnInfo(BaseModel):
    name: str
    type: str  # text, number, boolean, date, mixed
    null_count: int
    unique_count: int
    sample_values: List[Any]

class DatasetCreate(BaseModel):
    filename: str
    project_id: str

class DatasetRead(BaseModel):
    id: str
    filename: str
    file_size: int
    rows_count: int
    columns_count: int
    upload_status: str
    uploaded_at: datetime
    columns: List[ColumnInfo]
    preview_data: List[dict]

    class Config:
        from_attributes = True

class DatasetValidation(BaseModel):
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    recommendations: List[str]
    dataset_info: Optional[dict] = None