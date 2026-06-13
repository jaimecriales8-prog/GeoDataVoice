# TASKS.md — GeoDataVoice Backlog
> Última actualización: 2026-06-13

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
- [x] **P0-02** Proteger `/campo/*` por rol — middleware verifica rol por subruta: `/campo/panelista/**` → solo panelista/admin; `/campo/encuestador/**` → solo encuestador/admin; cualquier otro rol redirige a `/login`.

### Flujo de respuesta real
- [x] **P0-03** Cargar preguntas reales de Supabase en el flujo de encuesta
- [x] **P0-04** Guardar respuestas en tabla `responses` al completar encuesta
- [x] **P0-05** Upload audio a Storage (`geodatavoice-audio`) vía `/api/audio/upload` (service role) + registro en `audio_responses`
- [x] **P0-06** Bucket `geodatavoice-audio` creado (privado, sin filtro de mime — Safari manda mp4)

### Supabase Edge Functions
- [x] **P0-07** Edge Function `process-audio` — Whisper-1 (transcripción) + **Claude `claude-opus-4-8`** (NLP, no GPT) → `nlp_outputs`. Desplegada, con trigger automático (pg_net) en INSERT de `audio_responses` quality=pending. Probada end-to-end (capta sarcasmo). Modelo configurable vía secret `CLAUDE_MODEL`.

---

## P1 — Demo con clientes (semanas 3–6)

### Encuestas abiertas (anónimas, sin requisito de panel)
- [x] **P1-27** Encuestas abiertas — modalidad donde cualquier persona puede responder sin ser panelista registrado, vía link público.
  - **Esquema BD:**
    - `surveys.tipo` enum `panel` (default, actual) | `abierta`
    - `surveys.abierta_identidad` boolean — si se exige verificación de identidad (AutenTIC) al responder (default false)
    - `surveys.abierta_pago` boolean — si se paga al completar (default false; requiere billetera al final)
    - `surveys.slug` text unique nullable — identificador amigable para el link público (ej. `encuesta-barranquilla-2026-01`)
  - **Link público:** `/encuesta/[slug]` — ruta pública (fuera de `/campo/*`), sin auth requerida
  - **Flujo del respondente:**
    1. Página de bienvenida con descripción de la encuesta
    2. Datos demográficos obligatorios (mismo set que panelista: estrato, edad, género, nivel estudios, actividad, estado civil, hijos, régimen salud, SISBEN, vivienda, grupo étnico, antigüedad barrio, subsidios, internet, registro electoral)
    3. Si `abierta_identidad=true` → flujo AutenTIC (simulación o real)
    4. Consentimientos (grabación de voz si aplica)
    5. GPS (opcional)
    6. Preguntas de la encuesta
    7. Si `abierta_pago=true` → captura Nequi/Daviplata + número antes de cerrar
    8. Pantalla de agradecimiento
  - **Anonimato (opcional doble):** configurable por el creador (`surveys.abierta_anonima` boolean). Si `true` → siempre anónima (solo demografía, sin nombre/contacto). Si `false` → el respondente puede elegir identificarse (nombre + email/teléfono) o quedarse anónimo; en ambos casos los datos demográficos se capturan igual. No se crea `auth.users`; se guarda un `participant` con `user_id=null`, `is_anonymous=true/false`.
  - **Deduplicación:** si el mismo `document_hash` ya existe (fue panelista o encuestado en campo), reutilizar datos demográficos pero crear nueva `response` — no bloquear, solo prefill.
  - **Creación:** en el formulario de nueva encuesta (cliente y admin), nuevo toggle "Encuesta abierta" que muestra las opciones de identidad, pago y slug. El slug se puede auto-generar o editar.
  - **Segmentación:** `surveys.audiencia` aplica igual — si el respondente no cumple el perfil, mostrar mensaje de "esta encuesta no está dirigida a tu perfil" (no bloquear, solo informar).
  - **Resultados:** los tableros existentes (`/cliente/proyectos/[id]/encuestas/[eid]`) ya muestran los datos; no requieren cambios. El tipo `abierta` se muestra como badge en la encuesta.
  - **Consideración RLS futura:** la ruta pública usará service role solo para insertar; el anon key no debe poder leer otras respuestas.

### Dashboard resultados cliente
- [x] **Fix 404 sidebar cliente** — creadas `/cliente/encuestas` y `/cliente/resultados`.
- [x] **P1-01** Tableros de resultados — **por encuesta** y **por proyecto**.
  - Encuesta: KPIs + sentimiento (donut) + temas (barras) + emociones + voces ciudadanas + distribución por pregunta.
  - Proyecto: foto agregada + **evolución por ola** (sentimiento y favorabilidad % en líneas recharts) + **indicadores de seguimiento** (misma pregunta entre olas vía `tracking_key`).
  - Metodología: cada proyecto = olas (waves). NLP comparable entre olas; preguntas cerradas se rastrean por `tracking_key`; favorabilidad = % de `favorable_values` (top-box) por ola.
  - Esquema agregado: `surveys.perfil_objetivo`, `questions.tracking_key/favorability/favorable_values`. Esto arregló el **bug de crear-encuesta** (insertaba `perfil_objetivo`/`audio_prompt` inexistentes).
  - ⚠ aún sin verificar ownership proyecto↔cliente (cierra con RLS, P2-01).
