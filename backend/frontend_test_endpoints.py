"""
Additional endpoints for frontend testing
"""

from fastapi import APIRouter

router = APIRouter(prefix="/test", tags=["testing"])

@router.get("/sample-training")
async def get_sample_training_data():
    """Get sample training configuration for frontend testing"""
    return {
        "sample_request": {
            "project_id": "sample_project_123",
            "dataset_id": "sample_dataset_456",
            "target_column": "category", 
            "feature_columns": ["text"],
            "algorithm": "ensemble",
            "test_size": 0.2
        },
        "expected_response": {
            "job_id": "uuid-here",
            "status": "started",
            "message": "Training started for project sample_project_123"
        }
    }

@router.get("/sample-prediction")
async def get_sample_prediction_data():
    """Get sample prediction data for frontend testing"""
    return {
        "sample_texts": [
            "Saya ingin mengurus SBU konstruksi",
            "Kenapa NIB saya belum keluar?",
            "Website OSS error terus",
            "Bagaimana cara perpanjang SIUP?"
        ],
        "expected_results": [
            {"prediction": "layanan", "confidence": 0.95},
            {"prediction": "pengaduan", "confidence": 0.87},
            {"prediction": "pengaduan", "confidence": 0.92},
            {"prediction": "layanan", "confidence": 0.89}
        ]
    }