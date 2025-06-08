from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    ai_type: str

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    dataset_uploaded: Optional[bool] = None
    model_trained: Optional[bool] = None
    model_deployed: Optional[bool] = None
    accuracy: Optional[float] = None
    api_endpoint: Optional[str] = None

class ProjectRead(BaseModel):
    id: str
    name: str
    description: Optional[str]
    ai_type: str
    status: str
    dataset_uploaded: bool
    model_trained: bool
    model_deployed: bool
    accuracy: Optional[float]
    api_endpoint: Optional[str]
    api_calls_count: int
    created_at: datetime
    updated_at: datetime
    user_id: str

    class Config:
        from_attributes = True