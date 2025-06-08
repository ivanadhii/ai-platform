from celery import Celery
from celery.result import AsyncResult
import os
import pandas as pd
import json
from pathlib import Path
from typing import Dict, Any
import traceback
from datetime import datetime

from app.core.database import async_session_maker
from app.models.training import TrainingJob
from app.services.ml_trainer import MLTrainer

# Celery configuration
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery(
    "ai_platform_worker",
    broker=redis_url,
    backend=redis_url,
    include=['app.tasks.training_tasks']
)

# Celery configuration
celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

@celery_app.task(bind=True)
def train_ml_model(self, job_id: str, dataset_path: str, config: Dict[str, Any]):
    """
    Background task for ML model training
    """
    
    try:
        # Update status to training
        update_job_status(job_id, "preprocessing", 10, "Loading dataset...")
        
        # Load dataset
        if dataset_path.endswith('.csv'):
            df = pd.read_csv(dataset_path)
        elif dataset_path.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(dataset_path)
        else:
            raise ValueError(f"Unsupported file format: {dataset_path}")
        
        update_job_status(job_id, "preprocessing", 20, "Preprocessing text...")
        
        # Initialize trainer
        trainer = MLTrainer()
        
        # Preprocess data
        X, y = trainer.preprocess_data(
            df, 
            config['target_column'], 
            config['feature_columns']
        )
        
        update_job_status(job_id, "training", 40, "Training ensemble model...")
        
        # Train model
        results = trainer.train_model(X, y, config.get('test_size', 0.2))
        
        update_job_status(job_id, "training", 80, "Saving model...")
        
        # Save model
        model_path, vectorizer_path = trainer.save_model(results['model'], job_id)
        
        # Final update
        update_job_status(
            job_id, 
            "completed", 
            100, 
            "Training completed successfully!",
            {
                'accuracy': results['accuracy'],
                'precision': results['precision'],
                'recall': results['recall'],
                'f1_score': results['f1_score'],
                'confusion_matrix': results['confusion_matrix'],
                'model_path': model_path,
                'vectorizer_path': vectorizer_path,
                'class_names': results['class_names']
            }
        )
        
        return {
            "status": "completed",
            "accuracy": results['accuracy'],
            "model_path": model_path,
            "message": f"Training completed with {results['accuracy']:.3f} accuracy"
        }
        
    except Exception as e:
        error_msg = f"Training failed: {str(e)}\n{traceback.format_exc()}"
        update_job_status(job_id, "failed", 0, error_msg)
        
        # Re-raise for Celery
        raise self.retry(exc=e, countdown=60, max_retries=2)

def update_job_status(job_id: str, status: str, progress: int, message: str, results: Dict = None):
    """Update training job status in database"""
    
    # This is a simplified version - in production, use async session properly
    import asyncio
    from sqlalchemy import update
    
    async def _update():
        async with async_session_maker() as session:
            stmt = update(TrainingJob).where(TrainingJob.id == job_id)
            
            update_data = {
                'status': status,
                'progress': progress,
                'current_step': message
            }
            
            if status == "completed" and results:
                update_data.update({
                    'accuracy': results.get('accuracy'),
                    'precision': results.get('precision'),
                    'recall': results.get('recall'),
                    'f1_score': results.get('f1_score'),
                    'confusion_matrix': results.get('confusion_matrix'),
                    'model_path': results.get('model_path'),
                    'vectorizer_path': results.get('vectorizer_path'),
                    'completed_at': datetime.utcnow()
                })
            elif status == "failed":
                update_data['error_message'] = message
            elif status == "training" and 'started_at' not in update_data:
                update_data['started_at'] = datetime.utcnow()
            
            await session.execute(stmt.values(update_data))
            await session.commit()
    
    # Run async update (this is simplified - better to use proper async context)
    try:
        loop = asyncio.get_event_loop()
        loop.run_until_complete(_update())
    except:
        # Fallback for new event loop
        asyncio.run(_update())
