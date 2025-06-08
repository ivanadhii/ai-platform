"""
Celery configuration for AI Platform
"""

import os
from datetime import timedelta

# Redis configuration
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Celery configuration
CELERY_CONFIG = {
    'broker_url': REDIS_URL,
    'result_backend': REDIS_URL,
    'task_serializer': 'json',
    'accept_content': ['json'],
    'result_serializer': 'json',
    'timezone': 'UTC',
    'enable_utc': True,
    'task_track_started': True,
    'task_time_limit': 30 * 60,  # 30 minutes
    'task_soft_time_limit': 25 * 60,  # 25 minutes
    'worker_prefetch_multiplier': 1,
    'worker_max_tasks_per_child': 1000,
    'task_routes': {
        'app.tasks.training_tasks.train_ml_model': {'queue': 'training'},
        'app.tasks.training_tasks.test_task': {'queue': 'default'},
    },
    'task_default_queue': 'default',
    'task_create_missing_queues': True,
    'result_expires': timedelta(days=1),
    'worker_log_level': 'INFO',
}