from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

from app.core.database import get_async_session
from app.core.auth import current_active_user
from app.models.user import User
from app.models.training import TrainingJob, DeployedModel
from app.models.dataset import Dataset
from app.models.project import Project
from app.tasks.training_tasks import train_ml_model, celery_app

router = APIRouter(prefix="/training", tags=["training"])

class TrainingConfig(BaseModel):
    project_id: str
    dataset_id: str
    target_column: str
    feature_columns: List[str]
    algorithm: str = "ensemble"
    test_size: float = 0.2
    random_state: int = 42
    preprocessing_config: Optional[dict] = None

class TrainingJobResponse(BaseModel):
    id: str
    status: str
    progress: int
    current_step: Optional[str]
    accuracy: Optional[float]
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.post("/start", response_model=TrainingJobResponse)
async def start_training(
    config: TrainingConfig,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Start ML model training"""
    
    # Verify project ownership
    project_result = await session.execute(
        select(Project).where(
            Project.id == config.project_id,
            Project.user_id == current_user.id
        )
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Verify dataset exists
    dataset_result = await session.execute(
        select(Dataset).where(Dataset.id == config.dataset_id)
    )
    dataset = dataset_result.scalar_one_or_none()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    # Create training job
    job_id = str(uuid.uuid4())
    training_job = TrainingJob(
        id=job_id,
        project_id=config.project_id,
        dataset_id=config.dataset_id,
        target_column=config.target_column,
        feature_columns=config.feature_columns,
        algorithm=config.algorithm,
        test_size=config.test_size,
        random_state=config.random_state,
        preprocessing_config=config.preprocessing_config
    )
    
    session.add(training_job)
    await session.commit()
    await session.refresh(training_job)
    
    # Start background training task
    train_ml_model.delay(
        job_id,
        dataset.file_path,
        config.dict()
    )
    
    return training_job

@router.get("/{job_id}/status", response_model=TrainingJobResponse)
async def get_training_status(
    job_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Get training job status"""
    
    result = await session.execute(
        select(TrainingJob).where(TrainingJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    # Verify ownership through project
    project_result = await session.execute(
        select(Project).where(
            Project.id == job.project_id,
            Project.user_id == current_user.id
        )
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")
    
    return job

@router.get("/{job_id}/results")
async def get_training_results(
    job_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Get detailed training results"""
    
    result = await session.execute(
        select(TrainingJob).where(TrainingJob.id == job_id)
    )
    job = result.scalar_one_or_none()
    
    if not job:
        raise HTTPException(status_code=404, detail="Training job not found")
    
    # Verify ownership
    project_result = await session.execute(
        select(Project).where(
            Project.id == job.project_id,
            Project.user_id == current_user.id
        )
    )
    if not project_result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Access denied")
    
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Training not completed yet")
    
    return {
        "id": job.id,
        "status": job.status,
        "accuracy": job.accuracy,
        "precision": job.precision,
        "recall": job.recall,
        "f1_score": job.f1_score,
        "confusion_matrix": job.confusion_matrix,
        "model_path": job.model_path,
        "training_time": (job.completed_at - job.started_at).total_seconds() if job.completed_at and job.started_at else None
    }