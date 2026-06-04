# PROJECT_CONTEXT.md — GeoDataVoice
> Generado: 2026-06-04 | Arquitecto: Claude Sonnet 4.6 | Estado: Sesión inicial completada

---

## Resumen Ejecutivo

### Objetivo del proyecto
Construir una plataforma de **inteligencia territorial** que recluta personas reales y verificadas, las organiza en un panel georreferenciado, y mide su opinión de forma recurrente mediante WhatsApp, formularios y notas de voz. El análisis de voz ciudadana (transcripción + NLP) es el diferencial frente a encuestadoras tradicionales.

### Problema de negocio que resuelve
Alcaldes, gobernadores, candidatos y organizaciones con públicos masivos toman decisiones con información incompleta. Las encuestas tradicionales son costosas, episódicas y poco explicativas. GeoDataVoice llena la brecha para municipios medianos y ciudades intermedias de Colombia que no tienen acceso a medición recurrente adaptada a su tamaño y presupuesto.

### Estado actual del desarrollo
**Fase: Arquitectura base — primer commit.** El proyecto tiene la estructura de carpetas, todos los modelos de datos SQLAlchemy y dos rutas de API completamente implementadas (`/clients`, `/participants`). El resto de las 12 rutas son stubs vacíos. No hay frontend, no hay migraciones, no hay tests, no hay autenticación.

### Nivel de avance estimado
```
Modelos de datos          ████████░░  80%
API Backend               ██░░░░░░░░  20%  (2/12 rutas implementadas)
Autenticación / Auth      ░░░░░░░░░░   0%
Migraciones DB            ░░░░░░░░░░   0%
Frontend dashboard        ░░░░░░░░░░   0%
PWA campo (encuestadores) ░░░░░░░░░░   0%
Integración WhatsApp      ░░░░░░░░░░   0%
Pipeline de audio         ██░░░░░░░░  20%  (servicio escrito, no conectado)
Tests                     ░░░░░░░░░░   0%
CI/CD                     ░░░░░░░░░░   0%
TOTAL                     ██░░░░░░░░  ~12%
```

---

## Arquitectura General

### Arquitectura de alto nivel
```
┌─────────────────────────────────────────────────────┐
│                   CLIENTES                          │
│  Dashboard Web (Next.js)   PWA Campo (Next.js)      │
└────────────────┬───────────────────┬────────────────┘
                 │ HTTP/REST          │ HTTP/REST (offline-first)
┌────────────────▼───────────────────▼────────────────┐
│              FastAPI Backend (Python)               │
│  /api/v1/[clients|projects|territories|participants │
│            |field|consents|panel|surveys|           │
│             audio|payments|peers|messages]          │
└──────┬──────────────────────────┬───────────────────┘
       │ SQLAlchemy async          │ Celery tasks
┌──────▼──────┐          ┌────────▼────────┐
│  PostgreSQL │          │  Redis (broker) │
│  + PostGIS  │          └────────┬────────┘
└─────────────┘                   │
                         ┌────────▼────────┐
                         │  Workers Celery │
                         │  - Whisper STT  │
                         │  - GPT-4o-mini  │
                         │  - Pagos batch  │
                         └─────────────────┘

Servicios externos:
- WhatsApp Business API (mensajería/encuestas)
- Proveedor KYC (Truora/Metamap — por definir)
- OpenAI (Whisper + GPT-4o-mini)
- Nequi/Daviplata (dispersión de pagos)
- Supabase Storage (audios y evidencias)
```

### Componentes principales
| Componente | Estado | Descripción |
|---|---|---|
| `backend/` | Parcial | FastAPI, modelos, 2 rutas reales |
| `frontend/` | Vacío | Dashboard para clientes (por construir) |
| `field-app/` | Vacío | PWA offline para encuestadores |
| `infra/` | Docker Compose | PostgreSQL+PostGIS + Redis |

