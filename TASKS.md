# TASKS.md — GeoDataVoice Backlog
> Última actualización: 2026-06-04

## Leyenda
- `[ ]` Pendiente
- `[~]` En progreso
- `[x]` Completado
- **P0** Sin esto no hay MVP | **P1** Importante para demo | **P2** Post-validación

---

## P0 — Crítico (semanas 1–4)

### Infraestructura & Base
- [ ] **P0-01** Configurar Alembic: `alembic init`, `env.py` con async engine, primera migración desde modelos
- [ ] **P0-02** Agregar `requirements-dev.txt` con pytest, ruff, black, httpx para tests
- [ ] **P0-03** Crear `app/workers/celery.py` con configuración base y tarea `process_audio`
- [ ] **P0-04** Configurar exception handlers globales en `main.py` (404, 422, 500)
- [ ] **P0-05** Agregar logging estructurado (structlog o loguru)

### Seguridad & Auth
- [ ] **P0-06** Implementar autenticación JWT — usuarios internos con roles: `admin`, `analyst`, `field_supervisor`, `client_viewer`
- [ ] **P0-07** Agregar dependency `get_current_user` y aplicar a todos los routers
- [ ] **P0-08** Cifrar `name_encrypted` con AES-256 (clave en variable de entorno)
- [ ] **P0-09** Mover `ALLOWED_ORIGINS` a variable de entorno

### Módulos de API (rutas reales)
- [ ] **P0-10** `POST /projects` + `GET /projects` + `GET /projects/{id}` — CRUD de proyectos
- [ ] **P0-11** `POST /territories` + `GET /territories` + polígonos GeoJSON
- [ ] **P0-12** `POST /field/operators` — crear operador de campo
- [ ] **P0-13** `POST /field/visits` — registrar visita con GPS (lat/lon/accuracy) + evidencia URL
- [ ] **P0-14** `POST /consents` — guardar consentimiento versionado con prueba
- [ ] **P0-15** `POST /panel/memberships` — asignar participante a proyecto/cohorte
- [ ] **P0-16** `POST /surveys` + `POST /surveys/{id}/questions` — crear instrumento
- [ ] **P0-17** `POST /surveys/{id}/send` — generar link único por panelista, registrar envío
- [ ] **P0-18** `POST /responses` — guardar respuesta cerrada/abierta, validar completitud
- [ ] **P0-19** `POST /audio` — recibir archivo, validar duración mínima, subir a Supabase Storage, disparar worker
- [ ] **P0-20** `GET /audio/{id}/status` — consultar estado de procesamiento
- [ ] **P0-21** `GET /analytics/projects/{id}` — indicadores agregados: favorabilidad, sentimiento, temas por polígono
- [ ] **P0-22** `GET /payments/export` — lista de pagos aprobados en CSV para dispersión manual

### Participantes (completar ruta existente)
- [ ] **P0-23** `POST /participants/{id}/otp/send` — generar y enviar OTP al celular
- [ ] **P0-24** `POST /participants/{id}/otp/verify` — verificar OTP, marcar `phone_verified=True`
- [ ] **P0-25** `GET /participants/` — listar con filtros (territorio, estado, proyecto)
- [ ] **P0-26** `PATCH /participants/{id}/profile` — actualizar datos demográficos

---

## P1 — Demo con clientes (semanas 5–8)

### Frontend — Dashboard cliente
- [ ] **P1-01** Inicializar `frontend/` con Next.js 14 + Tailwind + shadcn/ui
- [ ] **P1-02** Página login + flujo de autenticación con JWT
- [ ] **P1-03** Dashboard principal: KPIs ejecutivos por proyecto
- [ ] **P1-04** Vista de mapa con polígonos + capa de indicadores (Mapbox GL o Leaflet)
- [ ] **P1-05** Vista de narrativas: frases ciudadanas, sentimiento, temas dominantes
- [ ] **P1-06** Filtros por municipio, segmento, fecha, polígono
- [ ] **P1-07** Exportar reporte PDF/PPT

### Frontend — PWA de campo
- [ ] **P1-08** Inicializar `field-app/` con Next.js PWA (next-pwa o Workbox)
- [ ] **P1-09** Formulario de registro: datos básicos + captura GPS automática
- [ ] **P1-10** Captura de foto de evidencia con cámara del dispositivo
- [ ] **P1-11** Cola offline: guardar registros localmente si no hay conexión, sync al recuperar red
- [ ] **P1-12** Login para operadores de campo

### Integraciones externas
- [ ] **P1-13** Integrar WhatsApp Business API (360dialog o Twilio) para envío de links de encuesta
- [ ] **P1-14** Integrar proveedor KYC — recomendado Truora para Colombia (`POST /kyc/check`, webhook resultado)
- [ ] **P1-15** Webhook de resultado KYC → actualizar `kyc_status` del participante

### AGORA básico
- [ ] **P1-16** `POST /peers` — crear par desde participante
- [ ] **P1-17** `POST /peer-tasks` — asignar tarea con mensaje aprobado
- [ ] **P1-18** `POST /peer-evidence` — recibir evidencia
- [ ] **P1-19** `GET /peers/report` — tareas, evidencias y pagos pendientes por proyecto

### Banco de mensajes
- [ ] **P1-20** CRUD de mensajes con estados: draft → in_review → approved → used
- [ ] **P1-21** Flujo de aprobación: cliente aprueba desde dashboard antes de activar en AGORA

---

## P2 — Post-validación

- [ ] **P2-01** Pagos automáticos vía Wompi o integración directa Nequi API
- [ ] **P2-02** Post-estratificación y ponderación estadística en módulo analítico
- [ ] **P2-03** Panel rotativo automático: reglas de rotación y reemplazo por gemelos estadísticos
- [ ] **P2-04** Portal de pares dedicado (app separada)
- [ ] **P2-05** MRP / estimaciones por subgrupos pequeños
- [ ] **P2-06** CI/CD con GitHub Actions (lint + test + deploy)
- [ ] **P2-07** Deploy en Railway o Fly.io con secrets management

---

## Completado
- [x] Estructura base del repositorio
- [x] 20 modelos SQLAlchemy con relaciones completas
- [x] Rutas `/clients` (CRUD) y `/participants` (pre-register + kyc + get)
- [x] Servicio `audio_processor.py` (transcripción Whisper + NLP GPT-4o-mini)
- [x] Docker Compose (PostGIS + Redis)
- [x] `.env.example` documentado
- [x] `.gitignore` completo
