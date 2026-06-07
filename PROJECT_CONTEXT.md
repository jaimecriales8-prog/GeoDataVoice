# PROJECT_CONTEXT.md — GeoDataVoice
> Actualizado: 2026-06-06 | Producción: https://geodatavoice.grialtech.co

---

## Resumen Ejecutivo

**GeoDataVoice** es una plataforma de inteligencia territorial para Colombia que recluta ciudadanos verificados, los organiza en paneles georreferenciados y mide su opinión de forma recurrente mediante encuestas web y notas de voz analizadas con IA (Whisper + Claude `claude-opus-4-8`).

**Problema:** Alcaldes, gobernadores, candidatos y gremios toman decisiones con información incompleta. Las encuestas tradicionales son episódicas y costosas. GeoDataVoice provee medición recurrente, accesible y territorializada con análisis de voz como diferencial.

**Estado actual:** ~70% de avance. Flujo end-to-end operativo: registro de los 3 perfiles, encuestar en campo (con perfil socioeconómico + identidad opcional + GPS), auto-registro de panelista (con claim/reuso de datos), respuesta de encuestas con audio, pipeline de IA (Whisper+Claude) automático, tableros de resultados (por encuesta y por proyecto), y panel de panelista con edición de perfil. Tablas en Supabase operativas (RLS aún desactivado).

---

## Arquitectura

**Frontends (Next.js 16) → Supabase directamente.** El backend FastAPI (`backend/`) está descontinuado — solo sirve como referencia de lógica de negocio. No continuar desarrollo allí.

```
frontend/ (Next.js 16 — puerto 3010 local, Vercel en prod)
  /                    → Landing comercial
  /login               → Login Supabase Auth
  /registro            → Selector de perfil (cliente/encuestador/panelista)
  /registro/cliente    → Registro cliente → Supabase Auth + insert clients
  /registro/encuestador → Registro encuestador → Supabase Auth
  /registro/panelista  → Registro panelista → Supabase Auth + insert participants

  /dashboard/          → Panel ADMINISTRADOR (sidebar azul oscuro)
    /clientes          → CRUD + activar/rechazar pendientes
    /panelistas        → Lista + filtros + cambiar estado inline
    /encuestadores     → CRUD + roles
    /proyectos         → Lista (proyectos los crean los clientes)
    /pagos             → Tarifa global + tarifa por cliente

  /cliente/            → Panel CLIENTE (sidebar violeta)
    /proyectos         → Lista proyectos del cliente
    /proyectos/nuevo   → Crear proyecto (tipo + propósito + fechas)
    /proyectos/[id]    → Detalle + lista de encuestas
    /proyectos/[id]/encuestas/nueva → Crear encuesta con preguntas + perfil_objetivo
    /encuestas         → Lista global de encuestas de todos los proyectos del cliente
    /resultados        → Tablero de resultados (placeholder — real es P1-01, depende de nlp_outputs)

  /campo/              → Vistas de campo (panelista + encuestador)
    /panelista         → Home panelista (nombre en header, encuestas pendientes reales, ganado del mes/total devengado)
    /panelista/encuesta/[id] → Flujo de encuesta con audio
    /panelista/pagos   → Historial de pagos (devengado real por usuario)
    /panelista/perfil  → Editar correo (Auth), teléfono, billetera (Nequi/Daviplata + número) y perfil socioeconómico completo + cerrar sesión
    /encuestador       → Home encuestador (ganado del mes: reclutamiento + encuestas, código reclutador, encuestas)
    /encuestador/registrar → "Encuestar en campo": selección encuesta → datos + perfil socioeconómico → identidad (opcional) → consentimientos → GPS → encuesta
    /verificar-identidad → KYC del panelista (simulación / AutenTIC)

Supabase: https://bsjiqatcqbjqmtytlgll.supabase.co (us-west-2)
GitHub: https://github.com/jaimecriales8-prog/GeoDataVoice.git
Producción: https://geodatavoice.grialtech.co (Vercel, proyecto geodatavoice-dashboard)
```

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.7 (App Router) + React 19 + TypeScript 5 |
| Estilos | Tailwind CSS v4 + Lucide React |
| Auth + DB | Supabase (PostgreSQL + Auth + Storage) |
| Data fetching | TanStack React Query 5 + @supabase/ssr |
| Charts | Recharts 3 (tableros de resultados) |
| Offline queue | idb 8 (IndexedDB — campo) |
| IA | OpenAI Whisper-1 (transcripción) + **Claude `claude-opus-4-8`** (análisis NLP) via Edge Function |

