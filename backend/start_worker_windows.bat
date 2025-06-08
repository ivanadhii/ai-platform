@echo off
echo Starting Celery Worker for Windows...
echo.

REM Activate virtual environment
call venv\Scripts\activate

REM Start worker with Windows-friendly settings
celery -A celery_app worker --loglevel=info --pool=solo --concurrency=1

pause