- [x] **P1-02** Encuesta detalle — `/cliente/proyectos/[id]/encuestas/[eid]` con estadísticas por pregunta y listado de respuestas individuales (tabla colapsable por participante, paginada de 25 en 25).
- [x] **P1-03** Exportar resultados CSV/PDF desde panel cliente — botón CSV (descarga con BOM UTF-8, una fila por participante) y botón PDF (window.print) en el encabezado de resultados de encuesta.

### Encuestador — flujo campo completo
- [x] **P1-04** "Encuestar en campo" — selección de encuesta OBLIGATORIA → datos + perfil socioeconómico → identidad (condicional) → consentimientos → GPS → encuesta. Guarda en `responses` con `encuestador_id` (columna agregada; sin ella fallaba). Si la persona ya existe (documento), reutiliza su registro (no bloquea). Paga `encuesta_campo_cop`.
- [x] **P1-05** GPS de visita en `field_visits` (operator_id).
- [x] **Encuestar ≠ Reclutar** — reclutar = auto-registro del panelista DESDE SU CELULAR con código del encuestador → bono. Encuestar no genera bono.
- [x] **Reclutamiento con bono** — `field_operators.recruiter_code`; `participants.recruited_by` (por código en auto-registro + prefill `?ref=`); control en `dashboard/encuestadores` (conteo) y `dashboard/pagos` (bono = reclutados × `payment_config.bono_reclutamiento_cop`). Código visible en home encuestador + pantalla de éxito.
- [x] **Reuso de datos (claim)** — `claim_field_participant`: encuestado que se vuelve panelista (mismo documento) reutiliza registro + verificación + historial. Prefill por documento.
- [x] **Toggle validación identidad en calle** — admin global (`platform_config.field_identity_verification`) + cliente por proyecto (`projects.field_identity_required`).
- [x] **Demografía del encuestado** — estrato, edad, nivel estudios, actividad(multi), estado civil, hijos, régimen salud, SISBEN, vivienda, grupo étnico, antigüedad barrio, subsidios, internet, registrado para votar.
- [x] **P1-04b** Segmentar tableros de resultados por demografía — filtro demográfico en `/cliente/proyectos/[id]/encuestas/[eid]`: selector de variable (sexo, estrato, estudios, estado civil, salud, étnico, vivienda) + chips de valor. Re-fetcha con filtro aplicado. Badge activo muestra "X de Y respuestas".

### Notificaciones y emails
- [x] **P1-06** Email de activación al cliente cuando admin aprueba su cuenta — `/api/email/cliente-activado` + integrado en `dashboard/clientes`
- [x] **P1-07** Notificación al panelista cuando hay nueva encuesta — `/api/email/nueva-encuesta` + integrado al publicar encuesta
- [x] **P1-06b** Integrar `/api/email/pago-procesado` en `dashboard/pagos` — sección "Pagos pendientes" con botón Aprobar: marca `payments.status=paid` + llama endpoint de email al panelista. 2026-06-09.
- [x] **P1-06c** Templates de email Supabase Auth — SMTP configurado + templates corregidos (token_hash, no PKCE). Confirm signup: `type=email`, Reset Password: `type=recovery&next=/auth/reset-password`. Fix bug "Enlace inválido" cross-device. Verificado 2026-06-08.
- [x] **P1-34** Agrupar encuestas por nombre en panel cliente — olas colapsadas bajo una fila por encuesta; fila muestra perfil, badge Abierta, nº de olas, fecha de cierre; click en nombre = resultados ola activa; chevron = expandir olas. 2026-06-09.
- [x] **P1-35** Navegación por olas + Evolución en detalle de encuesta — pills de ola + botón "Evolución" (mutuamente excluyentes); gráfica de sentimiento por ola + gráfica por pregunta vía `tracking_key` (line chart ≤8 opciones, bar charts lado a lado >8). 2026-06-09.
- [x] **P1-36** Agrupar encuestas en página de resultados del proyecto. 2026-06-09.
- [x] **P1-37** Copiar link de encuesta abierta desde fila expandida en detalle de proyecto. 2026-06-09.
- [x] **P1-38** Migración backfill `tracking_key` — `supabase/migrations/20260609_tracking_keys_backfill.sql`: asigna `tracking_key=id` donde es null; unifica keys por texto de pregunta dentro del mismo proyecto. 2026-06-09.
- [x] **P1-39** Captura de metadata de dispositivo en respuestas — hook `useDeviceMeta`, columna `responses.device_meta jsonb` (device_type, os, browser, language, timezone, screen, connection_type, referrer, ip_city/region/country vía ip-api.com). 2026-06-09.
- [x] **Fix** Registro panelista: `.eq("user_id",...)` en lugar de `.eq("id",...)` para guardar campos demográficos cuando el participante fue reclamado desde campo. 2026-06-09.
- [x] **Fix** Eliminar "Encuestas" del menú lateral del cliente — acceso solo desde Proyectos. 2026-06-09.
- [x] **P1-40** Visualizar `device_meta` en tab "Respondentes" — gráficas de dispositivo/OS/browser/conexión, top ciudades, fuente (referrer), duración promedio, alerta respuestas rápidas. Componente `DeviceStatsPanel` + API `/api/cliente/encuestas/device-stats`. 2026-06-13.
- [ ] **P1-06d** Verificar subdominio `geodatavoice.grialtech.co` en Resend cuando se suba de plan (hoy se envía desde la raíz `grialtech.co`)
- [ ] **P1-06e** Agregar variables de email a Preview en Vercel (hoy solo en Production)

