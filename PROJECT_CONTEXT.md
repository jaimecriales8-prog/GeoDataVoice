# PROJECT_CONTEXT.md — GeoDataVoice
> Actualizado: 2026-06-13 (v4) | Producción: https://geodatavoice.grialtech.co

---

## Resumen Ejecutivo

**GeoDataVoice** es una plataforma de inteligencia territorial para Colombia que recluta ciudadanos verificados, los organiza en paneles georreferenciados y mide su opinión de forma recurrente mediante encuestas web y notas de voz analizadas con IA (Whisper + Claude `claude-opus-4-8`).

**Problema:** Alcaldes, gobernadores, candidatos y gremios toman decisiones con información incompleta. Las encuestas tradicionales son episódicas y costosas. GeoDataVoice provee medición recurrente, accesible y territorializada con análisis de voz como diferencial.

**Estado actual:** ~92% de avance. Flujo end-to-end operativo en los 3 perfiles (panelista, encuestador, cliente), encuestas abiertas vía link público, audio en los 3 formularios de captura, departamento/municipio con datos de Colombia, tableros de resultados con filtros demográficos y ponderación. **Encuestadores con flujo de aprobación** (pending→active/inactive). **Cuotas de panel** (total, género, estrato, SISBEN, actividad — toggleables por variable). RLS parcialmente implementado (políticas críticas en su lugar). Deploy en Vercel estable.

**Novedades 2026-06-13:** Perfil del cliente editable (`/cliente/perfil`); WhatsApp via SendPulse integrado (nueva encuesta + recordatorio + pago aprobado) — plantillas pendientes aprobación Meta; visualización de `device_meta` en tab Respondentes (DeviceStatsPanel).

**Novedades 2026-06-09:** Encuestas agrupadas por nombre en panel cliente (olas colapsadas bajo una fila); navegación por olas + botón "Evolución" con gráficas de sentimiento y por pregunta vía `tracking_key`; captura de metadata de dispositivo (`device_meta jsonb`) en todas las respuestas (tipo dispositivo, OS, browser, conexión, geo-IP); fix en registro de panelista (`.eq("user_id",...)` en lugar de `.eq("id",...)`); "Encuestas" eliminada del menú lateral del cliente.

---

## Arquitectura

**Frontends (Next.js 16) → Supabase directamente.** El backend FastAPI (`backend/`) está descontinuado — solo sirve como referencia de lógica de negocio. No continuar desarrollo allí.

