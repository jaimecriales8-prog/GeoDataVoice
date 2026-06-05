# Plantillas de Email — Supabase Auth (en español)

> Pegar en: Supabase Dashboard → **Authentication** → **Email Templates**
> Proyecto: `bsjiqatcqbjqmtytlgll`
>
> Estas son las plantillas de **sistema** (las envía Supabase vía Resend SMTP).
> Los emails de **negocio** (cliente activado, nueva encuesta, pago) viven en `frontend/lib/email.ts`.
>
> Variables disponibles: `{{ .ConfirmationURL }}`, `{{ .Token }}`, `{{ .TokenHash }}`,
> `{{ .SiteURL }}`, `{{ .Email }}`, `{{ .RedirectTo }}`

---

## 1. Confirm signup (Confirmar registro)

**Subject:**
```
Confirma tu cuenta en GeoDataVoice
```

**Message body (HTML):**
```html
<div style="margin:0;padding:0;background:#0f172a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">📍 GeoDataVoice</span>
        </td></tr>
        <tr><td style="background:#1e293b;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.05);">
          <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px;">Confirma tu cuenta</h2>
          <p style="color:#94a3b8;margin:0 0 24px;font-size:15px;">
            ¡Bienvenido a GeoDataVoice! Para activar tu cuenta y empezar, confirma tu correo electrónico.
          </p>
          <a href="{{ .ConfirmationURL }}"
            style="display:block;background:#2563eb;color:#ffffff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:20px;">
            Confirmar mi cuenta →
          </a>
          <p style="color:#64748b;font-size:13px;text-align:center;margin:0;">
            Si no creaste esta cuenta, puedes ignorar este mensaje.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;color:#475569;font-size:12px;">
          <p style="margin:0;">GeoDataVoice · Inteligencia territorial validada · Colombia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>
```

---

## 2. Reset Password (Recuperar contraseña)

**Subject:**
```
Restablece tu contraseña — GeoDataVoice
```

**Message body (HTML):**
```html
<div style="margin:0;padding:0;background:#0f172a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">📍 GeoDataVoice</span>
        </td></tr>
        <tr><td style="background:#1e293b;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.05);">
          <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px;">Restablece tu contraseña</h2>
          <p style="color:#94a3b8;margin:0 0 24px;font-size:15px;">
            Recibimos una solicitud para cambiar la contraseña de tu cuenta. Haz clic en el botón para crear una nueva.
          </p>
          <a href="{{ .ConfirmationURL }}"
            style="display:block;background:#2563eb;color:#ffffff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:20px;">
            Crear nueva contraseña →
          </a>
          <p style="color:#64748b;font-size:13px;text-align:center;margin:0;">
            Si no solicitaste este cambio, ignora este correo. Tu contraseña actual seguirá siendo válida.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;color:#475569;font-size:12px;">
          <p style="margin:0;">GeoDataVoice · Inteligencia territorial validada · Colombia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>
```

---

## 3. Magic Link (Enlace de acceso)

**Subject:**
```
Tu enlace de acceso a GeoDataVoice
```

**Message body (HTML):**
```html
<div style="margin:0;padding:0;background:#0f172a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">📍 GeoDataVoice</span>
        </td></tr>
        <tr><td style="background:#1e293b;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.05);">
          <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px;">Inicia sesión</h2>
          <p style="color:#94a3b8;margin:0 0 24px;font-size:15px;">
            Usa este enlace para ingresar a tu cuenta de GeoDataVoice. Es válido por tiempo limitado.
          </p>
          <a href="{{ .ConfirmationURL }}"
            style="display:block;background:#2563eb;color:#ffffff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:20px;">
            Ingresar a GeoDataVoice →
          </a>
          <p style="color:#64748b;font-size:13px;text-align:center;margin:0;">
            Si no solicitaste este enlace, ignora este mensaje.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;color:#475569;font-size:12px;">
          <p style="margin:0;">GeoDataVoice · Inteligencia territorial validada · Colombia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>
```

---

## 4. Change Email Address (Cambio de correo)

**Subject:**
```
Confirma tu nuevo correo — GeoDataVoice
```

**Message body (HTML):**
```html
<div style="margin:0;padding:0;background:#0f172a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;">
        <tr><td style="padding-bottom:32px;text-align:center;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;">📍 GeoDataVoice</span>
        </td></tr>
        <tr><td style="background:#1e293b;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.05);">
          <h2 style="color:#ffffff;margin:0 0 8px;font-size:22px;">Confirma tu nuevo correo</h2>
          <p style="color:#94a3b8;margin:0 0 24px;font-size:15px;">
            Solicitaste cambiar el correo de tu cuenta a <strong style="color:#fff;">{{ .Email }}</strong>. Confirma para aplicar el cambio.
          </p>
          <a href="{{ .ConfirmationURL }}"
            style="display:block;background:#2563eb;color:#ffffff;text-decoration:none;text-align:center;padding:14px 24px;border-radius:10px;font-weight:600;font-size:15px;margin-bottom:20px;">
            Confirmar nuevo correo →
          </a>
          <p style="color:#64748b;font-size:13px;text-align:center;margin:0;">
            Si no solicitaste este cambio, contacta al soporte de inmediato.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;color:#475569;font-size:12px;">
          <p style="margin:0;">GeoDataVoice · Inteligencia territorial validada · Colombia</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>
```

---

## Notas
- El campo **Subject** y el **Message body** se editan por separado en cada pestaña del dashboard.
- Supabase NO permite cambiar el idioma globalmente; cada plantilla se traduce manualmente (estas 4).
- Tras pegar cada una, click **Save** en esa pestaña.
- Para verificar: dispara un "recuperar contraseña" y revisa que el correo llegue en español.
