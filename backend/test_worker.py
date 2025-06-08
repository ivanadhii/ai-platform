"""
Script to test if Celery worker is functioning properly
"""

import time
from celery_app import test_task, mock_training_task, app

def test_basic_task():
    """Test basic task execution"""
    print("\n🧪 Testing basic task...")
    
    # Send task
    result = test_task.delay("Hello from test!")
    print(f"📋 Task sent with ID: {result.id}")
    
    # Monitor progress
    while not result.ready():
        print(f"📊 Current state: {result.state}")
        if result.state == 'PROGRESS':
            meta = result.info
            print(f"   Progress: {meta.get('progress', 0)}%")
        time.sleep(1)
    
    # Get final result
    if result.successful():
        print(f"✅ Task completed: {result.result}")
        return True
    else:
        print(f"❌ Task failed: {result.traceback}")
        return False

def test_training_task():
    """Test mock training task"""
    print("\n🤖 Testing training task...")
    
    config = {
        'target_column': 'category',
        'feature_columns': ['text'],
        'algorithm': 'ensemble'
    }
    
    # Send training task
    result = mock_training_task.delay('test_job_123', config)
    print(f"📋 Training task sent with ID: {result.id}")
    
    # Monitor training progress
    while not result.ready():
        print(f"📊 Training state: {result.state}")
        if result.state == 'PROGRESS':
            meta = result.info
            progress = meta.get('progress', 0)
            status = meta.get('status', 'Working...')
            print(f"   {progress}% - {status}")
        time.sleep(2)
    
    # Get training result
    if result.successful():
        training_result = result.result
        print(f"🎉 Training completed!")
        print(f"   Accuracy: {training_result['accuracy']:.3f}")
        print(f"   Model: {training_result['model_path']}")
        return True
    else:
        print(f"❌ Training failed: {result.traceback}")
        return False

def check_worker_status():
    """Check if workers are available"""
    print("\n🔍 Checking worker status...")
    
    # Get active workers
    inspect = app.control.inspect()
    active_workers = inspect.active()
    
    if active_workers:
        print(f"✅ Found {len(active_workers)} active workers:")
        for worker, tasks in active_workers.items():
            print(f"   - {worker}: {len(tasks)} active tasks")
        return True
    else:
        print("❌ No active workers found!")
        return False

if __name__ == '__main__':
    print("🚀 Starting Celery Worker Tests")
    print("=" * 50)
    
    # Check worker status
    workers_ok = check_worker_status()
    
    if workers_ok:
        # Test basic task
        basic_ok = test_basic_task()
        
        if basic_ok:
            # Test training task
            training_ok = test_training_task()
            
            if training_ok:
                print("\n🎉 ALL TESTS PASSED!")
                print("Celery worker is functioning correctly!")
            else:
                print("\n⚠️ Basic task OK, but training task failed")
        else:
            print("\n❌ Basic task failed")
    else:
        print("\n❌ No workers available - start worker first!")
    
    print("\n" + "=" * 50)