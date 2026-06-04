# ARCHITECTURE.md — GeoDataVoice
> Diagramas y flujos del sistema | 2026-06-04

---

## Arquitectura de componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                        USUARIOS FINALES                             │
├────────────────────────┬───────────────────┬────────────────────────┤
│   Cliente político /   │  Encuestador de   │  Par AGORA             │
│   alcaldía / gremio    │  campo            │  (panelista activado)  │
│   (Dashboard Web)      │  (PWA móvil)      │  (WhatsApp)            │
└──────────┬─────────────┴─────────┬─────────┴──────────┬─────────────┘
           │ HTTPS                 │ HTTPS               │ WhatsApp API
           │ :3000                 │ :3001               │
┌──────────▼───────────────────────▼─────────────────────▼────────────┐
│                     FastAPI Backend  :8000                          │
│                                                                     │
│  /api/v1/                                                           │
│  ├── clients          ← CRUD clientes contratantes                  │
│  ├── projects         ← proyectos por cliente                       │
│  ├── territories      ← municipios, zonas, polígonos GeoJSON        │
│  ├── participants     ← pre-registro, KYC, OTP, perfil              │
│  ├── field            ← visitas GPS, operadores, evidencia          │
│  ├── consents         ← consentimientos versionados                 │
│  ├── panel            ← cohortes, membresías, rotación              │
│  ├── surveys          ← instrumentos, preguntas, envío              │
│  ├── responses        ← respuestas cerradas y abiertas              │
│  ├── audio            ← upload, status, pipeline trigger            │
│  ├── analytics        ← indicadores agregados (por construir)       │
│  ├── payments         ← aprobación y exportación CSV               │
│  ├── peers            ← red AGORA: pares, tareas, evidencias        │
│  └── messages         ← banco de contenidos con aprobación         │
└──────┬────────────────────────────────────────────┬─────────────────┘
       │                                            │
       │ SQLAlchemy async                           │ Celery tasks
       │                                            │
┌──────▼──────────┐                    ┌────────────▼──────────────────┐
│  PostgreSQL 16  │                    │  Redis 7 (broker + cache)     │
│  + PostGIS 3.4  │                    └────────────┬──────────────────┘
│                 │                                 │
│  Tablas:        │                    ┌────────────▼──────────────────┐
│  clients        │                    │  Celery Worker                │
│  projects       │                    │                               │
│  territories    │◄───────────────────│  process_audio():             │
│  participants   │  persiste NLP      │    1. fetch audio from storage │
│  panel_*        │                    │    2. Whisper STT → texto     │
│  surveys        │                    │    3. GPT-4o-mini → JSON NLP  │
│  responses      │                    │    4. persist NLPOutput       │
│  audio_responses│                    │    5. update AudioResponse    │
│  nlp_outputs    │                    │                               │
│  payments       │                    │  send_whatsapp():             │
│  peers          │                    │    envío de links/recordatorios│
│  messages       │                    │                               │
│  audit_logs     │                    │  process_payment_batch():     │
└─────────────────┘                    │    exportar CSV Nequi         │
                                       └───────────────────────────────┘

Servicios externos:
┌──────────────────┐  ┌──────────────┐  ┌─────────────────┐  ┌──────────────┐
│  OpenAI          │  │  WhatsApp    │  │  KYC Provider   │  │  Supabase    │
│  Whisper STT     │  │  Business    │  │  (Truora /      │  │  Storage     │
│  GPT-4o-mini     │  │  API         │  │   Metamap)      │  │  (audios +   │
│  NLP/sentimiento │  │  encuestas   │  │  identidad +    │  │   evidencias)│
└──────────────────┘  └──────────────┘  │  residencia     │  └──────────────┘
                                        └─────────────────┘
```

---

## Flujo 1: Reclutamiento y validación de un panelista

```
Encuestador           PWA (field-app)         Backend              Proveedor KYC
    │                       │                    │                       │
    │── abre formulario ───►│                    │                       │
    │── ingresa datos ──────│                    │                       │
    │   (nombre, doc, cel,  │                    │                       │
    │    foto, GPS)         │── POST /participants/pre-register ────────►│
    │                       │                    │── crea Participant    │
    │                       │                    │   status=PREREGISTERED│
    │                       │◄─── 201 {id} ──────│                       │
    │                       │                    │                       │
    │                       │── POST /participants/{id}/kyc ────────────►│
    │                       │                    │── llama API KYC ─────►│
    │                       │                    │◄── webhook resultado ─│
    │                       │                    │── actualiza kyc_status│
    │                       │                    │   si approved →       │
    │                       │                    │   status=VERIFIED     │
    │                       │                    │                       │
    │                       │── POST /participants/{id}/otp/send ────────│
    │                       │                    │── envía SMS con OTP   │
    │── recibe SMS OTP ─────│                    │                       │
    │── ingresa OTP ────────│── POST /otp/verify ►│                       │
    │                       │                    │── phone_verified=True │
    │                       │                    │                       │
    │                       │── POST /consents ──►│                       │
    │                       │                    │── guarda consentimiento│
    │                       │                    │   versionado          │
    │                       │                    │                       │
    │                       │── POST /panel/memberships ─────────────────│
    │                       │                    │── asigna a cohorte    │
    │                       │                    │   status=ACTIVE       │