### Flujo de información
1. Encuestador en campo → PWA → `POST /participants/pre-register`
2. Sistema dispara KYC → proveedor externo → `PATCH /participants/{id}/kyc`
3. OTP valida celular → panelista queda `VERIFIED`
4. Motor de panel asigna cohorte → `POST /panel-memberships`
5. Módulo de encuestas envía link por WhatsApp → panelista responde
6. Audio recibido → worker Celery → Whisper → GPT-4o-mini → `nlp_outputs`
7. Dashboard consulta `GET /analytics/projects/{id}` → cliente ve resultados
8. AGORA activa pares con mensajes aprobados → recibe evidencias

### Integraciones externas
| Servicio | Propósito | Estado |
|---|---|---|
| OpenAI Whisper | Transcripción de audios | Servicio escrito, sin conectar |
| OpenAI GPT-4o-mini | Análisis sentimiento/NLP | Servicio escrito, sin conectar |
| WhatsApp Business API | Envío de encuestas y links | No implementado |
| KYC (Truora/Metamap) | Validación de identidad | No implementado — proveedor sin decidir |
| Nequi/Daviplata | Dispersión de pagos | No implementado |
| Supabase | Storage de audios + auth | SDK incluido, sin configurar |

---

## Stack Tecnológico

### Backend
- **Python 3.12** + **FastAPI 0.115** (async)
- **SQLAlchemy 2.0** (async ORM) + **asyncpg** (driver)
- **Alembic 1.13** (migraciones — configuración pendiente)
- **Pydantic v2** (validación y schemas)
- **Celery 5.4** + **Redis** (procesamiento asíncrono de audios y pagos)
- **GeoAlchemy2 0.15** + **Shapely** (geometrías PostGIS)
- **python-jose** + **passlib[bcrypt]** (JWT — sin implementar)
- **OpenAI SDK 1.51** (Whisper + GPT)
- **Supabase Python SDK 2.9**

### Frontend
- **Next.js** (por construir) — dashboard de clientes
- **Next.js PWA** (por construir) — app de campo offline-first

### Base de datos
- **PostgreSQL 16 + PostGIS 3.4** (geolocalización de territorios/panelistas)
- Campos sensibles: documento y celular almacenados como SHA-256 hash; nombre como texto plano (pendiente cifrado real con KMS)

### Autenticación
- Librerías instaladas (`python-jose`, `passlib`) pero **sin implementar**
- No hay sistema de usuarios/roles todavía

### Infraestructura
- **Docker Compose** para desarrollo local (PostGIS + Redis + backend)
- Sin configuración de producción (no hay Supabase project, no hay deploy)
- Sin CI/CD

### Dependencias relevantes
```
fastapi==0.115.0        # Framework HTTP async
sqlalchemy==2.0.35      # ORM — versión con async completo
geoalchemy2==0.15.2     # Extensión PostGIS para SQLAlchemy
celery==5.4.0           # Task queue para audio/pagos
openai==1.51.0          # Whisper STT + GPT-4o-mini NLP
supabase==2.9.1         # Storage y auth en producción
phonenumbers==8.13.48   # Validación de números de teléfono colombianos
```

---

## Estructura del Proyecto

```
GeoDataVoice/
├── .gitignore
├── PROJECT_CONTEXT.md        ← este archivo
├── TASKS.md                  ← backlog priorizado
├── DECISIONS.md              ← decisiones arquitectónicas
├── ARCHITECTURE.md           ← diagramas y flujos
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py           ← entrada FastAPI, registro de routers
│       ├── core/
│       │   ├── config.py     ← Settings con pydantic-settings
│       │   └── database.py   ← engine async, Base ORM, get_db()
│       ├── models/           ← 12 modelos SQLAlchemy (ver abajo)
│       ├── api/v1/routes/    ← 12 routers (2 implementados, 10 stubs)
│       └── services/
│           └── audio_processor.py  ← Whisper + GPT-4o-mini
│
├── frontend/                 ← VACÍO — Next.js dashboard (por construir)
├── field-app/                ← VACÍO — Next.js PWA (por construir)
└── infra/
    └── docker-compose.yml    ← PostGIS + Redis + backend
```

