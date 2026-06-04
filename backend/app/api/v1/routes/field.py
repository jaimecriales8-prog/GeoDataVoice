import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.core.database import get_db
from app.models.field import FieldOperator, FieldVisit, OperatorRole

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────

class OperatorCreate(BaseModel):
    name: str
    document: str
    phone: str | None = None
    role: OperatorRole = OperatorRole.ENCUESTADOR
    territory_id: uuid.UUID | None = None


class OperatorOut(BaseModel):
    id: uuid.UUID
    name: str
    document: str
    phone: str | None
    role: OperatorRole
    territory_id: uuid.UUID | None
    status: str
    class Config: from_attributes = True


class VisitCreate(BaseModel):
    operator_id: uuid.UUID
    participant_id: uuid.UUID | None = None
    latitude: float
    longitude: float
    gps_accuracy: float | None = None
    address: str | None = None
    evidence_url: str | None = None
    result: str | None = None
    notes: str | None = None
    visited_at: datetime


class VisitOut(BaseModel):
    id: uuid.UUID
    operator_id: uuid.UUID
    participant_id: uuid.UUID | None
    latitude: float | None
    longitude: float | None
    gps_accuracy: float | None
    address: str | None
    evidence_url: str | None
    result: str | None
    notes: str | None
    visited_at: datetime
    created_at: datetime
    class Config: from_attributes = True


# ── Operators ────────────────────────────────────────────────────────

@router.get("/operators", response_model=list[OperatorOut])
async def list_operators(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(FieldOperator).where(FieldOperator.status == "active")
    )
    return result.scalars().all()


@router.post("/operators", response_model=OperatorOut, status_code=201)
async def create_operator(data: OperatorCreate, db: AsyncSession = Depends(get_db)):
    operator = FieldOperator(**data.model_dump())
    db.add(operator)
    await db.commit()
    await db.refresh(operator)
    return operator


@router.get("/operators/{operator_id}", response_model=OperatorOut)
async def get_operator(operator_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FieldOperator).where(FieldOperator.id == operator_id))
    op = result.scalar_one_or_none()
    if not op:
        raise HTTPException(404, "Operator not found")
    return op


@router.get("/operators/{operator_id}/stats")
async def operator_stats(operator_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    total = await db.execute(
        select(func.count()).where(FieldVisit.operator_id == operator_id)
    )
    valid = await db.execute(
        select(func.count()).where(
            FieldVisit.operator_id == operator_id,
            FieldVisit.result == "registered"
        )
    )
    return {
        "total_visits": total.scalar_one(),
        "registered": valid.scalar_one(),
    }


# ── Visits ───────────────────────────────────────────────────────────

@router.post("/visits", response_model=VisitOut, status_code=201)
async def create_visit(data: VisitCreate, db: AsyncSession = Depends(get_db)):
    # Verify operator exists
    op = await db.get(FieldOperator, data.operator_id)
    if not op:
        raise HTTPException(404, "Operator not found")

    visit = FieldVisit(**data.model_dump())
    db.add(visit)
    await db.commit()
    await db.refresh(visit)
    return visit


@router.get("/visits", response_model=list[VisitOut])
async def list_visits(
    operator_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(FieldVisit)
    if operator_id:
        query = query.where(FieldVisit.operator_id == operator_id)
    result = await db.execute(query.order_by(FieldVisit.visited_at.desc()).limit(200))
    return result.scalars().all()


@router.get("/visits/{visit_id}", response_model=VisitOut)
async def get_visit(visit_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(FieldVisit).where(FieldVisit.id == visit_id))
    visit = result.scalar_one_or_none()
    if not visit:
        raise HTTPException(404, "Visit not found")
    return visit
