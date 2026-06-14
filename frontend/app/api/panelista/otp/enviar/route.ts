import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase-service";
import { whatsappDisponible } from "@/lib/whatsapp";

function generarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("57")) return digits;
  if (digits.startsWith("3") && digits.length === 10) return `57${digits}`;
  return digits;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const anonClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await anonClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { phone } = await req.json();
  if (!phone) return NextResponse.json({ error: "Teléfono requerido" }, { status: 400 });

  const supabase = createServiceClient();

  // Obtener participant_id
  const { data: participant } = await supabase
    .from("participants")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!participant) return NextResponse.json({ error: "Participante no encontrado" }, { status: 404 });

  // Invalidar OTPs anteriores
  await supabase.from("otp_codes")
    .update({ used: true })
    .eq("participant_id", participant.id)
    .eq("used", false);

  // Crear nuevo OTP
  const code = generarCodigo();
  const expires_at = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  await supabase.from("otp_codes").insert({
    participant_id: participant.id,
    phone,
    code,
    expires_at,
  });

  // Enviar por WhatsApp
  if (!whatsappDisponible()) {
    return NextResponse.json({ error: "WhatsApp no configurado" }, { status: 503 });
  }

  const normalizedPhone = normalizePhone(phone);
  const SP_URL = "https://api.sendpulse.com";

  // Obtener token SendPulse
  const tokenRes = await fetch(`${SP_URL}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.SENDPULSE_API_ID,
      client_secret: process.env.SENDPULSE_API_SECRET,
    }),
  });
  if (!tokenRes.ok) return NextResponse.json({ error: "Error enviando OTP" }, { status: 500 });
  const { access_token } = await tokenRes.json();

  const waRes = await fetch(`${SP_URL}/whatsapp/contacts/sendTemplateByPhone`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${access_token}` },
    body: JSON.stringify({
      bot_id: process.env.SENDPULSE_WA_BOT_ID,
      phone: normalizedPhone,
      template: {
        name: "verificacion_otp",
        language: { policy: "deterministic", code: "es" },
        components: [{
          type: "body",
          parameters: [{ type: "text", text: code }],
        }],
      },
    }),
  });

  const waBody = await waRes.text();
  if (!waRes.ok) {
    console.error("[otp/enviar] WA error:", waBody);
    return NextResponse.json({ error: "Error enviando WhatsApp" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
