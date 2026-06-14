// SendPulse WhatsApp Business API
// Docs: https://sendpulse.com/integrations/api/whatsapp
//
// Variables de entorno requeridas:
//   SENDPULSE_API_ID      — "User ID" en Account > API
//   SENDPULSE_API_SECRET  — "Secret" en Account > API
//   SENDPULSE_WA_BOT_ID   — ID del canal WhatsApp en Messengers > WhatsApp > channel settings
//
// Plantillas requeridas en SendPulse (Messengers > WhatsApp > Templates):
//   nueva_encuesta     — parámetros: {{1}} nombre, {{2}} nombre_encuesta, {{3}} link
//   recordatorio       — parámetros: {{1}} nombre, {{2}} nombre_encuesta, {{3}} link
//   pago_aprobado      — parámetros: {{1}} nombre, {{2}} monto_cop

const SP_URL = "https://api.sendpulse.com";

let _token: string | null = null;
let _tokenExp = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExp) return _token;
  const res = await fetch(`${SP_URL}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: process.env.SENDPULSE_API_ID,
      client_secret: process.env.SENDPULSE_API_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`SendPulse auth failed: ${res.status}`);
  const data = await res.json();
  _token = data.access_token;
  _tokenExp = Date.now() + (data.expires_in - 60) * 1000;
  return _token!;
}

function normalizePhone(phone: string): string {
  // Asegurar formato E.164 sin el +
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("57")) return digits;
  if (digits.startsWith("3") && digits.length === 10) return `57${digits}`;
  return digits;
}

async function sendTemplate(phone: string, templateName: string, params: string[]): Promise<boolean> {
  if (!process.env.SENDPULSE_API_ID || !process.env.SENDPULSE_WA_BOT_ID) return false;
  try {
    const token = await getToken();
    const res = await fetch(`${SP_URL}/whatsapp/contacts/sendByPhone`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        bot_id: process.env.SENDPULSE_WA_BOT_ID,
        phone: normalizePhone(phone),
        message: {
          type: "template",
          template: {
            name: templateName,
            language: { code: "es_ES" },
            components: [{
              type: "body",
              parameters: params.map(text => ({ type: "text", text })),
            }],
          },
        },
      }),
    });
    const body = await res.text();
    if (!res.ok) console.error(`[whatsapp] sendTemplate ${templateName} error ${res.status}:`, body);
    return res.ok;
  } catch (e) {
    console.error(`[whatsapp] sendTemplate ${templateName} failed:`, e);
    return false;
  }
}

/** Notificar a un panelista de una nueva encuesta */
export async function whatsappNuevaEncuesta(phone: string, nombre: string, encuestaNombre: string, link: string) {
  return sendTemplate(phone, "nueva_encuesta", [nombre, encuestaNombre, link]);
}

/** Recordatorio de encuesta pendiente */
export async function whatsappRecordatorio(phone: string, nombre: string, encuestaNombre: string, link: string) {
  return sendTemplate(phone, "recordatorio", [nombre, encuestaNombre, link]);
}

/** Confirmación de pago aprobado */
export async function whatsappPagoAprobado(phone: string, nombre: string, montoCOP: number) {
  return sendTemplate(phone, "pago_aprobado", [nombre, montoCOP.toLocaleString("es-CO")]);
}

/** Verifica si SendPulse está configurado */
export function whatsappDisponible(): boolean {
  return !!(process.env.SENDPULSE_API_ID && process.env.SENDPULSE_API_SECRET && process.env.SENDPULSE_WA_BOT_ID);
}