### Archivos críticos
| Archivo | Responsabilidad |
|---|---|
| `backend/app/main.py` | Punto de entrada, CORS, registro de routers |
| `backend/app/core/config.py` | Variables de entorno centralizadas |
| `backend/app/core/database.py` | Motor async, sesión, Base declarativa |
| `backend/app/models/participant.py` | Entidad central del sistema |
| `backend/app/services/audio_processor.py` | Diferencial técnico del producto |
| `infra/docker-compose.yml` | Entorno de desarrollo local |

### Modelos implementados (12)
| Modelo | Tabla | Descripción |
|---|---|---|
| `Client` | `clients` | Clientes contratantes |
| `Project` | `projects` | Proyectos por cliente |
| `Territory` | `territories` | Jerarquía geográfica con geometría PostGIS |
| `Participant` | `participants` | Panelistas (datos hasheados/cifrados) |
| `ParticipantProfile` | `participant_profiles` | Variables demográficas adicionales |
| `FieldOperator` | `field_operators` | Encuestadores en campo |
| `FieldVisit` | `field_visits` | Registro GPS de visitas |
| `Consent` | `consents` | Consentimientos versionados por tipo |
| `Cohort` | `cohorts` | Grupos activo/reserva/descanso |
| `PanelMembership` | `panel_memberships` | Relación participante-proyecto-cohorte |
| `Survey` | `surveys` | Instrumentos de medición por ola |
| `Question` | `questions` | Preguntas del instrumento |
| `Response` | `responses` | Respuestas cerradas/abiertas |
| `AudioResponse` | `audio_responses` | Archivos de audio con transcripción |
| `NLPOutput` | `nlp_outputs` | Resultados IA: sentimiento, emoción, temas |
| `Payment` | `payments` | Pagos a panelistas y pares |
| `Peer` | `peers` | Red de pares AGORA |
| `PeerTask` | `peer_tasks` | Tareas asignadas a pares |
| `PeerEvidence` | `peer_evidences` | Evidencias de interacción |
| `Message` | `messages` | Banco de contenidos aprobados |

---

## Funcionalidades Implementadas

1. **Estructura de modelos de datos completa** — todas las entidades del dominio están definidas con relaciones SQLAlchemy correctas.
2. **API de Clientes** (`/api/v1/clients`) — `GET /` lista clientes activos; `POST /` crea cliente; `GET /{id}` obtiene por ID.
3. **Pre-registro de Participantes** (`POST /api/v1/participants/pre-register`) — hashea documento y celular con SHA-256, detecta duplicados, persiste con estado `PREREGISTERED`.
4. **Consulta de Participante** (`GET /api/v1/participants/{id}`) — retorna datos no sensibles.
5. **Actualización estado KYC** (`PATCH /api/v1/participants/{id}/kyc`) — transición de estado a `VERIFIED`.
6. **Servicio de transcripción de audio** — función `transcribe()` con OpenAI Whisper.
7. **Servicio de análisis NLP** — función `analyze_sentiment()` con GPT-4o-mini, retorna JSON estructurado con 9 variables cualitativas.
8. **Configuración de entorno** — `Settings` centralizada con pydantic-settings, `.env.example` documentado.
9. **Docker Compose** — PostgreSQL 16 + PostGIS 3.4 + Redis 7 + backend, listos para desarrollo.
10. **CORS configurado** — permite `localhost:3000` y `localhost:3001`.
11. **Endpoint `/health`** — liveness check con versión.
12. **`.gitignore`** completo — excluye `.env`, audios, `__pycache__`, `.next`, etc.

---

## Funcionalidades Pendientes

### P0 — Crítico para el MVP (sin esto no hay producto)
1. **Migraciones Alembic** — configurar `alembic.ini`, `env.py` y generar migración inicial desde los modelos
2. **Autenticación JWT** — usuarios internos (admin, analista, supervisor) y clientes; roles y permisos por proyecto
3. **Ruta de Field** — registro de visita con GPS, evidencia (foto), operador y resultado
4. **Ruta de Consentimientos** — guardar consentimiento versionado con prueba
5. **Ruta de Encuestas** — crear cuestionario, asignar a cohorte, enviar link por WhatsApp/SMS
6. **Pipeline de audio end-to-end** — recibir archivo, guardarlo en storage, disparar worker Celery que llama `audio_processor`, persistir `AudioResponse` + `NLPOutput`
7. **Dashboard API** — `GET /analytics/projects/{id}` con indicadores agregados (favorabilidad, sentimiento, temas por polígono)
8. **Pagos exportables** — lista de pagos aprobados exportable a CSV para dispersión manual Nequi/Daviplata
9. **PWA de campo** (Next.js) — formulario de registro, captura GPS, foto de evidencia, funcionamiento offline con sync posterior
10. **Integración KYC** — conectar proveedor externo (Truora o Metamap); webhook de resultado

