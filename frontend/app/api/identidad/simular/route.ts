import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";

/**
 * POST /api/identidad/simular
 * Marca el KYC del panelista como aprobado en modo SIMULACIÓN (sin AutenTIC real).
 * Bloqueado si NEXT_PUBLIC_AUTENTIC_API_KEY está definida (producción real).
 * Body: { aprobado: boolean }
 *
 * Vínculo: participants.id === auth.users.id (ver registro/panelista).
 */
export async function POST(req: NextRequest) {
  if (process.env.NEXT_PUBLIC_AUTENTIC_API_KEY) {
    return NextResponse.json({ error: "Simulación no disponible en producción" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { aprobado } = (await req.json()) as { aprobado: boolean };
  if (!aprobado) return NextResponse.json({ ok: true, aprobado });

  // El KYC biométrico aplica solo a panelistas (los encuestadores se activan por aprobación admin)
  const role = user.user_metadata?.role ?? "panelista";
  if (role !== "panelista") {
    return NextResponse.json({ ok: true, aprobado, skipped: "kyc solo aplica a panelistas" });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("participants")
    .update({ kyc_status: "approved", status: "verified" })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Verificar que el cambio persistió
  const { data: p } = await service
    .from("participants")
    .select("kyc_status")
    .eq("id", user.id)
    .single();

  if (p?.kyc_status !== "approved") {
    return NextResponse.json({ error: "No se pudo persistir la verificación" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, aprobado });
}
