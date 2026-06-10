import { NextResponse } from "next/server";
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

export async function GET() {
  const supabase = createServiceClient();

  const { data: panelistas } = await supabase
    .from("participants")
    .select("gender, birth_year, estrato, departamento, municipio, nivel_estudios, kyc_status, status")
    .not("user_id", "is", null);

  if (!panelistas) return NextResponse.json({ error: "Sin datos" }, { status: 500 });

  const total = panelistas.length;
  const verificados = panelistas.filter(p => p.kyc_status === "approved").length;
  const activos = panelistas.filter(p => p.status === "verified").length;

  const conteo = <T extends Record<string, unknown>>(arr: T[], fn: (p: T) => string) => {
    const map: Record<string, number> = {};
    arr.forEach(p => { const k = fn(p) || "Sin dato"; map[k] = (map[k] ?? 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([label, n]) => ({ label, n, pct: pct(n, total) }));
  };

  return NextResponse.json({
    total,
    verificados,
    activos,
    genero: conteo(panelistas, p => p.gender === "male" ? "Hombre" : p.gender === "female" ? "Mujer" : "Otro/NR"),
    edad: conteo(panelistas, p => agruparEdad(p.birth_year)),
    estrato: conteo(panelistas, p => p.estrato ? `Estrato ${p.estrato}` : "Sin dato"),
    nivel_estudios: conteo(panelistas, p => p.nivel_estudios ?? "Sin dato"),
    departamento: conteo(panelistas, p => p.departamento ?? "Sin dato").slice(0, 8),
    estado: conteo(panelistas, p => p.status === "verified" ? "Verificado" : p.status === "preregistered" ? "Pre-registrado" : "Suspendido"),
  });
}
