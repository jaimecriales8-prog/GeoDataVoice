import uuid
from datetime import datetime
from sqlalchemy import String, Enum, DateTime, ForeignKey, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class PeerStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"


class TaskStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    REJECTED = "rejected"


class Peer(Base):
    __tablename__ = "peers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), nullable=False)
    territory_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("territories.id"))
    origin: Mapped[str] = mapped_column(String(50), default="panel")
    affinities: Mapped[list | None] = mapped_column(JSON)
    communities: Mapped[str | None] = mapped_column(Text)
    estimated_reach: Mapped[int | None]
    status: Mapped[PeerStatus] = mapped_column(Enum(PeerStatus), default=PeerStatus.PENDING)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    tasks: Mapped[list["PeerTask"]] = relationship(back_populates="peer")


class PeerTask(Base):
    __tablename__ = "peer_tasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    message_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("messages.id"))
    peer_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("peers.id"), nullable=False)
    channel: Mapped[str] = mapped_column(String(50), default="whatsapp")
    payment_offered_cop: Mapped[float | None]
    status: Mapped[TaskStatus] = mapped_column(Enum(TaskStatus), default=TaskStatus.ASSIGNED)
    assigned_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)

    peer: Mapped["Peer"] = relationship(back_populates="tasks")
    evidences: Mapped[list["PeerEvidence"]] = relationship(back_populates="task")


class PeerEvidence(Base):
    __tablename__ = "peer_evidences"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("peer_tasks.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    url: Mapped[str | None] = mapped_column(Text)
    text: Mapped[str | None] = mapped_column(Text)
    metrics: Mapped[dict | None] = mapped_column(JSON)
    ai_review: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    submitted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    task: Mapped["PeerTask"] = relationship(back_populates="evidences")
