# DECISIONS.md — Decisiones Arquitectónicas
> GeoDataVoice | Registro de decisiones tomadas y sus justificaciones

---

## ADR-001: FastAPI + Python como backend principal
**Estado:** Aprobado  
**Fecha:** 2026-06-04

**Contexto:** El producto requiere procesamiento de audio (Whisper), NLP/IA (GPT), geometrías (PostGIS) y posible análisis estadístico (pandas, geopandas). Se evaluaron Django, Flask y NestJS.

**Decisión:** FastAPI con Python 3.12.

**Razones:**
- Ecosistema IA/ML sin fricción (OpenAI SDK, transformers, pandas, geopandas, scipy)
- Performance async nativa comparable a Node.js para I/O bound
- Tipado con Pydantic v2 + mypy sin TypeScript
- OpenAPI autogenerado

**Consecuencias:** Mayor complejidad para devs sin experiencia en async Python. El frontend sigue siendo Next.js (JS), lo que implica dos lenguajes en el stack.

---

## ADR-002: SQLAlchemy 2.0 ORM (no Supabase ORM directo)
**Estado:** Aprobado  
**Fecha:** 2026-06-04

**Contexto:** Supabase provee su propio cliente Python que puede usarse como ORM básico. También se evaluó Tortoise ORM.

**Decisión:** SQLAlchemy 2.0 async con Alembic para migraciones.

**Razones:**
- Control total del esquema — crítico por la complejidad de PostGIS y datos sensibles
- Alembic para migraciones versionadas y reproducibles
- Supabase se usará solo para Storage y Auth
- GeoAlchemy2 integra naturalmente con SQLAlchemy

**Consecuencias:** Más verbose que Supabase ORM directo. Alembic requiere configuración adicional.

---

## ADR-003: Hashing SHA-256 para documento y celular
**Estado:** Aprobado  
**Fecha:** 2026-06-04

**Contexto:** La ley 1581/2012 (Colombia) requiere proteger datos personales. Los identificadores (cédula, celular) son datos de alto riesgo.

**Decisión:** SHA-256 con normalización (`.strip().upper()`) antes de persistir.

**Razones:**
- Permite búsqueda por igualdad (¿ya está registrado?) sin exponer el dato
- Irreversible — cumple principio de minimización
- Sin salt intencional: la búsqueda por hash debe funcionar entre sesiones

**Limitación:** Sin salt hace el hash vulnerable a rainbow tables si el adversario tiene la BD. Para cédulas colombianas (formato conocido) esto es un riesgo real. **Recomendación futura:** usar HMAC-SHA256 con una clave secreta en lugar de SHA-256 puro.

---

## ADR-004: Cifrado pendiente para nombre de participante
**Estado:** Pendiente — RIESGO ACTIVO  
**Fecha:** 2026-06-04

**Contexto:** El campo `name_encrypted` en el modelo `Participant` actualmente guarda el nombre en texto plano con un comentario `# TODO: encrypt`.

**Decisión provisional:** Texto plano hasta implementar cifrado real.

**Riesgo:** Antes de procesar datos reales de personas, se debe implementar cifrado simétrico AES-256-GCM con clave manejada por variable de entorno o KMS (AWS KMS / Supabase Vault).

**Tarea bloqueante:** P0-08 en TASKS.md.

---

## ADR-005: Celery + Redis para procesamiento asíncrono
**Estado:** Planeado — sin implementar  
**Fecha:** 2026-06-04

**Contexto:** La transcripción de audio puede tomar 5–30 segundos. No debe bloquear el request HTTP de carga del archivo.

**Decisión:** Celery con Redis como broker. El endpoint `/audio` guarda el archivo, retorna 202 Accepted, y dispara una tarea Celery que ejecuta Whisper → GPT → persiste NLPOutput.

**Alternativa evaluada:** FastAPI BackgroundTasks — descartada porque no sobrevive reinicios del proceso y no tiene retry/monitoring.

---

## ADR-006: OpenAI GPT-4o-mini para NLP (no modelo propio)
**Estado:** Aprobado para MVP  
**Fecha:** 2026-06-04

**Contexto:** Se necesita clasificar sentimiento, emoción, temas y narrativa de audios ciudadanos en español colombiano coloquial.

**Decisión:** GPT-4o-mini con prompt estructurado y `response_format: json_object`.

**Razones:**
- Velocidad de implementación en MVP
- GPT-4o-mini maneja español latinoamericano coloquial bien
- Costo estimado: ~$0.0003 por audio de 2 minutos (transcripción + análisis)

**Ruta de migración:** Si el volumen crece (>10.000 audios/mes), evaluar fine-tuning de un modelo Llama 3 con datos etiquetados del propio panel.

---

## ADR-007: Separación GeoDataVoice / AGORA como capas, no productos separados
**Estado:** Aprobado  
**Fecha:** 2026-06-04

**Contexto:** El documento de producto define GeoDataVoice (panel + medición) y AGORA (red de pares + comunicación) como dos "subproductos".

**Decisión:** Implementar en el mismo backend como módulos separados (`/peers`, `/peer-tasks`, `/peer-evidence`, `/messages`) con consentimientos y finalidades diferenciadas.

**Razones:**
- Un panelista puede convertirse en par — los datos de perfil son compartibles
- Mantener un solo backend reduce complejidad operativa en el MVP
- La separación contractual y de consentimientos es suficiente para cumplimiento legal

**Condición:** Cada proyecto debe declarar explícitamente si incluye AGORA, con consentimiento separado.

---

## ADR-008: Supabase como Storage para audios y evidencias
**Estado:** Aprobado  
**Fecha:** 2026-06-04

**Contexto:** Los audios de panelistas y fotos de evidencia de campo necesitan almacenamiento seguro con URLs firmadas.

**Decisión:** Supabase Storage (equivalente a S3 compatible). `boto3` está incluido en requirements como alternativa/fallback.

**Razones:**
- Ya se usa Supabase en otros proyectos del mismo desarrollador (CertiLaboral)
- Storage con políticas RLS, URLs firmadas de tiempo limitado
- Sin costo adicional de infraestructura en MVP

---

## Decisiones Pendientes (antes de producción)

| # | Decisión | Opciones | Fecha límite sugerida |
|---|---|---|---|
| D1 | Proveedor KYC | Truora (Colombia), Metamap, Onfido | Antes de barrido piloto |
| D2 | Proveedor WhatsApp | 360dialog, Twilio, Meta directa | Antes de primera medición |
| D3 | Plataforma de deploy | Railway, Fly.io, Render, GCP | Semana 4 |
| D4 | Mapa interactivo en dashboard | Mapbox GL JS, Leaflet + OpenStreetMap | Semana 6 |
| D5 | Separación legal: proyectos políticos vs. gestión pública | Requiere revisión legal | Antes de cualquier contrato |
