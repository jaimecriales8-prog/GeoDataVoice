# PROJECT_CONTEXT.md — GeoDataVoice
> Actualizado: 2026-06-04 | Arquitecto: Claude Sonnet 4.6

---

## Resumen Ejecutivo

### Objetivo del proyecto
Plataforma de **inteligencia territorial** para Colombia que recluta personas verificadas, las organiza en paneles georreferenciados y mide su opinión de forma recurrente mediante formularios y notas de voz analizadas con IA. El diferencial es el análisis automático de audio ciudadano (transcripción + NLP) para extraer sentimiento, emoción, temas y citas representativas por municipio.

### Problema que resuelve
Alcaldes, gobernadores, candidatos y organizaciones en municipios medianos de Colombia toman decisiones con información incompleta. Las encuestadoras tradicionales son episódicas, costosas y poco explicativas. GeoDataVoice provee medición recurrente, accesible y territorializada con voz ciudadana analizada por IA como diferencial.

### Producto en dos capas
- **GeoDataVoice**: panel territorial, encuestas recurrentes, análisis de audio, dashboard analítico.
- **AGORA**: red de pares verificados (módulo fase 2 — no iniciado).

### Estado actual del desarrollo

```
Landing page (frontend)       ████████████  100%  Comercial, completa
Auth / Login (Supabase)       ████████████  100%  Funcionando
Registro 3 perfiles           ████████████  100%  Cliente, encuestador, panelista
Dashboard frontend             ████░░░░░░░░   35%  Listado proyectos (query Supabase)
PWA campo — registro           ████████░░░░   65%  GPS + consentimientos (llama al backend aún)
PWA campo — panelista          ████░░░░░░░░   40%  Home + encuesta flow (datos mock)
Backend FastAPI                ████████░░░░  [DESCONTINUADO] — NO continuar desarrollo aquí
Schema Supabase                ░░░░░░░░░░░░    0%  Tablas, RLS, policies — PENDIENTE DISEÑAR
Lógica en Edge Functions       ░░░░░░░░░░░░    0%  Audio, NLP, KYC — PENDIENTE
TOTAL                          ██░░░░░░░░░░  ~30%  (reset por cambio de arquitectura)
```

---

## DECISIÓN ARQUITECTÓNICA CRÍTICA

### El backend FastAPI fue descontinuado

**La nueva arquitectura es: Frontends → Supabase directamente.**

| Antes | Ahora |
|---|---|
| Next.js → FastAPI (Python) → PostgreSQL | Next.js → Supabase (PostgREST + Auth + Storage) |
| SQLAlchemy + Alembic para schema | SQL directo en Supabase (dashboard o migrations) |
| JWT propio en backend | Supabase Auth (JWT gestionado por Supabase) |
| FastAPI routes para lógica de negocio | Supabase Edge Functions para lógica compleja |
| `lib/api.ts` con axios a localhost:8000 | `lib/supabase.ts` con `createClient()` |

**El directorio `backend/` existe pero NO debe continuar desarrollándose.**  
Todo código nuevo va en `frontend/` y `field-app/` usando el cliente de Supabase.

### Qué hace falta diseñar/implementar para el nuevo stack

1. **Schema de tablas en Supabase**: reemplaza los modelos SQLAlchemy. Hay que diseñar las tablas directamente en el SQL Editor de Supabase o con `supabase/migrations/`.
2. **Row Level Security (RLS)**: cada tabla necesita policies para que los usuarios solo vean sus propios datos.
3. **Supabase Edge Functions**: para lógica que no puede ir en el cliente (audio con Whisper/GPT, envío de emails, OTP, KYC).
4. **Reescribir `field-app/lib/api.ts`**: actualmente llama al backend FastAPI. Debe migrar a llamadas Supabase.

---

## Arquitectura General (nueva)

