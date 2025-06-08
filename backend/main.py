from fastapi import FastAPI, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime

# Import existing modules
from app.core.auth import auth_backend, fastapi_users, current_active_user
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.models.user import User
from app.core.database import async_engine, Base
from frontend_test_endpoints import router as test_router

# Import Celery
from celery_app import app as celery_app, mock_training_task, test_task

# Create tables on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Database startup error: {e}")
        print("🔧 Continuing with limited functionality...")
    yield

# Initialize FastAPI app
app = FastAPI(
    title="AI Platform API",
    description="No-code ML training platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication routes
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

app.include_router(test_router)

# ==========================================
# TRAINING API ENDPOINTS WITH CELERY
# ==========================================

class TrainingRequest(BaseModel):
    project_id: str
    dataset_id: str
    target_column: str
    feature_columns: List[str]
    algorithm: str = "ensemble"
    test_size: float = 0.2

class TrainingResponse(BaseModel):
    job_id: str
    status: str
    message: str

class TrainingStatus(BaseModel):
    job_id: str
    state: str
    progress: int
    status: str
    result: Optional[Dict[str, Any]] = None

@app.post("/training/start", response_model=TrainingResponse)
async def start_training(
    request: TrainingRequest,
    current_user: User = Depends(current_active_user)
):
    """Start ML model training using Celery"""
    
    # Generate job ID
    job_id = str(uuid.uuid4())
    
    # Prepare training config
    config = {
        'project_id': request.project_id,
        'dataset_id': request.dataset_id,
        'target_column': request.target_column,
        'feature_columns': request.feature_columns,
        'algorithm': request.algorithm,
        'test_size': request.test_size,
        'user_id': str(current_user.id)
    }
    
    # Start Celery task
    task = mock_training_task.delay(job_id, config)
    
    return TrainingResponse(
        job_id=task.id,  # Use Celery task ID
        status="started",
        message=f"Training started for project {request.project_id}"
    )

@app.get("/training/{job_id}/status", response_model=TrainingStatus)
async def get_training_status(
    job_id: str,
    current_user: User = Depends(current_active_user)
):
    """Get real-time training status"""
    
    # Get task result
    from celery.result import AsyncResult
    task_result = AsyncResult(job_id, app=celery_app)
    
    # Parse task state and progress
    state = task_result.state
    
    if state == 'PENDING':
        response = {
            'job_id': job_id,
            'state': state,
            'progress': 0,
            'status': 'Task is waiting to be processed...',
        }
    elif state == 'PROGRESS':
        info = task_result.info
        response = {
            'job_id': job_id,
            'state': state,
            'progress': info.get('progress', 0),
            'status': info.get('status', 'Processing...'),
        }
    elif state == 'SUCCESS':
        result = task_result.result
        response = {
            'job_id': job_id,
            'state': state,
            'progress': 100,
            'status': 'Training completed successfully!',
            'result': result
        }
    else:  # FAILURE
        response = {
            'job_id': job_id,
            'state': state,
            'progress': 0,
            'status': f'Training failed: {str(task_result.info)}',
        }
    
    return TrainingStatus(**response)

@app.get("/training/{job_id}/results")
async def get_training_results(
    job_id: str,
    current_user: User = Depends(current_active_user)
):
    """Get detailed training results"""
    
    from celery.result import AsyncResult
    task_result = AsyncResult(job_id, app=celery_app)
    
    if task_result.state != 'SUCCESS':
        raise HTTPException(
            status_code=400, 
            detail=f"Training not completed. Current state: {task_result.state}"
        )
    
    return {
        'job_id': job_id,
        'status': 'completed',
        'results': task_result.result,
        'task_info': {
            'state': task_result.state,
            'task_id': task_result.id,
            'date_done': str(task_result.date_done) if task_result.date_done else None
        }
    }

# ==========================================
# MODEL DEPLOYMENT ENDPOINTS
# ==========================================

class DeploymentRequest(BaseModel):
    model_name: str
    description: Optional[str] = None

@app.post("/training/{job_id}/deploy")
async def deploy_model(
    job_id: str,
    request: DeploymentRequest,
    current_user: User = Depends(current_active_user)
):
    """Deploy trained model as API endpoint"""
    
    from celery.result import AsyncResult
    task_result = AsyncResult(job_id, app=celery_app)
    
    if task_result.state != 'SUCCESS':
        raise HTTPException(
            status_code=400,
            detail="Cannot deploy model - training not completed"
        )
    
    training_results = task_result.result
    model_id = str(uuid.uuid4())
    
    # Store deployment info (in real app, save to database)
    deployment_info = {
        'model_id': model_id,
        'model_name': request.model_name,
        'training_job_id': job_id,
        'model_path': training_results.get('model_path'),
        'accuracy': training_results.get('accuracy'),
        'deployed_at': datetime.utcnow().isoformat(),
        'api_endpoint': f'/models/{model_id}/predict',
        'status': 'deployed'
    }
    
    return {
        'model_id': model_id,
        'message': f"Model '{request.model_name}' deployed successfully!",
        'api_endpoint': f'/models/{model_id}/predict',
        'deployment_info': deployment_info
    }

# ==========================================
# MODEL INFERENCE ENDPOINTS (inference_router equivalent)
# ==========================================

class PredictionRequest(BaseModel):
    text: str

class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    model_id: str
    processing_time_ms: float

@app.post("/models/{model_id}/predict", response_model=PredictionResponse)
async def predict_with_model(
    model_id: str,
    request: PredictionRequest
):
    """Make prediction using deployed model"""
    
    import time
    import random
    
    start_time = time.time()
    
    # Mock prediction logic (replace with real model loading)
    text = request.text.lower()
    
    # Simple rule-based mock prediction
    if any(word in text for word in ['sbu', 'kbli', 'npwp', 'siup', 'izin', 'mengurus']):
        prediction = "layanan"
        confidence = 0.85 + random.random() * 0.10
    else:
        prediction = "pengaduan"
        confidence = 0.80 + random.random() * 0.15
    
    processing_time = (time.time() - start_time) * 1000
    
    return PredictionResponse(
        prediction=prediction,
        confidence=confidence,
        model_id=model_id,
        processing_time_ms=processing_time
    )

@app.get("/models/{model_id}/info")
async def get_model_info(model_id: str):
    """Get model information and metrics"""
    
    # Mock model info (in real app, fetch from database)
    return {
        'model_id': model_id,
        'name': 'OSS Text Classifier',
        'algorithm': 'Ensemble (Logistic + SVM + Naive Bayes)',
        'accuracy': 0.847,
        'precision': 0.85,
        'recall': 0.82,
        'f1_score': 0.83,
        'training_data_size': 386,
        'features': ['text'],
        'classes': ['layanan', 'pengaduan'],
        'deployed_at': '2025-06-08T19:31:35Z',
        'api_calls_count': 156,
        'avg_response_time_ms': 45.7
    }

# ==========================================
# WORKER STATUS & SYSTEM HEALTH
# ==========================================

@app.get("/training/worker-status")
async def get_worker_status():
    """Check Celery worker status"""
    
    try:
        # Check active workers
        inspect = celery_app.control.inspect()
        active_workers = inspect.active()
        stats = inspect.stats()
        
        if active_workers:
            return {
                'status': 'healthy',
                'workers': len(active_workers),
                'worker_names': list(active_workers.keys()),
                'active_tasks': sum(len(tasks) for tasks in active_workers.values()),
                'stats': stats
            }
        else:
            return {
                'status': 'no_workers',
                'workers': 0,
                'message': 'No active Celery workers found'
            }
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'message': 'Failed to connect to Celery workers'
        }

@app.post("/training/test")
async def test_training_system():
    """Test the training system with a simple task"""
    
    # Send test task
    task = test_task.delay("API test message")
    
    return {
        'test_task_id': task.id,
        'message': 'Test task sent to Celery worker',
        'check_status_url': f'/training/{task.id}/status'
    }

# ==========================================
# EXISTING ENDPOINTS (keep these)
# ==========================================

@app.get("/")
async def root():
    return {
        "message": "AI Platform API",
        "version": "1.0.0",
        "status": "active",
        "features": ["Authentication", "ML Training", "Model Deployment"]
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "API server is running"}

@app.get("/protected")
async def protected_endpoint(user: User = Depends(current_active_user)):
    return {
        "message": f"Hello {user.email}!",
        "user_id": str(user.id),
        "subscription": user.subscription_plan,
        "models_created": user.models_created,
        "full_name": user.full_name,
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
                "status": "✅ Working perfectly"
            }
    except Exception as e:
        return {
            "database": "error", 
            "message": str(e),
            "status": "❌ Connection failed"
        }