import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from dotenv import load_dotenv

load_dotenv()

# Database URL - convert to async
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:180802@127.0.0.1:5445/aiplatform")
ASYNC_DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

# Async engine
async_engine = create_async_engine(ASYNC_DATABASE_URL)
async_session_maker = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

Base = declarative_base()

# Async database dependency
async def get_async_session() -> AsyncSession:
    async with async_session_maker() as session:
        yield session