```
┌────────────────────────────────────────────────────────────┐
│                       FRONTENDS                            │
│                                                            │
│  frontend/ (Next.js 16 — dashboard clientes/admin)         │
│  Puerto 3000 — Vercel en producción                        │
│                                                            │
│  field-app/ (Next.js 16 PWA — encuestadores + panelistas)  │
│  Puerto 3001 — Vercel en producción                        │
└──────────────────────┬─────────────────────────────────────┘
                       │ @supabase/ssr + @supabase/supabase-js
                       │ (PostgREST API automática por tabla)
┌──────────────────────▼─────────────────────────────────────┐
│                     SUPABASE                               │
│                                                            │
│  PostgreSQL + PostGIS  →  tablas del dominio               │
│  Auth                  →  registro/login todos los roles   │
│  Storage               →  audios + evidencias de campo     │
│  Edge Functions        →  Whisper, GPT, OTP, emails, KYC   │
│  Realtime              →  notificaciones en tiempo real     │
└────────────────────────────────────────────────────────────┘

Servicios externos (via Edge Functions):
  OpenAI Whisper-1   → transcripción de audio
  OpenAI GPT-4o-mini → análisis NLP (sentimiento, temas, emoción)
  Resend / SendGrid  → emails transaccionales
  Twilio / 360dialog → WhatsApp Business (pendiente)
  Truora / Metamap   → KYC (pendiente)
  Nequi / Daviplata  → dispersión de pagos (manual en MVP)
```

### Flujo de información (nuevo)

```
1. Encuestador → field-app → supabase.from("participants").insert({...})
   (doc+cel hasheados en el cliente o via Edge Function)

2. → supabase.from("consents").insert([...])   [bulk]
3. → supabase.from("field_visits").insert({lat, lon, ...})

4. [Edge Function] → KYC proveedor → webhook → UPDATE participants SET status='verified'

5. → supabase.from("panel_memberships").insert({participant_id, project_id, cohorte})

6. [Edge Function "send-survey"] → genera tokens por panelista → WhatsApp

7. Panelista → field-app → supabase.from("responses").insert([...])
   → supabase.storage.from("audio").upload(file)
   → [Edge Function "process-audio"] → Whisper → GPT → nlp_outputs INSERT

8. Cliente → frontend → supabase.from("analytics_view").select(...)
   (vista calculada en SQL o Edge Function "get-analytics")
```

---

## Stack Tecnológico

### Frontends (dashboard + field-app)

| Componente | Tecnología | Versión |
|---|---|---|
| Framework | Next.js 16.2.7 (App Router) | — |
| React | React 19 | — |
| Estilos | Tailwind CSS v4 | — |
| Iconos | Lucide React | — |
| Charts | Recharts 3.8.1 (frontend) | — |
| Auth + DB | @supabase/ssr + @supabase/supabase-js | — |
| Data fetching | TanStack React Query 5 | — |
| HTTP | Axios (actualmente apunta al backend — migrar) | — |
| Offline queue | idb 8 (IndexedDB — field-app) | — |
| Lenguaje | TypeScript 5 | — |

### Supabase (backend-as-a-service)

| Servicio | Uso |
|---|---|
| PostgreSQL 15 + PostGIS | BD principal del dominio |
| Supabase Auth | JWT para todos los roles (cliente, encuestador, panelista, admin) |
| PostgREST | API REST automática sobre las tablas (con RLS) |
| Supabase Storage | Audios de panelistas + fotos de evidencia de campo |
| Edge Functions (Deno) | Lógica compleja: audio processing, OTP, emails, KYC webhook |
| Realtime | Notificaciones en tiempo real (pendiente) |

### Proyecto Supabase

- **ID del proyecto**: `bsjiqatcqbjqmtytlgll`
- **URL**: `https://bsjiqatcqbjqmtytlgll.supabase.co`
- **Región**: us-west-2 (AWS)
- **Bucket de storage**: `geodatavoice-audio`

---

## Estructura del Proyecto

