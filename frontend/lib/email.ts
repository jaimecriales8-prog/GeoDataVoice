import { Resend } from "resend";

// Lazy init — evita error en build cuando RESEND_API_KEY no está definida
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY no definida");
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// Subdominio geodatavoice.grialtech.co pendiente de verificar en Resend (requiere plan superior).
// Mientras tanto se envía desde el dominio raíz ya verificado, con dirección distintiva.
const FROM = "GeoDataVoice <geodatavoice@grialtech.co>";

// ── Templates ─────────────────────────────────────────────────────────────────

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GeoDataVoice</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
        <!-- Logo -->
        <tr><td style="padding-bottom:32px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="background:#2563eb;border-radius:10px;width:36px;height:36px;display:inline-block;text-align:center;line-height:36px;font-size:20px;">📍</div>
            <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">GeoDataVoice</span>
          </div>
        </td></tr>
        <!-- Card -->
        <tr><td style="background:#1e293b;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.05);">
          ${content}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding-top:24px;text-align:center;color:#475569;font-size:12px;">
          <p style="margin:0;">GeoDataVoice · Inteligencia territorial validada · Colombia</p>
          <p style="margin:4px 0 0;">Este correo es automático. No respondas a este mensaje.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Funciones de envío ────────────────────────────────────────────────────────

/** Admin: nuevo cliente pendiente de activación */
export async function emailAdminNuevoCliente(clienteNombre: string, clienteEmail: string, orgNombre: string) {
  return getResend().emails.send({
    from: FROM,
    to: process.env.ADMIN_EMAIL ?? "jaimecriales8@icloud.com",
    subject: `Nuevo cliente pendiente de activación — ${orgNombre}`,
    html: baseTemplate(`
      <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px;">Nuevo cliente registrado</h2>
      <p style="color:#94a3b8;margin:0 0 24px;font-size:15px;">Un cliente está esperando activación en GeoDataVoice.</p>
      <table width="100%" style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr><td style="color:#64748b;font-size:13px;padding-bottom:8px;">Organización</td></tr>
        <tr><td style="color:#ffffff;font-size:16px;font-weight:600;padding-bottom:16px;">${orgNombre}</td></tr>
        <tr><td style="color:#64748b;font-size:13px;padding-bottom:8px;">Contacto</td></tr>
        <tr><td style="color:#ffffff;font-size:15px;padding-bottom:8px;">${clienteNombre}</td></tr>
        <tr><td style="color:#60a5fa;font-size:14px;">${clienteEmail}</td></tr>
      </table>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://geodatavoice-dashboard-git-main-jaime-criales-projects.vercel.app"}/dashboard/clientes"
        style="display:block;background:#2563eb;color:#ffffff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;">
        Ir al panel de administración →
      </a>
    `),
  });
}

/** Cliente: cuenta activada */
export async function emailClienteActivado(clienteEmail: string, clienteNombre: string) {
  return getResend().emails.send({
    from: FROM,
    to: clienteEmail,
    subject: "Tu cuenta en GeoDataVoice ha sido activada",
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="background:rgba(16,185,129,0.15);border-radius:50%;width:64px;height:64px;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:32px;">✅</div>
        <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px;">¡Tu cuenta está activa!</h2>
        <p style="color:#94a3b8;margin:0;font-size:15px;">Hola ${clienteNombre}, tu acceso a GeoDataVoice ha sido habilitado.</p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://geodatavoice-dashboard-git-main-jaime-criales-projects.vercel.app"}/login"
        style="display:block;background:#2563eb;color:#ffffff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:20px;">
        Ingresar a mi panel →
      </a>
      <p style="color:#64748b;font-size:13px;text-align:center;margin:0;">
        Desde tu panel podrás crear proyectos, diseñar encuestas y ver los resultados de tus mediciones territoriales.
      </p>
    `),
  });
}

/** Panelista: encuesta disponible */
export async function emailPanelistaNuevaEncuesta(
  panelistaEmail: string,
  panelistaNombre: string,
  encuestaNombre: string,
  proyectoNombre: string,
) {
  return getResend().emails.send({
    from: FROM,
    to: panelistaEmail,
    subject: `Nueva encuesta disponible — ${encuestaNombre}`,
    html: baseTemplate(`
      <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px;">¡Tienes una encuesta nueva!</h2>
      <p style="color:#94a3b8;margin:0 0 24px;font-size:15px;">Hola ${panelistaNombre}, hay una nueva encuesta esperándote.</p>
      <table width="100%" style="background:#0f172a;border-radius:12px;padding:20px;margin-bottom:24px;">
        <tr><td style="color:#64748b;font-size:13px;padding-bottom:4px;">Encuesta</td></tr>
        <tr><td style="color:#ffffff;font-size:16px;font-weight:600;padding-bottom:12px;">${encuestaNombre}</td></tr>
        <tr><td style="color:#64748b;font-size:13px;padding-bottom:4px;">Proyecto</td></tr>
        <tr><td style="color:#94a3b8;font-size:14px;">${proyectoNombre}</td></tr>
      </table>
      <div style="background:rgba(245,158,11,0.1);border-radius:10px;padding:16px;margin-bottom:24px;text-align:center;">
        <p style="color:#fbbf24;font-weight:600;margin:0;font-size:15px;">💰 Recibirás un pago por completarla</p>
      </div>
      <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "https://geodatavoice-dashboard-git-main-jaime-criales-projects.vercel.app"}/campo/panelista"
        style="display:block;background:#f59e0b;color:#ffffff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;">
        Responder encuesta ahora →
      </a>
    `),
  });
}

/** Panelista: pago procesado */
export async function emailPanelistaPago(
  panelistaEmail: string,
  panelistaNombre: string,
  concepto: string,
  monto: number,
) {
  return getResend().emails.send({
    from: FROM,
    to: panelistaEmail,
    subject: "Tu pago ha sido procesado — GeoDataVoice",
    html: baseTemplate(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;margin-bottom:16px;">💳</div>
        <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px;">Pago procesado</h2>
        <p style="color:#94a3b8;margin:0;font-size:15px;">Hola ${panelistaNombre}, tu pago está en camino.</p>
      </div>
      <table width="100%" style="background:#0f172a;border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
        <tr><td style="color:#64748b;font-size:13px;padding-bottom:8px;">${concepto}</td></tr>
        <tr><td style="color:#10b981;font-size:32px;font-weight:700;">$${monto.toLocaleString("es-CO")} COP</td></tr>
      </table>
      <p style="color:#64748b;font-size:13px;text-align:center;margin:0;">
        El pago llegará a tu Nequi o Daviplata en las próximas 48 horas.
      </p>
    `),
  });
}