### Auth / onboarding por correo
- [x] **P1-19** Confirmación de email vía **token_hash + verifyOtp**
- [x] **P1-28** Gestión de olas inline en detalle de proyecto — selector de ola local, "Lanzar Ola X" (duplica encuesta + preguntas), "Cerrar Ola X", bloqueo si hay ola activa. Fix duplicación: columnas explícitas en `questions` (sin `created_at`).
- [x] **P1-29** Resultados por ola — tabs "Comparación entre olas" + "Ola N" en `/cliente/proyectos/[id]/resultados`. Comparación lado a lado. Línea Neutral en gráfico de sentimiento.
- [x] **P1-30** Flujo "olvidé mi contraseña" — página `/auth/olvide-contrasena` + indicadores fortaleza/coincidencia en `/auth/reset-password`.
- [x] **P1-31** Notificaciones admin encuestadores pendientes — badge con conteo en sidebar + email al admin al registrarse nuevo encuestador + email al encuestador al ser aprobado.
- [x] **P1-32** Registro encuestador con dropdowns departamento/municipio (Colombia).
- [x] **P1-33** Stats encuestador vía service role API (`/api/campo/encuestador/stats`) — bypasa RLS en `responses`. Contadores correctos: reclutados mes / encuestas hoy / encuestas mes / ganancias devengadas. (no PKCE) — arregla "Enlace inválido o expirado" que fallaba siempre al abrir el enlace en otro dispositivo. Ruta `/auth/confirm`, plantillas reescritas (confirmación/recuperación/cambio correo/magic link), página `/auth/reset-password`. Ver ADR-019.

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
- [x] **P1-26** Panel `/cliente` responsive en móvil: sidebar solo en escritorio (`hidden md:flex`); en móvil top bar (logo + cerrar sesión) + bottom nav de 4 ítems con safe-area (`app/cliente/layout.tsx`).

### Panel del panelista
- [x] **P1-13** Header con nombre del panelista + acceso a perfil (se quitó la estrella decorativa) + cerrar sesión.
- [x] **P1-13b** Botón Cerrar sesión también en el header del home (no solo en Perfil) para evitar editar datos por error.
- [x] **P1-14** Página `/campo/panelista/perfil` — editar correo (Supabase Auth `updateUser` → email de confirmación), teléfono, billetera (Nequi/Daviplata) y número.
- [x] **P1-15** Selector Nequi/Daviplata separado del número — nuevas columnas `participants.phone`, `payment_wallet`, `payment_number` (en claro, para contacto y dispersión). Se guardan en registro y edición.
- [x] **P1-16** El registro del panelista captura el **mismo perfil socioeconómico** que el flujo de campo (estrato, estado civil, estudios, actividades, hijos, salud, SISBEN, vivienda, grupo étnico, antigüedad barrio, subsidios, internet, registro electoral). Prefill reutiliza estos campos si ya fue encuestado.
- [x] **P1-17** El panelista puede **editar** todo ese perfil socioeconómico desde Mi perfil (los datos cambian con el tiempo).
- [x] **P1-18** Histórico del perfil socioeconómico — tabla `participant_profile_history` (snapshot jsonb + captured_at). Antes de cada guardado en `/campo/panelista/perfil`, inserta un snapshot. El historial (últimas 10 entradas) aparece colapsado al final de la página con fecha + chips de valores clave. Migración en `supabase/migrations/20260607_encuestas_abiertas.sql`.

