import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from app.core.database import get_db
from app.models.survey import Response, Survey, Question
from app.models.audio import AudioResponse, NLPOutput
from app.models.panel import PanelMembership
from app.models.participant import Participant

router = APIRouter()


@router.get("/projects/{project_id}")
async def project_analytics(project_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Aggregated analytics for a project.
    Returns panel stats, sentiment distribution, top topics, and response rates.
    """
    # Panel size
    panel_result = await db.execute(
        select(func.count(), PanelMembership.status)
        .where(PanelMembership.project_id == project_id)
        .group_by(PanelMembership.status)
    )
    panel_by_status = {row[1]: row[0] for row in panel_result.all()}

    # Survey response rate (latest wave)
    surveys_result = await db.execute(
        select(Survey).where(Survey.project_id == project_id).order_by(Survey.wave.desc())
    )
    surveys = surveys_result.scalars().all()

    # Sentiment distribution from NLP outputs
    sentiment_result = await db.execute(
        select(NLPOutput.sentiment, func.count())
        .join(AudioResponse, NLPOutput.audio_id == AudioResponse.id)
        .join(Response, AudioResponse.response_id == Response.id)
        .join(Survey, Response.survey_id == Survey.id)
        .where(Survey.project_id == project_id)
        .where(NLPOutput.sentiment.isnot(None))
        .group_by(NLPOutput.sentiment)
    )
    sentiment_dist = {row[0]: row[1] for row in sentiment_result.all()}
    total_sentiment = sum(sentiment_dist.values()) or 1

    # Top topics
    topics_result = await db.execute(
        select(NLPOutput.main_topic, func.count())
        .join(AudioResponse, NLPOutput.audio_id == AudioResponse.id)
        .join(Response, AudioResponse.response_id == Response.id)
        .join(Survey, Response.survey_id == Survey.id)
        .where(Survey.project_id == project_id)
        .where(NLPOutput.main_topic.isnot(None))
        .group_by(NLPOutput.main_topic)
        .order_by(func.count().desc())
        .limit(8)
    )
    top_topics = [{"topic": row[0], "count": row[1]} for row in topics_result.all()]

    # Emotion distribution
    emotion_result = await db.execute(
        select(NLPOutput.emotion, func.count())
        .join(AudioResponse, NLPOutput.audio_id == AudioResponse.id)
        .join(Response, AudioResponse.response_id == Response.id)
        .join(Survey, Response.survey_id == Survey.id)
        .where(Survey.project_id == project_id)
        .where(NLPOutput.emotion.isnot(None))
        .group_by(NLPOutput.emotion)
        .order_by(func.count().desc())
    )
    emotion_dist = {row[0]: row[1] for row in emotion_result.all()}

    # Total audios processed
    audio_count_result = await db.execute(
        select(func.count(AudioResponse.id))
        .join(Response, AudioResponse.response_id == Response.id)
        .join(Survey, Response.survey_id == Survey.id)
        .where(Survey.project_id == project_id)
    )
    total_audios = audio_count_result.scalar_one()

    processed_result = await db.execute(
        select(func.count(AudioResponse.id))
        .join(Response, AudioResponse.response_id == Response.id)
        .join(Survey, Response.survey_id == Survey.id)
        .where(Survey.project_id == project_id)
        .where(AudioResponse.quality == "processed")
    )
    processed_audios = processed_result.scalar_one()

    # Favorability score (positive / (positive + negative) — only from sentiment data)
    pos = sentiment_dist.get("positive", 0)
    neg = sentiment_dist.get("negative", 0)
    favorability = round(pos / (pos + neg) * 100, 1) if (pos + neg) > 0 else None

    return {
        "project_id": project_id,
        "panel": {
            "active": panel_by_status.get("active", 0),
            "reserve": panel_by_status.get("reserve", 0),
            "total": sum(panel_by_status.values()),
        },
        "waves": len(surveys),
        "latest_wave": surveys[0].wave if surveys else None,
        "favorability_pct": favorability,
        "sentiment": {
            k: {"count": v, "pct": round(v / total_sentiment * 100, 1)}
            for k, v in sentiment_dist.items()
        },
        "emotions": emotion_dist,
        "top_topics": top_topics,
        "audio": {
            "total": total_audios,
            "processed": processed_audios,
            "processing_rate_pct": round(processed_audios / total_audios * 100, 1) if total_audios else 0,
        },
    }