### P1 — Importante para el pitch con clientes
11. **Dashboard frontend** (Next.js) — indicadores ejecutivos, mapas de polígonos, filtros por segmento, evolución temporal
12. **Ruta de Panel** — asignar cohortes, cambiar estado de panelistas, gestionar rotación
13. **Integración WhatsApp Business API** — envío de encuestas y recordatorios
14. **Módulo AGORA básico** — crear par, asignar tarea, recibir evidencia, aprobar pago
15. **Banco de mensajes** — CRUD con flujo de aprobación por el cliente

### P2 — Optimización post-validación
16. Pagos automáticos (integración directa Wompi/Nequi)
17. Mapa interactivo con capas de indicadores (PostGIS + Mapbox/Leaflet)
18. Post-estratificación y ponderación estadística en el módulo analítico
19. Portal de pares (app dedicada para AGORA)
20. CI/CD con GitHub Actions + deploy en Railway/Fly.io/Render

---

## Decisiones Técnicas Identificadas

| Decisión | Evidencia | Impacto |
|---|---|---|
| **FastAPI async** en lugar de Django/Flask | `asyncpg`, `async_sessionmaker`, todas las rutas `async def` | Mejor throughput para llamadas concurrentes a WhatsApp API y workers; mayor complejidad para devs sin experiencia en async |
| **SQLAlchemy 2.0 ORM** (no Supabase ORM directo) | `from sqlalchemy.orm import Mapped, mapped_column` | Control total del esquema y migraciones Alembic; el SDK de Supabase se usará solo para Storage y Auth |
| **Hashing SHA-256** para documento y celular | `hashlib.sha256(value.strip().upper().encode()).hexdigest()` en `participants.py` | Permite búsqueda por hash sin exponer el dato; limitación: no se puede recuperar el valor original (correcto por diseño) |
| **Nombre en texto plano** para participantes | `name_encrypted=data.name` con TODO en comentario | RIESGO de privacidad — está pendiente cifrado real con KMS; actualmente es un placeholder |
| **GPT-4o-mini** para NLP en lugar de modelo propio | `model="gpt-4o-mini"` en `audio_processor.py` | Más rápido de implementar, costo variable por audio; en escala sería más barato un modelo fine-tuneado propio |
| **Celery + Redis** para procesamiento async | `celery==5.4.0`, `redis==5.1.1` en requirements | Los workers no están implementados aún; solo las funciones del servicio existen |
| **PostGIS** para territorios | `geoalchemy2`, `Geometry("MULTIPOLYGON", srid=4326)` | Correcto para polígonos homogéneos; requiere que Docker Compose use imagen `postgis/postgis` |
| **CORS abierto a localhost** | `allow_origins=["http://localhost:3000", "http://localhost:3001"]` | Solo válido en desarrollo; en producción se debe restringir al dominio real |

---

## Estado Actual del Código

### Módulos completos (listos para usar)
- `app/core/config.py` — configuración centralizada
- `app/core/database.py` — motor async y sesión
- `app/models/` — todos los modelos (20 tablas)
- `app/api/v1/routes/clients.py` — CRUD básico de clientes
- `app/services/audio_processor.py` — transcripción y NLP
- `infra/docker-compose.yml` — entorno local

