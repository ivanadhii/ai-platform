from celery import Celery
import os
import time
from datetime import datetime

# Redis configuration
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Create Celery app with Windows-friendly settings
app = Celery(
    'ai_platform',
    broker=redis_url,
    backend=redis_url
)

# Windows-friendly configuration
app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    # Windows specific settings
    worker_pool='solo',  # Better for Windows
    worker_concurrency=1,
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
    broker_connection_retry_on_startup=True,  # Fix deprecation warning
)

@app.task(bind=True)
def test_task(self, message: str = "Hello World"):
    """Simple test task"""
    print(f"🧪 Test task started: {message}")
    
    # Simulate some work
    for i in range(5):
        time.sleep(1)
        progress = (i + 1) * 20
        self.update_state(
            state='PROGRESS',
            meta={'current': i + 1, 'total': 5, 'progress': progress}
        )
        print(f"Progress: {progress}%")
    
    result = f"Task completed at {datetime.now()}: {message}"
    print(f"✅ {result}")
    return result

@app.task(bind=True)
def mock_training_task(self, job_id: str, config: dict):
    """Mock ML training task"""
    print(f"🚀 Starting mock training for job {job_id}")
    
    try:
        # Simulate training steps
        steps = [
            (20, "Loading dataset..."),
            (40, "Preprocessing data..."),
            (60, "Training model..."),
            (80, "Evaluating performance..."),
            (100, "Training completed!")
        ]
        
        for progress, status in steps:
            time.sleep(2)  # Simulate work
            self.update_state(
                state='PROGRESS',
                meta={
                    'progress': progress,
                    'status': status,
                    'job_id': job_id
                }
            )
            print(f"Job {job_id}: {progress}% - {status}")
        
        # Mock results
        import random
        accuracy = 0.80 + random.random() * 0.15  # 80-95%
        
        result = {
            'job_id': job_id,
            'status': 'completed',
            'accuracy': accuracy,
            'precision': 0.85,
            'recall': 0.82,
            'f1_score': 0.83,
            'model_path': f'models/model_{job_id}.pkl',
            'completed_at': datetime.now().isoformat()
        }
        
        print(f"🎉 Training completed! Accuracy: {accuracy:.3f}")
        return result
        
    except Exception as e:
        error_msg = f"Training failed: {str(e)}"
        print(f"❌ {error_msg}")
        self.update_state(
            state='FAILURE',
            meta={'error': error_msg}
        )
        raise

# Test function to call from Python
def test_celery_worker():
    """Test function to verify Celery is working"""
    print("🔍 Testing Celery worker...")
    
    # Test simple task
    result = test_task.delay("Test from Python!")
    print(f"Task ID: {result.id}")
    print(f"Task state: {result.state}")
    
    # Wait for result
    try:
        final_result = result.get(timeout=30)
        print(f"✅ Task result: {final_result}")
        return True
    except Exception as e:
        print(f"❌ Task failed: {e}")
        return False

if __name__ == '__main__':
    # Test the setup
    test_celery_worker()