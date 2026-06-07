# TASKS.md — GeoDataVoice Backlog
> Última actualización: 2026-06-06

## Leyenda
- `[ ]` Pendiente
- `[~]` En progreso
- `[x]` Completado
- **P0** Sin esto no hay MVP | **P1** Importante para demo | **P2** Post-validación

---

## P0 — Crítico (bloqueantes para primer uso real)

### Bugs activos
- [x] **B2** Insert en `field_operators` al registrar encuestador — agregado `field_operators.user_id`; el registro inserta el operador vinculado; el home del encuestador ya consulta por `user_id`.
- [x] **B3** Panelista conectado a encuestas reales — home carga surveys (status sent/ready, no respondidas) + pagos reales
- [x] **B4** Flujo de encuesta real — carga preguntas por survey_id, guarda en `responses` + audio en Storage + `audio_responses`. Probado end-to-end (3 respuestas + 3 audios).

### Auth & seguridad
- [x] **P0-01** Gate de verificación en middleware — bloquea `/campo/*` si panelista con `kyc_status != approved`, respetando `platform_config` (sin loops)
- [ ] **P0-02** Proteger `/campo/*` por rol — el middleware solo verifica sesión, no rol; un cliente podría acceder a `/campo/panelista`

### Flujo de respuesta real
- [x] **P0-03** Cargar preguntas reales de Supabase en el flujo de encuesta
- [x] **P0-04** Guardar respuestas en tabla `responses` al completar encuesta
- [x] **P0-05** Upload audio a Storage (`geodatavoice-audio`) vía `/api/audio/upload` (service role) + registro en `audio_responses`
- [x] **P0-06** Bucket `geodatavoice-audio` creado (privado, sin filtro de mime — Safari manda mp4)

### Supabase Edge Functions
- [x] **P0-07** Edge Function `process-audio` — Whisper-1 (transcripción) + **Claude `claude-opus-4-8`** (NLP, no GPT) → `nlp_outputs`. Desplegada, con trigger automático (pg_net) en INSERT de `audio_responses` quality=pending. Probada end-to-end (capta sarcasmo). Modelo configurable vía secret `CLAUDE_MODEL`.

---

## P1 — Demo con clientes (semanas 3–6)

### Dashboard resultados cliente
- [x] **Fix 404 sidebar cliente** — creadas `/cliente/encuestas` y `/cliente/resultados`.
- [x] **P1-01** Tableros de resultados — **por encuesta** y **por proyecto**.
  - Encuesta: KPIs + sentimiento (donut) + temas (barras) + emociones + voces ciudadanas + distribución por pregunta.
  - Proyecto: foto agregada + **evolución por ola** (sentimiento y favorabilidad % en líneas recharts) + **indicadores de seguimiento** (misma pregunta entre olas vía `tracking_key`).
  - Metodología: cada proyecto = olas (waves). NLP comparable entre olas; preguntas cerradas se rastrean por `tracking_key`; favorabilidad = % de `favorable_values` (top-box) por ola.
  - Esquema agregado: `surveys.perfil_objetivo`, `questions.tracking_key/favorability/favorable_values`. Esto arregló el **bug de crear-encuesta** (insertaba `perfil_objetivo`/`audio_prompt` inexistentes).
  - ⚠ aún sin verificar ownership proyecto↔cliente (cierra con RLS, P2-01).
- [ ] **P1-02** Encuesta detalle — `/cliente/proyectos/[id]/encuestas/[eid]` con estadísticas por pregunta y listado de respuestas
- [ ] **P1-03** Exportar resultados CSV/PDF desde panel cliente

### Encuestador — flujo campo completo
- [x] **P1-04** "Encuestar en campo" — selección de encuesta OBLIGATORIA → datos + perfil socioeconómico → identidad (condicional) → consentimientos → GPS → encuesta. Guarda en `responses` con `encuestador_id` (columna agregada; sin ella fallaba). Si la persona ya existe (documento), reutiliza su registro (no bloquea). Paga `encuesta_campo_cop`.
- [x] **P1-05** GPS de visita en `field_visits` (operator_id).
- [x] **Encuestar ≠ Reclutar** — reclutar = auto-registro del panelista DESDE SU CELULAR con código del encuestador → bono. Encuestar no genera bono.
- [x] **Reclutamiento con bono** — `field_operators.recruiter_code`; `participants.recruited_by` (por código en auto-registro + prefill `?ref=`); control en `dashboard/encuestadores` (conteo) y `dashboard/pagos` (bono = reclutados × `payment_config.bono_reclutamiento_cop`). Código visible en home encuestador + pantalla de éxito.
- [x] **Reuso de datos (claim)** — `claim_field_participant`: encuestado que se vuelve panelista (mismo documento) reutiliza registro + verificación + historial. Prefill por documento.
- [x] **Toggle validación identidad en calle** — admin global (`platform_config.field_identity_verification`) + cliente por proyecto (`projects.field_identity_required`).
- [x] **Demografía del encuestado** — estrato, edad, nivel estudios, actividad(multi), estado civil, hijos, régimen salud, SISBEN, vivienda, grupo étnico, antigüedad barrio, subsidios, internet, registrado para votar.
- [ ] **P1-04b** Segmentar tableros de resultados por demografía (favorabilidad por estrato/régimen/etc.).

