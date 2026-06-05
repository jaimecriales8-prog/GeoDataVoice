import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { emailPanelistaPago } from "@/lib/email";

/**
 * POST /api/email/pago-procesado
 * Llamado desde dashboard/pagos cuando admin aprueba un pago a un panelista.
 * Body: { pagoId: string }
 * Solo puede ser invocado por usuario con role=admin.
 */
export async function POST(req: NextRequest) {
  try {
    const { pagoId } = await req.json();
    if (!pagoId) {
      return NextResponse.json({ error: "pagoId requerido" }, { status: 400 });
    }

    const cookieStore = await cookies();

    // Verificar que quien llama es admin
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Service role para leer pago + email del panelista
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    // Obtener datos del pago
    const { data: pago, error: pagoError } = await supabase
      .from("payments")
      .select("id, amount, concept, participant_id")
      .eq("id", pagoId)
      .single();

    if (pagoError || !pago) {
      return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
    }

    // Obtener email del panelista desde Auth via participant_id → user_id
    const { data: participant } = await supabase
      .from("participants")
      .select("user_id")
      .eq("id", pago.participant_id)
      .single();

    if (!participant?.user_id) {
      return NextResponse.json({ error: "Panelista sin usuario asociado" }, { status: 404 });
    }

    const { data: authUser } = await supabase.auth.admin.getUserById(participant.user_id);

    if (!authUser.user?.email) {
      return NextResponse.json({ error: "Email de panelista no encontrado" }, { status: 404 });
    }

    const result = await emailPanelistaPago(
      authUser.user.email,
      authUser.user.user_metadata?.full_name ?? "Panelista",
      pago.concept ?? "Participación en encuesta",
      pago.amount,
    );

    return NextResponse.json({ ok: true, emailId: result.data?.id });
  } catch (err) {
    console.error("[email/pago-procesado]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
