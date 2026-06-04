import uuid
from datetime import datetime
from sqlalchemy import String, Enum, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry
from app.core.database import Base
import enum


class TerritoryType(str, enum.Enum):
    DEPARTMENT = "department"
    MUNICIPALITY = "municipality"
    ZONE = "zone"
    POLYGON = "polygon"


class Territory(Base):
    __tablename__ = "territories"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    type: Mapped[TerritoryType] = mapped_column(Enum(TerritoryType), nullable=False)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("territories.id"))
    codigo_dane: Mapped[str | None] = mapped_column(String(10))
    geom = mapped_column(Geometry("MULTIPOLYGON", srid=4326), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    parent: Mapped["Territory | None"] = relationship("Territory", remote_side="Territory.id")
    children: Mapped[list["Territory"]] = relationship("Territory", back_populates="parent", foreign_keys=[parent_id])
    participants: Mapped[list["Participant"]] = relationship(back_populates="territory")
