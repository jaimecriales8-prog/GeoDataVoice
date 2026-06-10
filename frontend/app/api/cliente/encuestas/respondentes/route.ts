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

  // Verificar ownership: encuesta → proyecto → cliente
  const { data: survey } = await supabase
    .from("surveys").select("project_id").eq("id", surveyId).maybeSingle();
  if (!survey) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });

  const { data: proyecto } = await supabase
    .from("projects").select("client_id").eq("id", survey.project_id).maybeSingle();
  if (!proyecto) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });

  const role = user.user_metadata?.role;
  if (role !== "admin" && proyecto.client_id !== user.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const from = page * POR_PAGINA;
  const to = from + POR_PAGINA - 1;

  // Traer respuestas únicas por participante para esta encuesta
  const { data: rows, count, error } = await supabase
    .from("responses")
    .select(`
      participant_id,
      encuestador_id,
      created_at,
      participants!inner(
        id, name_encrypted, gender, birth_year, estrato, municipio,
        departamento, kyc_status, status, user_id, is_anonymous
      )
    `, { count: "exact" })
    .eq("survey_id", surveyId)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Deduplicar por participant_id (un participante puede tener N respuestas)
  const seen = new Set<string>();
  const respondentes = (rows ?? [])
    .filter(r => {
      if (seen.has(r.participant_id)) return false;
      seen.add(r.participant_id);
      return true;
    })
    .map(r => {
      const p = r.participants as Record<string, unknown>;
      const tipo = p.user_id ? "panelista" : r.encuestador_id ? "campo" : "abierta";
      return {
        id: p.id,
        nombre: p.is_anonymous ? "Anónimo" : (p.name_encrypted as string ?? "—"),
        tipo,
        gender: p.gender ?? null,
        edad: p.birth_year ? new Date().getFullYear() - (p.birth_year as number) : null,
        estrato: p.estrato ?? null,
        municipio: p.municipio ?? null,
        departamento: p.departamento ?? null,
        kyc_status: p.kyc_status ?? "none",
        fecha: r.created_at,
      };
    });

  return NextResponse.json({ respondentes, total: count ?? 0, pagina: page, porPagina: POR_PAGINA });
}
