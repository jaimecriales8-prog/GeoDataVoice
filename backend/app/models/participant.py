import uuid
from datetime import datetime, date
from sqlalchemy import String, Enum, DateTime, Date, ForeignKey, func, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class ParticipantStatus(str, enum.Enum):
    PREREGISTERED = "preregistered"
    VERIFIED = "verified"
    REJECTED = "rejected"
    PENDING = "pending"
    ACTIVE = "active"
    RESERVE = "reserve"
    REST = "rest"
    REVIEW = "review"
    INACTIVE = "inactive"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    # Datos sensibles hasheados — nunca almacenar en claro
    document_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    phone_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    name_encrypted: Mapped[str] = mapped_column(Text, nullable=False)
    gender: Mapped[Gender | None] = mapped_column(Enum(Gender))
    birth_year: Mapped[int | None]
    territory_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("territories.id"))
    status: Mapped[ParticipantStatus] = mapped_column(Enum(ParticipantStatus), default=ParticipantStatus.PREREGISTERED)
    kyc_status: Mapped[str] = mapped_column(String(20), default="pending")
    phone_verified: Mapped[bool] = mapped_column(default=False)
    residence_verified: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    territory: Mapped["Territory | None"] = relationship(back_populates="participants")
    profile: Mapped["ParticipantProfile | None"] = relationship(back_populates="participant", uselist=False)
    consents: Mapped[list["Consent"]] = relationship(back_populates="participant")
    memberships: Mapped[list["PanelMembership"]] = relationship(back_populates="participant")
    responses: Mapped[list["Response"]] = relationship(back_populates="participant")
    payments: Mapped[list["Payment"]] = relationship(back_populates="participant")


class ParticipantProfile(Base):
    __tablename__ = "participant_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), unique=True)
    socioeconomic_stratum: Mapped[int | None]
    education_level: Mapped[str | None] = mapped_column(String(50))
    occupation: Mapped[str | None] = mapped_column(String(100))
    housing_type: Mapped[str | None] = mapped_column(String(50))
    income_range: Mapped[str | None] = mapped_column(String(50))
    tags: Mapped[str | None] = mapped_column(Text)

    participant: Mapped["Participant"] = relationship(back_populates="profile")
