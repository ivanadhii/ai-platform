"""
Quick script to check if Celery worker is running
"""

import requests

def quick_worker_check():
    try:
        response = requests.get("http://localhost:8000/training/worker-status")
        if response.status_code == 200:
            data = response.json()
            status = data["status"]
            workers = data.get("workers", 0)
            
            if status == "healthy" and workers > 0:
                print(f"✅ Celery worker is healthy ({workers} workers)")
                return True
            else:
                print(f"⚠️ Worker status: {status} ({workers} workers)")
                print("Start worker: celery -A celery_app worker --loglevel=info --pool=solo")
                return False
        else:
            print(f"❌ API not responding: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False

if __name__ == '__main__':
    quick_worker_check()