### Módulos incompletos (stub o parcial)
- `app/api/v1/routes/participants.py` — faltan: OTP, listado, actualización de perfil, historial
- `app/api/v1/routes/projects.py` — stub vacío
- `app/api/v1/routes/territories.py` — stub vacío
- `app/api/v1/routes/field.py` — stub vacío
- `app/api/v1/routes/consents.py` — stub vacío
- `app/api/v1/routes/panel.py` — stub vacío
- `app/api/v1/routes/surveys.py` — stub vacío
- `app/api/v1/routes/audio.py` — stub vacío
- `app/api/v1/routes/payments.py` — stub vacío
- `app/api/v1/routes/peers.py` — stub vacío
- `app/api/v1/routes/messages.py` — stub vacío

### Módulos en riesgo
- **Autenticación**: librería instalada pero sin implementar. Cualquier endpoint actual es de acceso público.
- **Cifrado de nombre**: marcado como TODO, actualmente en texto plano — riesgo legal antes de procesar datos reales.
- **Workers Celery**: sin archivo `celery.py` de configuración, sin tareas definidas.
- **Alembic**: sin `alembic.ini` ni `env.py` — las tablas no se pueden crear.

---

## Bugs Conocidos o Potenciales

| # | Descripción | Severidad | Solución sugerida |
|---|---|---|---|
| B1 | `name_encrypted` guarda el nombre en texto plano | **Alta** | Implementar cifrado simétrico (AES-256) con clave en KMS/env antes de cualquier dato real |
| B2 | Ningún endpoint tiene autenticación — cualquiera puede crear/leer datos | **Alta** | Implementar middleware JWT antes de conectar a cualquier cliente o PWA |
| B3 | `Territory.children` tiene `foreign_keys=[parent_id]` pero SQLAlchemy podría confundirse con la relación auto-referencial | **Media** | Agregar `primaryjoin` explícito en la relación `children` |
| B4 | `audio_processor.py` abre el archivo con `open()` síncrono dentro de una función `async` | **Media** | Usar `aiofiles` o ejecutar en threadpool con `asyncio.to_thread()` |
| B5 | CORS permite `allow_credentials=True` con orígenes específicos, pero en producción los dominios no están definidos | **Media** | Agregar variable de entorno `ALLOWED_ORIGINS` y usarla en producción |
| B6 | `docker-compose.yml` tiene credenciales de DB hardcodeadas (`geodata_dev`) | **Baja** | Mover a `.env` del proyecto infra |
| B7 | No hay límite de tamaño en carga de archivos de audio | **Media** | Agregar `MAX_UPLOAD_SIZE` en la ruta de audio antes de guardar en storage |
| B8 | `import json` está dentro de la función `analyze_sentiment()` | **Baja** | Mover al top del archivo |

---

## Deuda Técnica

| Ítem | Descripción | Prioridad |
|---|---|---|
| DT1 | Sin tests (unitarios, integración, e2e) | Alta |
| DT2 | Sin schemas Pydantic para la mayoría de rutas (solo clients y participants los tienen) | Alta |
| DT3 | Sin capa de servicios/repositorios — lógica de negocio mezclada con rutas | Media |
| DT4 | Sin logging estructurado (solo el default de uvicorn) | Media |
| DT5 | Sin manejo de errores global (exception handlers) | Media |
| DT6 | `requirements.txt` sin separación dev/prod (pytest, etc. deberían estar en `requirements-dev.txt`) | Baja |
| DT7 | Sin documentación de API (OpenAPI está auto-generado pero sin ejemplos ni descripciones) | Baja |
| DT8 | Modelos de `Peer` y `PeerTask` referencian `Message` pero el import circular no está resuelto explícitamente | Media |

---

## Configuración del Entorno

### Variables requeridas (`.env`)
```bash
DATABASE_URL=postgresql+asyncpg://geodata:geodata_dev@localhost:5432/geodatavoice
SECRET_KEY=genera-con-openssl-rand-hex-32
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
REDIS_URL=redis://localhost:6379/0
OPENAI_API_KEY=sk-...
STORAGE_BUCKET=geodatavoice-audio
KYC_PROVIDER_URL=       # pendiente definir proveedor
KYC_API_KEY=            # pendiente
```

