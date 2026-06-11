import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";
import { whatsappRecordatorio, whatsappDisponible } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/recordatorio
// Envía WhatsApp a panelistas que NO han respondido la encuesta aún
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
      .select("id, name, perfil_objetivo, audiencia, slug, es_abierta, status")
      .eq("id", surveyId).single();
    if (!survey) return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
    if (!["ready", "sent"].includes(survey.status as string))
      return NextResponse.json({ error: "La encuesta no está activa" }, { status: 400 });

    // IDs de panelistas que ya respondieron
    const { data: yaRespondieron } = await supabase
      .from("responses")
      .select("participant_id")
      .eq("survey_id", surveyId);
    const yaIds = new Set((yaRespondieron ?? []).map(r => r.participant_id));

    // Panelistas activos con teléfono que NO han respondido
    const { data: panelistas } = await supabase
      .from("participants")
      .select("id, phone, user_id")
      .eq("status", "verified")
      .not("phone", "is", null)
      .not("user_id", "is", null);

    const pendientes = (panelistas ?? []).filter(p => !yaIds.has(p.id));

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://geodatavoice.grialtech.co";
    const link = survey.es_abierta && survey.slug
      ? `${appUrl}/encuesta/${survey.slug}`
      : `${appUrl}/campo/panelista`;

    const { data: authData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const nombrePorUserId = new Map<string, string>();
    (authData?.users ?? []).forEach(u => {
      nombrePorUserId.set(u.id, u.user_metadata?.full_name ?? "Panelista");
    });

    const encuestaNombre = survey.name as string;
    let enviados = 0;
    const BATCH = 10;
    for (let i = 0; i < pendientes.length; i += BATCH) {
      await Promise.all(pendientes.slice(i, i + BATCH).map(async p => {
        if (!p.phone) return;
        const nombre = nombrePorUserId.get(p.user_id as string) ?? "Panelista";
        const ok = await whatsappRecordatorio(p.phone, nombre, encuestaNombre, link);
        if (ok) enviados++;
      }));
    }

    return NextResponse.json({ ok: true, enviados, pendientes: pendientes.length });
  } catch (e) {
    console.error("[whatsapp/recordatorio]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
