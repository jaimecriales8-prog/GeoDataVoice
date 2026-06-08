import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

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
      ...q,
      id: crypto.randomUUID(),
      survey_id: newSurveyId,
      created_at: new Date().toISOString(),
    }));
    const { error: qErr } = await supabase.from("questions").insert(newQuestions);
    if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: newSurveyId });
}
