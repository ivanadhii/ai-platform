"""
Python script to start Celery worker programmatically
"""

import os
import sys
from celery_app import app

def start_worker():
    """Start Celery worker with Windows-friendly settings"""
    print("🚀 Starting Celery worker...")
    
    # Set worker options
    worker_options = {
        'loglevel': 'INFO',
        'pool': 'solo',  # Better for Windows
        'concurrency': 1,
        'optimization': 'fair',
    }
    
    try:
        # Start worker
        app.worker_main(['worker'] + [
            f'--{key}={value}' for key, value in worker_options.items()
        ])
    except KeyboardInterrupt:
        print("\n🛑 Worker stopped by user")
    except Exception as e:
        print(f"❌ Worker error: {e}")

if __name__ == '__main__':
    start_worker()