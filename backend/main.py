# backend/main.py - Complete version with all upload endpoints

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
import traceback

from app.core.auth import auth_backend, fastapi_users, current_active_user
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.models.user import User
from app.core.database import async_engine, Base

# Create upload directory
UPLOAD_DIR = Path("uploaded_files")
UPLOAD_DIR.mkdir(exist_ok=True)

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

# ===== UPLOAD ENDPOINTS =====

@app.post("/upload/file/{project_id}")
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    current_user: User = Depends(current_active_user)
):
    """Upload and process file"""
    
    print(f"🔥 Upload called: {file.filename}")
    
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in {'.csv', '.xlsx', '.xls'}:
        raise HTTPException(status_code=400, detail="File type not supported")
    
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large")
    
    try:
        # Save file
        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        file_path = UPLOAD_DIR / filename
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Process file
        if file_extension == '.csv':
            df = pd.read_csv(file_path, nrows=100)
        else:
            df = pd.read_excel(file_path, nrows=100)
        
        # Basic info
        rows_count = len(df)
        columns_count = len(df.columns)
        
        # Process columns
        columns_info = []
        for col in df.columns:
            col_data = df[col]
            null_count = int(col_data.isnull().sum())
            unique_count = int(col_data.nunique())
            
            if pd.api.types.is_numeric_dtype(col_data):
                col_type = 'number'
            else:
                col_type = 'text'
            
            sample_values = [str(val)[:50] for val in col_data.dropna().head(3).tolist()]
            
            columns_info.append({
                'name': str(col),
                'type': col_type,
                'data_type': str(col_data.dtype),
                'null_count': null_count,
                'unique_count': unique_count,
                'total_count': rows_count,
                'null_percentage': round((null_count / rows_count) * 100, 2),
                'sample_values': sample_values,
                'data_quality': 'good' if null_count < rows_count * 0.1 else 'fair',
                'is_recommended_target': col_type == 'text' and 2 <= unique_count <= 10,
                'is_recommended_feature': unique_count > 1 and null_count < rows_count * 0.5,
            })
        
        # Preview data
        preview_data = []
        for _, row in df.head(5).iterrows():
            row_dict = {}
            for col in df.columns:
                val = row[col]
                if pd.isna(val):
                    row_dict[str(col)] = None
                else:
                    row_dict[str(col)] = str(val)[:100]
            preview_data.append(row_dict)
        
        response_data = {
            "dataset_id": file_id,
            "filename": file.filename,
            "file_size": len(content),
            "rows_count": rows_count,
            "columns_count": columns_count,
            "upload_status": "completed",
            "uploaded_at": datetime.utcnow().isoformat(),
            "columns": columns_info,
            "preview_data": preview_data,
            "file_path": str(file_path)
        }
        
        print(f"✅ Upload success: {rows_count} rows, {columns_count} cols")
        return response_data
        
    except Exception as e:
        print(f"❌ Upload error: {e}")
        if 'file_path' in locals() and file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

@app.get("/upload/dataset/{dataset_id}/preview")
async def get_dataset_preview(
    dataset_id: str,
    rows: int = 10,
    page: int = 1,
    current_user: User = Depends(current_active_user)
):
    """Get dataset preview with pagination"""
    
    print(f"📊 Preview called: {dataset_id}, page {page}, {rows} rows")
    
    try:
        # Find file
        file_pattern = f"{dataset_id}_*"
        matching_files = list(UPLOAD_DIR.glob(file_pattern))
        
        if not matching_files:
            print(f"❌ File not found: {file_pattern}")
            print(f"📁 Available files: {[f.name for f in UPLOAD_DIR.glob('*')]}")
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        file_path = matching_files[0]
        file_extension = file_path.suffix.lower()
        
        # Read file
        if file_extension == '.csv':
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        
        # Pagination
        total_rows = len(df)
        start_idx = (page - 1) * rows
        end_idx = start_idx + rows
        
        page_data = df.iloc[start_idx:end_idx] if start_idx < total_rows else pd.DataFrame()
        
        # Convert to dict
        cleaned_data = []
        for _, row in page_data.iterrows():
            row_dict = {}
            for col in df.columns:
                val = row[col]
                if pd.isna(val):
                    row_dict[str(col)] = None
                else:
                    row_dict[str(col)] = str(val)[:200]
            cleaned_data.append(row_dict)
        
        total_pages = (total_rows + rows - 1) // rows
        
        response = {
            "data": cleaned_data,
            "columns": [str(col) for col in df.columns],
            "rows_shown": len(cleaned_data),
            "total_rows": total_rows,
            "current_page": page,
            "rows_per_page": rows,
            "total_pages": total_pages,
            "has_next": end_idx < total_rows,
            "has_previous": page > 1
        }
        
        print(f"✅ Preview success: {len(cleaned_data)} rows returned")
        return response
        
    except Exception as e:
        print(f"❌ Preview error: {e}")
        raise HTTPException(status_code=500, detail=f"Preview failed: {str(e)}")

@app.get("/upload/dataset/{dataset_id}/columns")
async def get_dataset_columns(
    dataset_id: str,
    current_user: User = Depends(current_active_user)
):
    """Get column information"""
    
    try:
        file_pattern = f"{dataset_id}_*"
        matching_files = list(UPLOAD_DIR.glob(file_pattern))
        
        if not matching_files:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        file_path = matching_files[0]
        file_extension = file_path.suffix.lower()
        
        if file_extension == '.csv':
            df = pd.read_csv(file_path, nrows=1000)
        else:
            df = pd.read_excel(file_path, nrows=1000)
        
        columns_info = []
        for col in df.columns:
            col_data = df[col]
            columns_info.append({
                'name': str(col),
                'type': 'number' if pd.api.types.is_numeric_dtype(col_data) else 'text',
                'null_count': int(col_data.isnull().sum()),
                'unique_count': int(col_data.nunique()),
                'sample_values': [str(val)[:50] for val in col_data.dropna().head(5).tolist()]
            })
        
        return columns_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Column analysis failed: {str(e)}")

@app.delete("/upload/dataset/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    current_user: User = Depends(current_active_user)
):
    """Delete dataset"""
    
    try:
        file_pattern = f"{dataset_id}_*"
        matching_files = list(UPLOAD_DIR.glob(file_pattern))
        
        deleted_count = 0
        for file_path in matching_files:
            file_path.unlink()
            deleted_count += 1
        
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        return {"message": f"Dataset deleted ({deleted_count} files)"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")

# ===== EXISTING ENDPOINTS =====

@app.get("/")
async def root():
    return {
        "message": "AI Platform API - Complete Upload System",
        "version": "1.0.0",
        "status": "active",
        "endpoints": {
            "upload": "POST /upload/file/{project_id} ✅",
            "preview": "GET /upload/dataset/{dataset_id}/preview ✅",
            "columns": "GET /upload/dataset/{dataset_id}/columns ✅",
            "delete": "DELETE /upload/dataset/{dataset_id} ✅"
        },
        "upload_dir_exists": UPLOAD_DIR.exists()
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "upload_endpoints": "available"}

@app.get("/protected")
async def protected_endpoint(user: User = Depends(current_active_user)):
    return {
        "message": f"Hello {user.email}!",
        "user_id": str(user.id),
        "subscription": user.subscription_plan
    }