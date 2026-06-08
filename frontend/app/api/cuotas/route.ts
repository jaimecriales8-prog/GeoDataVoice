import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createServiceClient();

  const [{ data: cfg }, { data: parts }] = await Promise.all([
    supabase.from("platform_config").select("value").eq("key", "panel_quotas").maybeSingle(),
    supabase.from("participants").select("gender, estrato, sisben_grupo, actividad_principal"),
  ]);

  const quotas = cfg?.value ?? null;
  const participants = parts ?? [];

  const counts = {
    total: participants.length,
    gender: {} as Record<string, number>,
    estrato: {} as Record<string, number>,
    sisben_grupo: {} as Record<string, number>,
    actividades: {} as Record<string, number>,
  };

  for (const p of participants) {
    if (p.gender) counts.gender[p.gender] = (counts.gender[p.gender] ?? 0) + 1;
    if (p.estrato) counts.estrato[p.estrato] = (counts.estrato[p.estrato] ?? 0) + 1;
    if (p.sisben_grupo) counts.sisben_grupo[p.sisben_grupo] = (counts.sisben_grupo[p.sisben_grupo] ?? 0) + 1;
    if (p.actividad_principal) counts.actividades[p.actividad_principal] = (counts.actividades[p.actividad_principal] ?? 0) + 1;
  }

  // Check if a new participant with given attributes would be blocked
  // Returns: { blocked: bool, reason: string | null, quotas, counts }
  return NextResponse.json({ quotas, counts });
}

export async function POST(req: Request) {
  // Check if a candidate with specific attributes passes quotas
  const body = await req.json();
  const { gender, estrato, sisben_grupo, actividad_principal } = body;

  const supabase = createServiceClient();
  const [{ data: cfg }, { data: parts }] = await Promise.all([
    supabase.from("platform_config").select("value").eq("key", "panel_quotas").maybeSingle(),
    supabase.from("participants").select("gender, estrato, sisben_grupo, actividad_principal"),
  ]);

  const q = cfg?.value ?? null;
  if (!q) return NextResponse.json({ blocked: false });

  const participants = parts ?? [];
  const total = participants.length;

  // Check total quota
  if (q.total?.enabled && total >= (q.total.max ?? Infinity)) {
    return NextResponse.json({ blocked: true, reason: "El panel ya alcanzó su cupo máximo de participantes." });
  }

  // Check gender quota
  if (q.gender?.enabled && gender) {
    const count = participants.filter(p => p.gender === gender).length;
    const max = q.gender.cupos?.[gender];
    if (max != null && count >= max) {
      return NextResponse.json({ blocked: true, reason: `El cupo para tu género (${gender}) está completo.` });
    }
  }

  // Check estrato quota
  if (q.estrato?.enabled && estrato) {
    const count = participants.filter(p => p.estrato === estrato).length;
    const max = q.estrato.cupos?.[estrato];
    if (max != null && count >= max) {
      return NextResponse.json({ blocked: true, reason: `El cupo para estrato ${estrato} está completo.` });
    }
  }

  // Check sisben quota
  if (q.sisben_grupo?.enabled && sisben_grupo) {
    const count = participants.filter(p => p.sisben_grupo === sisben_grupo).length;
    const max = q.sisben_grupo.cupos?.[sisben_grupo];
    if (max != null && count >= max) {
      return NextResponse.json({ blocked: true, reason: `El cupo para tu grupo SISBEN está completo.` });
    }
  }

  // Check actividades quota
  if (q.actividades?.enabled && actividad_principal) {
    const count = participants.filter(p => p.actividad_principal === actividad_principal).length;
    const max = q.actividades.cupos?.[actividad_principal];
    if (max != null && count >= max) {
      return NextResponse.json({ blocked: true, reason: `El cupo para tu actividad principal está completo.` });
    }
  }

  return NextResponse.json({ blocked: false });
}
