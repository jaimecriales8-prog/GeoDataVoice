# ARCHITECTURE.md — GeoDataVoice
> Última actualización: 2026-06-06

---

## Arquitectura actual

**Next.js (App Router) → Supabase directamente.**
No hay backend intermedio. El directorio `backend/` (FastAPI) está **descontinuado** — no continuar desarrollo allí.

```
┌──────────────────────────────────────────────────────────────┐
│                       USUARIOS FINALES                       │
├──────────────────┬──────────────────┬────────────────────────┤
│  Admin / Cliente │   Encuestador    │      Panelista         │
│  (Desktop web)   │  (Móvil — PWA)   │   (Móvil — PWA)        │
└────────┬─────────┴────────┬─────────┴──────────┬─────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│              frontend/  (Next.js 16 — App Router)           │
│                                                             │
│  /dashboard/*    Panel ADMIN (sidebar azul oscuro)          │
│  /cliente/*      Panel CLIENTE (sidebar violeta)            │
│  /campo/*        Encuestador + Panelista (mobile-first)     │
│  /registro/*     Registro público (3 perfiles)              │
│  /login          Supabase Auth                              │
│                                                             │
│  Rutas de datos: @supabase/ssr + TanStack React Query       │
│  Lógica compleja: Supabase Edge Functions (Deno/TS)         │
└──────────────────────────┬──────────────────────────────────┘
                           │ supabase-js
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       SUPABASE                              │
│                                                             │
│  PostgreSQL (tablas del dominio + RLS)                      │
│  Auth (JWT + user_metadata.role)                            │
│  Storage (bucket geodatavoice-audio — audios privados)      │
│  Edge Functions (process-audio: Whisper + Claude (claude-opus-4-8))      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP (OpenAI SDK)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Servicios externos                                         │
│  OpenAI Whisper-1 (STT) + Claude (claude-opus-4-8) (NLP/sentimiento)    │
│  AutenTIC/Veriff (KYC — en simulación, cuenta saas-3)                │
│  WhatsApp Business API (pendiente integrar)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Rutas del frontend

```
frontend/app/
├── page.tsx                              Landing comercial
├── login/page.tsx                        Login → redirige por rol
├── registro/
│   ├── page.tsx                          Selector de perfil
│   ├── cliente/page.tsx                  signUp + insert clients
│   ├── panelista/page.tsx                signUp + insert participants (SHA-256)
│   └── encuestador/page.tsx              signUp + insert field_operators + genera recruiter_code
├── auth/
│   ├── callback/route.ts                 Callback OAuth/email
│   └── verificar-email/page.tsx
├── dashboard/                            ROL: admin
│   ├── layout.tsx                        Sidebar azul oscuro
│   ├── page.tsx                          KPIs globales (Supabase)
│   ├── clientes/page.tsx                 CRUD + activar/rechazar
│   ├── panelistas/page.tsx               Lista + filtros + cambiar estado
│   ├── encuestadores/page.tsx            CRUD + roles
│   ├── proyectos/page.tsx                Lista de proyectos
│   ├── pagos/page.tsx                    Configuración de tarifas
│   └── configuracion/page.tsx
├── cliente/                              ROL: cliente
│   ├── layout.tsx                        Sidebar violeta
│   ├── page.tsx                          Home cliente
│   ├── encuestas/page.tsx               Lista global de encuestas del cliente
│   ├── resultados/page.tsx              Lista proyectos → resultados
│   └── proyectos/
│       ├── page.tsx, nuevo/page.tsx
│       └── [id]/
│           ├── page.tsx                  Detalle + encuestas + toggle identidad calle
│           ├── resultados/page.tsx       Resultados del PROYECTO (foto+olas+indicadores+favorabilidad)
│           └── encuestas/
│               ├── nueva/page.tsx        Crear encuesta (+ tracking_key/favorabilidad)
│               └── [eid]/page.tsx        Resultados por ENCUESTA
└── campo/                                ROL: panelista | encuestador
    ├── verificar-identidad/page.tsx      KYC panelista (AutenTIC real / simulación) + gate middleware
    ├── panelista/
    │   ├── page.tsx                      Home (encuestas reales + ganado este mes/total)
    │   ├── pagos/page.tsx                Historial de pagos
    │   └── encuesta/[id]/page.tsx        Flujo encuesta REAL (preguntas Supabase + audio→Storage)
    └── encuestador/
        ├── page.tsx                      Home (encuestas + código reclutador + ganado mes)
        └── registrar/page.tsx            ENCUESTAR EN CAMPO: selección→datos+demografía→identidad(cond)→consent→GPS→encuesta