```
frontend/ (Next.js 16 — puerto 3010 local, Vercel en prod)
  /                    → Landing comercial
  /login               → Login Supabase Auth
  /registro            → Selector de perfil (cliente/encuestador/panelista)
  /registro/cliente    → Registro cliente → Supabase Auth + insert clients
  /registro/encuestador → Registro encuestador → Supabase Auth + field_operators
  /registro/panelista  → Registro panelista → Supabase Auth + insert participants

  /dashboard/          → Panel ADMINISTRADOR (sidebar azul oscuro)
    /clientes          → CRUD + activar/rechazar pendientes
    /panelistas        → Lista + filtros + cambiar estado inline
    /encuestadores     → CRUD + roles
    /proyectos         → Lista (proyectos los crean los clientes)
    /pagos             → Tarifa global + tarifa por cliente

  /cliente/            → Panel CLIENTE (sidebar violeta) — nav: Inicio / Proyectos / Resultados
    /proyectos         → Lista proyectos del cliente
    /proyectos/nuevo   → Crear proyecto (tipo + propósito + fechas)
    /proyectos/[id]    → Detalle + encuestas agrupadas por nombre (olas colapsadas, copiar link abierta)
    /proyectos/[id]/encuestas/nueva → Crear encuesta (preguntas + perfil_objetivo + toggle abierta)
    /proyectos/[id]/encuestas/[eid] → Resultados por encuesta (filtros + ponderación + CSV/PDF + navegación olas + Evolución)
    /proyectos/[id]/resultados → Resultados agregados por proyecto (tracking por ola, encuestas agrupadas)

  /encuesta/[slug]     → Encuesta ABIERTA pública (sin auth): bienvenida → anonimato → demografía → preguntas → pago → gracias

  /campo/              → Vistas de campo (panelista + encuestador)
    /panelista         → Home panelista (encuestas pendientes reales, devengado)
    /panelista/encuesta/[id] → Flujo de encuesta con audio
    /panelista/pagos   → Historial de pagos
    /panelista/perfil  → Editar correo, teléfono, billetera y perfil socioeconómico completo
    /encuestador       → Home encuestador (ganado del mes, código reclutador)
    /encuestador/registrar → "Encuestar en campo": selección encuesta → datos + perfil → identidad → consentimientos → GPS → encuesta
    /verificar-identidad → KYC del panelista (simulación / AutenTIC)

Supabase: https://bsjiqatcqbjqmtytlgll.supabase.co (us-west-2)
GitHub: https://github.com/jaimecriales8-prog/GeoDataVoice.git
Producción: https://geodatavoice.grialtech.co (Vercel, proyecto geodatavoice-dashboard, rootDirectory=frontend)
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
| Datos Colombia | `lib/colombia.ts` — 33 departamentos + municipios (estático) |

---

## Integraciones externas

| Servicio | Para qué | Cómo se conecta | Estado |
|---|---|---|---|
| **Supabase** | DB + Auth + Storage + Edge Functions | proyecto `bsjiqatcqbjqmtytlgll`. `@supabase/ssr` (cliente), service role (route handlers + Edge) | ✅ activo |
| **Resend (API)** | Emails de negocio (cliente activado, nueva encuesta, pago) | `lib/email.ts` lazy init, route handlers `/api/email/*`. Remitente `geodatavoice@grialtech.co` | ✅ activo |
| **SendPulse** | WhatsApp Business (nueva encuesta, recordatorio, pago aprobado) | `lib/whatsapp.ts`, route handlers `/api/whatsapp/*`. Bot ID `6a2d7fd90abdaad9e40f5ae8`. Vars en Vercel. | ⏳ plantillas pendientes aprobación Meta |
| **Resend (SMTP)** | Emails de sistema de Supabase Auth (confirmar/recuperar) | SMTP en Supabase Auth: `smtp.resend.com:465`, user `resend`. Plantillas en español | ✅ activo |
| **OpenAI Whisper-1** | Transcripción de notas de voz | Edge Function `process-audio`. Secret `OPENAI_API_KEY` | ✅ activo (requiere saldo) |
| **Anthropic Claude** | Análisis NLP de transcripciones | Edge Function `process-audio`. Secret `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` | ✅ activo |
| **AutenTIC (Veriff)** | KYC de panelistas | SDK Veriff + webhook `/api/identidad/webhook` (HMAC). Cuenta `saas-3` | ⏸️ simulación (webhook sin configurar) |
| **Vercel** | Hosting/deploy | proyecto `geodatavoice-dashboard`, scope `jaime-criales-projects`. `rootDirectory=frontend` | ✅ activo |

**Edge Function `process-audio`** (Deno): Storage → Whisper → Claude → `nlp_outputs`. Disparo automático por trigger pg_net en INSERT de `audio_responses` (quality=pending).

**Route handlers** (`frontend/app/api/`): `email/*`, `identidad/*`, `audio/upload`, `encuesta-abierta`, `encuesta-abierta/audio`, `resultados`, `resultados/proyecto`, `admin/encuestadores`, `admin/panelistas`, `admin/config` (GET/POST para `platform_config`), `registro/*`, `cuotas` (GET conteos + POST verifica si candidato pasa cuotas). Service role vía `lib/supabase-service.ts`. Todos con `export const dynamic = "force-dynamic"` en GETs.

---

## Tablas en Supabase (RLS parcialmente implementado)

| Tabla | Descripción |
|---|---|
| `clients` | Clientes contratantes. `status`: pending → active/inactive |
| `projects` | Proyectos por cliente. **`field_identity_required`** (bool nullable=hereda global) |
| `surveys` | Encuestas. **`perfil_objetivo`** (panelista/encuestador/ambos/abierta). **`es_abierta`** bool, **`slug`** unique, **`abierta_identidad`**, **`abierta_pago`**, **`abierta_anonima`** bools. **`audiencia`** jsonb, **`ponderacion`** jsonb. `status`: draft/ready/sent/closed |
| `questions` | Preguntas. `type`, `options`(jsonb), `order`, **`audio_prompt`**, **`tracking_key`**, **`favorability`**, **`favorable_values`** |
| `participants` | Personas. SHA-256: `document_hash`, `phone_hash`. `user_id`=auth.users.id (null en encuesta abierta). **`departamento`**, **`municipio`** (Colombia). Contacto: `phone`, `payment_wallet`, `payment_number`. Demografía completa: estrato, birth_year, nivel_estudios, actividades(jsonb), estado_civil, num_hijos, regimen_salud, sisben_grupo, tenencia_vivienda, grupo_etnico, antiguedad_barrio, recibe_subsidios, acceso_internet, registrado_votar. `is_anonymous` bool |
| `field_operators` | Encuestadores. `user_id`→auth, **`recruiter_code`** |
| `field_visits` | GPS de visitas (`operator_id`, lat/lon, accuracy) |
| `consents` | Consentimientos versionados (v1.0) |
| `responses` | Respuestas. `participant_id`, `survey_id`, `question_id`, `value`, **`encuestador_id`**, `responded_at`, **`device_meta`** (jsonb: device_type, os, browser, connection_type, ip_city/region/country, started_at, finished_at, referrer) |
| `audio_responses` | Audio. `response_id`, `audio_url`(Storage path), `quality`: pending/processed/error |
| `nlp_outputs` | IA: sentiment, emotion, intensity, main_topic, narrative, citizen_quote, etc. |
| `payments` | Pagos a panelistas (dispersión real pendiente) |
| `payment_config` | Tarifas globales: encuesta_cop, audio_cop, encuesta_campo_cop, bono_reclutamiento_cop |
| `client_payment_config` | Tarifa override por cliente |
| `platform_config` | key/value jsonb. Keys: `identity_verification`, `field_identity_verification`, `encuestadores_config` (`{max, require_approval}`), `panel_quotas` (`{total, gender, estrato, sisben_grupo, actividades}` — cada uno con `enabled` toggle + `max`/`cupos`) |
| `participant_profile_history` | Snapshots del perfil socioeconómico (jsonb + captured_at) |

**Columnas importantes en `participants` agregadas en esta sesión:** `departamento`, `municipio` (text, nullable).

**RLS implementado:** `responses_panelista_insert`, `audio_panelista_insert`, `surveys_cliente_update`, `surveys_open_authenticated`, `questions_open_authenticated`. Las demás tablas siguen en MVP sin RLS.

**Función RPC:** `claim_field_participant(...)` — panelista que ya fue encuestado en campo reutiliza registro + verificación + historial.

**Auth por correo (token_hash):** `/auth/confirm` → `verifyOtp`. Funciona entre dispositivos.

---

## Formularios de Captura de Datos (homologados)

Los 3 formularios tienen el mismo set de campos demográficos y dropdowns consistentes:

| Campo | Valores |
|---|---|
| Departamento | 33 departamentos Colombia (de `lib/colombia.ts`) |
| Municipio | Filtrado por departamento (de `lib/colombia.ts`) |
| Barrio | Texto libre |
| Género | female/male/other |
| Nivel estudios | bachiller / tecnico_tecnologo / profesional / posgrado |
| Estado civil | soltero / casado / union_libre / separado / divorciado / viudo |
| Régimen salud | subsidiado / contributivo / especial / ninguno |
| SISBEN | no / A / B / C / D |
| Vivienda | propia / arriendo / familiar |
| Grupo étnico | ninguno / afro / indigena / raizal / otro |
| Antigüedad barrio | menos_1 / 1_5 / 5_10 / mas_10 |
| Actividades | empleado / independiente / desempleado / estudiante / ama_de_casa / pensionado / empresario / otro |

---

## Roles del Sistema

| Rol | Acceso | Cómo llega |
|---|---|---|
| **admin** | `/dashboard` | Creado manualmente |
| **cliente** | `/cliente` | Registro → aprobación admin |
| **encuestador** | `/campo/encuestador` | Registro → status=pending → admin aprueba → accede al panel |
| **panelista** | `/campo/panelista` | Registro (opcional código reclutador) → gate KYC |

Login redirige por `user_metadata.role`. Middleware protege `/dashboard|/cliente|/campo` + gate KYC panelista.

---

## Audio — Compatibilidad Safari/Chrome

Todos los formularios de captura usan `pickAudioMime()` para detectar el formato soportado:
```typescript
for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
  if (MediaRecorder.isTypeSupported(t)) return t;
}
```
Safari graba `audio/mp4`, Chrome `audio/webm`. La extensión del archivo se determina dinámicamente.

---

## Encuestas Abiertas (`/encuesta/[slug]`)

Ruta pública sin auth. El flujo:
1. **Bienvenida** — nombre de la encuesta, qué esperar
2. **Anonimato** (si `!abierta_anonima`) — elige participar anónimo o identificado
3. **Demografía** — perfil socioeconómico completo (departamento + municipio filtrado + todos los campos)
4. **Preguntas** — con audio por pregunta si tiene `audio_prompt`
5. **Pago** (si `abierta_pago` y anónimo) — billetera Nequi/Daviplata
6. **Gracias**

Datos cargados vía `/api/encuesta-abierta` (service role, `force-dynamic`). Respuestas guardadas vía POST al mismo endpoint. Audio vía `/api/encuesta-abierta/audio`. El participante se crea con `user_id=null`.

Slug auto-generado con sufijo aleatorio de 5 chars. El cliente puede copiar el link desde los resultados de la encuesta.

---

## Configuración del Entorno

### Variables (`frontend/.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://bsjiqatcqbjqmtytlgll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
RESEND_API_KEY=re_...
ADMIN_EMAIL=jaimecriales8@icloud.com
NEXT_PUBLIC_APP_URL=https://geodatavoice.grialtech.co
```

### Vercel
- Proyecto: `geodatavoice-dashboard`, scope `jaime-criales-projects`
- **`rootDirectory: frontend`** — crítico, configurado vía API (no dashboard)
- Las mismas 6 variables en Production. Preview pendiente.
- ⚠️ `NEXT_PUBLIC_API_URL` legacy del FastAPI — ignorar.

### Comandos
```bash
# Desarrollo local
cd frontend && npm run dev -- --port 3010

# Build local
cd frontend && npm run build

# Deploy (auto en push a main)
git push origin main

# Configurar rootDirectory en Vercel (si se pierde)
TOKEN=$(cat "/Users/jaimecriales/Library/Application Support/com.vercel.cli/auth.json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))")
curl -X PATCH "https://api.vercel.com/v9/projects/prj_uMy66cfixy7kZMdfzVGIB4FrUYQ1" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"rootDirectory": "frontend"}'
```

---

## Estado Actual del Código

### Funciona correctamente
- Landing, login, registro de los 3 perfiles con validaciones completas
- Panel admin: CRUD clientes/panelistas/encuestadores (con tabs Pendientes/Activos + aprobar/rechazar), tarifas, toggles de identidad, KPIs, cuotas de panel
- Panel cliente: crear proyectos y encuestas (preguntas, perfil_objetivo, audio, tracking/favorabilidad, toggle abierta + slug), publicar/cerrar/reabrir, copiar link encuesta abierta
- **Encuesta abierta** (`/encuesta/[slug]`): flujo completo con demografía (departamento+municipio), audio multi-pregunta, anonimato opcional, pago al final
- **Encuestar en campo** (encuestador): departamento+municipio filtrado, audio con MIME detectado, guarda en `audio_responses`
- **Auto-registro panelista**: departamento+municipio filtrado, audio, claim de datos si ya fue encuestado, código reclutador
- **Pipeline IA**: Edge Function `process-audio` (Whisper + Claude) con trigger automático
- **Tableros de resultados**: por encuesta (filtro demográfico + ponderación + CSV/PDF) y por proyecto (tracking por ola, favorabilidad, series ponderadas)
- Emails: Resend API + SMTP Auth, dominio propio
- Middleware + gate KYC panelista
- Build limpio, deploy estable en Vercel

### Parcialmente implementado
- KYC: funcional en simulación; AutenTIC real requiere configurar webhook
- Pagos: devengado calculado; dispersión real a Nequi/Daviplata pendiente
- RLS: políticas críticas en su lugar; quedan ~10 tablas sin políticas

### Pendiente de construir
- Dispersión real de pagos (tabla `payments`)
- Email pago-procesado integrado en dashboard/pagos
- Webhook AutenTIC configurado en panel de AutenTIC
- AGORA (red de pares)
- Mapa interactivo
- Post-estratificación DANE (raking)

---

## Pendientes Prioritarios

### Alta prioridad
1. **Dispersión real de pagos** — tabla `payments` + flujo Nequi/Daviplata
2. **RLS en tablas restantes** — priorizar datos sensibles (salud, payment_number, registrado_votar) — Ley 1581
3. **Webhook AutenTIC** — configurar URL en panel AutenTIC para activar KYC real

### Media prioridad
4. **Email pago-procesado** — integrar `/api/email/pago-procesado` en `dashboard/pagos`
5. **Variables Preview Vercel** — agregar env vars al entorno Preview
6. **Verificar subdominio Resend** — `geodatavoice.grialtech.co` (requiere plan superior)

### Baja prioridad
7. Paginación en listados
8. Supabase Vault para cifrar `name_encrypted` (Ley 1581)
9. AGORA (red de pares)
10. CI/CD GitHub Actions

---

## Bugs Conocidos / Resueltos

| # | Descripción | Estado |
|---|---|---|
| B1 | Login redirige por rol | ✅ Resuelto |
| B2 | Insert field_operators al registrar encuestador | ✅ Resuelto |
| B3 | Montos en landing fijos | ⏳ Parcial — paneles usan payment_config; landing fija |
| B4 | Home panelista con datos mock | ✅ Resuelto |
| B5 | Sin validación sesión en /campo/* | ✅ Resuelto |
| B6 | Audio MIME hardcoded (fallaba en Safari) | ✅ Resuelto — pickAudioMime() en los 3 formularios |
| B7 | responded_at vs created_at en responses | ✅ Resuelto |
| B8 | municipio/barrio/description no existen en participants | ✅ Resuelto |
| B9 | document_hash/phone_hash/name_encrypted NOT NULL en anónimos | ✅ Resuelto |
| B10 | encuesta-abierta GET cacheado estáticamente | ✅ Resuelto — force-dynamic |
| B11 | /api/resultados y otros routes no commiteados a git | ✅ Resuelto |
| B12 | Vercel rootDirectory perdido (se resetea a null) | ✅ Resuelto — configurado vía API, no dashboard |

---

## Próximas Tareas para Nueva Sesión

| # | Tarea | Archivo principal | Prioridad |
|---|---|---|---|
| 1 | **Pruebas end-to-end** — ver checklist completo abajo | todos los flujos | 🔴 Alta |
| 2 | Dispersión real de pagos | `app/dashboard/pagos/` + tabla `payments` | 🟡 Media |
| 3 | RLS en tablas restantes (tarea dedicada) | Supabase policies | 🟡 Media |
| 4 | Email pago-procesado en dashboard/pagos | `app/dashboard/pagos/page.tsx` | 🟢 Baja |
| 5 | Webhook AutenTIC | Panel AutenTIC + `app/api/identidad/webhook` | 🟢 Baja |
| 6 | AGORA — módulo de pares | Esquema + UI nueva | 🟢 Baja |

### Checklist de pruebas end-to-end (hacer mañana)

**Flujo Panelista**
- [ ] Registro nuevo: formulario completo con departamento+municipio, audio funciona en Safari y Chrome
- [ ] Cuota bloqueada: activar una cuota en `/dashboard/configuracion`, intentar registrarse en ese segmento → debe bloquear con mensaje
- [ ] Login → gate KYC → home panelista muestra encuestas
- [ ] Responder encuesta con audio → verificar en `responses` + `audio_responses` + edge function dispara NLP
- [ ] Ver devengado en home panelista
- [ ] Editar perfil en `/campo/panelista/perfil`

**Flujo Encuestador**
- [ ] Registro nuevo → pantalla "pendiente de aprobación"
- [ ] Admin aprueba en `/dashboard/encuestadores` pestaña Pendientes → botón Aprobar
- [ ] Encuestador inicia sesión → ya accede al panel sin bloqueo
- [ ] Encuestar en campo: seleccionar encuesta → llenar datos participante → audio → GPS → encuesta → guardar
- [ ] Ver devengado del mes y código reclutador en home

**Flujo Admin**
- [ ] `/dashboard/encuestadores`: ver tabs Pendientes/Activos, aprobar/rechazar, config modal (max + require_approval)
- [ ] `/dashboard/panelistas`: lista con estados
- [ ] `/dashboard/configuracion`: toggles de identidad + editor de cuotas (activar/desactivar, cambiar número, guardar)

**Flujo Cliente**
- [ ] Crear proyecto → crear encuesta → publicar
- [ ] Encuesta abierta: copiar link, abrir en otra pestaña/device, llenar, verificar en resultados
- [ ] Tablero de resultados: filtros demográficos, ponderación, CSV
- [ ] Tracking por ola en tablero de proyecto

---

## Prompt de Continuación

```
Estoy desarrollando GeoDataVoice, plataforma de inteligencia territorial para Colombia.
Ruta local: /Users/jaimecriales/Sites/GeoDataVoice/frontend
GitHub: https://github.com/jaimecriales8-prog/GeoDataVoice.git
Producción: https://geodatavoice.grialtech.co (Vercel, rootDirectory=frontend)

## ARQUITECTURA
Next.js 16 → Supabase directamente. Sin backend intermedio.
El directorio backend/ está DESCONTINUADO — no tocar.
Supabase: bsjiqatcqbjqmtytlgll (us-west-2)

## ROLES (user_metadata.role en Supabase Auth)
admin → /dashboard | cliente → /cliente | panelista → /campo/panelista | encuestador → /campo/encuestador

## TABLAS CLAVE
clients, projects, surveys (es_abierta/slug/abierta_*), questions (audio_prompt/tracking_key),
participants (departamento/municipio/document_hash/phone_hash/is_anonymous),
field_operators (recruiter_code), responses (encuestador_id/responded_at),
audio_responses, nlp_outputs, payment_config, platform_config

## ESTADO (~88%)
Flujo end-to-end operativo: registro 3 perfiles, encuestas abiertas vía link,
audio en los 3 formularios (MIME detectado), departamento+municipio filtrado,
tableros con filtros y ponderación, pipeline IA (Whisper+Claude).
Encuestadores: flujo de aprobación (pending→active/inactive).
Panelistas: cuotas por variable (total/género/estrato/SISBEN/actividad, toggleables).
RLS parcialmente implementado. Pagos: solo devengado calculado.

## SQL PENDIENTE (ejecutar en Supabase antes de probar)
```sql
INSERT INTO platform_config (key, value) VALUES
  ('encuestadores_config', '{"max": 50, "require_approval": true}'::jsonb),
  ('panel_quotas', '{"total": {"enabled": false, "max": 500}, "gender": {"enabled": false, "cupos": {"male": 200, "female": 200, "other": 100}}, "estrato": {"enabled": false, "cupos": {"1": 100, "2": 150, "3": 150, "4": 60, "5": 25, "6": 15}}, "sisben_grupo": {"enabled": false, "cupos": {"no": 100, "A": 100, "B": 100, "C": 100, "D": 100}}, "actividades": {"enabled": false, "cupos": {"empleado": 150, "independiente": 100, "desempleado": 60, "estudiante": 80, "ama_de_casa": 50, "pensionado": 30, "empresario": 20, "otro": 10}}}'::jsonb)
ON CONFLICT (key) DO NOTHING;
```

## CONVENCIONES IMPORTANTES
- Route handlers: siempre export const dynamic = "force-dynamic" en GETs
- Audio: usar pickAudioMime() — Safari=mp4, Chrome=webm
- Datos anónimos: sha256(randomUUID()) para document_hash y phone_hash cuando no hay documento
- colombia.ts: DEPARTAMENTOS, getMunicipios(dept) — usar en formularios de captura
- Service role: createServiceClient() para cualquier operación que bypasee RLS

## PRÓXIMA TAREA
[describe aquí lo que quieres hacer]

Lee PROJECT_CONTEXT.md antes de escribir código.
```
