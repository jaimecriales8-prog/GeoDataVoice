import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.models.consent import Consent, ConsentType
from app.models.participant import Participant

router = APIRouter()

CURRENT_CONSENT_VERSION = "1.0"

CONSENT_TEXT = {
    ConsentType.PANEL: "Autorizo a GeoDataVoice a incluirme en su panel territorial validado y contactarme para mediciones de opinión.",
    ConsentType.AUDIO: "Autorizo la grabación, transcripción y análisis de mis notas de voz con fines de investigación territorial. Las grabaciones se usarán de forma anónima.",
    ConsentType.WHATSAPP: "Autorizo el envío de mensajes por WhatsApp para participar en encuestas y recibir información del panel.",
    ConsentType.PAYMENTS: "Autorizo el registro de mi cuenta de pago (Nequi/Daviplata) para recibir incentivos por participación.",
    ConsentType.AGORA: "Autorizo mi participación en la red AGORA como difusor de contenidos aprobados en mi comunidad.",
    ConsentType.POLITICAL: "Entiendo y autorizo que los datos recolectados sean usados con fines de análisis político-electoral por el cliente contratante.",
}


class ConsentCreate(BaseModel):
    participant_id: uuid.UUID
    type: ConsentType
    accepted: bool
    channel: str = "field_app"
    ip_or_device: str | None = None
    proof_url: str | None = None


class ConsentBulkCreate(BaseModel):
    participant_id: uuid.UUID
    types: list[ConsentType]
    accepted: bool
    channel: str = "field_app"
    ip_or_device: str | None = None


class ConsentOut(BaseModel):
    id: uuid.UUID
    participant_id: uuid.UUID
    type: ConsentType
    version: str
    accepted: bool
    channel: str
    accepted_at: datetime
    revoked_at: datetime | None
    class Config: from_attributes = True


@router.post("/", response_model=ConsentOut, status_code=201)
async def record_consent(data: ConsentCreate, db: AsyncSession = Depends(get_db)):
    participant = await db.get(Participant, data.participant_id)
    if not participant:
        raise HTTPException(404, "Participant not found")

    consent = Consent(
        participant_id=data.participant_id,
        type=data.type,
        version=CURRENT_CONSENT_VERSION,
        accepted=data.accepted,
        channel=data.channel,
        ip_or_device=data.ip_or_device,
        proof_url=data.proof_url,
        accepted_at=datetime.now(timezone.utc),
    )
    db.add(consent)
    await db.commit()
    await db.refresh(consent)
    return consent


@router.post("/bulk", response_model=list[ConsentOut], status_code=201)
async def record_bulk_consents(data: ConsentBulkCreate, db: AsyncSession = Depends(get_db)):
    """Record multiple consent types at once (common during onboarding flow)."""
    participant = await db.get(Participant, data.participant_id)
    if not participant:
        raise HTTPException(404, "Participant not found")

    now = datetime.now(timezone.utc)
    consents = []
    for consent_type in data.types:
        consent = Consent(
            participant_id=data.participant_id,
            type=consent_type,
            version=CURRENT_CONSENT_VERSION,
            accepted=data.accepted,
            channel=data.channel,
            ip_or_device=data.ip_or_device,
            accepted_at=now,
        )
        db.add(consent)
        consents.append(consent)

    await db.commit()
    for c in consents:
        await db.refresh(c)
    return consents


@router.get("/participant/{participant_id}", response_model=list[ConsentOut])
async def get_participant_consents(participant_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Consent)
        .where(Consent.participant_id == participant_id)
        .order_by(Consent.accepted_at.desc())
    )
    return result.scalars().all()


@router.post("/{consent_id}/revoke")
async def revoke_consent(consent_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    consent = await db.get(Consent, consent_id)
    if not consent:
        raise HTTPException(404, "Consent not found")
    if consent.revoked_at:
        raise HTTPException(409, "Consent already revoked")
    consent.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    return {"ok": True, "revoked_at": consent.revoked_at}


@router.get("/texts")
async def get_consent_texts():
    """Return current consent texts and version for display in field app."""
    return {
        "version": CURRENT_CONSENT_VERSION,
        "texts": {k.value: v for k, v in CONSENT_TEXT.items()},
    }
