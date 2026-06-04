import uuid
from datetime import datetime, date
from sqlalchemy import String, Enum, DateTime, Date, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class ProjectType(str, enum.Enum):
    FAVORABILITY = "favorability"
    SATISFACTION = "satisfaction"
    PULSE = "pulse"
    AGORA = "agora"
    CUSTOM = "custom"


class ProjectPurpose(str, enum.Enum):
    POLITICAL = "political"
    PUBLIC_MANAGEMENT = "public_management"
    PRIVATE = "private"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    client_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("clients.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[ProjectType] = mapped_column(Enum(ProjectType), nullable=False)
    purpose: Mapped[ProjectPurpose] = mapped_column(Enum(ProjectPurpose), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date)
    end_date: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    client: Mapped["Client"] = relationship(back_populates="projects")
    surveys: Mapped[list["Survey"]] = relationship(back_populates="project")
    memberships: Mapped[list["PanelMembership"]] = relationship(back_populates="project")
