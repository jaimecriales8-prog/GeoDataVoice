import uuid
from datetime import datetime
from sqlalchemy import String, Enum, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class MembershipStatus(str, enum.Enum):
    ACTIVE = "active"
    RESERVE = "reserve"
    REST = "rest"
    REVIEW = "review"
    INACTIVE = "inactive"


class CohortType(str, enum.Enum):
    ACTIVE = "active"
    RESERVE = "reserve"
    REST = "rest"


class Cohort(Base):
    __tablename__ = "cohorts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[CohortType] = mapped_column(Enum(CohortType), nullable=False)
    rotation_rule: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    memberships: Mapped[list["PanelMembership"]] = relationship(back_populates="cohort")


class PanelMembership(Base):
    __tablename__ = "panel_memberships"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    cohort_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("cohorts.id"))
    status: Mapped[MembershipStatus] = mapped_column(Enum(MembershipStatus), default=MembershipStatus.ACTIVE)
    statistical_weight: Mapped[float | None]
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    participant: Mapped["Participant"] = relationship(back_populates="memberships")
    project: Mapped["Project"] = relationship(back_populates="memberships")
    cohort: Mapped["Cohort | None"] = relationship(back_populates="memberships")
