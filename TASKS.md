# TASKS.md — GeoDataVoice Backlog
> Última actualización: 2026-06-05

## Leyenda
- `[ ]` Pendiente
- `[~]` En progreso
- `[x]` Completado
- **P0** Sin esto no hay MVP | **P1** Importante para demo | **P2** Post-validación

---

## P0 — Crítico (bloqueantes para primer uso real)

### Bugs activos
- [ ] **B2** Insert en `field_operators` al registrar encuestador — `frontend/app/registro/encuestador/page.tsx:42` solo hace `signUp`, no inserta en la tabla
- [ ] **B3** Conectar panelista a encuestas reales — `frontend/app/campo/panelista/page.tsx` usa `MOCK_SURVEYS` y `MOCK_PAYMENTS` hardcodeados
- [ ] **B4** Flujo de encuesta real — `frontend/app/campo/panelista/encuesta/[id]/page.tsx` usa `DEMO_QUESTIONS` y no guarda respuestas en Supabase

### Auth & seguridad
- [x] **P0-01** Gate de verificación en middleware — bloquea `/campo/*` si panelista con `kyc_status != approved`, respetando `platform_config` (sin loops)
- [ ] **P0-02** Proteger `/campo/*` por rol — el middleware solo verifica sesión, no rol; un cliente podría acceder a `/campo/panelista`

### Flujo de respuesta real
- [ ] **P0-03** Cargar preguntas reales de Supabase en el flujo de encuesta — `frontend/app/campo/panelista/encuesta/[id]/page.tsx`
- [ ] **P0-04** Guardar respuestas en tabla `responses` al completar encuesta
- [ ] **P0-05** Upload audio a Supabase Storage (bucket `geodatavoice-audio`) + crear registro en `audio_responses`
- [ ] **P0-06** Crear bucket `geodatavoice-audio` en Supabase Storage con política de acceso privado

### Supabase Edge Functions
- [ ] **P0-07** Edge Function `process-audio` — Whisper-1 (transcripción) + GPT-4o-mini (NLP) → insertar en `nlp_outputs`; disparar desde trigger en `audio_responses` o webhook

---

## P1 — Demo con clientes (semanas 3–6)

### Dashboard resultados cliente
- [ ] **P1-01** Página `/cliente/proyectos/[id]/resultados` — favorabilidad, sentimiento, temas dominantes consultando `nlp_outputs`
- [ ] **P1-02** Encuesta detalle — `/cliente/proyectos/[id]/encuestas/[eid]` con estadísticas por pregunta y listado de respuestas
- [ ] **P1-03** Exportar resultados CSV/PDF desde panel cliente

### Encuestador — flujo campo completo
- [ ] **P1-04** Flujo encuestador aplica encuesta a panelista — `campo/encuestador/registrar?survey_id=` recibe el survey, guarda respuesta con `encuestador_id`
- [ ] **P1-05** Registro GPS de visita en `field_visits` al iniciar flujo de registro de panelista

### Notificaciones y emails
- [x] **P1-06** Email de activación al cliente cuando admin aprueba su cuenta — `/api/email/cliente-activado` + integrado en `dashboard/clientes`
- [x] **P1-07** Notificación al panelista cuando hay nueva encuesta — `/api/email/nueva-encuesta` + integrado al publicar encuesta
- [ ] **P1-06b** Integrar `/api/email/pago-procesado` en `dashboard/pagos` (endpoint listo, falta llamarlo al aprobar pago)
- [ ] **P1-06c** Configurar SMTP de Resend en Supabase Auth (confirmar registro / recuperar contraseña) — en progreso
- [ ] **P1-06d** Verificar subdominio `geodatavoice.grialtech.co` en Resend cuando se suba de plan (hoy se envía desde la raíz `grialtech.co`)
- [ ] **P1-06e** Agregar variables de email a Preview en Vercel (hoy solo en Production)

### Pagos a panelistas
- [ ] **P1-08** Vista `/campo/panelista/pagos` conectada a tabla `payments` (actualmente usa mock)
- [ ] **P1-09** Lógica de creación de `payments` al completar encuesta/audio (actualmente el mensaje "+$3.000" es hardcodeado)
- [ ] **P1-10** Página de configuración de tarifas en dashboard admin — conectar a `payment_config`

