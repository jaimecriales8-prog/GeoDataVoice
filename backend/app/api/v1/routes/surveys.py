import uuid
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.core.database import get_db
from app.models.survey import Survey, Question, Response, QuestionType
from app.models.panel import PanelMembership

router = APIRouter()


# ── Schemas ──────────────────────────────────────────────────────────

class QuestionCreate(BaseModel):
    type: QuestionType
    text: str
    options: dict | None = None
    required: bool = True
    order: int = 0


class SurveyCreate(BaseModel):
    project_id: uuid.UUID
    name: str
    wave: int = 1
    closes_at: datetime | None = None
    questions: list[QuestionCreate] = []


class QuestionOut(BaseModel):
    id: uuid.UUID
    type: QuestionType
    text: str
    options: dict | None
    required: bool
    order: int
    class Config: from_attributes = True


class SurveyOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    wave: int
    status: str
    sent_at: datetime | None
    closes_at: datetime | None
    created_at: datetime
    questions: list[QuestionOut] = []
    class Config: from_attributes = True


class ResponseCreate(BaseModel):
    participant_id: uuid.UUID
    survey_id: uuid.UUID
    answers: list[dict]  # [{question_id, value}]


class ResponseOut(BaseModel):
    id: uuid.UUID
    participant_id: uuid.UUID
    survey_id: uuid.UUID
    question_id: uuid.UUID
    value: str | None
    quality: str
    responded_at: datetime
    class Config: from_attributes = True


# ── Surveys ───────────────────────────────────────────────────────────

@router.get("/", response_model=list[SurveyOut])
async def list_surveys(project_id: uuid.UUID | None = None, db: AsyncSession = Depends(get_db)):
    query = select(Survey)
    if project_id:
        query = query.where(Survey.project_id == project_id)
    result = await db.execute(query.order_by(Survey.created_at.desc()))
    return result.scalars().all()


@router.post("/", response_model=SurveyOut, status_code=201)
async def create_survey(data: SurveyCreate, db: AsyncSession = Depends(get_db)):
    survey = Survey(
        project_id=data.project_id,
        name=data.name,
        wave=data.wave,
        closes_at=data.closes_at,
    )
    db.add(survey)
    await db.flush()

    for q_data in data.questions:
        question = Question(survey_id=survey.id, **q_data.model_dump())
        db.add(question)

    await db.commit()
    await db.refresh(survey)
    return survey


@router.get("/{survey_id}", response_model=SurveyOut)
async def get_survey(survey_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Survey).where(Survey.id == survey_id))
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(404, "Survey not found")
    return survey


@router.post("/{survey_id}/questions", response_model=QuestionOut, status_code=201)
async def add_question(survey_id: uuid.UUID, data: QuestionCreate, db: AsyncSession = Depends(get_db)):
    survey = await db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(404, "Survey not found")
    question = Question(survey_id=survey_id, **data.model_dump())
    db.add(question)
    await db.commit()
    await db.refresh(question)
    return question


@router.post("/{survey_id}/send")
async def send_survey(survey_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Mark survey as sent and generate a unique response token per active panelist.
    In production this would trigger WhatsApp messages via the messaging service.
    Returns the list of generated links for manual distribution in MVP.
    """
    survey = await db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(404, "Survey not found")
    if survey.status not in ("draft", "ready"):
        raise HTTPException(409, f"Cannot send survey in status '{survey.status}'")

    # Get active panelists for this project
    memberships = await db.execute(
        select(PanelMembership).where(
            PanelMembership.project_id == survey.project_id,
            PanelMembership.status == "active",
        )
    )
    active_members = memberships.scalars().all()

    # Generate unique tokens (in prod: send via WhatsApp API)
    links = []
    for member in active_members:
        token = secrets.token_urlsafe(16)
        links.append({
            "participant_id": str(member.participant_id),
            "token": token,
            "link": f"/survey/{survey_id}?token={token}",
        })

    survey.status = "sent"
    survey.sent_at = datetime.now(timezone.utc)
    await db.commit()

    return {
        "survey_id": survey_id,
        "status": "sent",
        "panelists_notified": len(links),
        "links": links,
    }


# ── Responses ─────────────────────────────────────────────────────────

@router.post("/responses", response_model=list[ResponseOut], status_code=201)
async def submit_responses(data: ResponseCreate, db: AsyncSession = Depends(get_db)):
    survey = await db.get(Survey, data.survey_id)
    if not survey:
        raise HTTPException(404, "Survey not found")

    saved = []
    for answer in data.answers:
        question_id = uuid.UUID(answer["question_id"])
        question = await db.get(Question, question_id)
        if not question or question.survey_id != data.survey_id:
            raise HTTPException(400, f"Question {question_id} not found in survey")

        response = Response(
            participant_id=data.participant_id,
            survey_id=data.survey_id,
            question_id=question_id,
            value=str(answer.get("value", "")),
        )
        db.add(response)
        saved.append(response)

    await db.commit()
    for r in saved:
        await db.refresh(r)
    return saved


@router.get("/{survey_id}/responses")
async def get_survey_responses(survey_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Response).where(Response.survey_id == survey_id)
    )
    responses = result.scalars().all()
    return {"survey_id": survey_id, "count": len(responses), "responses": responses}
