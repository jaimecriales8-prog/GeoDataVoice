import uuid
import os
import tempfile
import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.audio import AudioResponse, NLPOutput
from app.models.survey import Response
from app.services.audio_processor import transcribe, analyze_sentiment
from app.services.storage import upload_audio

router = APIRouter()

ALLOWED_AUDIO_TYPES = {"audio/ogg", "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/aac"}
MAX_AUDIO_BYTES = 25 * 1024 * 1024  # 25 MB
MIN_DURATION_SECONDS = 3


async def _process_audio_background(audio_id: uuid.UUID, audio_path: str):
    """Transcribe and analyze audio; update DB. Runs in background."""
    from app.core.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        audio = await db.get(AudioResponse, audio_id)
        if not audio:
            return
        try:
            # Transcribe
            text = await asyncio.to_thread(
                lambda: __import__("openai").OpenAI(
                    api_key=__import__("app.core.config", fromlist=["settings"]).settings.OPENAI_API_KEY
                ).audio.transcriptions.create(
                    model="whisper-1",
                    file=open(audio_path, "rb"),
                    language="es",
                ).text
            )
            audio.transcription = text
            audio.quality = "transcribed"

            # NLP analysis
            nlp_data = await analyze_sentiment(text)
            nlp = NLPOutput(
                audio_id=audio_id,
                sentiment=nlp_data.get("sentiment"),
                emotion=nlp_data.get("emotion"),
                intensity=nlp_data.get("intensity"),
                main_topic=nlp_data.get("main_topic"),
                topics=nlp_data.get("topics"),
                narrative=nlp_data.get("narrative"),
                summary=nlp_data.get("summary"),
                citizen_quote=nlp_data.get("citizen_quote"),
                actor_mentioned=nlp_data.get("actor_mentioned"),
                opinion_driver=nlp_data.get("opinion_driver"),
                confidence=nlp_data.get("confidence", 0.8),
                model_version="gpt-4o-mini",
            )
            db.add(nlp)
            audio.quality = "processed"
            audio.processed_at = datetime.now(timezone.utc)
            await db.commit()
        except Exception as e:
            audio.quality = "error"
            await db.commit()
        finally:
            if os.path.exists(audio_path):
                os.unlink(audio_path)


@router.post("/upload", status_code=202)
async def upload_audio_file(
    background_tasks: BackgroundTasks,
    response_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    # Validate content type
    if file.content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(400, f"Audio type '{file.content_type}' not supported. Use ogg, mp3, wav, or webm.")

    # Read and validate size
    content = await file.read()
    if len(content) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio file exceeds 25 MB limit.")
    if len(content) < 1000:
        raise HTTPException(400, "Audio file too small — minimum 3 seconds required.")

    # Verify response exists
    response_obj = await db.get(Response, response_id)
    if not response_obj:
        raise HTTPException(404, "Response not found")

    # Check for duplicate
    existing = await db.execute(
        select(AudioResponse).where(AudioResponse.response_id == response_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Audio already uploaded for this response")

    # Save to temp file for background processing
    ext = file.filename.split(".")[-1] if file.filename else "ogg"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
    tmp.write(content)
    tmp.close()

    # Upload to storage and get URL
    audio_url = await upload_audio(content, f"audio/{response_id}.{ext}")

    # Persist AudioResponse
    audio = AudioResponse(
        response_id=response_id,
        audio_url=audio_url,
        language="es",
        quality="pending",
    )
    db.add(audio)
    await db.commit()
    await db.refresh(audio)

    # Dispatch background processing
    background_tasks.add_task(_process_audio_background, audio.id, tmp.name)

    return {
        "audio_id": audio.id,
        "status": "processing",
        "message": "Audio recibido. Transcripción en proceso.",
    }


@router.get("/{audio_id}/status")
async def audio_status(audio_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    audio = await db.get(AudioResponse, audio_id)
    if not audio:
        raise HTTPException(404, "Audio not found")

    result = {
        "audio_id": audio_id,
        "quality": audio.quality,
        "processed_at": audio.processed_at,
        "has_transcription": bool(audio.transcription),
    }

    if audio.quality == "processed":
        nlp_result = await db.execute(
            select(NLPOutput).where(NLPOutput.audio_id == audio_id)
        )
        nlp = nlp_result.scalar_one_or_none()
        if nlp:
            result["nlp"] = {
                "sentiment": nlp.sentiment,
                "emotion": nlp.emotion,
                "main_topic": nlp.main_topic,
                "summary": nlp.summary,
            }

    return result


@router.get("/{audio_id}/full")
async def audio_full(audio_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """Full result including transcription and all NLP fields."""
    audio = await db.get(AudioResponse, audio_id)
    if not audio:
        raise HTTPException(404, "Audio not found")

    nlp_result = await db.execute(
        select(NLPOutput).where(NLPOutput.audio_id == audio_id)
    )
    nlp = nlp_result.scalar_one_or_none()

    return {
        "audio_id": audio_id,
        "quality": audio.quality,
        "transcription": audio.transcription,
        "processed_at": audio.processed_at,
        "nlp": {
            "sentiment": nlp.sentiment if nlp else None,
            "emotion": nlp.emotion if nlp else None,
            "intensity": nlp.intensity if nlp else None,
            "main_topic": nlp.main_topic if nlp else None,
            "topics": nlp.topics if nlp else None,
            "narrative": nlp.narrative if nlp else None,
            "summary": nlp.summary if nlp else None,
            "citizen_quote": nlp.citizen_quote if nlp else None,
            "actor_mentioned": nlp.actor_mentioned if nlp else None,
            "opinion_driver": nlp.opinion_driver if nlp else None,
            "confidence": nlp.confidence if nlp else None,
        } if nlp else None,
    }