```

---

## Flujo 2: Ciclo de medición (encuesta + audio)

```
Backend (scheduler)     WhatsApp API        Panelista           Workers
      │                      │                  │                   │
      │── POST /surveys/{id}/send               │                   │
      │── genera link único por panelista       │                   │
      │── POST mensaje ─────►│                  │                   │
      │                      │── link encuesta ►│                   │
      │                      │                  │── abre formulario │
      │                      │                  │── responde preguntas
      │                      │                  │── graba nota voz  │
      │                      │◄── POST /responses (respuestas)      │
      │                      │◄── POST /audio (archivo .ogg)        │
      │                      │                  │                   │
      │── guarda AudioResponse                  │                   │
      │── status=pending      │                  │                   │
      │── dispatch Celery task ────────────────────────────────────►│
      │                                                             │── fetch audio
      │                                                             │── Whisper STT
      │                                                             │── GPT-4o-mini
      │                                                             │── persist NLPOutput
      │◄────────────────────────────────────────────────────────────│
      │── AudioResponse status=processed        │                   │
      │── genera pago pendiente (Payment)       │                   │
```

---

## Flujo 3: Dashboard del cliente

```
Cliente                 Frontend (Next.js)         Backend API
   │                          │                        │
   │── abre dashboard ────────│                        │
   │                          │── GET /analytics/projects/{id}
   │                          │                        │── query PostgreSQL
   │                          │                        │── agrega por polígono
   │                          │                        │── aplica pesos
   │                          │◄─── JSON {             │
   │                          │   favorabilidad: 62%,  │
   │                          │   sentimiento: {...},  │
   │                          │   temas: [...],        │
   │                          │   por_poligono: [...]  │
   │                          │ }                      │
   │◄── mapa + KPIs ──────────│                        │
   │── filtra por zona ───────│── GET /analytics?zona= │
   │◄── resultados filtrados ─│                        │
```

---

## Modelo de datos — Relaciones principales

```
clients ──< projects ──< surveys ──< questions
                │                        │
                │                ┌───────▼──────┐
                │                │  responses   │
                │                └───────┬──────┘
                │                        │ 1:1
                │                ┌───────▼──────────┐
                │                │  audio_responses │
                │                └───────┬──────────┘
                │                        │ 1:1
                │                ┌───────▼──────────┐
                │                │   nlp_outputs    │
                │                └──────────────────┘
                │
                ├──< panel_memberships >── participants
                │           │                    │
                │         cohorts          participant_profiles
                │                                │
                │                          identity_verifications
                │                          consents
                │                          payments
                │
territories ────┘ (participants.territory_id)
    │
    └── self-referential (parent_id): department > municipality > zone > polygon

peers ── participants (1:1)
peers ──< peer_tasks ──< peer_evidences
peer_tasks ── messages (aprobación antes de activar)
```

---

## Seguridad y privacidad por diseño

```
Capa de datos:
┌─────────────────────────────────────────────────────┐
│  Campo                │ Tratamiento                  │
│──────────────────────────────────────────────────────│
│  document_number      │ SHA-256 hash (irreversible)  │
│  phone                │ SHA-256 hash (irreversible)  │
│  name                 │ AES-256-GCM (pendiente)      │
│  address              │ Texto plano (pendiente cifrar)│
│  GPS coordinates      │ Precisión reducida en export │
│  audio files          │ Supabase Storage privado     │
│  nlp_outputs          │ Sin nombre — solo texto anon │
│  dashboard data       │ Siempre agregado y anónimo   │
└─────────────────────────────────────────────────────┘

Consentimientos requeridos antes de cada acción:
- PANEL: antes de asignar al panel
- AUDIO: antes de solicitar nota de voz
- WHATSAPP: antes de enviar mensajes
- PAYMENTS: antes de registrar cuenta de pago
- AGORA: antes de activar como par (finalidad distinta)
- POLITICAL: si el proyecto tiene finalidad electoral
```

---

## Estructura de carpetas objetivo (completa)

```
GeoDataVoice/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── security.py          ← JWT, hashing (por crear)
│   │   │   └── dependencies.py      ← get_current_user (por crear)
│   │   ├── models/                  ← COMPLETO
│   │   ├── schemas/                 ← Pydantic schemas (por crear)
│   │   │   ├── participant.py
│   │   │   ├── survey.py
│   │   │   └── ...
│   │   ├── api/v1/routes/           ← 2/12 implementados
│   │   ├── services/
│   │   │   ├── audio_processor.py   ← COMPLETO
│   │   │   ├── kyc_service.py       ← por crear
│   │   │   ├── whatsapp_service.py  ← por crear
│   │   │   └── payment_service.py   ← por crear
│   │   └── workers/
│   │       ├── celery.py            ← por crear
│   │       ├── audio_tasks.py       ← por crear
│   │       └── payment_tasks.py     ← por crear
│   ├── alembic/                     ← por configurar
│   ├── tests/                       ← por crear
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                        ← Next.js dashboard (vacío)
├── field-app/                       ← Next.js PWA (vacío)
├── infra/
│   └── docker-compose.yml
│
├── PROJECT_CONTEXT.md
├── TASKS.md
├── DECISIONS.md
└── ARCHITECTURE.md
```
