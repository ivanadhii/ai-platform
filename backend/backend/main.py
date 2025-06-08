from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
import uuid

from app.core.auth import auth_backend, fastapi_users, current_active_user
from app.schemas.user import UserCreate, UserRead, UserUpdate
from app.models.user import User
from app.core.database import async_engine, Base

# Import routers (with error handling)
try:
    from app.routers import upload, projects
    ROUTERS_AVAILABLE = True
except ImportError as e:
    print(f"⚠️ Router import error: {e}")
    ROUTERS_AVAILABLE = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        async with async_engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Database startup error: {e}")
    yield

app = FastAPI(
    title="AI Platform API",
    description="No-code ML training platform API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication routes
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

# Include new routers if available
if ROUTERS_AVAILABLE:
    app.include_router(upload.router)
    app.include_router(projects.router)
    print("✅ Upload and Projects routers loaded")
else:
    print("⚠️ Upload routers not loaded - check file structure")

@app.get("/")
async def root():
    return {
        "message": "AI Platform API",
        "version": "1.0.0",
        "status": "active",
        "routers_loaded": ROUTERS_AVAILABLE
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "routers": ROUTERS_AVAILABLE}

@app.get("/protected")
async def protected_endpoint(user: User = Depends(current_active_user)):
    return {
        "message": f"Hello {user.email}!",
        "user_id": str(user.id),
        "subscription": user.subscription_plan
    }
