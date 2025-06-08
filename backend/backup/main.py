# backend/main.py - Quick Fix with Inline Upload Endpoint

from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import uuid
import os
import pandas as pd
from pathlib import Path
import json
from datetime import datetime

from app.core.auth import auth_backend, fastapi_users, current_active_user
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.models.user import User
from app.core.database import async_engine, Base

# Create upload directory
UPLOAD_DIR = Path("uploaded_files")
UPLOAD_DIR.mkdir(exist_ok=True)

# Simple test model
class SimpleUserCreate(BaseModel):
    email: str
    password: str
    full_name: str = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Database startup error: {e}")
    yield

app = FastAPI(
    title="AI Platform API",
    description="No-code ML training platform API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication routes
app.include_router(
    fastapi_users.get_auth_router(auth_backend), 
    prefix="/auth/jwt", 
    tags=["auth"]
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

# ===== INLINE UPLOAD ENDPOINT (Quick Fix) =====

def process_uploaded_file(file_path: Path, file_extension: str):
    """Simple file processor"""
    try:
        # Read file based on extension
        if file_extension == '.csv':
            df = pd.read_csv(file_path, nrows=1000)  # Limit to 1000 rows for preview
        elif file_extension in ['.xlsx', '.xls']:
            df = pd.read_excel(file_path, nrows=1000)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
        
        # Basic file info
        rows_count = len(df)
        columns_count = len(df.columns)
        
        # Process columns
        columns_info = []
        for col in df.columns:
            col_data = df[col]
            null_count = col_data.isnull().sum()
            unique_count = col_data.nunique()
            
            # Determine data type
            if pd.api.types.is_numeric_dtype(col_data):
                col_type = 'number'
            elif pd.api.types.is_datetime64_any_dtype(col_data):
                col_type = 'date'
            elif pd.api.types.is_bool_dtype(col_data):
                col_type = 'boolean'
            else:
                col_type = 'text'
            
            # Sample values
            sample_values = col_data.dropna().unique()[:5].tolist()
            
            # Clean sample values for JSON
            cleaned_samples = []
            for val in sample_values:
                if pd.isna(val):
                    continue
                elif isinstance(val, (pd.Timestamp, datetime)):
                    cleaned_samples.append(val.isoformat())
                else:
                    str_val = str(val)
                    if len(str_val) > 50:
                        str_val = str_val[:47] + '...'
                    cleaned_samples.append(str_val)
            
            # Recommendations
            is_recommended_target = (
                col_type in ['text', 'boolean'] and 
                2 <= unique_count <= 20 and 
                null_count / len(col_data) < 0.1
            )
            
            is_recommended_feature = (
                unique_count > 1 and 
                null_count / len(col_data) < 0.3 and
                not ('id' in col.lower() and unique_count == len(col_data))
            )
            
            columns_info.append({
                'name': col,
                'type': col_type,
                'data_type': str(col_data.dtype),
                'null_count': int(null_count),
                'unique_count': int(unique_count),
                'total_count': len(col_data),
                'null_percentage': float((null_count / len(col_data)) * 100),
                'sample_values': cleaned_samples,
                'data_quality': 'good' if null_count / len(col_data) < 0.1 else 'fair',
                'is_recommended_target': is_recommended_target,
                'is_recommended_feature': is_recommended_feature,
            })
        
        # Get preview data (first 10 rows)
        preview_data = df.head(10).to_dict('records')
        
        # Clean preview data for JSON
        cleaned_preview = []
        for row in preview_data:
            cleaned_row = {}
            for key, value in row.items():
                if pd.isna(value):
                    cleaned_row[key] = None
                elif isinstance(value, (pd.Timestamp, datetime)):
                    cleaned_row[key] = value.isoformat()
                else:
                    cleaned_row[key] = str(value) if not isinstance(value, (int, float, bool)) else value
            cleaned_preview.append(cleaned_row)
        
        return {
            'rows_count': rows_count,
            'columns_count': columns_count,
            'columns': columns_info,
            'preview_data': cleaned_preview
        }
        
    except Exception as e:
        raise Exception(f"Error processing file: {str(e)}")

@app.post("/upload/file/{project_id}")
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(current_active_user)
):
    """Quick upload endpoint - inline implementation"""
    
    print(f"🔥 Upload endpoint called! Project: {project_id}, File: {file.filename}")
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file extension
    allowed_extensions = {'.csv', '.xlsx', '.xls'}
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not supported. Allowed: CSV, Excel (.xlsx, .xls)"
        )
    
    # Read file content
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    try:
        # Generate unique filename and save
        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        file_path = UPLOAD_DIR / filename
        
        # Save file
        with open(file_path, 'wb') as f:
            f.write(content)
        
        print(f"💾 File saved to: {file_path}")
        
        # Process file
        file_info = process_uploaded_file(file_path, file_extension)
        
        print(f"📊 File processed: {file_info['rows_count']} rows, {file_info['columns_count']} columns")
        
        # Return response
        response_data = {
            "dataset_id": file_id,
            "filename": file.filename,
            "file_size": len(content),
            "rows_count": file_info['rows_count'],
            "columns_count": file_info['columns_count'],
            "upload_status": "completed",
            "uploaded_at": datetime.utcnow().isoformat(),
            "columns": file_info['columns'],
            "preview_data": file_info['preview_data'],
            "file_path": str(file_path)
        }
        
        print(f"✅ Upload successful! Returning data for {file.filename}")
        
        return response_data
        
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        # Clean up file on error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

@app.get("/upload/dataset/{dataset_id}/preview")
async def get_dataset_preview(
    dataset_id: str,
    rows: int = 10,
    page: int = 1,
    current_user: User = Depends(current_active_user)
):
    """Get dataset preview with pagination"""
    
    try:
        # Find uploaded file
        file_pattern = f"{dataset_id}_*"
        matching_files = list(UPLOAD_DIR.glob(file_pattern))
        
        if not matching_files:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        file_path = matching_files[0]
        file_extension = file_path.suffix.lower()
        
        # Read file
        if file_extension == '.csv':
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        
        # Calculate pagination
        total_rows = len(df)
        start_idx = (page - 1) * rows
        end_idx = start_idx + rows
        
        # Get page data
        page_data = df.iloc[start_idx:end_idx].to_dict('records')
        
        # Clean data
        cleaned_data = []
        for row in page_data:
            cleaned_row = {}
            for key, value in row.items():
                if pd.isna(value):
                    cleaned_row[key] = None
                else:
                    cleaned_row[key] = str(value) if not isinstance(value, (int, float, bool)) else value
            cleaned_data.append(cleaned_row)
        
        return {
            "data": cleaned_data,
            "columns": list(df.columns),
            "rows_shown": len(page_data),
            "total_rows": total_rows,
            "current_page": page,
            "rows_per_page": rows,
            "total_pages": (total_rows + rows - 1) // rows,
            "has_next": end_idx < total_rows,
            "has_previous": page > 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preview: {str(e)}")

# ===== EXISTING ENDPOINTS =====

@app.get("/")
async def root():
    return {
        "message": "AI Platform API",
        "version": "1.0.0",
        "status": "active",
        "upload_endpoint": "✅ Available",
        "note": "Upload endpoint working inline"
    }

@app.get("/health")
async def health_check():
    upload_dir_exists = UPLOAD_DIR.exists()
    return {
        "status": "healthy", 
        "upload_dir": upload_dir_exists,
        "upload_endpoint": "available"
    }

@app.get("/protected")
async def protected_endpoint(user: User = Depends(current_active_user)):
    return {
        "message": f"Hello {user.email}!",
        "user_id": str(user.id),
        "subscription": user.subscription_plan
    }

@app.get("/test-db")
async def test_database():
    try:
        from app.core.database import async_engine
        from sqlalchemy import text
        async with async_engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.fetchone()
            return {
                "database": "connected",
                "type": "PostgreSQL", 
                "version": str(version[0]) if version else "unknown",
                "status": "Working"
            }
    except Exception as e:
        return {
            "database": "error", 
            "message": str(e)
        }