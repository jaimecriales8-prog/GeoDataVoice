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

## ADR-013: Encuestar en campo ≠ Reclutar panelista
**Estado:** Vigente · **Fecha:** 2026-06-06

**Contexto:** El flujo del encuestador se llamaba "Registrar panelista", pero en realidad son dos cosas distintas: encuestar a alguien en la calle, vs. que esa persona se vuelva panelista.

**Decisión:**
- **Encuestar en campo** (`/campo/encuestador/registrar`): el encuestador aplica una encuesta a una persona. Requiere una encuesta seleccionada. Paga `encuesta_campo_cop`. NO genera bono.
- **Reclutar**: la persona se auto-registra **desde su propio celular** con el **código del encuestador** (`field_operators.recruiter_code`). Eso fija `participants.recruited_by` → bono de reclutamiento.

**Razón:** El bono debe premiar la conversión a panelista (con cuenta propia), no cada encuesta de calle. Separa incentivos y evita inflar reclutamientos.

---

## ADR-014: Reuso de datos al volverse panelista (`claim_field_participant`)
**Estado:** Vigente · **Fecha:** 2026-06-06

**Contexto:** Una persona encuestada en campo ya existe en `participants` (id aleatorio, sin cuenta). Si luego se registra como panelista, no debe duplicarse ni perder su historial/verificación.

**Decisión:** Función SQL `claim_field_participant`. Si el documento ya existe, crea el registro del panelista con `id = auth.users.id` reutilizando los datos + verificación, y re-apunta el historial (responses/field_visits/consents/panel_memberships/payments) al nuevo id; libera los índices únicos del registro viejo y lo borra.

**Razón:** Mantiene el modelo `participants.id = auth.id` intacto (sin tocar el resto de la app) y conserva continuidad de datos. Se agregó `participants.user_id` para evolución futura, pero el linkage sigue por `id`.

**Alternativa descartada:** Migrar todo a linkage por `user_id` (rippleaba a ~6 archivos y arriesgaba el flujo del panelista).

---

## ADR-015: Validación de identidad en encuestas de calle — toggle de dos niveles
**Estado:** Vigente · **Fecha:** 2026-06-06

**Decisión:** Configurable con override jerárquico:
- **Admin** (global): `platform_config.field_identity_verification` (default true).
- **Cliente** (por proyecto): `projects.field_identity_required` (null = hereda el global).
- El flujo de campo calcula el efectivo (proyecto > global) y salta el paso de identidad si está desactivado.

**Razón:** Algunos sondeos rápidos/anónimos no requieren foto de cédula; otros sí (anti-fraude). El cliente decide para sus proyectos; el admin pone el default.

---

## ADR-016: Ficha demográfica rica del encuestado para segmentación
**Estado:** Vigente · **Fecha:** 2026-06-06

**Contexto:** El valor analítico del producto está en cruzar la opinión con perfiles socioeconómicos.

**Decisión:** Capturar en `participants` (en el flujo de campo): estrato, edad→birth_year, nivel_estudios, actividades (multi), estado_civil, num_hijos, regimen_salud, sisben_grupo, tenencia_vivienda, grupo_etnico, antiguedad_barrio, recibe_subsidios, acceso_internet, registrado_votar.

**Razón:** Habilita segmentación futura en tableros (favorabilidad por estrato/régimen/etc.). `registrado_votar` y salud son datos sensibles (Ley 1581) — cubiertos por el consentimiento del flujo.

---

## ADR-017: Análisis de audio con Claude (no GPT)
**Estado:** Vigente · **Fecha:** 2026-06-06 (reemplaza el GPT-4o-mini de ADR-006 para el análisis)

**Decisión:** La Edge Function `process-audio` usa **OpenAI Whisper-1** para transcribir y **Claude (`claude-opus-4-8`)** para el análisis NLP estructurado. Modelo configurable vía secret `CLAUDE_MODEL`.

**Razón:** Claude entiende mejor el español colombiano coloquial (capta ironía/sarcasmo) y da JSON estructurado confiable. Whisper sigue siendo el mejor STT. Para alto volumen se puede bajar a `claude-haiku-4-5` sin redeploy de código.

---

## ADR-018: Datos de contacto/pago en claro + perfil socioeconómico simétrico panelista↔campo
**Estado:** Vigente · **Fecha:** 2026-06-06

**Contexto:** El teléfono solo se guardaba hasheado (dedup) y el número Nequi/Daviplata no se guardaba en ninguna parte. Además, el panelista que se auto-registra debía aportar la misma riqueza de datos que el flujo de campo, y poder mantenerlos al día.

**Decisión:**
1. Nuevas columnas en `participants` en claro: `phone`, `payment_wallet` (nequi/daviplata) y `payment_number` — necesarias para contacto (WhatsApp) y dispersión real de pagos. El `phone_hash` se conserva para dedup.
2. El selector de billetera (Nequi vs Daviplata) y el número son campos separados.
3. El **registro del panelista captura el mismo set socioeconómico** que el flujo de campo, y el panelista puede **editarlo** desde `/campo/panelista/perfil` (los datos cambian con el tiempo). El correo se cambia vía Supabase Auth (`updateUser`, dispara email de confirmación).
4. Al editar se **sobrescribe** el valor vigente (sin histórico por ahora — ver tarea P1-18).

**Razón:** Funcionalidad real de pagos y contacto exige datos usables; la simetría con campo mantiene los resultados agregables/comparables sin importar el canal de captura.

**Consecuencia / riesgo:** `phone`, `payment_number` y datos sensibles (salud, `registrado_votar`) quedan en claro con anon key hasta implementar RLS (P2-01) — priorizar esas columnas al asegurar.

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
