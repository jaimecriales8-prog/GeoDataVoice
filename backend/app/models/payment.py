import uuid
from datetime import datetime
from sqlalchemy import String, Enum, DateTime, ForeignKey, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class PaymentType(str, enum.Enum):
    SURVEY_RESPONSE = "survey_response"
    AUDIO_RESPONSE = "audio_response"
    PEER_TASK = "peer_task"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    SENT = "sent"
    FAILED = "failed"
    RECONCILED = "reconciled"


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), nullable=False)
    type: Mapped[PaymentType] = mapped_column(Enum(PaymentType), nullable=False)
    amount_cop: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    medium: Mapped[str] = mapped_column(String(50), default="nequi")
    status: Mapped[PaymentStatus] = mapped_column(Enum(PaymentStatus), default=PaymentStatus.PENDING)
    reference_id: Mapped[str | None] = mapped_column(Text)
    notes: Mapped[str | None] = mapped_column(Text)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    participant: Mapped["Participant"] = relationship(back_populates="payments")