---

## Integraciones externas (conexiones)

| Servicio | Para qué | Cómo se conecta | Estado |
|---|---|---|---|
| **Supabase** | DB + Auth + Storage + Edge Functions | proyecto `bsjiqatcqbjqmtytlgll`. `@supabase/ssr` (cliente), service role (route handlers + Edge) | ✅ activo |
| **Resend (API)** | Emails de negocio (cliente activado, nueva encuesta, pago) | `lib/email.ts` lazy init, route handlers `/api/email/*`. Remitente `geodatavoice@grialtech.co` | ✅ activo |
| **Resend (SMTP)** | Emails de sistema de Supabase Auth (confirmar/recuperar) | SMTP en Supabase Auth: `smtp.resend.com:465`, user `resend`. Plantillas en español | ✅ activo |
| **OpenAI Whisper-1** | Transcripción de notas de voz | Edge Function `process-audio` (fetch `api.openai.com`). Secret `OPENAI_API_KEY` | ✅ activo (requiere saldo) |
| **Anthropic Claude** | Análisis NLP de las transcripciones | Edge Function `process-audio` (fetch `api.anthropic.com`). Secret `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | ✅ activo |
| **AutenTIC (Veriff)** | KYC de panelistas | SDK Veriff (cdn.veriff.me) + webhook `/api/identidad/webhook` (HMAC). Cuenta `saas-3` | ⏸️ en simulación (credenciales validadas, webhook sin configurar) |
| **Vercel** | Hosting/deploy | proyecto `geodatavoice-dashboard`, scope `jaime-criales-projects`. Dominio `geodatavoice.grialtech.co` | ✅ activo |

**Edge Function `process-audio`** (Deno): Storage → Whisper → Claude → `nlp_outputs`. Disparo automático
por trigger pg_net en INSERT de `audio_responses` (quality=pending). Deploy: `npx supabase functions deploy`.

**Route handlers** (`frontend/app/api/`): `email/{cliente-activado,nueva-encuesta,pago-procesado}`,
`identidad/{simular,webhook}`, `audio/upload`. Service role vía `lib/supabase-service.ts`.

---

## Tablas en Supabase (RLS desactivado — MVP)

| Tabla | Descripción |
|---|---|
| `clients` | Clientes contratantes. `status`: pending → active/inactive |
| `projects` | Proyectos por cliente. `type`. **`field_identity_required`** (bool nullable=hereda global) |
| `surveys` | Encuestas por proyecto. **`perfil_objetivo`** panelista/encuestador/ambos. **`audiencia`** (jsonb) filtros de público objetivo por variable (null=cualquiera). **`ponderacion`** (jsonb) pesos por valor de variable para balancear resultados (null=sin ponderar). `status`: draft/ready/sent/closed |
| `questions` | Preguntas. `type`, `options`(jsonb), `order`. **`tracking_key`** (indicador entre olas), **`favorability`**, **`favorable_values`** |
| `participants` | Personas. doc+phone SHA-256 (`document_hash`, `phone_hash`) para dedup. `id`=auth.users.id. **`user_id`**, **`recruited_by`**→field_operators. Contacto/pago en claro: **`phone`**, **`payment_wallet`** (nequi/daviplata), **`payment_number`**. Demografía: estrato, birth_year, nivel_estudios, actividades(jsonb), estado_civil, num_hijos, regimen_salud, sisben_grupo, tenencia_vivienda, grupo_etnico, antiguedad_barrio, recibe_subsidios, acceso_internet, registrado_votar. `name_encrypted` (texto plano por ahora). El panelista captura/edita el **mismo** set de campos que el flujo de campo |
| `panel_memberships` | Participante ↔ proyecto ↔ cohorte |
| `field_operators` | Encuestadores. `user_id`→auth, **`recruiter_code`** (código de reclutador) |
| `field_visits` | GPS de visitas del encuestador (`operator_id`, lat/lon) |
| `consents` | Consentimientos versionados (v1.0) |
| `responses` | Respuestas. `participant_id`, `survey_id`, `question_id`, `value`, **`encuestador_id`** (si fue en campo), `responded_at` |
| `audio_responses` | Audio. `response_id`, `audio_url`(path Storage), `transcription`, `quality`: pending/processed/error |
| `nlp_outputs` | 9 variables IA (vincula por `audio_id`): sentiment, emotion, intensity, main_topic, topics, narrative, summary, citizen_quote, actor_mentioned, opinion_driver, confidence |
| `payments` | Pagos a panelistas (dispersión real pendiente) |
| `payment_config` | Tarifas: encuesta_cop / audio_cop / encuesta_campo_cop / **bono_reclutamiento_cop** |
| `client_payment_config` | Tarifa por cliente (override) |
| `platform_config` | key/value jsonb. Keys: `identity_verification` (KYC panelista), `field_identity_verification` (identidad en calle) |

**Función RPC:** `claim_field_participant(...)` — al auto-registrarse un panelista ya encuestado en campo
(mismo documento), reutiliza su registro + verificación + re-apunta su historial al nuevo id.

**Auth por correo (token_hash):** los enlaces de correo usan el flujo token_hash (`/auth/confirm` →
`verifyOtp`), NO PKCE — funciona entre dispositivos. `/auth/reset-password` para recuperación.
Plantillas configuradas en español vía Management API. Enlaces válidos 1 hora.

**Segmentación de audiencia:** `lib/segmentacion.ts` define las variables (`SEGMENT_VARS`),
el matcher `participanteCoincide(audiencia, participant)` y `resumenAudiencia()`. AND entre
variables, OR dentro de cada una; listas (actividades) por intersección.

---

## Roles del Sistema

| Rol | Acceso | Cómo llega |
|---|---|---|
| **admin** | `/dashboard` | Creado manualmente (no hay registro público) |
| **cliente** | `/cliente` | Registro en `/registro/cliente` → aprobación admin |
| **encuestador** | `/campo/encuestador` | Registro en `/registro/encuestador` (genera código reclutador) |
| **panelista** | `/campo/panelista` | Registro en `/registro/panelista` (opcional código reclutador) → gate KYC |

Login redirige por `user_metadata.role`. Middleware: protege `/dashboard|/cliente|/campo` + gate KYC del panelista.

### Modelo Encuestar vs Reclutar
- **Encuestar en campo** (`/campo/encuestador/registrar`): encuestador encuesta a una persona (paga `encuesta_campo_cop`). NO recluta.
- **Reclutar**: la persona se auto-registra desde su celular con el **código del encuestador** → `recruited_by` → bono. Si ya fue encuestada, se reutilizan sus datos (claim).

---

## Flujos Implementados

### Registro de usuarios
- **Cliente**: signUp Supabase + insert `clients` (status=pending) → admin activa
- **Panelista**: signUp Supabase + insert `participants` (SHA-256 doc+phone) → confirma email
- **Encuestador**: signUp Supabase → pendiente insert en `field_operators`

### Creación de encuestas (cliente)
1. Cliente va a `/cliente/proyectos/[id]`
2. Clic en "Nueva encuesta" → `/cliente/proyectos/[id]/encuestas/nueva`
3. Define: nombre, ola, fecha cierre, **perfil_objetivo** (panelista/encuestador/ambos)
4. Agrega preguntas: tipo + texto + opciones + prompt de voz opcional
5. Guarda como borrador o publica directamente

### perfil_objetivo en encuestas
- `panelista` → solo panelistas la ven en su home y la responden solos
- `encuestador` → el encuestador la aplica en campo a un panelista (respuesta va con `encuestador_id`)
- `ambos` → cualquiera de los dos puede responderla

---

## Estado Actual del Código

### Funciona correctamente
- Landing comercial, login, registro de los 3 perfiles
- Panel admin: CRUD clientes/panelistas/encuestadores, configuración de tarifas + bono reclutamiento + toggles de identidad
- Panel cliente: crear proyectos, crear encuestas (preguntas, perfil_objetivo, audio por pregunta, tracking/favorabilidad), toggle identidad por proyecto
- **Encuestar en campo** (encuestador): selección de encuesta → datos + perfil socioeconómico → identidad opcional → consentimientos → GPS → encuesta. Claim/reuso si el documento ya existe
- **Auto-registro panelista**: captura mismo perfil socioeconómico que campo, código reclutador → bono, claim de datos si ya fue encuestado
- **Panelista**: home con datos reales (encuestas pendientes, devengado), responder encuestas con audio, ver pagos, **editar perfil completo** (correo/teléfono/billetera/socioeconómico) + cerrar sesión
- **Encuestador**: home con ganado del mes (reclutamiento + encuestas) y código reclutador
- **Pipeline IA**: Edge Function `process-audio` (Whisper + Claude) con disparo automático por trigger
- **Tableros de resultados**: por encuesta y por proyecto (agregación por ola, tracking, favorabilidad)
- Emails: Resend API (negocio) + SMTP (sistema Auth), dominio propio
- Middleware protege `/dashboard`, `/cliente`, `/campo` + gate KYC panelista
- Build limpio, deploy en Vercel

### Parcialmente implementado
- KYC: funcional en modo simulación; AutenTIC real requiere configurar webhook
- Pagos: se muestra **devengado** (calculado de actividad); dispersión real a Nequi/Daviplata pendiente
- Resultados: falta segmentación por demografía (P1-04b)

### Pendiente de construir
- RLS en todas las tablas (tarea dedicada y cuidadosa — todo usa anon key hoy)
- Dispersión real de pagos (tabla `payments` + flujo de pago)
- Segmentación de tableros por variables demográficas
- AGORA (red de pares) — fase posterior
- Histórico de perfil socioeconómico (hoy se sobrescribe al editar)

---

## Pendientes Prioritarios

### Alta prioridad
1. **RLS en todas las tablas** — hoy todo usa anon key. Tarea dedicada y cuidadosa (riesgo de romper la app en producción). Priorizar datos sensibles (salud, `registrado_votar`, `payment_number`) — Ley 1581
2. **Dispersión real de pagos** — tabla `payments` + flujo; hoy solo se muestra devengado calculado

### Media prioridad
3. **Segmentación de tableros por demografía** (P1-04b) — cruzar resultados por estrato/edad/género/etc.
4. **Configurar AutenTIC Decision Webhook** para KYC real (hoy en simulación)
5. **Histórico de perfil socioeconómico** — al editar hoy se sobrescribe; decidir si se versiona para análisis longitudinal
6. **Variables de entorno en Preview de Vercel** (quedó solo Production)

### Baja prioridad
7. Landing: tarifas desde `payment_config` (hoy fijas)
8. Paginación en listados
9. Supabase Vault para cifrar `name_encrypted` (Ley 1581)
10. AGORA (red de pares) — fase posterior

---

## Bugs Conocidos

| # | Descripción | Impacto | Estado |
|---|---|---|---|
| B1 | Login redirige siempre a `/dashboard` sin importar el rol | Alto | ✅ Resuelto — redirige por `user_metadata.role` |
| B2 | Registro encuestador no inserta en `field_operators` | Medio | ✅ Resuelto — inserta + genera `recruiter_code` |
| B3 | Montos fijos hardcodeados en landing y panelista | Bajo | ⏳ Parcial — paneles usan `payment_config`; landing aún fija |
| B4 | Home panelista con datos mock | Alto | ✅ Resuelto — datos reales por usuario |
| B5 | Sin validación de sesión en `/campo/*` | Medio | ✅ Resuelto — middleware protege `/campo` + gate KYC |

---

## Configuración del Entorno

### Variables (`frontend/.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://bsjiqatcqbjqmtytlgll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Resend (emails transaccionales)
RESEND_API_KEY=re_...                         # key "sending only" (restringida)
ADMIN_EMAIL=jaimecriales8@icloud.com
NEXT_PUBLIC_APP_URL=https://geodatavoice.grialtech.co
```

### Variables en Vercel (Production) — proyecto `geodatavoice-dashboard`
Scope: `jaime-criales-projects`. Las mismas 6 variables están en Production.
`NEXT_PUBLIC_API_URL` que aparece es **legacy** del backend FastAPI descontinuado — ignorar.
⚠️ Preview quedó pendiente (bug del CLI 54.9.1 con `--yes`); agregar por dashboard si se usan deploys de rama.

### Emails — dos sistemas separados
1. **API de Resend** (`frontend/lib/email.ts`, init lazy) → emails de negocio disparados por route handlers:
   - `POST /api/email/cliente-activado` (admin activa cliente)
   - `POST /api/email/nueva-encuesta` (cliente publica encuesta → notifica panelistas, batch de 10)
   - `POST /api/email/pago-procesado` (admin aprueba pago)
2. **SMTP de Resend en Supabase Auth** → emails de sistema (confirmar registro, recuperar
   contraseña). Config: host `smtp.resend.com`, port `465`, user `resend`, pass = API key,
   sender `geodatavoice@grialtech.co`.

**Remitente (FROM):** `GeoDataVoice <geodatavoice@grialtech.co>`.
El subdominio `geodatavoice.grialtech.co` **NO está verificado** en Resend (requiere plan
superior). Solo el dominio raíz `grialtech.co` está verificado. DNS en GoDaddy (`ns45/ns46.domaincontrol.com`).

### KYC / Verificación de identidad (AutenTIC — igual que CertiLaboral)
Página `frontend/app/campo/verificar-identidad/page.tsx`. **Doble modo:**
- **Simulación** (sin `NEXT_PUBLIC_AUTENTIC_API_KEY`): captura frente/reverso/selfie con cámara
  real → `POST /api/identidad/simular` marca `participants.kyc_status=approved, status=verified`.
- **AutenTIC real** (con API key): SDK Veriff (cdn.veriff.me) → webhook
  `POST /api/identidad/webhook` (HMAC `AUTENTIC_SECRET_KEY`) marca verificado por `vendorData`.

Solo aplica a **panelistas** (`platform_config.identity_verification.required_for=["panelista"]`).
Vínculo: `participants.id === auth.users.id`. Route handlers usan `lib/supabase-service.ts`.
Variables AutenTIC: comentadas en `.env.local` → modo simulación activo.
**Pendiente:** gate en middleware para forzar verificación antes de `/campo/panelista` (P0-01).

### Comandos
```bash
# Desarrollo local
cd frontend && npm run dev -- --port 3010

# Build
cd frontend && npm run build

# Deploy (auto en push a main via Vercel)
git push origin main

# Vercel CLI (Node vía nvm — cargar primero: source ~/.nvm/nvm.sh)
npx vercel env ls production
```

---

## Próximas Tareas para Nueva Sesión

| # | Tarea | Archivo principal |
|---|---|---|
| 1 | RLS en todas las tablas (tarea dedicada y cuidadosa) | Supabase (policies) |
| 2 | Dispersión real de pagos | `frontend/app/dashboard/pagos/` + tabla `payments` |
| 3 | Segmentación de tableros por demografía | `frontend/lib/resultados.ts`, `components/resultados-*` |
| 4 | Configurar webhook AutenTIC para KYC real | `app/api/identidad/webhook` + panel AutenTIC |
| 5 | Histórico de perfil socioeconómico | esquema `participants` / tabla histórica |

---

## Prompt de Continuación

```
Estoy desarrollando GeoDataVoice, plataforma de inteligencia territorial para Colombia.
Ruta local: /Users/jaimecriales/Sites/GeoDataVoice/frontend
GitHub: https://github.com/jaimecriales8-prog/GeoDataVoice.git
Producción: geodatavoice-dashboard-git-main-jaime-criales-projects.vercel.app

## ARQUITECTURA
Next.js 16 → Supabase directamente. Sin backend intermedio.
El directorio backend/ está DESCONTINUADO — no tocar.

## SUPABASE
Proyecto: bsjiqatcqbjqmtytlgll (us-west-2)
Tablas creadas (RLS desactivado): clients, projects, surveys, questions,
participants, panel_memberships, field_operators, field_visits, consents,
responses, audio_responses, nlp_outputs, payments, payment_config, client_payment_config

## ESTRUCTURA DE RUTAS
/dashboard/*     → Admin (sidebar azul)
/cliente/*       → Cliente (sidebar violeta)
/campo/*         → Encuestador + Panelista (mobile-first)
/registro/*      → Registro público (3 perfiles)
/login           → Supabase Auth
Middleware protege /dashboard y /cliente

## ROLES (user_metadata.role en Supabase Auth)
admin → /dashboard | cliente → /cliente | panelista → /campo/panelista | encuestador → /campo/encuestador

## CONCEPTO CLAVE: perfil_objetivo en surveys
panelista → solo panelistas responden (desde su web)
encuestador → encuestador aplica a panelista en campo (response.encuestador_id ≠ null)
ambos → cualquiera

## ESTADO
Flujo end-to-end operativo (~70%). Pendiente clave: RLS (todo usa anon key),
dispersión real de pagos, segmentación de tableros por demografía.
RLS es tarea dedicada — no improvisar, puede romper producción.

## PRÓXIMA TAREA
[describe aquí lo que quieres hacer]

Lee PROJECT_CONTEXT.md antes de escribir código.
```
