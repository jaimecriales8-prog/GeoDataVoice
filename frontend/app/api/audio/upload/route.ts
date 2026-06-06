import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";

/**
 * POST /api/audio/upload  (multipart/form-data)
 * Sube una nota de voz al bucket privado geodatavoice-audio con service role.
 * Campos: file (Blob), surveyId, questionId.
 * El participantId se toma de la sesión (no se confía en el cliente).
 * Devuelve { path } para guardar en audio_responses.audio_url.
 */
export async function POST(req: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const surveyId = form.get("surveyId") as string | null;
  const questionId = form.get("questionId") as string | null;

  if (!file || !surveyId || !questionId) {
    return NextResponse.json({ error: "Faltan campos (file, surveyId, questionId)" }, { status: 400 });
  }

  // Extensión y contentType reales (Safari graba mp4, Chrome webm)
  const ext = (file.name.split(".").pop() || "webm").toLowerCase();
  const contentType = file.type || "audio/webm";
  const path = `${user.id}/${surveyId}/${questionId}.${ext}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const service = createServiceClient();
  const { error } = await service.storage
    .from("geodatavoice-audio")
    .upload(path, bytes, { contentType, upsert: true });

  if (error) {
    console.error("[audio/upload]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, path });
}
