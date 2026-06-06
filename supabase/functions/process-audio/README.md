# Edge Function: process-audio

Transcribe (Whisper) + analiza (Claude) las notas de voz ciudadanas → `nlp_outputs`.

## Pipeline
1. Descarga el audio del bucket privado `geodatavoice-audio`.
2. **OpenAI Whisper-1** transcribe a texto (español).
3. **Claude** (`claude-opus-4-8` por defecto) extrae 9 variables NLP en JSON estructurado.
4. Inserta en `nlp_outputs` y marca `audio_responses.quality = 'processed'`.

## Despliegue

```bash
cd /Users/jaimecriales/Sites/GeoDataVoice

# 1. Login + vincular el proyecto (una vez). Node vía nvm: source ~/.nvm/nvm.sh
npx supabase login
npx supabase link --project-ref bsjiqatcqbjqmtytlgll

# 2. Cargar los secrets (las llaves NO van en el código)
npx supabase secrets set OPENAI_API_KEY=sk-...
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# Opcional, para cambiar de modelo sin tocar código:
# npx supabase secrets set CLAUDE_MODEL=claude-haiku-4-5

# 3. Desplegar
npx supabase functions deploy process-audio
```

> `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente — no los cargues.

## Disparo automático (Database Webhook)

Dashboard → **Database → Webhooks → Create**:
- Tabla: `audio_responses`
- Evento: `INSERT`
- Tipo: HTTP Request → `POST` a la URL de la función
  `https://bsjiqatcqbjqmtytlgll.functions.supabase.co/process-audio`
- Header: `Authorization: Bearer <SERVICE_ROLE_KEY>`

La función acepta el payload del webhook (`{ record }`) o un POST manual (`{ "audio_id": "<uuid>" }`).

## Prueba manual

```bash
curl -X POST 'https://bsjiqatcqbjqmtytlgll.functions.supabase.co/process-audio' \
  -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
  -H 'Content-Type: application/json' \
  -d '{"audio_id":"<un audio_responses.id con quality=pending>"}'
```

## Modelo y costo
Por defecto `claude-opus-4-8` (máxima calidad). Para alto volumen, `claude-haiku-4-5` o
`claude-sonnet-4-6` son mucho más baratos — cámbialo con el secret `CLAUDE_MODEL` sin redeploy
de código (el redeploy de secrets sí re-inicia la función). La transcripción Whisper cuesta
~US$0.006/min aparte.
