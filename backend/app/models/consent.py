import uuid
from datetime import datetime
from sqlalchemy import String, Enum, DateTime, ForeignKey, Boolean, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class ConsentType(str, enum.Enum):
    PANEL = "panel"
    AUDIO = "audio"
    WHATSAPP = "whatsapp"
    PAYMENTS = "payments"
    AGORA = "agora"
    POLITICAL = "political"


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), nullable=False)
    type: Mapped[ConsentType] = mapped_column(Enum(ConsentType), nullable=False)
    version: Mapped[str] = mapped_column(String(20), nullable=False)
    accepted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    channel: Mapped[str] = mapped_column(String(50), default="field_app")
    ip_or_device: Mapped[str | None] = mapped_column(String(200))
    proof_url: Mapped[str | None] = mapped_column(Text)
    accepted_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)

    participant: Mapped["Participant"] = relationship(back_populates="consents")