```
GeoDataVoice/
├── PROJECT_CONTEXT.md        ← este archivo
├── TASKS.md                  ← backlog
├── DECISIONS.md              ← ADRs
│
├── frontend/                 ← Next.js 16 dashboard (clientes/admin)
│   ├── middleware.ts          ← protege /dashboard con sesión Supabase
│   ├── lib/
│   │   ├── supabase.ts        ← createBrowserClient (componentes cliente)
│   │   ├── supabase-server.ts ← createServerClient (server components)
│   │   ├── auth.ts            ← helpers de auth Supabase
│   │   └── api.ts             ← ⚠️ APUNTA AL BACKEND — MIGRAR A SUPABASE
│   └── app/
│       ├── page.tsx           ← Landing comercial (completa)
│       ├── login/             ← Login Supabase Auth (funciona)
│       ├── dashboard/         ← Dashboard proyectos (parcialmente conectado)
│       ├── projects/[id]/     ← Detalle proyecto (pendiente)
│       └── registro/
│           ├── page.tsx       ← Selector perfil (completo)
│           ├── cliente/       ← Registro cliente (Supabase signUp)
│           ├── encuestador/   ← Registro encuestador (pendiente conectar)
│           └── panelista/     ← Registro panelista (pendiente conectar)
│
├── field-app/                ← Next.js 16 PWA (encuestadores + panelistas)
│   ├── lib/
│   │   ├── api.ts             ← ⚠️ APUNTA AL BACKEND — MIGRAR A SUPABASE
│   │   ├── supabase.ts        ← createBrowserClient (existe, listo)
│   │   └── offline-queue.ts   ← IndexedDB para sincronización offline
│   └── app/
│       ├── registro/          ← Flujo 3 pasos: datos→GPS→consentimientos
│       └── panelista/
│           ├── page.tsx       ← Home panelista (MOCK_SURVEYS — pendiente)
│           ├── encuesta/[id]/ ← Flujo encuesta con audio (pendiente)
│           └── pagos/         ← Historial pagos (MOCK — pendiente)
│
├── backend/                  ← ⚠️ DESCONTINUADO — no continuar desarrollo
│   └── ...                   ← Útil como referencia de lógica de negocio
│
└── infra/
    └── docker-compose.yml    ← PostGIS + Redis (solo si se reactiva backend)
```

### Archivos críticos (nueva arquitectura)

| Archivo | Estado | Acción requerida |
|---|---|---|
| `frontend/lib/supabase.ts` | ✅ Listo | Usar para todas las queries |
| `frontend/lib/supabase-server.ts` | ✅ Listo | Usar en server components |
| `frontend/middleware.ts` | ✅ Funciona | — |
| `frontend/lib/api.ts` | ⚠️ Apunta al backend | Reescribir con Supabase |
| `field-app/lib/supabase.ts` | ✅ Existe | Usar para todas las queries |
| `field-app/lib/api.ts` | ⚠️ Apunta al backend | Reescribir con Supabase |
| `field-app/lib/offline-queue.ts` | ✅ Listo | Adaptar para que encole queries Supabase |

---

## Trabajo Realizado (que sigue siendo válido)

### Funcionalidades de frontend completadas

- **Landing comercial** (`frontend/app/page.tsx`) — completa con nav, hero, metodología, 3 actores, contacto
- **Login** (`frontend/app/login/page.tsx`) — Supabase Auth, maneja sesión activa
- **Selector de perfil** (`frontend/app/registro/page.tsx`) — 3 tarjetas (cliente/encuestador/panelista)
- **Registro cliente** — Supabase `signUp` con metadata `{role: "client", org_name, org_type}`
- **Dashboard con listado proyectos** (`frontend/app/dashboard/page.tsx`) — query directa a Supabase `projects`
- **Middleware protección `/dashboard`** — redirige a `/login` si no hay sesión
- **Flujo de registro panelista en field-app** — 3 pasos: datos → GPS → consentimientos (actualmente llama al backend, hay que migrar)
- **Offline queue** (`field-app/lib/offline-queue.ts`) — IndexedDB para sincronización offline (lógica válida, hay que adaptar las URLs)
- **Home panelista** — UI completa con stats, encuestas pendientes y pagos (datos mock)
- **Flujo de encuesta con audio** — UI por pregunta con grabación de audio (datos mock)

