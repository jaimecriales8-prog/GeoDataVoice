import { NextResponse } from "next/server";
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

function conteo<T extends Record<string, unknown>>(arr: T[], fn: (p: T) => string, total: number) {
  const map: Record<string, number> = {};
  arr.forEach(p => { const k = fn(p) || "Sin dato"; map[k] = (map[k] ?? 0) + 1; });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => ({ label, n, pct: total ? Math.round((n / total) * 100) : 0 }));
}

export async function GET() {
  const cookieStore = await cookies();
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  const role = user?.user_metadata?.role;
  if (!user || !["admin", "cliente"].includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data: panelistas } = await supabase
    .from("participants")
    .select("gender, birth_year, estrato, departamento, municipio, nivel_estudios, kyc_status, status")
    .not("user_id", "is", null);

  const total = panelistas?.length ?? 0;
  const verificados = panelistas?.filter(p => p.kyc_status === "approved").length ?? 0;

  return NextResponse.json({
    total,
    verificados,
    genero: conteo(panelistas ?? [], p => p.gender === "male" ? "Hombre" : p.gender === "female" ? "Mujer" : "Otro/NR", total),
    edad: conteo(panelistas ?? [], p => agruparEdad(p.birth_year), total),
    estrato: conteo(panelistas ?? [], p => p.estrato ? `Estrato ${p.estrato}` : "Sin dato", total),
    nivel_estudios: conteo(panelistas ?? [], p => (p.nivel_estudios as string) ?? "Sin dato", total).slice(0, 6),
    departamento: conteo(panelistas ?? [], p => (p.departamento as string) ?? "Sin dato", total).slice(0, 8),
    estado: conteo(panelistas ?? [], p => p.status === "verified" ? "Verificado" : p.status === "preregistered" ? "Pre-registrado" : "Suspendido", total),
  });
}
