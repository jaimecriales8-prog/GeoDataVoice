import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { whatsappNuevaEncuesta, whatsappDisponible } from "@/lib/whatsapp";

export async function POST(req: Request) {
  const { survey_id, wave } = await req.json();
  if (!survey_id || !wave) return NextResponse.json({ error: "survey_id and wave required" }, { status: 400 });

  const supabase = createServiceClient();

  // Cargar encuesta original + preguntas
  const [{ data: original }, { data: questions }] = await Promise.all([
    supabase.from("surveys").select("*").eq("id", survey_id).single(),
    supabase.from("questions").select("*").eq("survey_id", survey_id).order("order"),
  ]);

  if (!original) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });

  // Crear nueva encuesta con el mismo contenido, nueva ola, estado sent
  const newSurveyId = crypto.randomUUID();
  const { error: surveyErr } = await supabase.from("surveys").insert({
    id: newSurveyId,
    project_id: original.project_id,
    name: original.name,
    wave,
    status: "sent",
    perfil_objetivo: original.perfil_objetivo,
    closes_at: original.closes_at,
    audiencia: original.audiencia,
    ponderacion: original.ponderacion,
    es_abierta: original.es_abierta,
    abierta_identidad: original.abierta_identidad,
    abierta_pago: original.abierta_pago,
    abierta_anonima: original.abierta_anonima,
    field_identity_required: original.field_identity_required,
    slug: original.slug ? `${original.slug}-ola${wave}` : null,
    sent_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  });
  if (surveyErr) return NextResponse.json({ error: surveyErr.message }, { status: 500 });

  // Copiar preguntas
  if (questions && questions.length > 0) {
    const newQuestions = questions.map(q => ({
      id: crypto.randomUUID(),
      survey_id: newSurveyId,
      type: q.type,
      text: q.text,
      options: q.options,
      required: q.required,
      order: q.order,
      tracking_key: q.tracking_key,
      favorability: q.favorability,
      favorable_values: q.favorable_values,
      audio_prompt: q.audio_prompt,
    }));
    const { error: qErr } = await supabase.from("questions").insert(newQuestions);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  // Notificar panelistas (fire-and-forget)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://geodatavoice.grialtech.co";
  const link = original.es_abierta && original.slug
    ? `${appUrl}/encuesta/${original.slug}-ola${wave}`
    : `${appUrl}/campo/panelista`;

  if (whatsappDisponible()) {
    const { data: panelistas } = await supabase
      .from("participants")
      .select("id, phone, user_id")
      .eq("status", "verified")
      .not("phone", "is", null);

    const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const nombreMap: Record<string, string> = {};
    for (const u of authList?.users ?? []) nombreMap[u.id] = u.user_metadata?.full_name ?? "Panelista";

    await Promise.allSettled(
      (panelistas ?? []).map(p =>
        whatsappNuevaEncuesta(p.phone!, nombreMap[p.user_id as string] ?? "Panelista", original.name as string, link)
      )
    );
  }

  return NextResponse.json({ ok: true, id: newSurveyId });
}
