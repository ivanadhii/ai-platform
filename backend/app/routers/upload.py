# backend/app/routers/upload.py - Enhanced Version

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import pandas as pd
import json
import uuid
import os
from datetime import datetime
import aiofiles
from pathlib import Path

from app.core.database import get_async_session
from app.core.auth import current_active_user
from app.models.user import User
from app.models.project import Project
from app.schemas.dataset import DatasetRead, ColumnInfo
from app.services.file_processor import FileProcessor

router = APIRouter(prefix="/upload", tags=["file-upload"])

# File upload directory
UPLOAD_DIR = Path("uploaded_files")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/file/{project_id}")
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Upload and process file with comprehensive error handling"""
    
    # Validate file basics
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
    
    # Check file size (50MB limit)
    content = await file.read()
    if len(content) > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
    
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")
    
    # Verify project ownership
    project_result = await session.execute(
        select(Project).where(
            Project.id == project_id, 
            Project.user_id == current_user.id
        )
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found or access denied")
    
    try:
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        file_path = UPLOAD_DIR / filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(content)
        
        # Process file with enhanced error handling
        processor = FileProcessor()
        file_info = await processor.process_file(file_path, file_extension)
        
        # Return immediate response with preview data
        response_data = {
            "dataset_id": file_id,
            "filename": file.filename,
            "file_size": len(content),
            "rows_count": file_info['rows_count'],
            "columns_count": file_info['columns_count'],
            "upload_status": "completed",
            "uploaded_at": datetime.utcnow().isoformat(),
            "columns": file_info['columns'],
            "preview_data": file_info['preview_data'][:10],  # Default 10 rows
            "file_path": str(file_path)  # For subsequent operations
        }
        
        return response_data
        
    except UnicodeDecodeError:
        # Clean up file on error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=400, detail="File encoding error. Please save as UTF-8")
    
    except pd.errors.EmptyDataError:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=400, detail="File contains no data")
    
    except pd.errors.ParserError as e:
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=400, detail=f"File parsing error: {str(e)}")
    
    except Exception as e:
        # Clean up file on error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

@router.get("/dataset/{dataset_id}/preview")
async def get_dataset_preview(
    dataset_id: str,
    rows: int = Query(default=10, ge=1, le=1000),
    page: int = Query(default=1, ge=1),
    current_user: User = Depends(current_active_user)
):
    """Get paginated preview of dataset"""
    
    try:
        # Find uploaded file
        file_pattern = f"{dataset_id}_*"
        matching_files = list(UPLOAD_DIR.glob(file_pattern))
        
        if not matching_files:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        file_path = matching_files[0]
        file_extension = file_path.suffix.lower()
        
        # Calculate pagination
        skip_rows = (page - 1) * rows
        
        # Read file with pagination
        if file_extension == '.csv':
            # For CSV, we can use skiprows and nrows
            df = pd.read_csv(file_path, skiprows=range(1, skip_rows + 1) if skip_rows > 0 else None, nrows=rows)
            total_rows = sum(1 for line in open(file_path)) - 1  # Subtract header
        else:
            # For Excel, read all then slice (less efficient but simpler)
            df_full = pd.read_excel(file_path)
            total_rows = len(df_full)
            df = df_full.iloc[skip_rows:skip_rows + rows]
        
        # Process data
        processor = FileProcessor()
        preview_data = df.to_dict('records')
        cleaned_preview = processor._clean_preview_data(preview_data)
        
        return {
            "data": cleaned_preview,
            "columns": list(df.columns),
            "rows_shown": len(df),
            "total_rows": total_rows,
            "current_page": page,
            "rows_per_page": rows,
            "total_pages": (total_rows + rows - 1) // rows,
            "has_next": page * rows < total_rows,
            "has_previous": page > 1
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preview: {str(e)}")

@router.get("/dataset/{dataset_id}/columns")
async def get_dataset_columns(
    dataset_id: str,
    current_user: User = Depends(current_active_user)
):
    """Get detailed column information for dataset"""
    
    try:
        # Find uploaded file
        file_pattern = f"{dataset_id}_*"
        matching_files = list(UPLOAD_DIR.glob(file_pattern))
        
        if not matching_files:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        file_path = matching_files[0]
        file_extension = file_path.suffix.lower()
        
        # Read sample of file for column analysis
        if file_extension == '.csv':
            df = pd.read_csv(file_path, nrows=1000)  # Sample first 1000 rows
        else:
            df = pd.read_excel(file_path, nrows=1000)
        
        # Analyze columns
        processor = FileProcessor()
        columns_info = []
        
        for col in df.columns:
            col_info = await processor._analyze_column(df, col)
            columns_info.append(ColumnInfo(
                name=col_info['name'],
                type=col_info['type'],
                null_count=col_info['null_count'],
                unique_count=col_info['unique_count'],
                sample_values=col_info['sample_values']
            ))
        
        return columns_info
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to analyze columns: {str(e)}")

@router.delete("/dataset/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    current_user: User = Depends(current_active_user)
):
    """Delete uploaded dataset file"""
    
    try:
        # Find and delete file
        file_pattern = f"{dataset_id}_*"
        matching_files = list(UPLOAD_DIR.glob(file_pattern))
        
        deleted_count = 0
        for file_path in matching_files:
            file_path.unlink()
            deleted_count += 1
        
        if deleted_count == 0:
            raise HTTPException(status_code=404, detail="Dataset not found")
        
        return {"message": f"Dataset deleted successfully ({deleted_count} files removed)"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")