### Lo que el backend tiene de útil como referencia

El código del backend sirve como **especificación de la lógica de negocio** a reimplementar en Supabase:

- `backend/app/models/` → diseño de las tablas que hay que crear en Supabase
- `backend/app/api/v1/routes/consents.py` → textos de consentimiento versionados, lógica de bulk/revocación
- `backend/app/api/v1/routes/field.py` → campos requeridos para registro de visitas GPS
- `backend/app/api/v1/routes/surveys.py` → lógica de encuestas, respuestas, generación de tokens
- `backend/app/api/v1/routes/analytics.py` → queries SQL de favorabilidad, sentimiento, temas
- `backend/app/services/audio_processor.py` → prompt exacto de GPT-4o-mini para NLP (9 variables)
- `backend/app/models/participant.py` → convención SHA-256 para hashear documento y celular

---

## Estado Actual del Código

### Funciona correctamente (con la nueva arquitectura)
- Landing page → sin auth, funciona en frío
- Login → Supabase Auth, produce sesión JWT válida
- Registro cliente → `supabase.auth.signUp()` con metadata de rol
- Dashboard listado proyectos → `supabase.from("projects").select(*)` (requiere que la tabla exista en Supabase)
- Middleware de auth → protege `/dashboard`

### Requiere migración (apunta al backend descontinuado)
- `field-app/lib/api.ts` → `preRegisterParticipant`, `recordVisit`, `recordConsents`, `fetchConsentTexts` — todas llaman a `localhost:8000`
- `frontend/lib/api.ts` → `fetchProjects`, `fetchAnalytics` — llaman a `localhost:8000`
- `field-app/app/registro/page.tsx` → usa `preRegisterParticipant` de la lib anterior

### Pendiente de construir (lógica de negocio nueva)
- Tablas en Supabase (schema SQL)
- RLS policies
- Edge Functions para: audio processing, OTP, emails, KYC webhook
- Consultas analytics (vistas SQL o Edge Function)

---

## Pendientes Prioritarios

### Alta prioridad — Fundación nueva arquitectura

**1. Diseñar y crear el schema en Supabase**

Las tablas mínimas para el MVP (consultar `backend/app/models/` como referencia):

