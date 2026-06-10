import { NextResponse } from "next/server";
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

export async function GET() {
  const supabase = createServiceClient();
  const { data: p } = await supabase
    .from("participants")
    .select("gender, birth_year, estrato, departamento, municipio, nivel_estudios, estado_civil, actividades, regimen_salud, tenencia_vivienda, grupo_etnico, registrado_votar, recibe_subsidios, acceso_internet, kyc_status, status")
    .not("user_id", "is", null);

  const arr = p ?? [];
  const total = arr.length;
  const verificados = arr.filter(x => x.kyc_status === "approved").length;
  const activos = arr.filter(x => x.status === "verified").length;

  return NextResponse.json({
    total, verificados, activos,
    estado:           cnt(arr, x => x.status === "verified" ? "Verificado" : x.status === "preregistered" ? "Pre-registrado" : "Suspendido", total),
    genero:           cnt(arr, x => x.gender === "male" ? "Hombre" : x.gender === "female" ? "Mujer" : "Otro/NR", total),
    edad:             cnt(arr, x => agruparEdad(x.birth_year), total),
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
