#!/bin/bash
# Apply main.py fix

echo "🔧 Backing up current main.py..."
cp backend/main.py backend/main.py.backup

echo "📝 Applying safe main.py..."
cat > backend/main.py << 'EOF'
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import uuid

from app.core.auth import auth_backend, fastapi_users, current_active_user
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.models.user import User
from app.core.database import async_engine, Base

# Simple test model
class SimpleUserCreate(BaseModel):
    email: str
    password: str
    full_name: str = None

# Create tables on startup - SAFE VERSION
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Create tables
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Database startup error: {e}")
        print("🔧 Continuing with limited functionality...")
    yield

# Initialize FastAPI app
app = FastAPI(
    title="AI Platform API",
    description="No-code ML training platform API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include authentication routes
app.include_router(
    fastapi_users.get_auth_router(auth_backend), 
    prefix="/auth/jwt", 
    tags=["auth"]
)
app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)
app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

@app.get("/")
async def root():
    return {
        "message": "AI Platform API",
        "version": "1.0.0",
        "status": "active"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/protected")
async def protected_endpoint(user: User = Depends(current_active_user)):
    return {
        "message": f"Hello {user.email}!",
        "user_id": str(user.id),
        "subscription": user.subscription_plan,
        "models_created": user.models_created
    }

@app.get("/test-db")
async def test_database():
    try:
        from app.core.database import async_engine
        from sqlalchemy import text
        async with async_engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.fetchone()
            return {
                "database": "connected",
                "type": "PostgreSQL", 
                "version": str(version[0]) if version else "unknown",
                "status": "Working"
            }
    except Exception as e:
        return {
            "database": "error", 
            "message": str(e)
        }
EOF

echo "✅ main.py updated successfully!"
echo ""
echo "🚀 Now test the backend:"
echo "cd backend && python -m uvicorn main:app --reload"
echo ""
echo "🔍 Test endpoints:"
echo "curl http://127.0.0.1:8000/health"
echo "curl http://127.0.0.1:8000/test-db"