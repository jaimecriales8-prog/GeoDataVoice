// Supabase Edge Function (Deno) — process-audio
//
// Pipeline de una nota de voz ciudadana:
//   1. Descarga el audio del bucket privado geodatavoice-audio
//   2. Transcribe con OpenAI Whisper-1 (español)
//   3. Analiza el texto con Claude → 9 variables NLP (JSON estructurado)
//   4. Guarda en nlp_outputs y marca audio_responses.quality = 'processed'
//
// Disparo: Database Webhook sobre INSERT en audio_responses, o POST manual
//   { "audio_id": "<uuid>" }.
//
// Secrets requeridos (supabase secrets set ...):
//   OPENAI_API_KEY, ANTHROPIC_API_KEY
//   (SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY los inyecta Supabase)
// Opcional: CLAUDE_MODEL (default claude-opus-4-8)

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const CLAUDE_MODEL = Deno.env.get("CLAUDE_MODEL") ?? "claude-opus-4-8";
const BUCKET = "geodatavoice-audio";

// ── Esquema JSON estructurado para el análisis (las 9 variables de nlp_outputs) ──
const NLP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    sentiment: { type: "string", enum: ["positivo", "negativo", "neutral", "mixto"] },
    emotion: {
      type: "string",
      enum: ["satisfacción", "frustración", "esperanza", "indiferencia", "indignación", "preocupación", "alegría", "tristeza", "enojo"],
    },
    intensity: { type: "integer", enum: [1, 2, 3, 4, 5] },
    main_topic: {
      type: "string",
      enum: ["seguridad", "salud", "educación", "empleo", "servicios_públicos", "movilidad", "corrupción", "medio_ambiente", "economía", "otro"],
    },
    topics: { type: "array", items: { type: "string" } },
    narrative: { type: "string" },
    summary: { type: "string" },
    citizen_quote: { type: "string" },
    actor_mentioned: { type: "string" },
    opinion_driver: { type: "string" },
    confidence: { type: "number" },
  },
  required: [
    "sentiment", "emotion", "intensity", "main_topic", "topics",
    "narrative", "summary", "citizen_quote", "actor_mentioned",
    "opinion_driver", "confidence",
  ],
};

const SYSTEM_PROMPT = `Eres un analista de opinión pública en Colombia. Analizas notas de voz
ciudadanas en español colombiano coloquial y extraes variables estructuradas para inteligencia
territorial. Sé fiel a lo que dice el ciudadano, no inventes. Responde SOLO con el JSON pedido.

Guía de campos:
- sentiment: sentimiento general hacia el tema/gestión.
- emotion: emoción dominante.
- intensity: 1 (muy débil) a 5 (muy intensa).
- main_topic: tema principal.
- topics: lista de temas mencionados (1-5).
- narrative: 1-2 frases que resumen la postura del ciudadano.
- summary: una frase muy breve.
- citizen_quote: la frase textual más representativa (copiada del audio).
- actor_mentioned: persona/institución mencionada (alcalde, gobernador, etc.) o "" si ninguna.
- opinion_driver: la razón principal detrás de la opinión.
- confidence: 0 a 1, qué tan claro es el audio para este análisis.`;

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json" },
  });
}

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    // Soporta Database Webhook ({ record }) y POST manual ({ audio_id })
    const audioId: string | undefined = body?.record?.id ?? body?.audio_id;
    if (!audioId) return json({ error: "Falta audio_id" }, 400);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1. Obtener el audio_response
    const { data: ar, error: arErr } = await supabase
      .from("audio_responses")
      .select("id, audio_url, quality")
      .eq("id", audioId)
      .single();
    if (arErr || !ar) return json({ error: "audio_response no encontrado" }, 404);
    if (ar.quality === "processed") return json({ ok: true, skipped: "ya procesado" });

    // 2. Descargar el audio del bucket privado
    const { data: file, error: dlErr } = await supabase.storage.from(BUCKET).download(ar.audio_url);
    if (dlErr || !file) {
      await supabase.from("audio_responses").update({ quality: "error" }).eq("id", audioId);
      return json({ error: `No se pudo descargar el audio: ${dlErr?.message}` }, 500);
    }

    // 3. Transcribir con Whisper-1
    const fd = new FormData();
    fd.append("file", file, ar.audio_url.split("/").pop() ?? "audio.webm");
    fd.append("model", "whisper-1");
    fd.append("language", "es");
    const wRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: fd,
    });
    if (!wRes.ok) {
      await supabase.from("audio_responses").update({ quality: "error" }).eq("id", audioId);
      return json({ error: `Whisper falló: ${await wRes.text()}` }, 502);
    }
    const transcription = ((await wRes.json()).text ?? "").trim();
    if (!transcription) {
      await supabase.from("audio_responses").update({ quality: "error", transcription: "" }).eq("id", audioId);
      return json({ error: "Transcripción vacía" }, 422);
    }

    // 4. Analizar con Claude (JSON estructurado, sin thinking para minimizar costo/latencia)
    const aRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        thinking: { type: "disabled" },
        system: SYSTEM_PROMPT,
        output_config: { format: { type: "json_schema", schema: NLP_SCHEMA } },
        messages: [
          {
            role: "user",
            content: `Analiza esta nota de voz ciudadana (español colombiano coloquial):\n\n"""${transcription}"""`,
          },
        ],
      }),
    });
    if (!aRes.ok) {
      return json({ error: `Claude falló: ${await aRes.text()}` }, 502);
    }
    const aJson = await aRes.json();
    const textBlock = (aJson.content ?? []).find((b: { type: string }) => b.type === "text");
    if (!textBlock?.text) return json({ error: "Claude no devolvió texto" }, 502);
    const nlp = JSON.parse(textBlock.text);

    // 5. Guardar resultados
    const { error: insErr } = await supabase.from("nlp_outputs").insert({
      audio_id: audioId,
      sentiment: nlp.sentiment,
      emotion: nlp.emotion,
      intensity: String(nlp.intensity),
      main_topic: nlp.main_topic,
      topics: nlp.topics,
      narrative: nlp.narrative,
      summary: nlp.summary,
      citizen_quote: nlp.citizen_quote,
      actor_mentioned: nlp.actor_mentioned || null,
      opinion_driver: nlp.opinion_driver,
      confidence: nlp.confidence ?? null,
      model_version: `whisper-1 + ${CLAUDE_MODEL}`,
    });
    if (insErr) return json({ error: `Error guardando nlp_outputs: ${insErr.message}` }, 500);

    await supabase
      .from("audio_responses")
      .update({ quality: "processed", transcription, processed_at: new Date().toISOString() })
      .eq("id", audioId);

    return json({ ok: true, audio_id: audioId, transcription, nlp });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
