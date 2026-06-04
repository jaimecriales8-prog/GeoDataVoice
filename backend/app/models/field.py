import uuid
from datetime import datetime
from sqlalchemy import String, Enum, DateTime, ForeignKey, Float, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class OperatorRole(str, enum.Enum):
    ENCUESTADOR = "encuestador"
    SUPERVISOR = "supervisor"
    COORDINATOR = "coordinator"


class FieldOperator(Base):
    __tablename__ = "field_operators"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    document: Mapped[str] = mapped_column(String(20), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    role: Mapped[OperatorRole] = mapped_column(Enum(OperatorRole), default=OperatorRole.ENCUESTADOR)
    territory_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("territories.id"))
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    visits: Mapped[list["FieldVisit"]] = relationship(back_populates="operator")


class FieldVisit(Base):
    __tablename__ = "field_visits"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    operator_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("field_operators.id"), nullable=False)
    participant_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("participants.id"))
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    gps_accuracy: Mapped[float | None] = mapped_column(Float)
    address: Mapped[str | None] = mapped_column(Text)
    evidence_url: Mapped[str | None] = mapped_column(Text)
    result: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)
    visited_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    operator: Mapped["FieldOperator"] = relationship(back_populates="visits")
