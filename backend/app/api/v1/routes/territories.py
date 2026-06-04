import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.models.territory import Territory, TerritoryType

router = APIRouter()


class TerritoryCreate(BaseModel):
    name: str
    type: TerritoryType
    parent_id: uuid.UUID | None = None
    codigo_dane: str | None = None


class TerritoryOut(BaseModel):
    id: uuid.UUID
    name: str
    type: TerritoryType
    parent_id: uuid.UUID | None
    codigo_dane: str | None
    status: str
    class Config: from_attributes = True


@router.get("/", response_model=list[TerritoryOut])
async def list_territories(
    type: TerritoryType | None = None,
    parent_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Territory).where(Territory.status == "active")
    if type:
        query = query.where(Territory.type == type)
    if parent_id:
        query = query.where(Territory.parent_id == parent_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=TerritoryOut, status_code=201)
async def create_territory(data: TerritoryCreate, db: AsyncSession = Depends(get_db)):
    territory = Territory(**data.model_dump())
    db.add(territory)
    await db.commit()
    await db.refresh(territory)
    return territory


@router.get("/{territory_id}", response_model=TerritoryOut)
async def get_territory(territory_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Territory).where(Territory.id == territory_id))
    t = result.scalar_one_or_none()
    if not t:
        raise HTTPException(404, "Territory not found")
    return t
