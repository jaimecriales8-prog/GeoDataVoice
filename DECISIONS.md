# DECISIONS.md — Decisiones Arquitectónicas
> GeoDataVoice | Última actualización: 2026-06-05

---

## ADR-001: Next.js → Supabase directamente (sin backend intermedio)
**Estado:** Vigente  
**Fecha:** 2026-06-04 (migración de FastAPI)

**Contexto:** El proyecto comenzó con FastAPI + PostgreSQL/PostGIS + Celery + Redis. Esa arquitectura fue descontinuada porque añadía complejidad operativa en el MVP sin entregar valor diferencial: las consultas territoriales del MVP no requieren PostGIS avanzado, el procesamiento de audio puede vivir en una Edge Function serverless, y el desarrollador puede moverse más rápido con un solo stack TypeScript.

**Decisión:** Frontends Next.js 16 (App Router) conectan directamente a Supabase vía `@supabase/ssr`. Lógica de servidor compleja va en Supabase Edge Functions (Deno/TypeScript).

**Razones:**
- Un solo lenguaje (TypeScript) en todo el stack
- Sin infraestructura adicional que operar (no hay servidor FastAPI, Redis ni Docker en producción)
- Supabase provee Auth, Storage, PostgreSQL y Edge Functions — todo lo que necesita el MVP
- Deploy automático en Vercel sin configuración

**Consecuencias:** El directorio `backend/` (FastAPI/Python) existe como referencia de lógica de negocio pero no se ejecuta ni se continúa. Para lógica pesada de servidor (audio processing, webhooks KYC) se usan Edge Functions.

---

## ADR-002: Supabase como plataforma principal (Auth + DB + Storage + Edge)
**Estado:** Vigente  
**Fecha:** 2026-06-04

**Contexto:** Se necesitaba Auth con roles, base de datos relacional, storage para audios y un mecanismo serverless para procesamiento async.

**Decisión:** Supabase unifica los cuatro componentes. Proyecto: `bsjiqatcqbjqmtytlgll` (us-west-2).

**Razones:**
- Auth con `user_metadata.role` elimina la necesidad de tabla de roles propia
- Storage con URLs firmadas de tiempo limitado para audios privados
- Edge Functions en Deno/TypeScript evitan cambiar de lenguaje
- RLS cuando se habilite provee seguridad a nivel de fila sin código de aplicación adicional

**Consecuencias:** RLS está desactivado en todas las tablas para el MVP. **Debe habilitarse antes de procesar datos reales de personas** (ver P2-01 en TASKS.md).

---

## ADR-003: Roles en `user_metadata` de Supabase Auth
**Estado:** Vigente  
**Fecha:** 2026-06-04

**Contexto:** Se necesita distinguir 4 roles: `admin`, `cliente`, `encuestador`, `panelista`. Opciones: tabla propia de perfiles, JWT custom claims, o `user_metadata`.

**Decisión:** `user_metadata.role` almacenado en el momento del `signUp`.

**Razones:**
- Disponible en el cliente sin query adicional
- El middleware de Next.js puede leer el JWT sin llamar a Supabase
- Suficiente para el MVP donde los roles son simples y no cambian

**Consecuencia:** El rol no está en el JWT firmado (`app_metadata`), sino en `user_metadata` que el usuario puede modificar vía API si tiene acceso directo al token. Para producción con datos sensibles, migrar a `app_metadata` (solo modificable con `service_role`).

---

## ADR-004: SHA-256 para hash de documento y celular
**Estado:** Vigente  
**Fecha:** 2026-06-04

**Contexto:** La Ley 1581/2012 (Colombia) exige proteger datos personales. Cédula y celular son datos de alto riesgo.

**Decisión:** SHA-256 con normalización (`.trim().toUpperCase()`) antes de persistir en `document_hash` y `phone_hash`.

**Razones:**
- Permite verificar duplicados (¿ya está registrado?) sin exponer el dato real
- Irreversible — principio de minimización
- Sin salt intencional: la búsqueda por hash debe funcionar entre sesiones y dispositivos

**Limitación conocida:** Sin salt hace el hash vulnerable a rainbow tables para cédulas colombianas (espacio de búsqueda conocido). **Recomendación antes de producción a escala:** reemplazar por HMAC-SHA256 con clave secreta en variable de entorno.