```sql
-- Participantes del panel (datos sensibles hasheados)
CREATE TABLE participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_hash text UNIQUE NOT NULL,  -- SHA-256 cédula
  phone_hash text UNIQUE NOT NULL,     -- SHA-256 celular
  name text NOT NULL,                  -- TODO: cifrar con Supabase Vault
  gender text,
  birth_year int,
  territory_id uuid REFERENCES territories(id),
  status text DEFAULT 'preregistered', -- preregistered | verified | suspended
  kyc_status text DEFAULT 'pending',
  phone_verified bool DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Territorios (barrios, comunas, municipios, departamentos)
CREATE TABLE territories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,  -- barrio | comuna | municipio | departamento
  parent_id uuid REFERENCES territories(id),
  codigo_dane text,
  status text DEFAULT 'active'
);

-- Proyectos de medición
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,  -- user_id de Supabase Auth con role=client
  name text NOT NULL,
  type text NOT NULL,       -- favorability | satisfaction | pulse | custom
  purpose text NOT NULL,    -- political | public_management | private
  status text DEFAULT 'active',
  start_date date,
  end_date date,
  created_at timestamptz DEFAULT now()
);

-- Membresías de panel (participante ↔ proyecto)
CREATE TABLE panel_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id),
  project_id uuid REFERENCES projects(id),
  status text DEFAULT 'active',  -- active | reserve | resting
  joined_at timestamptz DEFAULT now()
);

-- Encuestas (olas de medición)
CREATE TABLE surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id),
  name text NOT NULL,
  wave int DEFAULT 1,
  status text DEFAULT 'draft',  -- draft | ready | sent | closed
  sent_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Preguntas de encuesta
CREATE TABLE questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES surveys(id),
  type text NOT NULL,  -- single_choice | multiple_choice | open_text | audio | scale
  text text NOT NULL,
  options jsonb,
  required bool DEFAULT true,
  "order" int DEFAULT 0
);

-- Respuestas de panelistas
CREATE TABLE responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id),
  survey_id uuid REFERENCES surveys(id),
  question_id uuid REFERENCES questions(id),
  value text,
  responded_at timestamptz DEFAULT now()
);

-- Audios subidos a Storage
CREATE TABLE audio_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid REFERENCES responses(id),
  audio_url text NOT NULL,  -- Supabase Storage URL
  transcription text,
  quality text DEFAULT 'pending',  -- pending | transcribed | processed | error
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Resultados NLP por audio
CREATE TABLE nlp_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audio_id uuid REFERENCES audio_responses(id),
  sentiment text,      -- positive | negative | neutral | mixed
  emotion text,        -- rabia | miedo | esperanza | frustración | orgullo | ...
  intensity text,      -- low | medium | high
  main_topic text,
  topics jsonb,
  narrative text,
  summary text,
  citizen_quote text,
  actor_mentioned text,
  opinion_driver text,
  confidence numeric,
  model_version text DEFAULT 'gpt-4o-mini',
  created_at timestamptz DEFAULT now()
);

-- Consentimientos versionados
CREATE TABLE consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id),
  type text NOT NULL,   -- panel | audio | whatsapp | payments | agora | political
  version text DEFAULT '1.0',
  accepted bool NOT NULL,
  channel text DEFAULT 'field_app',
  ip_or_device text,
  accepted_at timestamptz DEFAULT now(),
  revoked_at timestamptz
);

-- Operadores de campo (encuestadores)
CREATE TABLE field_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,         -- Supabase Auth user_id
  name text NOT NULL,
  document text NOT NULL,
  phone text,
  territory_id uuid REFERENCES territories(id),
  status text DEFAULT 'active'
);

-- Visitas de campo con GPS
CREATE TABLE field_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid REFERENCES field_operators(id),
  participant_id uuid REFERENCES participants(id),
  latitude numeric,
  longitude numeric,
  gps_accuracy numeric,
  address text,
  evidence_url text,
  result text,  -- registered | duplicate | refused | absent
  notes text,
  visited_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Pagos a panelistas
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid REFERENCES participants(id),
  project_id uuid REFERENCES projects(id),
  concept text NOT NULL,  -- survey_response | audio_response | agora_task
  amount_cop int NOT NULL,
  status text DEFAULT 'pending',  -- pending | approved | paid | failed
  channel text,   -- nequi | daviplata
  paid_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```

**2. Configurar RLS en cada tabla**

Ejemplo básico:
```sql
-- Participantes: solo el encuestador que los registró y admins
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can do anything" ON participants
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "operators see their territory" ON participants
  USING (territory_id IN (
    SELECT territory_id FROM field_operators WHERE user_id = auth.uid()
  ));

-- Projects: clientes ven solo los suyos
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client sees own projects" ON projects
  USING (client_id = auth.uid());

CREATE POLICY "admin sees all" ON projects
  USING (auth.jwt() ->> 'role' = 'admin');
```

**3. Migrar `field-app/lib/api.ts` a Supabase**

```typescript
// field-app/lib/api.ts  (NUEVA VERSIÓN)
import { createClient } from "@/lib/supabase";

function hashSHA256(value: string): string {
  // En Edge/browser usar SubtleCrypto
  // Alternativa: mover el hash a una Edge Function
}

export async function preRegisterParticipant(data: PreRegisterPayload) {
  const supabase = createClient();
  // Opción A: insertar directo (hash en cliente)
  const { data: participant, error } = await supabase
    .from("participants")
    .insert({
      document_hash: await sha256(data.document_number.toUpperCase().trim()),
      phone_hash: await sha256(data.phone.trim()),
      name: data.name,
      gender: data.gender,
      birth_year: data.birth_year,
    })
    .select()
    .single();

  if (error?.code === "23505") throw new Error("Ya registrado");
  return participant;
}
```

