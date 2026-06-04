import uuid
from datetime import datetime
from sqlalchemy import String, Enum, DateTime, ForeignKey, Boolean, Text, JSON, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base
import enum


class QuestionType(str, enum.Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"
    SCALE = "scale"
    OPEN_TEXT = "open_text"
    AUDIO = "audio"
    NPS = "nps"


class Survey(Base):
    __tablename__ = "surveys"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    wave: Mapped[int] = mapped_column(default=1)
    status: Mapped[str] = mapped_column(String(20), default="draft")
    sent_at: Mapped[datetime | None] = mapped_column(DateTime)
    closes_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    project: Mapped["Project"] = relationship(back_populates="surveys")
    questions: Mapped[list["Question"]] = relationship(back_populates="survey", order_by="Question.order")
    responses: Mapped[list["Response"]] = relationship(back_populates="survey")


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    survey_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("surveys.id"), nullable=False)
    type: Mapped[QuestionType] = mapped_column(Enum(QuestionType), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    options: Mapped[dict | None] = mapped_column(JSON)
    required: Mapped[bool] = mapped_column(Boolean, default=True)
    order: Mapped[int] = mapped_column(default=0)

    survey: Mapped["Survey"] = relationship(back_populates="questions")
    responses: Mapped[list["Response"]] = relationship(back_populates="question")


class Response(Base):
    __tablename__ = "responses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    participant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("participants.id"), nullable=False)
    survey_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("surveys.id"), nullable=False)
    question_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("questions.id"), nullable=False)
    value: Mapped[str | None] = mapped_column(Text)
    quality: Mapped[str] = mapped_column(String(20), default="valid")
    responded_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    participant: Mapped["Participant"] = relationship(back_populates="responses")
    survey: Mapped["Survey"] = relationship(back_populates="responses")
    question: Mapped["Question"] = relationship(back_populates="responses")
    audio: Mapped["AudioResponse | None"] = relationship(back_populates="response", uselist=False)
