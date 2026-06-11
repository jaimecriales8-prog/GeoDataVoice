import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";
import { whatsappNuevaEncuesta, whatsappDisponible } from "@/lib/whatsapp";
import { participanteCoincide, type Audiencia } from "@/lib/segmentacion";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { surveyId } = await req.json();
    if (!surveyId) return NextResponse.json({ error: "surveyId requerido" }, { status: 400 });

    const cookieStore = await cookies();
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    const role = user?.user_metadata?.role ?? "";
    if (!user || !["cliente", "admin"].includes(role))
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    if (!whatsappDisponible())
      return NextResponse.json({ error: "WhatsApp no configurado" }, { status: 503 });

    const supabase = createServiceClient();
    const { data: survey } = await supabase
      .from("surveys")
      .select("id, name, perfil_objetivo, audiencia, slug, es_abierta, projects(name)")
      .eq("id", surveyId).single();
    if (!survey) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://geodatavoice.grialtech.co";
    const link = survey.es_abierta && survey.slug
      ? `${appUrl}/encuesta/${survey.slug}`
      : `${appUrl}/campo/panelista`;

    // Cargar panelistas activos con teléfono
    const { data: panelistas } = await supabase
      .from("participants")
      .select("id, phone, gender, estrato, nivel_estudios, estado_civil, regimen_salud, sisben_grupo, tenencia_vivienda, grupo_etnico, antiguedad_barrio, actividades, recibe_subsidios, acceso_internet, registrado_votar, user_id")
      .eq("status", "verified")
      .not("phone", "is", null)
      .not("user_id", "is", null);

    // Filtrar por perfil_objetivo y audiencia
    const po = survey.perfil_objetivo as string;
    const audiencia = survey.audiencia as Audiencia | null;
    const elegibles = (panelistas ?? []).filter(p => {
      if (po === "encuestador") return false;
      return participanteCoincide(audiencia, p as Parameters<typeof participanteCoincide>[1]);
    });

    // Obtener nombres desde auth
    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const nombrePorUserId = new Map<string, string>();
    (authData?.users ?? []).forEach(u => {
      nombrePorUserId.set(u.id, u.user_metadata?.full_name ?? "Panelista");
    });

    const encuestaNombre = survey.name as string;
    let enviados = 0;
    const BATCH = 10;
    for (let i = 0; i < elegibles.length; i += BATCH) {
      await Promise.all(elegibles.slice(i, i + BATCH).map(async p => {
        if (!p.phone) return;
        const nombre = nombrePorUserId.get(p.user_id as string) ?? "Panelista";
        const ok = await whatsappNuevaEncuesta(p.phone, nombre, encuestaNombre, link);
        if (ok) enviados++;
      }));
    }

    return NextResponse.json({ ok: true, enviados, total: elegibles.length });
  } catch (e) {
    console.error("[whatsapp/nueva-encuesta]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
