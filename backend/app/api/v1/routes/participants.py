import uuid
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.participant import Participant, ParticipantStatus, Gender
from pydantic import BaseModel

router = APIRouter()


def _hash(value: str) -> str:
    return hashlib.sha256(value.strip().upper().encode()).hexdigest()


class ParticipantRegister(BaseModel):
    document_number: str
    phone: str
    name: str
    gender: Gender | None = None
    birth_year: int | None = None
    territory_id: uuid.UUID | None = None


class ParticipantOut(BaseModel):
    id: uuid.UUID
    gender: Gender | None
    birth_year: int | None
    territory_id: uuid.UUID | None
    status: ParticipantStatus
    kyc_status: str
    phone_verified: bool
    residence_verified: bool

    class Config:
        from_attributes = True


@router.post("/pre-register", response_model=ParticipantOut, status_code=201)
async def pre_register(data: ParticipantRegister, db: AsyncSession = Depends(get_db)):
    doc_hash = _hash(data.document_number)
    existing = await db.execute(select(Participant).where(Participant.document_hash == doc_hash))
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Participant already registered")

    participant = Participant(
        document_hash=doc_hash,
        phone_hash=_hash(data.phone),
        name_encrypted=data.name,  # TODO: encrypt with KMS before persisting
        gender=data.gender,
        birth_year=data.birth_year,
        territory_id=data.territory_id,
    )
    db.add(participant)
    await db.commit()
    await db.refresh(participant)
    return participant


@router.get("/{participant_id}", response_model=ParticipantOut)
async def get_participant(participant_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Participant).where(Participant.id == participant_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Participant not found")
    return p


@router.patch("/{participant_id}/kyc")
async def update_kyc_status(participant_id: uuid.UUID, status: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Participant).where(Participant.id == participant_id))
    p = result.scalar_one_or_none()
    if not p:
        raise HTTPException(404, "Participant not found")
    p.kyc_status = status
    if status == "approved":
        p.status = ParticipantStatus.VERIFIED
    await db.commit()
    return {"ok": True}