### Verificación de identidad
- [x] **P1-11** KYC con **AutenTIC** (Veriff Colombia) en `/campo/verificar-identidad` — doble modo (simulación + SDK real), igual que CertiLaboral
- [x] **P1-12** Webhook `/api/identidad/webhook` (HMAC) → marca `participants.kyc_status=approved, status=verified`
- [x] **P1-11b** Credenciales AutenTIC obtenidas y **validadas** (cuenta saas-3): API key crea sesiones (HTTP 201), secret firma HMAC OK (HTTP 200). Guardadas comentadas en `.env.local`.
- [ ] **P1-11b2** ⚠️ BLOQUEANTE para modo real: configurar Decision Webhook URL en panel AutenTIC → `https://geodatavoice.grialtech.co/api/identidad/webhook`. Hasta entonces se queda en SIMULACIÓN. Cuenta saas-3 compartida con CertiLaboral (que está en simulación, sin conflicto).
- [ ] **P1-11b3** Cuando el webhook esté listo: descomentar vars en `.env.local`, cargarlas en Vercel Production, deploy.
- [x] **P1-11c** Gate en middleware: bloquea `/campo/*` si `kyc_status != approved` (ver P0-01)
- [x] **Fix registro panelista**: insert usaba `name` (columna inexistente) → corregido a `name_encrypted` + captura de error. Antes el insert fallaba silenciosamente y `participants` quedaba vacía.

---

## P2 — Post-validación

- [ ] **P2-01** RLS policies en todas las tablas (actualmente desactivado — MVP)
- [ ] **P2-02** Cifrado AES-256-GCM para `name` de participantes (Supabase Vault) — ver ADR-004
- [ ] **P2-03** OTP SMS para verificación de celular de panelistas
- [ ] **P2-04** AGORA — módulo de pares: `peers`, `peer_tasks`, `peer_evidences`, banco de mensajes con aprobación
- [ ] **P2-05** Mapa interactivo en dashboard cliente — Mapbox GL o Leaflet con polígonos por zona
- [ ] **P2-06** Paginación en listados de panelistas, encuestadores, proyectos
- [ ] **P2-07** WhatsApp Business API (360dialog o Twilio) para envío de links de encuesta
- [ ] **P2-08** Panel rotativo automático: reglas de rotación, reemplazo por gemelos estadísticos
- [ ] **P2-09** Post-estratificación y ponderación estadística (Raking contra censo)
- [ ] **P2-10** CI/CD con GitHub Actions (lint + type-check + deploy preview)
- [ ] **P2-11** Monitoreo de errores — Sentry o Vercel Analytics

---

## Completado

- [x] Arquitectura migrada a Next.js → Supabase directamente (FastAPI descontinuado)
- [x] Landing comercial completa
- [x] Login con redirección por rol (`user_metadata.role` → `/dashboard` | `/cliente` | `/campo/panelista` | `/campo/encuestador`)
- [x] Registro 3 perfiles: cliente, panelista, encuestador (Supabase Auth + insert en tablas)
- [x] Panel admin: CRUD clientes, panelistas, encuestadores, configuración de tarifas
- [x] Panel cliente: crear proyectos, crear encuestas con preguntas y `perfil_objetivo`
- [x] Home encuestador `/campo/encuestador` — conectado a Supabase: encuestas activas + stats del día
- [x] UI flujo de encuesta panelista — grabación de audio funcional (pendiente conectar a Supabase)
- [x] Flujo de registro encuestador en campo — GPS + consentimientos → Supabase
- [x] Middleware protege `/dashboard`, `/cliente`, `/campo`
- [x] 15 tablas creadas en Supabase (RLS desactivado para MVP)
- [x] Build limpio, 33 rutas (incluye 3 route handlers de email), deploy en Vercel
- [x] `lib/email.ts` con 4 templates HTML + init lazy de Resend (no rompe build sin key)
- [x] 3 route handlers de email con verificación de rol (admin/cliente)
- [x] Resend configurado: key en `.env.local` + 6 vars en Vercel Production
- [x] Remitente verificado y probado: `geodatavoice@grialtech.co` (llega a bandeja principal)
