import openai
from app.core.config import settings


async def transcribe(audio_path: str, language: str = "es") -> str:
    client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    with open(audio_path, "rb") as f:
        result = await client.audio.transcriptions.create(
            model="whisper-1",
            file=f,
            language=language,
        )
    return result.text


async def analyze_sentiment(transcription: str) -> dict:
    client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    prompt = f"""Analiza este audio de un ciudadano colombiano y responde SOLO en JSON con esta estructura:
{{
  "sentiment": "positive|negative|neutral|mixed",
  "emotion": "rabia|miedo|esperanza|frustración|orgullo|cansancio|confianza|otro",
  "intensity": "low|medium|high",
  "main_topic": "seguridad|empleo|obras|salud|servicios|corrupción|movilidad|educación|otro",
  "topics": ["tema1", "tema2"],
  "narrative": "resumen de la narrativa en 1-2 oraciones",
  "summary": "resumen del audio en 1 oración",
  "citizen_quote": "frase textual representativa (anonimizada)",
  "actor_mentioned": "nombre o cargo mencionado si aplica",
  "opinion_driver": "razón concreta que explica la opinión"
}}

Transcripción: {transcription}"""

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
    )
    import json
    return json.loads(response.choices[0].message.content)