**4. Migrar `frontend/lib/api.ts` a Supabase**

```typescript
// frontend/lib/api.ts  (NUEVA VERSIÓN)
import { createClient } from "@/lib/supabase";

export async function fetchProjects() {
  const supabase = createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "active");
  return data ?? [];
}
```

**5. Crear Edge Function para procesamiento de audio**

```typescript
// supabase/functions/process-audio/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import OpenAI from "https://esm.sh/openai";

Deno.serve(async (req) => {
  const { audio_id, audio_url } = await req.json();
  const openai = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });

  // Descargar audio de Storage y transcribir
  // ...transcribe con whisper-1...
  // ...analizar con gpt-4o-mini...
  // UPDATE audio_responses + INSERT nlp_outputs

  return new Response(JSON.stringify({ ok: true }));
});
```

### Media prioridad

6. **Roles en Supabase Auth**: guardar `role` en `user_metadata` durante el registro y usarlo en RLS policies (`auth.jwt() ->> 'role'`)
7. **Conectar home panelista** a encuestas reales vía Supabase
8. **Edge Function OTP**: generar y enviar código de 6 dígitos por SMS para verificar celular
9. **Edge Function emails**: notificaciones para panelistas y clientes (Resend + Supabase)
10. **Vista analítica en SQL**: crear una vista o function de PostgreSQL que calcule favorabilidad, sentimiento y temas por proyecto (ver lógica en `backend/app/api/v1/routes/analytics.py`)

### Baja prioridad

11. **Supabase Realtime**: notificaciones en tiempo real para el dashboard
12. **Supabase Vault**: cifrar el campo `name` de participantes (requerimiento Ley 1581/2012)
13. **Mapa con polígonos**: columna `geometry` en `territories` + Mapbox GL o Leaflet en el dashboard
14. **AGORA módulo**: pares, tareas, evidencias — fase 2

---

## Bugs Conocidos / Problemas Activos

| # | Descripción | Impacto | Solución |
|---|---|---|---|
| B1 | `field-app/lib/api.ts` llama a `localhost:8000` (backend descontinuado) | **Bloqueante** — el flujo de registro no funciona sin el backend corriendo | Reescribir con Supabase client |
| B2 | `frontend/lib/api.ts` llama a `localhost:8000` | **Bloqueante** para analytics y detalle de proyectos | Reescribir con Supabase client |
| B3 | `MOCK_SURVEYS` y `MOCK_PAYMENTS` hardcodeados en panelista home | **Alto** — no muestra datos reales | Conectar a Supabase tras crear tablas |
| B4 | Nombre del panelista en texto plano en la BD | **Riesgo legal** — Ley 1581/2012 Colombia | Usar Supabase Vault o cifrado en Edge Function antes de datos reales |
| B5 | SHA-256 puro para doc/celular (sin salt) | **Medio** — vulnerable a rainbow tables | Migrar a HMAC-SHA256 con `HASH_SECRET` en Supabase secrets |
| B6 | RLS no configurado — cualquier usuario autenticado puede leer todas las filas | **Alto** una vez haya datos reales | Configurar policies antes de conectar clientes reales |
| B7 | `NEXT_PUBLIC_OPERATOR_ID` hardcodeado en field-app | **Medio** — visitas quedan con operador ficticio | Implementar login de encuestador y usar su `user_id` |

---

## Deuda Técnica

| ID | Descripción | Prioridad |
|---|---|---|
| DT-01 | `axios` instalado en frontends pero debería eliminarse al migrar a Supabase | Media |
| DT-02 | Sin tests de ningún tipo | Alta |
| DT-03 | Hash SHA-256 sin HMAC (ver B5) | Media |
| DT-04 | Nombre participante en texto plano | Alta |
| DT-05 | `CORS` y `ALLOWED_ORIGINS` del backend ya no aplican | — (ignorar, backend descontinuado) |
| DT-06 | `backend/` crea confusión en el repositorio — documentar explícitamente como "solo referencia" | Baja |
| DT-07 | Sin paginación en ninguna query Supabase | Baja — problema real con volumen |

