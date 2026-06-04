import uuid
from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.models.project import Project, ProjectType, ProjectPurpose

router = APIRouter()


class ProjectCreate(BaseModel):
    client_id: uuid.UUID
    name: str
    type: ProjectType
    purpose: ProjectPurpose
    start_date: date | None = None
    end_date: date | None = None


class ProjectOut(BaseModel):
    id: uuid.UUID
    client_id: uuid.UUID
    name: str
    type: ProjectType
    purpose: ProjectPurpose
    start_date: date | None
    end_date: date | None
    status: str
    class Config: from_attributes = True


@router.get("/", response_model=list[ProjectOut])
async def list_projects(client_id: uuid.UUID | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Project).where(Project.status == "active")
    if client_id:
        query = query.where(Project.client_id == client_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(data: ProjectCreate, db: AsyncSession = Depends(get_db)):
    project = Project(**data.model_dump())
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Project).where(Project.id == project_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@router.patch("/{project_id}/status")
async def update_status(project_id: uuid.UUID, status: str, db: AsyncSession = Depends(get_db)):
    p = await db.get(Project, project_id)
    if not p:
        raise HTTPException(404, "Project not found")
    p.status = status
    await db.commit()
    return {"ok": True}