---

## ADR-005: Cifrado AES-256 para nombre de participante — pendiente
**Estado:** Pendiente — RIESGO ACTIVO  
**Fecha:** 2026-06-04

**Contexto:** El campo `name` en `participants` actualmente guarda el nombre en texto plano.

**Decisión provisional:** Texto plano hasta implementar cifrado real.

**Riesgo:** Antes de procesar datos reales de personas, implementar cifrado simétrico AES-256-GCM con clave en Supabase Vault o variable de entorno. Ver **P2-02** en TASKS.md.

---

## ADR-006: OpenAI GPT-4o-mini para NLP (no modelo propio)
**Estado:** Vigente para MVP  
**Fecha:** 2026-06-04

**Contexto:** Se necesita clasificar sentimiento, emoción, temas y narrativa de audios ciudadanos en español colombiano coloquial.

**Decisión:** GPT-4o-mini con prompt estructurado y `response_format: json_object`. Ejecutado en Supabase Edge Function (`process-audio`) disparada por trigger en `audio_responses`.

**Razones:**
- Velocidad de implementación en MVP
- GPT-4o-mini maneja español latinoamericano coloquial bien
- Costo estimado: ~$0.0003 por audio de 2 minutos (transcripción Whisper + análisis GPT)
- Edge Functions eliminan la necesidad de un servidor dedicado para esta tarea

**Ruta de migración:** Si el volumen supera 10.000 audios/mes, evaluar fine-tuning de Llama 3 con datos etiquetados del propio panel.

---

## ADR-007: `perfil_objetivo` en surveys para separar flujos campo/web
**Estado:** Vigente  
**Fecha:** 2026-06-04

**Contexto:** Algunas encuestas las responde el panelista solo (web), otras las aplica el encuestador en campo, y otras admiten ambas modalidades.

**Decisión:** Campo `perfil_objetivo` en tabla `surveys` con valores `panelista | encuestador | ambos`.

**Consecuencias:**
- Home del panelista filtra surveys con `perfil_objetivo IN ('panelista', 'ambos')`
- Home del encuestador filtra surveys con `perfil_objetivo IN ('encuestador', 'ambos')`
- Las respuestas en campo llevan `encuestador_id ≠ null` en `responses`

---

## ADR-008: RLS desactivado en MVP
**Estado:** Deuda técnica consciente  
**Fecha:** 2026-06-04

**Contexto:** Habilitar RLS requiere diseñar y probar policies para 15 tablas con 4 roles distintos — trabajo significativo que bloquearía el desarrollo del MVP.

**Decisión:** RLS desactivado mientras el acceso es controlado solo a nivel de aplicación (middleware Next.js + Supabase Auth en cada query).

**Condición de salida:** Habilitar RLS antes del primer barrido con datos reales de participantes. Ver **P2-01** en TASKS.md.

---

## ADR-009: GeoDataVoice y AGORA como módulos del mismo producto
**Estado:** Vigente  
**Fecha:** 2026-06-04

**Contexto:** El documento de producto define GeoDataVoice (panel + medición) y AGORA (red de pares + comunicación) como dos capas diferenciadas.

**Decisión:** Mismo frontend y misma base de datos Supabase. AGORA se implementa como tablas adicionales (`peers`, `peer_tasks`, `peer_evidences`, `messages`) con consentimientos y finalidades diferenciadas.

**Razones:**
- Un panelista puede convertirse en par — reutiliza datos de perfil
- Un solo proyecto Supabase reduce costos y complejidad operativa en MVP
- La separación contractual y de consentimientos es suficiente para cumplimiento legal

**Condición:** Cada proyecto debe declarar explícitamente si incluye AGORA con consentimiento separado (`type: 'AGORA'`).

---

## ADR-010: Emails vía Resend — API para negocio, SMTP para Auth
**Estado:** Vigente  
**Fecha:** 2026-06-05

**Contexto:** Se necesitan dos clases de email: (a) transaccionales de negocio (cliente activado, nueva encuesta, pago procesado) y (b) de sistema de Supabase Auth (confirmar registro, recuperar contraseña). El SMTP gratuito por defecto de Supabase es muy limitado (~3-4/hora, baja entregabilidad).