### Notificaciones y emails
- [x] **P1-06** Email de activación al cliente cuando admin aprueba su cuenta — `/api/email/cliente-activado` + integrado en `dashboard/clientes`
- [x] **P1-07** Notificación al panelista cuando hay nueva encuesta — `/api/email/nueva-encuesta` + integrado al publicar encuesta
- [ ] **P1-06b** Integrar `/api/email/pago-procesado` en `dashboard/pagos` (endpoint listo, falta llamarlo al aprobar pago)
- [ ] **P1-06c** Configurar SMTP de Resend en Supabase Auth (confirmar registro / recuperar contraseña) — en progreso
- [ ] **P1-06d** Verificar subdominio `geodatavoice.grialtech.co` en Resend cuando se suba de plan (hoy se envía desde la raíz `grialtech.co`)
- [ ] **P1-06e** Agregar variables de email a Preview en Vercel (hoy solo en Production)

### Auth / onboarding por correo
- [x] **P1-19** Confirmación de email vía **token_hash + verifyOtp** (no PKCE) — arregla "Enlace inválido o expirado" que fallaba siempre al abrir el enlace en otro dispositivo. Ruta `/auth/confirm`, plantillas reescritas (confirmación/recuperación/cambio correo/magic link), página `/auth/reset-password`. Ver ADR-019.

### Segmentación de encuestas
- [x] **P1-20** Público objetivo segmentado por variables del panelista (`surveys.audiencia` jsonb + `lib/segmentacion.ts`). Creación: "Cualquier persona" vs "Segmentar"; home panelista filtra por coincidencia; detalle de proyecto muestra "Segmentada". Ver ADR-020.
- [x] **P1-25** Ponderación demográfica de resultados (`surveys.ponderacion` jsonb). El cliente asigna pesos por grupo (ej. estrato) al crear la encuesta; los % por pregunta se balancean (suma de pesos); la vista muestra % ponderado + crudo + badge. Ver ADR-022.
- [x] **P1-25b** Editor de ponderación en la página de resultados por encuesta (`components/ponderacion-editor.tsx`): ajusta pesos post-recolección, guarda `surveys.ponderacion` y recalcula en vivo (solo dueño/admin).
- [x] **P1-25c** Ponderadas las series del tablero de proyecto (sentimiento por ola, favorabilidad por ola e indicadores de seguimiento) con el mismo peso demográfico.

### Calidad de datos
- [x] **P1-23** Todos los campos obligatorios en el **registro del panelista** (datos + perfil socioeconómico + actividad ≥1 + billetera + número) con validación específica y `passwordCumple`.
- [x] **P1-24** Todos los campos obligatorios en **"Encuestar en campo"** (mismo set), para consistencia y segmentación/ponderación.

### UX / registro y admin
- [x] **P1-21** Barra de fortaleza de contraseña + condiciones + coincidencia en los 3 registros (`components/password-strength.tsx`).
- [x] **P1-22** Toggles globales del admin unificados en el panel principal (`components/admin-config-toggles.tsx`); Configuración reusa el mismo componente.

### Panel del panelista
- [x] **P1-13** Header con nombre del panelista + acceso a perfil (se quitó la estrella decorativa) + cerrar sesión.
- [x] **P1-13b** Botón Cerrar sesión también en el header del home (no solo en Perfil) para evitar editar datos por error.
- [x] **P1-14** Página `/campo/panelista/perfil` — editar correo (Supabase Auth `updateUser` → email de confirmación), teléfono, billetera (Nequi/Daviplata) y número.
- [x] **P1-15** Selector Nequi/Daviplata separado del número — nuevas columnas `participants.phone`, `payment_wallet`, `payment_number` (en claro, para contacto y dispersión). Se guardan en registro y edición.
- [x] **P1-16** El registro del panelista captura el **mismo perfil socioeconómico** que el flujo de campo (estrato, estado civil, estudios, actividades, hijos, salud, SISBEN, vivienda, grupo étnico, antigüedad barrio, subsidios, internet, registro electoral). Prefill reutiliza estos campos si ya fue encuestado.
- [x] **P1-17** El panelista puede **editar** todo ese perfil socioeconómico desde Mi perfil (los datos cambian con el tiempo).
- [ ] **P1-18** Histórico del perfil socioeconómico — hoy al editar se sobrescribe; decidir si se versiona para análisis longitudinal.

### Pagos a panelistas
- [x] **Ganancias devengadas en vivo** — home panelista ("ganado este mes" + "total" = encuestas × `encuesta_cop` + audios × `audio_cop`); home encuestador ("ganado este mes" = reclutados × bono + encuestas campo × `encuesta_campo_cop`). Calculado desde la actividad, no desde `payments`.
- [x] **P1-10** Configuración de tarifas en `dashboard/pagos` conectada a `payment_config` (incl. bono reclutamiento)
- [ ] **P1-08/09** Dispersión real de pagos: registrar cada pago en `payments` (Nequi/Daviplata) para distinguir devengado vs pagado vs por cobrar. Hoy se muestra solo lo devengado.

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

- [~] **P2-01** RLS policies en todas las tablas (desactivado — MVP). PARCIAL: guard de ownership client-side en tableros de resultados (cliente solo ve sus proyectos; admin todo). FALTA: RLS real a nivel BD en las 15 tablas con políticas por rol (panelista/encuestador/cliente/admin) + probar cada flujo. Tarea dedicada (riesgosa, no apurar).
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
