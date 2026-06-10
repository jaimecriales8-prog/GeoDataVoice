import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

const POR_PAGINA = 50;

export async function GET(req: NextRequest) {
  const surveyId = req.nextUrl.searchParams.get("surveyId");
  const page = parseInt(req.nextUrl.searchParams.get("page") ?? "0");
  if (!surveyId) return NextResponse.json({ error: "surveyId requerido" }, { status: 400 });

  const cookieStore = await cookies();
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const supabase = createServiceClient();

  // Verificar ownership
  const { data: survey } = await supabase.from("surveys").select("project_id").eq("id", surveyId).maybeSingle();
  if (!survey) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
  const { data: proyecto } = await supabase.from("projects").select("client_id").eq("id", survey.project_id).maybeSingle();
  const role = user.user_metadata?.role;
  if (role !== "admin" && proyecto?.client_id !== user.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Paso 1: IDs únicos de participantes que respondieron esta encuesta
  const { data: pidRows } = await supabase
    .from("responses")
    .select("participant_id, encuestador_id")
    .eq("survey_id", surveyId);

  // Deduplicar manteniendo el primer registro (más reciente)
  const seen = new Set<string>();
  const unique: { participant_id: string; encuestador_id: string | null }[] = [];
  for (const r of pidRows ?? []) {
    if (!seen.has(r.participant_id)) {
      seen.add(r.participant_id);
      unique.push(r);
    }
  }

  const total = unique.length;
  const from = page * POR_PAGINA;
  const pageItems = unique.slice(from, from + POR_PAGINA);

  if (pageItems.length === 0) return NextResponse.json({ respondentes: [], total, pagina: page, porPagina: POR_PAGINA });

  // Paso 2: Detalles de los participantes de esta página
  const ids = pageItems.map(r => r.participant_id);
  const { data: parts } = await supabase
    .from("participants")
    .select("id, name_encrypted, gender, birth_year, estrato, municipio, departamento, kyc_status, user_id, is_anonymous, created_at")
    .in("id", ids);

  const partMap = new Map((parts ?? []).map(p => [p.id, p]));

  const respondentes = pageItems.map(r => {
    const p = partMap.get(r.participant_id);
    const tipo = p?.user_id ? "panelista" : r.encuestador_id ? "campo" : "abierta";
    return {
      id: r.participant_id,
      nombre: p?.is_anonymous ? "Anónimo" : (p?.name_encrypted ?? "—"),
      tipo,
      gender: p?.gender ?? null,
      edad: p?.birth_year ? new Date().getFullYear() - p.birth_year : null,
      estrato: p?.estrato ?? null,
      municipio: p?.municipio ?? null,
      departamento: p?.departamento ?? null,
      kyc_status: p?.kyc_status ?? "none",
      fecha: p?.created_at ?? null,
    };
  });

  return NextResponse.json({ respondentes, total, pagina: page, porPagina: POR_PAGINA });
}
