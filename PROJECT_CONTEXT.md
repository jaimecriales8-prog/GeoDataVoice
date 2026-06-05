# PROJECT_CONTEXT.md — GeoDataVoice
> Actualizado: 2026-06-04 | 39 commits en rama `main`

---

## Resumen Ejecutivo

**GeoDataVoice** es una plataforma de inteligencia territorial para Colombia que recluta ciudadanos verificados, los organiza en paneles georreferenciados y mide su opinión de forma recurrente mediante encuestas web y notas de voz analizadas con IA (Whisper + GPT-4o-mini).

**Problema:** Alcaldes, gobernadores, candidatos y gremios toman decisiones con información incompleta. Las encuestas tradicionales son episódicas y costosas. GeoDataVoice provee medición recurrente, accesible y territorializada con análisis de voz como diferencial.

**Estado actual:** ~45% de avance. Frontend funcional con flujos de registro, panel admin, dashboard de cliente y vistas de panelista. Tablas en Supabase creadas y operativas.

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

  /campo/              → Vistas de campo (panelista + encuestador)
    /panelista         → Home panelista (encuestas pendientes, pagos) — datos mock
    /panelista/encuesta/[id] → Flujo de encuesta con audio
    /panelista/pagos   → Historial de pagos
    /registro          → Flujo 3 pasos encuestador: datos→GPS→consentimientos

