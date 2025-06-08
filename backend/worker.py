"""
Simple Celery worker starter script
"""

import os
import sys
from pathlib import Path

# Add current directory to Python path
sys.path.insert(0, str(Path(__file__).parent))

# Set environment variables
os.environ.setdefault('PYTHONPATH', str(Path(__file__).parent))

# Import and start the Celery app
from app.tasks.training_tasks import celery_app

if __name__ == '__main__':
    # Start the worker
    celery_app.start([
        'worker',
        '--loglevel=info',
        '--concurrency=1',
    ])