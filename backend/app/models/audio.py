import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Float, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class AudioResponse(Base):
    __tablename__ = "audio_responses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    response_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("responses.id"), unique=True)
    audio_url: Mapped[str] = mapped_column(Text, nullable=False)
    duration_seconds: Mapped[float | None] = mapped_column(Float)
    language: Mapped[str] = mapped_column(String(10), default="es")
    transcription: Mapped[str | None] = mapped_column(Text)
    quality: Mapped[str] = mapped_column(String(20), default="pending")
    processed_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    response: Mapped["Response"] = relationship(back_populates="audio")
    nlp: Mapped["NLPOutput | None"] = relationship(back_populates="audio", uselist=False)


class NLPOutput(Base):
    __tablename__ = "nlp_outputs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    audio_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("audio_responses.id"), unique=True)
    sentiment: Mapped[str | None] = mapped_column(String(20))
    emotion: Mapped[str | None] = mapped_column(String(50))
    intensity: Mapped[str | None] = mapped_column(String(20))
    main_topic: Mapped[str | None] = mapped_column(String(100))
    topics: Mapped[list | None] = mapped_column(JSON)
    narrative: Mapped[str | None] = mapped_column(Text)
    summary: Mapped[str | None] = mapped_column(Text)
    citizen_quote: Mapped[str | None] = mapped_column(Text)
    actor_mentioned: Mapped[str | None] = mapped_column(String(200))
    opinion_driver: Mapped[str | None] = mapped_column(Text)
    confidence: Mapped[float | None] = mapped_column(Float)
    model_version: Mapped[str | None] = mapped_column(String(50))
    human_reviewed: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    audio: Mapped["AudioResponse"] = relationship(back_populates="nlp")