### Pagos a panelistas
- [x] **Ganancias devengadas en vivo** — home panelista ("ganado este mes" + "total" = encuestas × `encuesta_cop` + audios × `audio_cop`); home encuestador ("ganado este mes" = reclutados × bono + encuestas campo × `encuesta_campo_cop`). Calculado desde la actividad, no desde `payments`.
- [x] **P1-10** Configuración de tarifas en `dashboard/pagos` conectada a `payment_config` (incl. bono reclutamiento)
- [ ] **P1-08/09** Dispersión real de pagos: registrar cada pago en `payments` (Nequi/Daviplata) para distinguir devengado vs pagado vs por cobrar. Hoy se muestra solo lo devengado. ⏸ **Bloqueado: requiere convenio con Nequi/Daviplata.**

### Verificación de identidad
- [x] **P1-11** KYC con **AutenTIC** (Veriff Colombia) en `/campo/verificar-identidad` — doble modo (simulación + SDK real), igual que CertiLaboral
- [x] **P1-12** Webhook `/api/identidad/webhook` (HMAC) → marca `participants.kyc_status=approved, status=verified`
- [x] **P1-11b** Credenciales AutenTIC obtenidas y **validadas** (cuenta saas-3): API key crea sesiones (HTTP 201), secret firma HMAC OK (HTTP 200). Guardadas comentadas en `.env.local`.
- [ ] **P1-11b2** Configurar Decision Webhook URL en panel AutenTIC → `https://geodatavoice.grialtech.co/api/identidad/webhook`. ⏸ **Bloqueado: requiere convenio con AutenTIC.**
- [ ] **P1-11b3** Activar vars AutenTIC en `.env.local` + Vercel Production + deploy. ⏸ **Bloqueado: depende de P1-11b2.**
- [x] **P1-11c** Gate en middleware: bloquea `/campo/*` si `kyc_status != approved` (ver P0-01)
- [x] **Fix registro panelista**: insert usaba `name` (columna inexistente) → corregido a `name_encrypted` + captura de error. Antes el insert fallaba silenciosamente y `participants` quedaba vacía.

---

## P2 — Post-validación

- [x] **P2-01** RLS policies en todas las tablas — **APLICADO en producción 2026-06-08**. 16 tablas con políticas por rol (admin/cliente/panelista/encuestador). Migration `supabase/migrations/20260607_rls.sql` corrida + políticas adicionales de soporte. Verificado con `pg_policies`.
- [ ] **P2-02** Cifrado AES-256-GCM para `name` de participantes (Supabase Vault) — ver ADR-004
- [ ] **P2-03** OTP SMS para verificación de celular de panelistas
- [ ] **P2-04** AGORA — módulo de pares: `peers`, `peer_tasks`, `peer_evidences`, banco de mensajes con aprobación
- [ ] **P2-05** Mapa interactivo en dashboard cliente — Mapbox GL o Leaflet con polígonos por zona
- [x] **P2-06** Paginación en listados de panelistas, encuestadores, proyectos — 2026-06-08
- [x] **P2-07** WhatsApp via SendPulse — `lib/whatsapp.ts` + 3 route handlers (`/api/whatsapp/nueva-encuesta`, `/api/whatsapp/recordatorio`, `/api/whatsapp/pago-aprobado`). Integrado en publicación de encuesta, botón "Recordatorio WA" en detalle encuesta, y aprobación de pagos. Variables en Vercel. Plantillas `nueva_encuesta`, `recordatorio`, `pago_aprobado` creadas en SendPulse — **pendientes de aprobación Meta** (~24h). 2026-06-13.
- [ ] **P2-08** Panel rotativo automático: reglas de rotación, reemplazo por gemelos estadísticos
- [ ] **P2-09** Post-estratificación y ponderación estadística (Raking contra censo DANE)
  - **Qué:** ajustar automáticamente los pesos de la muestra para que reproduzca las distribuciones reales del territorio (corrige el sesgo del panel: ej. panel 70% mujeres vs censo 55%). Distinto de la ponderación manual del cliente (ADR-022, P1-25), que es editorial/subjetiva.
  - **Cómo:** algoritmo IPF (Iterative Proportional Fitting / raking) que itera hasta cuadrar varias variables a la vez (sexo, estrato, edad, etc.) contra las cifras del censo.
  - **Necesita:** (1) cargar tablas del censo DANE por municipio; (2) implementar IPF; (3) definir variables ancla por proyecto; (4) decidir tabla/estructura para guardar los marginales del censo.
  - **Combinación ideal:** raking corrige el sesgo muestral y, encima, el cliente puede aplicar su ponderación editorial (P1-25) si quiere dar más peso a un grupo según el tema.
- [x] **P2-10** CI/CD con GitHub Actions — `.github/workflows/ci.yml`: type-check (`tsc --noEmit`) + ESLint en cada push/PR a `main`. No bloquea el deploy (continue-on-error), solo reporta en GitHub. 2026-06-09.
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
