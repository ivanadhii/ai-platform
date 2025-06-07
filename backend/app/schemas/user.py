from fastapi_users import schemas
from typing import Optional
from datetime import datetime
import uuid

class UserRead(schemas.BaseUser[uuid.UUID]):  # Changed from str to uuid.UUID
    full_name: Optional[str] = None
    subscription_plan: str = "free"
    api_calls_used: int = 0
    models_created: int = 0
    created_at: datetime

class UserCreate(schemas.BaseUserCreate):
    full_name: Optional[str] = None

class UserUpdate(schemas.BaseUserUpdate):
    full_name: Optional[str] = None