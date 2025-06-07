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

# Create tables on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created")
    yield

# Initialize FastAPI app with authentication
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

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "AI Platform API",
        "version": "1.0.0",
        "status": "active"
    }

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# Test endpoint
@app.get("/test")
async def test_endpoint():
    return {
        "status": "success",
        "message": "Authentication system is working!",
        "endpoints": [
            "POST /auth/register - Register new user",
            "POST /auth/jwt/login - Login user", 
            "GET /users/me - Get current user info",
            "GET /protected - Test protected endpoint"
        ]
    }

# Protected endpoint example
@app.get("/protected")
async def protected_endpoint(user: User = Depends(current_active_user)):
    return {
        "message": f"Hello {user.email}!",
        "user_id": str(user.id),
        "subscription": user.subscription_plan,
        "models_created": user.models_created
    }

# Simple test register (for debugging)
@app.post("/simple-register")
async def simple_register(user_data: SimpleUserCreate):
    return {
        "message": "Registration data received successfully!",
        "email": user_data.email,
        "full_name": user_data.full_name,
        "password_length": len(user_data.password),
        "status": "This endpoint works - now we debug the real register"
    }

# Database test endpoint
@app.get("/test-db")
async def test_database():
    try:
        from app.core.database import async_engine
        from sqlalchemy import text
        # Test async connection to PostgreSQL with proper SQLAlchemy 2.0 syntax
        async with async_engine.begin() as conn:
            result = await conn.execute(text("SELECT version()"))
            version = result.fetchone()
            return {
                "database": "connected",
                "type": "PostgreSQL", 
                "version": str(version[0]) if version else "unknown",
                "port": "5445",
                "status": "SQLAlchemy 2.0 syntax working"
            }
    except Exception as e:
        return {
            "database": "error", 
            "message": str(e),
            "type": "PostgreSQL connection failed",
            "hint": "Check if asyncpg is installed and PostgreSQL is running"
        }
    
@app.post("/reset-tables")
async def reset_tables():
    """Reset database tables with new schema"""
    try:
        from app.core.database import async_engine
        from app.models.user import Base
        from sqlalchemy import text
        
        async with async_engine.begin() as conn:
            # Drop existing tables
            await conn.execute(text("DROP TABLE IF EXISTS users CASCADE"))
            
            # Create new tables with updated schema
            await conn.run_sync(Base.metadata.create_all)
            
        return {
            "status": "success",
            "message": "Database tables reset successfully",
            "action": "Old tables dropped, new schema created"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }