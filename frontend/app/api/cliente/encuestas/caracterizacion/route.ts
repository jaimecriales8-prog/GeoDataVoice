import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

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

function cnt<T extends Record<string, unknown>>(arr: T[], fn: (p: T) => string, total: number, limit = 0) {
  const map: Record<string, number> = {};
  arr.forEach(p => { const k = fn(p) || "Sin dato"; map[k] = (map[k] ?? 0) + 1; });
  const result = Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => ({ label, n, pct: total ? Math.round((n / total) * 100) : 0 }));
  return limit ? result.slice(0, limit) : result;
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

  const { data: rows } = await supabase
    .from("responses")
    .select(`participant_id, encuestador_id, participants!inner(gender, birth_year, estrato, departamento, municipio, nivel_estudios, estado_civil, actividades, regimen_salud, tenencia_vivienda, grupo_etnico, registrado_votar, recibe_subsidios, acceso_internet, kyc_status, user_id)`)
    .eq("survey_id", surveyId);

  // Deduplicar por participant_id
  const seen = new Set<string>();
  const arr = (rows ?? [])
    .filter(r => { if (seen.has(r.participant_id)) return false; seen.add(r.participant_id); return true; })
    .map(r => ({ ...(r.participants as Record<string, unknown>), encuestador_id: r.encuestador_id }));

  const total = arr.length;
  const verificados = arr.filter(x => x.kyc_status === "approved").length;

  return NextResponse.json({
    total,
    verificados,
    tipo:             cnt(arr, x => x.user_id ? "Panelista" : x.encuestador_id ? "Campo" : "Abierta", total),
    genero:           cnt(arr, x => x.gender === "male" ? "Hombre" : x.gender === "female" ? "Mujer" : "Otro/NR", total),
    edad:             cnt(arr, x => agruparEdad(x.birth_year as number | null), total),
    estrato:          cnt(arr, x => x.estrato ? `Estrato ${x.estrato}` : "Sin dato", total),
    nivel_estudios:   cnt(arr, x => (x.nivel_estudios as string) ?? "Sin dato", total, 6),
    estado_civil:     cnt(arr, x => (x.estado_civil as string) ?? "Sin dato", total),
    actividades:      cnt(arr, x => Array.isArray(x.actividades) ? (x.actividades as string[]).join(", ") : ((x.actividades as string) ?? "Sin dato"), total, 6),
    regimen_salud:    cnt(arr, x => (x.regimen_salud as string) ?? "Sin dato", total),
    tenencia_vivienda:cnt(arr, x => (x.tenencia_vivienda as string) ?? "Sin dato", total),
    grupo_etnico:     cnt(arr, x => (x.grupo_etnico as string) ?? "Sin dato", total),
    departamento:     cnt(arr, x => (x.departamento as string) ?? "Sin dato", total, 8),
    municipio:        cnt(arr, x => (x.municipio as string) ?? "Sin dato", total, 8),
    registrado_votar: cnt(arr, x => x.registrado_votar ? "Sí" : "No", total),
    recibe_subsidios: cnt(arr, x => x.recibe_subsidios ? "Sí" : "No", total),
    acceso_internet:  cnt(arr, x => x.acceso_internet ? "Sí" : "No", total),
  });
}
