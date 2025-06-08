import joblib
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import time
from pathlib import Path

router = APIRouter(prefix="/models", tags=["inference"])

class PredictionRequest(BaseModel):
    text: str

class PredictionResponse(BaseModel):
    prediction: str
    confidence: float
    processing_time_ms: float
    model_version: str

@router.post("/{model_id}/predict", response_model=PredictionResponse)
async def predict(
    model_id: str,
    request: PredictionRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Make prediction using deployed model"""
    
    start_time = time.time()
    
    # Get deployed model info
    result = await session.execute(
        select(DeployedModel).where(
            DeployedModel.id == model_id,
            DeployedModel.status == "deployed"
        )
    )
    model_info = result.scalar_one_or_none()
    
    if not model_info:
        raise HTTPException(status_code=404, detail="Model not found or not deployed")
    
    try:
        # Load model
        model = joblib.load(model_info.model_path)
        
        # Make prediction
        prediction = model.predict([request.text])[0]
        prediction_proba = model.predict_proba([request.text])[0]
        
        # Get confidence (max probability)
        confidence = float(max(prediction_proba))
        
        processing_time = (time.time() - start_time) * 1000
        
        # Update API call count
        model_info.api_calls_count += 1
        await session.commit()
        
        return PredictionResponse(
            prediction=str(prediction),
            confidence=confidence,
            processing_time_ms=processing_time,
            model_version=model_info.version
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")