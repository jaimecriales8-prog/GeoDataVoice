import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";
import { whatsappPagoAprobado, whatsappDisponible } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// POST /api/whatsapp/pago-aprobado
// Body: { participantId, montoCOP }
export async function POST(req: NextRequest) {
  try {
    const { participantId, montoCOP } = await req.json();
    if (!participantId || !montoCOP)
      return NextResponse.json({ error: "participantId y montoCOP requeridos" }, { status: 400 });

    const cookieStore = await cookies();
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user || user.user_metadata?.role !== "admin")
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    if (!whatsappDisponible())
      return NextResponse.json({ ok: false, reason: "WhatsApp no configurado" });

    const supabase = createServiceClient();
    const { data: p } = await supabase
      .from("participants")
      .select("phone, user_id")
      .eq("id", participantId)
      .maybeSingle();
    if (!p?.phone) return NextResponse.json({ ok: false, reason: "Sin teléfono" });

    const { data: authData } = await supabase.auth.admin.getUserById(p.user_id as string);
    const nombre = authData?.user?.user_metadata?.full_name ?? "Panelista";

    const ok = await whatsappPagoAprobado(p.phone, nombre, montoCOP);
    return NextResponse.json({ ok });
  } catch (e) {
    console.error("[whatsapp/pago-aprobado]", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