### Pasos para ejecutar el proyecto (hoy)
```bash
# 1. Clonar y entrar al proyecto
cd /Users/jaimecriales/Sites/GeoDataVoice

# 2. Levantar base de datos y Redis
docker compose -f infra/docker-compose.yml up db redis -d

# 3. Instalar dependencias Python
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 4. Configurar entorno
cp .env.example .env
# editar .env con los valores reales

# 5. Crear tablas (pendiente — Alembic no configurado aún)
# alembic upgrade head   ← NO FUNCIONA AÚN

# 6. Levantar servidor
uvicorn app.main:app --reload --port 8000

# 7. Ver docs
open http://localhost:8000/docs
```

---

## Comandos Útiles

```bash
# Desarrollo
uvicorn app.main:app --reload --port 8000

# Docker completo
docker compose -f infra/docker-compose.yml up --build

# Solo DB + Redis
docker compose -f infra/docker-compose.yml up db redis -d

# Migraciones (una vez configurado Alembic)
alembic init alembic
alembic revision --autogenerate -m "initial"
alembic upgrade head
alembic downgrade -1

# Worker Celery (una vez implementado)
celery -A app.workers.celery worker --loglevel=info

# Tests (una vez implementados)
pytest backend/tests/ -v --cov=app

# Linting
ruff check backend/
black backend/ --check
```

---

## Próximos Pasos Recomendados (Top 20)

| # | Tarea | Prioridad | Tiempo est. |
|---|---|---|---|
| 1 | Configurar Alembic + migración inicial | P0 | 1h |
| 2 | Implementar autenticación JWT (usuarios internos + clientes) | P0 | 3h |
| 3 | Implementar ruta `POST /field/visits` con GPS + evidencia | P0 | 2h |
| 4 | Implementar ruta `POST /consents` | P0 | 1h |
| 5 | Cifrar el campo `name_encrypted` con AES-256 | P0 | 1h |
| 6 | Configurar Celery (`app/workers/celery.py`) + tarea `process_audio` | P0 | 2h |
| 7 | Implementar ruta `POST /audio` con upload a Supabase Storage | P0 | 2h |
| 8 | Conectar pipeline audio end-to-end (upload → worker → NLPOutput) | P0 | 3h |
| 9 | Implementar CRUD de proyectos y territorios | P0 | 2h |
| 10 | Implementar motor de encuestas (crear, asignar cohorte, generar link) | P0 | 3h |
| 11 | Implementar `GET /analytics/projects/{id}` con indicadores básicos | P0 | 3h |
| 12 | Implementar exportación de pagos aprobados (CSV) | P0 | 1h |
| 13 | Crear PWA de campo en `field-app/` con Next.js | P1 | 8h |
| 14 | Agregar service workers para modo offline en PWA | P1 | 3h |
| 15 | Crear dashboard frontend en `frontend/` con Next.js | P1 | 8h |
| 16 | Integrar WhatsApp Business API para envío de encuestas | P1 | 4h |
| 17 | Definir e integrar proveedor KYC (Truora recomendado para Colombia) | P1 | 4h |
| 18 | Módulo AGORA básico (peers + tasks + evidence) | P1 | 4h |
| 19 | Banco de mensajes con flujo de aprobación | P1 | 2h |
| 20 | Tests unitarios para modelos y rutas críticas | P1 | 4h |

---

## Prompt de Continuación

Usa este prompt al inicio de una nueva sesión para retomar el desarrollo:

```
Estoy trabajando en GeoDataVoice, una plataforma de inteligencia territorial
ubicada en /Users/jaimecriales/Sites/GeoDataVoice.

STACK: FastAPI + Python 3.12 / SQLAlchemy 2.0 async / PostgreSQL + PostGIS /
Celery + Redis / OpenAI (Whisper + GPT-4o-mini) / Supabase Storage.
Frontend (aún por construir): Next.js dashboard + Next.js PWA de campo offline.

ESTADO ACTUAL: Modelos de datos completos (20 tablas), 2 rutas implementadas
(/clients, /participants parcial), resto son stubs. Sin autenticación, sin
migraciones Alembic, sin frontend, sin tests. Ver PROJECT_CONTEXT.md para el
mapa completo.

TAREA DE HOY: [describe aquí lo que quieres construir]

Antes de escribir código, lee los archivos relevantes del proyecto para
entender el contexto existente.
```
