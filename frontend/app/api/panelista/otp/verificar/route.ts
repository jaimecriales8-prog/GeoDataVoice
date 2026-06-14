import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ error: "Código requerido" }, { status: 400 });

  const supabase = createServiceClient();

  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!participant) return NextResponse.json({ error: "Participante no encontrado" }, { status: 404 });

  // Buscar OTP válido
  const { data: otp } = await supabase
    .from("otp_codes")
    .select("id, code, expires_at, phone")
    .eq("participant_id", participant.id)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!otp) return NextResponse.json({ error: "Código inválido o expirado" }, { status: 400 });
  if (otp.code !== code) return NextResponse.json({ error: "Código incorrecto" }, { status: 400 });

  // Marcar OTP como usado y phone como verificado
  await Promise.all([
    supabase.from("otp_codes").update({ used: true }).eq("id", otp.id),
    supabase.from("participants").update({ phone_verified: true, phone: otp.phone }).eq("id", participant.id),
  ]);

  return NextResponse.json({ ok: true });
}