api/  (route handlers, service role)
  ├── email/{cliente-activado,nueva-encuesta,pago-procesado}
  ├── identidad/{simular,webhook}
  └── audio/upload                        Sube audio al bucket privado
```

---

## Tablas en Supabase

RLS desactivado en todas las tablas (MVP). Habilitar antes de producción real.

| Tabla | Descripción |
|---|---|
| `clients` | Clientes contratantes. `status`: pending → active/inactive |
| `projects` | Proyectos por cliente. `type`: favorability/satisfaction/pulse/custom |
| `surveys` | Encuestas por proyecto. `perfil_objetivo`: panelista/encuestador/ambos. `status`: draft/sent/closed |
| `questions` | Preguntas de encuesta. `type`: single_choice/multiple_choice/scale/open_text/audio |
| `participants` | Panelistas. `document_hash` + `phone_hash` SHA-256. `status`: preregistered/verified/suspended |
| `panel_memberships` | Participante ↔ proyecto ↔ cohorte |
| `field_operators` | Encuestadores. `role`: encuestador/supervisor/coordinator. `status`: active/inactive |
| `field_visits` | Registro GPS de visitas del encuestador (lat/lon/accuracy) |
| `consents` | Consentimientos versionados (v1.0). `type`: PANEL/AUDIO/WHATSAPP/PAYMENTS/AGORA/POLITICAL |
| `responses` | Respuestas de encuesta. `encuestador_id` si fue aplicada en campo |
| `audio_responses` | Archivo de audio subido. `quality`: pending/transcribed/processed/error |
| `nlp_outputs` | 9 variables IA: sentiment, emotion, intensity, main_topic, topics, narrative, summary, citizen_quote, opinion_driver |
| `payments` | Pagos a panelistas. `status`: pending/approved/paid |
| `payment_config` | Tarifa global: encuesta_cop / audio_cop / encuesta_campo_cop |
| `client_payment_config` | Tarifa por cliente (override de la global) |

---

## Roles del sistema

| Rol (`user_metadata.role`) | Panel | Registro |
|---|---|---|
| `admin` | `/dashboard` | Creado manualmente en Supabase |
| `cliente` | `/cliente` | `/registro/cliente` → aprobación admin |
| `encuestador` | `/campo/encuestador` | `/registro/encuestador` → aprobación coordinador |
| `panelista` | `/campo/panelista` | `/registro/panelista` → confirma email |

---

## Flujo 1: Panelista responde encuesta

```
Panelista          campo/panelista/page.tsx     Supabase         Edge Function
    │                       │                      │                   │
    │── login ─────────────►│                      │                   │
    │                       │── query surveys ─────►│                   │
    │                       │   (perfil=panelista/ambos, status=sent)   │
    │◄── lista encuestas ───│◄─────────────────────│                   │
    │── selecciona ─────────│                      │                   │
    │                  encuesta/[id]/page.tsx       │                   │
    │                       │── query questions ───►│                   │
    │◄── preguntas reales ──│◄─────────────────────│                   │
    │── responde + graba ───│                      │                   │
    │                       │── insert responses ──►│                   │
    │                       │── upload audio ───────► Storage           │
    │                       │── insert audio_responses ►│               │
    │                       │                      │── trigger ────────►│
    │                       │                      │             Whisper STT
    │                       │                      │             Claude NLP
    │                       │                      │◄── insert nlp_outputs
    │                       │── insert payments ───►│                   │
    │◄── confirmación ──────│                      │                   │