Supabase: https://bsjiqatcqbjqmtytlgll.supabase.co (us-west-2)
GitHub: https://github.com/jaimecriales8-prog/GeoDataVoice.git
Producción Vercel: geodatavoice-dashboard-git-main-jaime-criales-projects.vercel.app
```

---

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16.2.7 (App Router) + React 19 + TypeScript 5 |
| Estilos | Tailwind CSS v4 + Lucide React |
| Auth + DB | Supabase (PostgreSQL + Auth + Storage) |
| Data fetching | TanStack React Query 5 + @supabase/ssr |
| Charts | Recharts 3 (frontend dashboard) |
| Offline queue | idb 8 (IndexedDB — campo) |
| IA (pendiente conectar) | OpenAI Whisper-1 + GPT-4o-mini via Supabase Edge Functions |

---

## Tablas en Supabase (RLS desactivado — MVP)

| Tabla | Descripción |
|---|---|
| `clients` | Clientes contratantes. `status`: pending → active/inactive |
| `projects` | Proyectos por cliente. `type`: favorability/satisfaction/pulse/custom |
| `surveys` | Encuestas por proyecto. `perfil_objetivo`: panelista/encuestador/ambos |
| `questions` | Preguntas de encuesta. `type`: single_choice/multiple_choice/scale/open_text/audio |
| `participants` | Panelistas. doc+phone hasheados SHA-256. `status`: preregistered/verified/suspended |
| `panel_memberships` | Participante ↔ proyecto ↔ cohorte |
| `field_operators` | Encuestadores. `role`: encuestador/supervisor/coordinator |
| `field_visits` | Registro GPS de visitas del encuestador |
| `consents` | Consentimientos versionados (v1.0) |
| `responses` | Respuestas de encuesta. Incluye `encuestador_id` si fue en campo |
| `audio_responses` | Audio subido. `quality`: pending/transcribed/processed/error |
| `nlp_outputs` | 9 variables IA: sentiment, emotion, intensity, main_topic, topics, narrative, summary, citizen_quote, opinion_driver |
| `payments` | Pagos a panelistas |
| `payment_config` | Tarifa global: encuesta_cop / audio_cop / encuesta_campo_cop |
| `client_payment_config` | Tarifa por cliente (override de la global) |

---

## Roles del Sistema

| Rol | Acceso | Cómo llega |
|---|---|---|
| **admin** | `/dashboard` | Creado manualmente (no hay registro público) |
| **cliente** | `/cliente` | Registro en `/registro/cliente` → aprobación admin |
| **encuestador** | `/campo/registro` (por ahora) | Registro en `/registro/encuestador` |
| **panelista** | `/campo/panelista` | Registro en `/registro/panelista` → confirma email |

**Redirección post-login pendiente:** el login actualmente siempre va a `/dashboard`. Falta redirigir según `role` del `user_metadata`.

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
- Panel admin: CRUD clientes/panelistas/encuestadores, configuración de tarifas
- Panel cliente: crear proyectos, crear encuestas con preguntas y perfil_objetivo
- Flujo de registro campo (3 pasos GPS + consentimientos) conectado a Supabase
- Middleware protege `/dashboard` y `/cliente`
- Build limpio, 21 rutas, deploy en Vercel

### Parcialmente implementado
- Dashboard cliente: home y proyectos consultan Supabase; encuestas y resultados pendientes de conectar
- Home panelista `/campo/panelista`: UI completa con datos mock — pendiente conectar a encuestas reales
- Encuestador: tiene registro pero no tiene home/dashboard propio aún
- Redirección post-login: siempre va a `/dashboard` sin importar el rol

### Pendiente de construir
- Vista encuestador con sus encuestas asignadas
- Conectar panelista a encuestas reales de Supabase
- Flujo de respuesta real (guardar en `responses` + upload audio)
- Procesamiento de audio: Edge Function Supabase con Whisper + GPT
- Dashboard de resultados para el cliente (favorabilidad, sentimiento, temas)
- Verificación de identidad digital para panelistas
- OTP de celular para panelistas
- Redirección post-login según rol

---

## Pendientes Prioritarios

### Alta prioridad
1. **Redirección post-login por rol** — leer `user_metadata.role` y redirigir a `/dashboard`, `/cliente`, `/campo/panelista`
2. **Vista encuestador** — home `/campo/encuestador` con sus encuestas asignadas (perfil=encuestador/ambos)
3. **Conectar panelista** — encuestas reales en `/campo/panelista` (perfil=panelista/ambos)
4. **Flujo de respuesta real** — guardar respuestas en `responses` + upload audio a Supabase Storage + disparar Edge Function
5. **Insert encuestador en field_operators** — al registrarse, crear registro en la tabla

### Media prioridad
6. **Dashboard resultados cliente** — `/cliente/proyectos/[id]/resultados` con favorabilidad, sentimiento, temas (consulta `nlp_outputs`)
7. **Edge Function process-audio** — Whisper + GPT-4o-mini → `nlp_outputs`
8. **Supabase Storage** — crear bucket `geodatavoice-audio` para audios
9. **Encuesta detalle cliente** — ver respuestas, estadísticas por pregunta
10. **Validación de identidad** — integrar Truora o Metamap para KYC digital

### Baja prioridad
11. RLS policies (actualmente desactivado en todas las tablas)
12. Paginación en listados
13. Notificaciones email (Resend) para activación de clientes
14. Supabase Vault para cifrar nombre de participantes (cumplimiento Ley 1581)

---

## Bugs Conocidos

| # | Descripción | Impacto | Solución |
|---|---|---|---|
| B1 | Login redirige siempre a `/dashboard` sin importar el rol | Alto — clientes y panelistas ven 403 o el panel de admin | Leer `user_metadata.role` en login y redirigir según rol |
| B2 | Registro encuestador no inserta en `field_operators` | Medio — el encuestador queda en Auth pero no en la tabla | Agregar insert en `registro/encuestador/page.tsx` igual que cliente y panelista |
| B3 | Montos fijos `$2.000–$3.000` hardcodeados en landing y panelista | Bajo — debería venir de `payment_config` | Consultar tarifa global al cargar la página |
| B4 | Home panelista con `MOCK_SURVEYS` y `MOCK_PAYMENTS` | Alto — no muestra datos reales | Conectar a Supabase con filtro `perfil_objetivo` |
| B5 | Sin validación de sesión activa en `/campo/*` | Medio — cualquiera puede ver las páginas de campo | Agregar protección en middleware |

---

## Configuración del Entorno

### Variables (`frontend/.env.local`)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://bsjiqatcqbjqmtytlgll.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Comandos
```bash
# Desarrollo local
cd frontend && npm run dev -- --port 3010

# Build
cd frontend && npm run build

# Deploy (auto en push a main via Vercel)
git push origin main
```

---

## Próximas 10 Tareas para Nueva Sesión

| # | Tarea | Archivo principal |
|---|---|---|
| 1 | Redirección post-login por rol | `frontend/app/login/page.tsx` |
| 2 | Insert `field_operators` en registro encuestador | `frontend/app/registro/encuestador/page.tsx` |
| 3 | Proteger `/campo/*` en middleware | `frontend/middleware.ts` |
| 4 | Home encuestador `/campo/encuestador` con encuestas filtradas | Crear `frontend/app/campo/encuestador/page.tsx` |
| 5 | Conectar panelista a encuestas reales de Supabase | `frontend/app/campo/panelista/page.tsx` |
| 6 | Guardar respuestas en Supabase al completar encuesta | `frontend/app/campo/panelista/encuesta/[id]/page.tsx` |
| 7 | Upload audio a Supabase Storage | `frontend/app/campo/panelista/encuesta/[id]/page.tsx` |
| 8 | Edge Function `process-audio` (Whisper + GPT → nlp_outputs) | `supabase/functions/process-audio/` |
| 9 | Dashboard resultados para cliente | `frontend/app/cliente/proyectos/[id]/resultados/page.tsx` |
| 10 | Notificación email al activar cliente (Resend) | Edge Function o Supabase trigger |

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

## BUGS CRÍTICOS ACTIVOS
1. Login redirige siempre a /dashboard — debe leer user_metadata.role
2. Registro encuestador no inserta en field_operators
3. Home panelista usa MOCK_SURVEYS — conectar a Supabase
4. /campo/* sin protección de auth

## PRÓXIMA TAREA
[describe aquí lo que quieres hacer]

Lee PROJECT_CONTEXT.md antes de escribir código.
```
