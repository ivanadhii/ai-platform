# backend/test_full_training_flow.py
"""
Complete end-to-end test of training flow
Tests the actual training pipeline with Celery
"""

import requests
import time
import json

API_BASE = "http://localhost:8000"

def register_test_user():
    """Register a test user for authentication"""
    print("👤 Registering test user...")
    
    user_data = {
        "email": "test@training.com",
        "password": "testpass123",
        "full_name": "Training Tester"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/register", json=user_data)
        if response.status_code == 201:
            print("✅ Test user registered successfully")
            return True
        elif response.status_code == 400 and "already registered" in response.text.lower():
            print("ℹ️ Test user already exists")
            return True
        else:
            print(f"⚠️ Registration response: {response.status_code}")
            return True  # Continue anyway
    except Exception as e:
        print(f"⚠️ Registration failed: {e}")
        return True  # Continue anyway

def login_test_user():
    """Login and get JWT token"""
    print("🔐 Logging in test user...")
    
    login_data = {
        "username": "test@training.com",
        "password": "testpass123"
    }
    
    try:
        # FastAPI-Users expects form data
        response = requests.post(
            f"{API_BASE}/auth/jwt/login",
            data=login_data,  # Use data, not json
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access_token")
            print(f"✅ Login successful, got token: {token[:20]}...")
            return token
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def test_authenticated_training(token):
    """Test training with authentication"""
    print("\n🤖 Testing authenticated training flow...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    training_request = {
        "project_id": "test_project_123",
        "dataset_id": "test_dataset_456",
        "target_column": "category",
        "feature_columns": ["text"],
        "algorithm": "ensemble",
        "test_size": 0.2
    }
    
    try:
        # Start training
        response = requests.post(
            f"{API_BASE}/training/start",
            json=training_request,
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            job_id = data["job_id"]
            print(f"✅ Training started! Job ID: {job_id}")
            
            # Monitor training progress
            return monitor_training_progress(job_id, headers)
        else:
            print(f"❌ Training failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Training request failed: {e}")
        return False

def monitor_training_progress(job_id, headers):
    """Monitor training progress in real-time"""
    print(f"\n📊 Monitoring training progress for job {job_id}...")
    
    max_attempts = 30  # 30 seconds max
    for attempt in range(max_attempts):
        try:
            response = requests.get(
                f"{API_BASE}/training/{job_id}/status",
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                state = data["state"]
                progress = data["progress"]
                status = data["status"]
                
                print(f"   {state}: {progress}% - {status}")
                
                if state == "SUCCESS":
                    print("🎉 Training completed successfully!")
                    result = data.get("result", {})
                    accuracy = result.get("accuracy", 0)
                    print(f"   Final accuracy: {accuracy:.3f}")
                    
                    # Test deployment
                    return test_model_deployment(job_id, headers, result)
                
                elif state == "FAILURE":
                    print("❌ Training failed!")
                    return False
                
                time.sleep(1)  # Wait 1 second
            else:
                print(f"❌ Status check failed: {response.status_code}")
                return False
                
        except Exception as e:
            print(f"❌ Progress monitoring error: {e}")
            return False
    
    print("⏰ Training timeout - taking too long")
    return False

def test_model_deployment(job_id, headers, training_result):
    """Test model deployment after training"""
    print(f"\n🚀 Testing model deployment for job {job_id}...")
    
    deployment_request = {
        "model_name": "Test OSS Classifier",
        "description": "Test model deployment"
    }
    
    try:
        response = requests.post(
            f"{API_BASE}/training/{job_id}/deploy",
            json=deployment_request,
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            model_id = data["model_id"]
            api_endpoint = data["api_endpoint"]
            
            print(f"✅ Model deployed successfully!")
            print(f"   Model ID: {model_id}")
            print(f"   API Endpoint: {api_endpoint}")
            
            # Test the deployed model
            return test_deployed_model_prediction(model_id)
        else:
            print(f"❌ Deployment failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Deployment error: {e}")
        return False

def test_deployed_model_prediction(model_id):
    """Test prediction with deployed model"""
    print(f"\n🎯 Testing predictions with deployed model {model_id}...")
    
    test_texts = [
        "Saya ingin mengurus SBU konstruksi",
        "Kenapa NIB saya belum keluar?",
        "Website OSS error terus",
        "Bagaimana cara perpanjang SIUP?"
    ]
    
    all_success = True
    
    for i, text in enumerate(test_texts):
        try:
            response = requests.post(
                f"{API_BASE}/models/{model_id}/predict",
                json={"text": text}
            )
            
            if response.status_code == 200:
                data = response.json()
                prediction = data["prediction"]
                confidence = data["confidence"]
                processing_time = data["processing_time_ms"]
                
                print(f"   Test {i+1}: '{text[:30]}...'")
                print(f"           → {prediction} (confidence: {confidence:.3f}, {processing_time:.1f}ms)")
            else:
                print(f"❌ Prediction {i+1} failed: {response.status_code}")
                all_success = False
                
        except Exception as e:
            print(f"❌ Prediction {i+1} error: {e}")
            all_success = False
    
    return all_success

def test_worker_health_during_training():
    """Check worker status during training"""
    print("\n🔍 Checking worker health...")
    
    try:
        response = requests.get(f"{API_BASE}/training/worker-status")
        if response.status_code == 200:
            data = response.json()
            status = data["status"]
            workers = data.get("workers", 0)
            
            print(f"   Worker status: {status}")
            print(f"   Active workers: {workers}")
            
            if status == "healthy" and workers > 0:
                print("✅ Workers are healthy and active")
                return True
            elif status == "no_workers":
                print("⚠️ No workers detected - start Celery worker!")
                print("   Run: celery -A celery_app worker --loglevel=info --pool=solo")
                return False
            else:
                print(f"⚠️ Worker status: {status}")
                return False
        else:
            print(f"❌ Worker check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Worker check error: {e}")
        return False

def main():
    """Run complete end-to-end test"""
    print("🚀 COMPLETE END-TO-END TRAINING TEST")
    print("=" * 70)
    
    # Check worker health first
    worker_ok = test_worker_health_during_training()
    
    if not worker_ok:
        print("\n❌ CRITICAL: Celery worker not detected!")
        print("Please start the worker in another terminal:")
        print("celery -A celery_app worker --loglevel=info --pool=solo")
        return False
    
    # Register test user
    register_ok = register_test_user()
    
    if not register_ok:
        print("❌ User registration failed")
        return False
    
    # Login to get token
    token = login_test_user()
    
    if not token:
        print("❌ Authentication failed")
        return False
    
    # Test complete training flow
    training_ok = test_authenticated_training(token)
    
    print("\n" + "=" * 70)
    print("📊 FINAL TEST RESULTS:")
    print(f"   Worker Health: {'✅' if worker_ok else '❌'}")
    print(f"   Authentication: {'✅' if token else '❌'}")
    print(f"   Training Flow: {'✅' if training_ok else '❌'}")
    
    if worker_ok and token and training_ok:
        print("\n🎉 COMPLETE SUCCESS!")
        print("🚀 Full ML pipeline is working end-to-end!")
        print("Ready for frontend integration!")
    else:
        print("\n⚠️ Some components need attention")
        if not worker_ok:
            print("   → Start Celery worker")
        if not token:
            print("   → Check authentication setup")
        if not training_ok:
            print("   → Check training pipeline")
    
    return worker_ok and token and training_ok

if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)