```

*(Pasos marcados con ⚠ en el árbol de rutas aún no están implementados)*

---

## Flujo 2: Encuestador registra panelista en campo

```
Encuestador       campo/encuestador/page.tsx     Supabase
    │                       │                      │
    │── login ─────────────►│                      │
    │                       │── query field_operators (user_id) ──────►│
    │                       │── query surveys (perfil=encuestador/ambos) ►│
    │── "Registrar panelista" ──────────────────────────────────────────│
    │              campo/encuestador/registrar/page.tsx                 │
    │── datos + foto + GPS ─│                      │                   │
    │                       │── insert participants ►│                  │
    │                       │── insert field_visits ►│                  │
    │                       │── insert consents ────►│                  │
```

---

## Flujo 3: Cliente crea encuesta

```
Cliente            cliente/proyectos/[id]/encuestas/nueva/page.tsx     Supabase
    │                                    │                                │
    │── define nombre, ola, fechas ──────│                                │
    │── perfil_objetivo: panelista/encuestador/ambos                      │
    │── agrega preguntas (tipo + texto + opciones + audio_prompt)         │
    │── "Publicar" ──────────────────────│── insert surveys ─────────────►│
    │                                    │── insert questions (bulk) ─────►│
    │                                    │── update surveys.status='sent' ►│
```

---

## Procesamiento de audio (Edge Function — ACTIVA)

```
Supabase Trigger (insert en audio_responses)
    │
    ▼
Edge Function: supabase/functions/process-audio/index.ts
    │── fetch audio desde Storage (URL firmada)
    │── OpenAI Whisper-1 → texto transcrito
    │── Claude (claude-opus-4-8) con prompt estructurado → JSON con:
    │     sentiment (positivo/negativo/neutro/mixto)
    │     emotion (satisfacción/frustración/esperanza/indiferencia/indignación)
    │     intensity (1–5)
    │     main_topic (seguridad/salud/educación/empleo/servicios/movilidad/otro)
    │     topics (array)
    │     narrative (resumen 2 frases)
    │     summary (1 frase)
    │     citizen_quote (frase literal más representativa)
    │     opinion_driver (razón principal detrás de la opinión)
    │── insert nlp_outputs (vinculado a audio_responses.id)
    └── update audio_responses.quality = 'processed'
```

---

## Modelo de datos — Relaciones principales

```
clients ──< projects ──< surveys ──< questions
               │
               ├──< panel_memberships >── participants
               │                               │
               │                         field_visits
               │                         consents
               │                         payments
               │
surveys ──< responses ──< audio_responses ──< nlp_outputs
               │
          field_operators (encuestador_id)
```

---

## Seguridad y privacidad

| Campo | Tratamiento actual |
|---|---|
| `document_hash` | SHA-256 (irreversible) |
| `phone_hash` | SHA-256 (irreversible) |
| `name` | Texto plano — **pendiente cifrar** (ver ADR-004) |
| Audios | Supabase Storage privado (URLs firmadas con TTL) |
| `nlp_outputs` | Sin datos personales — solo texto anónimo y métricas |
| Dashboard | Siempre datos agregados, nunca nombres |

**Consentimientos requeridos antes de cada acción:**
`PANEL` | `AUDIO` | `WHATSAPP` | `PAYMENTS` | `AGORA` | `POLITICAL`

---

## Configuración del entorno

```bash
# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://bsjiqatcqbjqmtytlgll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# supabase/functions/.env (para Edge Functions)
OPENAI_API_KEY=sk-...
```

```bash
# Desarrollo local
cd frontend && npm run dev -- --port 3010

# Deploy (auto en push a main via Vercel)
git push origin main
```