---

## Configuración del Entorno

### Variables de entorno — Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://bsjiqatcqbjqmtytlgll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# Ya no se necesita NEXT_PUBLIC_API_URL
```

### Variables de entorno — Field-app (`field-app/.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://bsjiqatcqbjqmtytlgll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# NEXT_PUBLIC_API_URL → eliminar después de migrar lib/api.ts
# NEXT_PUBLIC_OPERATOR_ID → eliminar cuando se implemente login de encuestador
```

### Variables de entorno — Supabase Edge Functions

Configurar en el dashboard de Supabase → Project Settings → Edge Functions:
```bash
OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...            # para emails
HASH_SECRET=<cadena aleatoria>   # para HMAC-SHA256
KYC_PROVIDER_URL=                # pendiente definir
KYC_API_KEY=                     # pendiente
```

---

## Comandos Útiles

### Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
npm run build  # build de producción
npm run lint
```

### Field-app

```bash
cd field-app
npm install
npm run dev    # http://localhost:3001
npm run build
```

### Supabase CLI (para Edge Functions y migraciones)

```bash
# Instalar Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# Inicializar en el proyecto (si no está hecho)
supabase init

# Linkear al proyecto remoto
supabase link --project-ref bsjiqatcqbjqmtytlgll

# Crear una Edge Function
supabase functions new process-audio

# Hacer deploy de Edge Functions
supabase functions deploy process-audio

# Migraciones de BD (alternativa al SQL Editor del dashboard)
supabase db diff -f nombre_migracion   # generar desde cambios
supabase db push                        # aplicar en producción
supabase db reset                       # reset local

# Ejecutar SQL en la BD de producción
supabase db execute --file schema.sql
```

### Vercel (deploy de frontends)

```bash
# Primer deploy interactivo
cd frontend && vercel

# Deploy a producción
vercel --prod

# Lo mismo para field-app
cd field-app && vercel --prod
```

---

## Estado de Git

- **Rama**: `main`
- **Commits**: 33
- **Último commit**: `ac08194` — cambios en landing page

### Archivos más importantes para la nueva arquitectura

| Archivo | Estado |
|---|---|
| `frontend/lib/supabase.ts` | ✅ Usar tal cual |
| `frontend/lib/supabase-server.ts` | ✅ Usar tal cual |
| `frontend/middleware.ts` | ✅ Funciona |
| `frontend/app/page.tsx` | ✅ Landing completa |
| `frontend/app/login/page.tsx` | ✅ Funciona |
| `frontend/app/dashboard/page.tsx` | ⚠️ Funciona si la tabla `projects` existe en Supabase |
| `frontend/lib/api.ts` | ❌ Migrar a Supabase |
| `field-app/lib/supabase.ts` | ✅ Usar tal cual |
| `field-app/lib/api.ts` | ❌ Migrar a Supabase |
| `field-app/lib/offline-queue.ts` | ✅ Lógica válida, adaptar URLs |
| `field-app/app/registro/page.tsx` | ⚠️ Migrar las llamadas a api.ts |

---

## Próximos Pasos Recomendados (Top 10)

| # | Tarea | Tiempo est. |
|---|---|---|
| 1 | Crear tablas en Supabase SQL Editor (schema de arriba) | 2h |
| 2 | Configurar RLS básico para `projects`, `participants`, `panel_memberships` | 1.5h |
| 3 | Migrar `field-app/lib/api.ts` — reemplazar llamadas al backend por Supabase client | 2h |
| 4 | Migrar `field-app/app/registro/page.tsx` para usar el nuevo `api.ts` | 1h |
| 5 | Migrar `frontend/lib/api.ts` — fetchProjects + fetchAnalytics con Supabase | 1.5h |
| 6 | Crear Edge Function `process-audio` (Deno + Whisper + GPT → nlp_outputs) | 3h |
| 7 | Conectar panelista home a encuestas reales (Supabase query) | 1.5h |
| 8 | Conectar flujo de encuesta a `responses` y `audio_responses` en Supabase | 2h |
| 9 | Crear vista SQL `project_analytics` con favorabilidad y sentimiento | 2h |
| 10 | Implementar login de encuestador y eliminar `NEXT_PUBLIC_OPERATOR_ID` hardcodeado | 1.5h |

