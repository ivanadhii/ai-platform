from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form
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
from app.models.dataset import Dataset, DatasetColumn
from app.models.project import Project
from app.schemas.dataset import DatasetCreate, DatasetRead, ColumnInfo
from app.services.file_processor import FileProcessor

router = APIRouter(prefix="/upload", tags=["file-upload"])

# File upload directory
UPLOAD_DIR = Path("uploaded_files")
UPLOAD_DIR.mkdir(exist_ok=True)

@router.post("/file/{project_id}", response_model=DatasetRead)
async def upload_file(
    project_id: str,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Upload a dataset file for a specific project"""
    
    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    
    # Check file extension
    allowed_extensions = {'.csv', '.xlsx', '.xls', '.json'}
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"File type not supported. Allowed: {', '.join(allowed_extensions)}"
        )
    
    # Check file size (50MB limit)
    if file.size and file.size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 50MB limit")
    
    # Verify project ownership
    project_result = await session.execute(
        select(Project).where(
            Project.id == project_id, 
            Project.user_id == current_user.id
        )
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    try:
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}_{file.filename}"
        file_path = UPLOAD_DIR / filename
        
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Process file
        processor = FileProcessor()
        file_info = await processor.process_file(file_path, file_extension)
        
        # Create dataset record
        dataset = Dataset(
            id=file_id,
            filename=file.filename,
            file_path=str(file_path),
            file_size=len(content),
            rows_count=file_info['rows_count'],
            columns_count=file_info['columns_count'],
            upload_status='ready',
            project_id=project_id,
            uploaded_at=datetime.utcnow()
        )
        
        session.add(dataset)
        
        # Create column records
        for col_info in file_info['columns']:
            column = DatasetColumn(
                dataset_id=file_id,
                name=col_info['name'],
                data_type=col_info['type'],
                null_count=col_info['null_count'],
                unique_count=col_info['unique_count'],
                sample_values=json.dumps(col_info['sample_values'])
            )
            session.add(column)
        
        await session.commit()
        await session.refresh(dataset)
        
        return DatasetRead(
            id=dataset.id,
            filename=dataset.filename,
            file_size=dataset.file_size,
            rows_count=dataset.rows_count,
            columns_count=dataset.columns_count,
            upload_status=dataset.upload_status,
            uploaded_at=dataset.uploaded_at,
            columns=[
                ColumnInfo(
                    name=col['name'],
                    type=col['type'],
                    null_count=col['null_count'],
                    unique_count=col['unique_count'],
                    sample_values=col['sample_values']
                ) for col in file_info['columns']
            ],
            preview_data=file_info['preview_data']
        )
        
    except Exception as e:
        # Clean up file on error
        if file_path.exists():
            file_path.unlink()
        raise HTTPException(status_code=500, detail=f"File processing failed: {str(e)}")

@router.get("/dataset/{dataset_id}/preview")
async def get_dataset_preview(
    dataset_id: str,
    rows: int = 10,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Get preview of dataset with specified number of rows"""
    
    # Get dataset
    dataset_result = await session.execute(
        select(Dataset).where(Dataset.id == dataset_id)
    )
    dataset = dataset_result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Verify project ownership
    project_result = await session.execute(
        select(Project).where(
            Project.id == dataset.project_id,
            Project.user_id == current_user.id
        )
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        processor = FileProcessor()
        preview_data = await processor.get_preview(dataset.file_path, rows)
        return preview_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get preview: {str(e)}")

@router.get("/dataset/{dataset_id}/columns")
async def get_dataset_columns(
    dataset_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Get detailed column information for dataset"""
    
    # Get dataset columns
    columns_result = await session.execute(
        select(DatasetColumn).where(DatasetColumn.dataset_id == dataset_id)
    )
    columns = columns_result.scalars().all()
    
    if not columns:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Verify ownership through project
    dataset_result = await session.execute(
        select(Dataset).where(Dataset.id == dataset_id)
    )
    dataset = dataset_result.scalar_one_or_none()
    
    if dataset:
        project_result = await session.execute(
            select(Project).where(
                Project.id == dataset.project_id,
                Project.user_id == current_user.id
            )
        )
        if not project_result.scalar_one_or_none():
            raise HTTPException(status_code=403, detail="Access denied")
    
    return [
        ColumnInfo(
            name=col.name,
            type=col.data_type,
            null_count=col.null_count,
            unique_count=col.unique_count,
            sample_values=json.loads(col.sample_values) if col.sample_values else []
        ) for col in columns
    ]

@router.post("/dataset/{dataset_id}/validate")
async def validate_dataset(
    dataset_id: str,
    target_column: str = Form(...),
    feature_columns: List[str] = Form(...),
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Validate dataset configuration for training"""
    
    # Get dataset
    dataset_result = await session.execute(
        select(Dataset).where(Dataset.id == dataset_id)
    )
    dataset = dataset_result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Verify project ownership
    project_result = await session.execute(
        select(Project).where(
            Project.id == dataset.project_id,
            Project.user_id == current_user.id
        )
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        processor = FileProcessor()
        validation_result = await processor.validate_for_training(
            dataset.file_path,
            target_column,
            feature_columns
        )
        return validation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@router.delete("/dataset/{dataset_id}")
async def delete_dataset(
    dataset_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Delete a dataset and its associated file"""
    
    # Get dataset
    dataset_result = await session.execute(
        select(Dataset).where(Dataset.id == dataset_id)
    )
    dataset = dataset_result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Verify project ownership
    project_result = await session.execute(
        select(Project).where(
            Project.id == dataset.project_id,
            Project.user_id == current_user.id
        )
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")
    
    try:
        # Delete file
        file_path = Path(dataset.file_path)
        if file_path.exists():
            file_path.unlink()
        
        # Delete database records
        await session.execute(
            select(DatasetColumn).where(DatasetColumn.dataset_id == dataset_id)
        )
        await session.delete(dataset)
        await session.commit()
        
        return {"message": "Dataset deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Deletion failed: {str(e)}")