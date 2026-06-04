import os
import uuid
from app.core.config import settings


async def upload_audio(content: bytes, path: str) -> str:
    """
    Upload audio bytes to Supabase Storage.
    Falls back to local filesystem if SUPABASE_URL is not configured (dev mode).
    Returns the public/signed URL of the stored file.
    """
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        from supabase import create_client
        client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        result = client.storage.from_(settings.STORAGE_BUCKET).upload(
            path=path,
            file=content,
            file_options={"content-type": "audio/ogg", "upsert": "false"},
        )
        return client.storage.from_(settings.STORAGE_BUCKET).get_public_url(path)
    else:
        # Dev fallback: save to local uploads/ directory
        local_dir = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")
        os.makedirs(local_dir, exist_ok=True)
        local_path = os.path.join(local_dir, path.replace("/", "_"))
        with open(local_path, "wb") as f:
            f.write(content)
        return f"file://uploads/{path.replace('/', '_')}"


async def upload_evidence(content: bytes, filename: str) -> str:
    """Upload field evidence photo."""
    path = f"evidence/{uuid.uuid4()}_{filename}"
    return await upload_audio(content, path)