**Decisión:** Resend como único proveedor, por dos vías:
- **API** (`frontend/lib/email.ts` + route handlers en `/api/email/*`) para los emails de negocio.
- **SMTP de Resend en Supabase Auth** (`smtp.resend.com:465`, user `resend`, pass = API key) para los emails de sistema.

**Razones:**
- Mismo proveedor y mismo dominio verificado para todo → reputación consistente
- La API da control total del HTML de los emails de negocio
- El SMTP resuelve el límite de entregabilidad de Supabase sin escribir código propio para Auth

**Detalles de implementación:**
- La key de Resend es "sending only" (restringida) — no puede listar/crear dominios vía API.
- `new Resend()` se inicializa de forma **lazy** para que el build no falle si la key no está definida.
- Las route handlers verifican el rol del llamante (admin/cliente) antes de enviar.

---

## ADR-011: Remitente desde dominio raíz `grialtech.co` (subdominio pospuesto)
**Estado:** Vigente — provisional  
**Fecha:** 2026-06-05

**Contexto:** Se quería enviar desde `geodatavoice@geodatavoice.grialtech.co` para separar reputación por producto. Pero en Resend los subdominios NO heredan la verificación del dominio padre, y el plan actual de Resend no permite agregar más dominios.

**Decisión:** Enviar desde `GeoDataVoice <geodatavoice@grialtech.co>` (dominio raíz ya verificado), con dirección distintiva que identifica el producto.

**Consecuencias:** Comparte reputación de envío con los demás proyectos del dominio (CertiLaboral también envía desde `grialtech.co`). Aceptable para el MVP. **Ruta de salida:** verificar `geodatavoice.grialtech.co` en Resend al subir de plan (DNS en GoDaddy — agregar registros SPF/DKIM que genere Resend). Ver P1-06d en TASKS.md.

---

## ADR-012: KYC con AutenTIC (Veriff Colombia), patrón replicado de CertiLaboral
**Estado:** Vigente  
**Fecha:** 2026-06-05

**Contexto:** Los panelistas aportan datos sensibles y deben verificar identidad (Ley 1581/2012). CertiLaboral ya resolvió esto con AutenTIC (revendedor de Veriff en Colombia). Se decidió replicar el mismo patrón en GeoDataVoice en vez de integrar Truora/Metamap desde cero.

**Decisión:** Página `/campo/verificar-identidad` con **doble modo**, idéntico a CertiLaboral:
- **Simulación** (sin API key): captura cámara → `POST /api/identidad/simular` (service client).
- **Real** (con `NEXT_PUBLIC_AUTENTIC_API_KEY`): SDK Veriff + `POST /api/identidad/webhook` (HMAC).

**Diferencias respecto a CertiLaboral:**
- Tabla `participants` (no `perfiles`); campos `kyc_status` + `status` (no `identidad_verificada`).
- Vínculo `participants.id === auth.users.id` (CertiLaboral usa `perfiles.user_id`).
- Solo aplica a **panelistas**; los encuestadores se activan por aprobación del admin.
- Variables `AUTENTIC_*` (CertiLaboral usa `VERIFF_*`); mismo SDK (`cdn.veriff.me`).

**Razones:** Reutilizar un patrón ya probado en producción reduce riesgo. El modo simulación permite operar el MVP sin credenciales reales mientras se contrata AutenTIC.

**Pendiente:** credenciales reales de AutenTIC y gate en middleware (P1-11b, P1-11c).

---

## Decisiones Pendientes (antes de producción)

| # | Decisión | Opciones | Urgencia |
|---|---|---|---|
| D1 | Proveedor KYC | Truora (Colombia), Metamap, Onfido | Antes de primer barrido |
| D2 | Proveedor WhatsApp | 360dialog, Twilio, Meta Business directa | Antes de primera medición |
| D3 | Migrar `user_metadata.role` → `app_metadata` | Requiere Supabase service role en registro | Antes de producción con datos reales |
| D4 | Cifrado nombre participante | Supabase Vault vs. AES-256 en Edge Function | Antes de primer barrido |
| D5 | Mapa interactivo en dashboard | Mapbox GL JS (de pago), Leaflet + OpenStreetMap (gratis) | Semana 6 |
| D6 | Separación legal proyectos políticos vs. gestión pública | Revisión legal requerida | Antes de cualquier contrato |
