import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createServiceClient } from "@/lib/supabase-service";

/**
 * Webhook de AutenTIC (Veriff Colombia) — KYC de panelistas.
 *
 * Dos formatos según el evento:
 * 1. Evento intermedio (plano): { id, attemptId, feature, code, action, vendorData }
 *    Códigos: 7001=started, 7002=submitted
 * 2. Decisión final (wrapper): { status, verification: { id, code, status, vendorData, ... } }
 *    Códigos: 9001=approved, 9102=declined, 9103=resubmission, 9104=expired
 *
 * HMAC: SHA256(AUTENTIC_SECRET_KEY, rawBody) → header x-hmac-signature
 * vendorData === auth.users.id === participants.id
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // ── Verificación HMAC ──────────────────────────────────────────────
  const secretKey = process.env.AUTENTIC_SECRET_KEY;
  const skipHmac = process.env.AUTENTIC_SKIP_HMAC === "true" || !secretKey;

  if (!skipHmac && secretKey) {
    const firmaRecibida = req.headers.get("x-hmac-signature") ?? "";
    const firmaCalculada = createHmac("sha256", secretKey).update(rawBody).digest("hex");
    if (firmaCalculada !== firmaRecibida) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // ── Formato 2: Decisión final ──────────────────────────────────────
  if (payload.verification && typeof payload.verification === "object") {
    const v = payload.verification as Record<string, unknown>;
    const status = v.status as string;
    const code = v.code as number;
    const userId = v.vendorData as string;

    console.log("[identidad/webhook] decisión final — status:", status, "code:", code, "userId:", userId);

    if (!userId) {
      return NextResponse.json({ error: "Sin vendorData" }, { status: 400 });
    }

    const service = createServiceClient();
    const esAprobado = status === "approved" || code === 9001;

    if (!esAprobado) {
      // Declined / expired / resubmission → marcar kyc_status como rechazado
      await service.from("participants")
        .update({ kyc_status: "rejected" })
        .eq("id", userId);
      return NextResponse.json({ ok: true, result: status });
    }

    const { error } = await service.from("participants")
      .update({ kyc_status: "approved", status: "verified" })
      .eq("id", userId);

    if (error) {
      console.error("[identidad/webhook] error actualizando participant:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[identidad/webhook] identidad verificada para:", userId);
    return NextResponse.json({ ok: true, result: "approved" });
  }

  // ── Formato 1: Evento intermedio ───────────────────────────────────
  const action = payload.action as string | undefined;
  const code = payload.code as number | undefined;
  console.log("[identidad/webhook] evento intermedio — action:", action, "code:", code);
  return NextResponse.json({ ok: true, skipped: action ?? code });
}