---

## Prompt de Continuación

> Copia este bloque completo en una nueva sesión de Claude Code.

```
Estoy desarrollando GeoDataVoice, una plataforma de inteligencia territorial para Colombia.
Ruta local: /Users/jaimecriales/Sites/GeoDataVoice

## ARQUITECTURA (monorepo)

**El backend FastAPI (backend/) está DESCONTINUADO. No continuar desarrollo allí.**
La arquitectura nueva es: Frontends → Supabase directamente.

### frontend/ — Next.js 16 (puerto 3000) — dashboard clientes/admin
### field-app/ — Next.js 16 PWA (puerto 3001) — encuestadores + panelistas

Ambos usan:
  - @supabase/ssr + @supabase/supabase-js para auth + datos
  - TanStack React Query para data fetching
  - Tailwind CSS v4 + Lucide React
  - TypeScript 5

## PROYECTO SUPABASE
- ID: bsjiqatcqbjqmtytlgll
- URL: https://bsjiqatcqbjqmtytlgll.supabase.co
- Anon key y service key en frontend/.env.local y field-app/.env.local

## ESTADO ACTUAL — LO QUE FUNCIONA
- Landing page (frontend/app/page.tsx) — completa
- Login (frontend/app/login/page.tsx) — Supabase Auth funciona
- Registro cliente (frontend/app/registro/cliente/page.tsx) — Supabase signUp
- Dashboard listado proyectos (frontend/app/dashboard/page.tsx) — query directa a Supabase
- Middleware protección /dashboard — funciona

## PROBLEMA PRINCIPAL — LO QUE HAY QUE MIGRAR
- frontend/lib/api.ts — apunta a localhost:8000 (backend descontinuado) → reescribir con Supabase
- field-app/lib/api.ts — apunta a localhost:8000 → reescribir con Supabase
- field-app/app/registro/page.tsx — usa las funciones del api.ts anterior

## TABLAS EN SUPABASE — ESTADO
Las tablas del dominio AÚN NO EXISTEN en Supabase (hay que crearlas).
Usar backend/app/models/ como referencia de diseño.
Tablas necesarias: participants, territories, projects, panel_memberships,
surveys, questions, responses, audio_responses, nlp_outputs, consents,
field_operators, field_visits, payments.

## LÓGICA DE NEGOCIO DEL BACKEND (usar como referencia)
- backend/app/services/audio_processor.py — prompt GPT-4o-mini para NLP (9 variables)
- backend/app/api/v1/routes/consents.py — textos de consentimiento versionados
- backend/app/api/v1/routes/analytics.py — queries SQL de analytics (re-implementar como vista SQL)
- backend/app/models/participant.py — convención hash SHA-256 para doc+celular

## DATOS MOCK PENDIENTES DE CONECTAR
- field-app/app/panelista/page.tsx — MOCK_SURVEYS y MOCK_PAYMENTS hardcodeados
- field-app/app/panelista/encuesta/[id]/page.tsx — flujo de encuesta con datos mock

## PRÓXIMAS 3 TAREAS
1. Crear schema de tablas en Supabase (ver PROJECT_CONTEXT.md para el SQL)
2. Migrar field-app/lib/api.ts a Supabase client
3. Crear Edge Function process-audio (Whisper + GPT-4o-mini → nlp_outputs)

Lee PROJECT_CONTEXT.md para el mapa completo antes de escribir código.

TAREA DE HOY: [describe aquí lo que quieres construir]
```
