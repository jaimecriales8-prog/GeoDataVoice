import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

/**
 * POST /api/audio/upload-abierta  (multipart/form-data)
 * Igual que /api/audio/upload pero para encuestas abiertas (sin sesión auth).
 * Campos: file (Blob), surveyId, questionId, participantId.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const surveyId = form.get("surveyId") as string | null;
  const questionId = form.get("questionId") as string | null;
  const participantId = form.get("participantId") as string | null;

  if (!file || !surveyId || !questionId || !participantId) {
    return NextResponse.json({ error: "Faltan campos (file, surveyId, questionId, participantId)" }, { status: 400 });
  }

  const ext = (file.name.split(".").pop() || "webm").toLowerCase();
  const contentType = file.type || "audio/webm";
  const path = `abierta/${participantId}/${surveyId}/${questionId}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const service = createServiceClient();
  const { error } = await service.storage
    .from("geodatavoice-audio")
    .upload(path, bytes, { contentType, upsert: true });

  if (error) {
    console.error("[audio/upload-abierta]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}
