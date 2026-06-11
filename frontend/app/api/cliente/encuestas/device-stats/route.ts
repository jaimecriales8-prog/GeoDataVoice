import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

type Grupo = { label: string; n: number; pct: number };

function agrupar(vals: (string | undefined | null)[], total: number, limit = 8): Grupo[] {
  const map: Record<string, number> = {};
  vals.forEach(v => { const k = v || "Sin dato"; map[k] = (map[k] ?? 0) + 1; });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, n]) => ({ label, n, pct: total ? Math.round((n / total) * 100) : 0 }));
}

function duracionSegundos(dm: Record<string, string>): number | null {
  if (!dm.started_at || !dm.finished_at) return null;
  const diff = (new Date(dm.finished_at).getTime() - new Date(dm.started_at).getTime()) / 1000;
  return diff > 0 ? diff : null;
}

function agruparDuracion(secs: number): string {
  if (secs < 60) return "< 1 min";
  if (secs < 120) return "1–2 min";
  if (secs < 300) return "2–5 min";
  if (secs < 600) return "5–10 min";
  return "> 10 min";
}

function agruparReferrer(ref: string | undefined | null): string {
  if (!ref) return "Directo";
  if (/whatsapp/i.test(ref)) return "WhatsApp";
  if (/mail\.google|outlook|yahoo.*mail|webmail/i.test(ref)) return "Correo";
  if (/facebook|instagram|twitter|x\.com|tiktok/i.test(ref)) return "Redes sociales";
  if (/google\.com/i.test(ref)) return "Google";
  return "Otro";
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
    .select("device_meta")
    .eq("survey_id", surveyId)
    .not("device_meta", "is", null);

  const metas = (rows ?? []).map(r => r.device_meta as Record<string, string>);
  const total = metas.length;

  if (total === 0) return NextResponse.json({ total: 0 });

  const duraciones = metas.map(m => duracionSegundos(m)).filter((d): d is number => d !== null);
  const promDuracion = duraciones.length ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length) : null;
  const rapidas = duraciones.filter(d => d < 60).length;
  const alertaRapidas = duraciones.length > 0 && (rapidas / duraciones.length) > 0.3;

  return NextResponse.json({
    total,
    device_type:      agrupar(metas.map(m => m.device_type), total),
    os:               agrupar(metas.map(m => m.os), total),
    browser:          agrupar(metas.map(m => m.browser), total),
    connection_type:  agrupar(metas.map(m => m.connection_type), total),
    ciudad:           agrupar(metas.map(m => m.ip_city ? `${m.ip_city}${m.ip_region ? `, ${m.ip_region}` : ""}` : null), total, 8),
    referrer:         agrupar(metas.map(m => agruparReferrer(m.referrer)), total),
    duracion:         agrupar(metas.map(m => { const s = duracionSegundos(m); return s !== null ? agruparDuracion(s) : null; }), total),
    prom_duracion_seg: promDuracion,
    alerta_rapidas:   alertaRapidas,
    pct_rapidas:      duraciones.length ? Math.round((rapidas / duraciones.length) * 100) : 0,
  });
}
