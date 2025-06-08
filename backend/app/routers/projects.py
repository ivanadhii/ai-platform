from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.core.database import get_async_session
from app.core.auth import current_active_user
from app.models.user import User
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectRead

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("/", response_model=ProjectRead)
async def create_project(
    project_data: ProjectCreate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Create a new AI project"""
    
    # Check subscription limits
    user_projects_result = await session.execute(
        select(Project).where(Project.user_id == current_user.id)
    )
    user_projects = user_projects_result.scalars().all()
    
    # Get subscription limits
    limits = {
        'free': 1,
        'starter': 5,
        'professional': 25,
        'enterprise': 999
    }
    
    max_projects = limits.get(current_user.subscription_plan, 1)
    
    if len(user_projects) >= max_projects:
        raise HTTPException(
            status_code=403, 
            detail=f"Project limit reached. Your {current_user.subscription_plan} plan allows {max_projects} projects."
        )
    
    # Create project
    project = Project(
        name=project_data.name,
        description=project_data.description,
        ai_type=project_data.ai_type,
        user_id=current_user.id
    )
    
    session.add(project)
    await session.commit()
    await session.refresh(project)
    
    return project

@router.get("/", response_model=List[ProjectRead])
async def get_user_projects(
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Get all projects for current user"""
    
    result = await session.execute(
        select(Project).where(Project.user_id == current_user.id).order_by(Project.created_at.desc())
    )
    projects = result.scalars().all()
    
    return projects

@router.get("/{project_id}", response_model=ProjectRead)
async def get_project(
    project_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Get specific project"""
    
    result = await session.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project

@router.put("/{project_id}", response_model=ProjectRead)
async def update_project(
    project_id: str,
    project_data: ProjectUpdate,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Update project"""
    
    result = await session.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Update fields
    update_data = project_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    await session.commit()
    await session.refresh(project)
    
    return project

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    session: AsyncSession = Depends(get_async_session),
    current_user: User = Depends(current_active_user)
):
    """Delete project"""
    
    result = await session.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    await session.delete(project)
    await session.commit()
    
    return {"message": "Project deleted successfully"}