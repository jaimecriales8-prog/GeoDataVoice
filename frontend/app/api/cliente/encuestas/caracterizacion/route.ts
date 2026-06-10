import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

function pct(n: number, total: number) { return total ? Math.round((n / total) * 100) : 0; }

function agruparEdad(birth_year: number | null): string {
  if (!birth_year) return "Sin dato";
  const edad = new Date().getFullYear() - birth_year;
  if (edad < 25) return "18–24";
  if (edad < 35) return "25–34";
  if (edad < 45) return "35–44";
  if (edad < 55) return "45–54";
  if (edad < 65) return "55–64";
  return "65+";
}

export async function GET(req: NextRequest) {
  const surveyId = req.nextUrl.searchParams.get("surveyId");
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

  const { data: survey } = await supabase.from("surveys").select("project_id").eq("id", surveyId).maybeSingle();
  if (!survey) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const { data: proyecto } = await supabase.from("projects").select("client_id").eq("id", survey.project_id).maybeSingle();
  const role = user.user_metadata?.role;
  if (role !== "admin" && proyecto?.client_id !== user.id)
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  // Traer todos los participantes únicos de esta encuesta
  const { data: rows } = await supabase
    .from("responses")
    .select("participant_id, encuestador_id, participants!inner(gender, birth_year, estrato, departamento, municipio, nivel_estudios, kyc_status, user_id)")
    .eq("survey_id", surveyId);

  if (!rows) return NextResponse.json({ error: "Sin datos" }, { status: 500 });

  // Deduplicar por participant_id
  const seen = new Set<string>();
  const participantes = rows.filter(r => { if (seen.has(r.participant_id)) return false; seen.add(r.participant_id); return true; })
    .map(r => ({ ...r.participants as Record<string, unknown>, encuestador_id: r.encuestador_id }));

  const total = participantes.length;

  const conteo = <K extends string>(fn: (p: Record<string, unknown>) => K) => {
    const map: Record<string, number> = {};
    participantes.forEach(p => { const k = fn(p) || "Sin dato"; map[k] = (map[k] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n, pct: pct(n, total) }));
  };

  return NextResponse.json({
    total,
    tipo: conteo(p => p.user_id ? "Panelista" : p.encuestador_id ? "Campo" : "Abierta"),
    genero: conteo(p => (p.gender as string) === "male" ? "Hombre" : (p.gender as string) === "female" ? "Mujer" : "Otro/NR"),
    edad: conteo(p => agruparEdad(p.birth_year as number | null)),
    estrato: conteo(p => p.estrato ? `Estrato ${p.estrato}` : "Sin dato"),
    nivel_estudios: conteo(p => (p.nivel_estudios as string) ?? "Sin dato"),
    departamento: conteo(p => (p.departamento as string) ?? "Sin dato").slice(0, 8),
    verificados: participantes.filter(p => (p.kyc_status as string) === "approved").length,
  });
}
