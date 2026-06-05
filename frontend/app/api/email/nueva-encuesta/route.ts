import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { emailPanelistaNuevaEncuesta } from "@/lib/email";

/**
 * POST /api/email/nueva-encuesta
 * Llamado desde cliente/proyectos/[id]/encuestas/nueva cuando se publica una encuesta.
 * Envía email a todos los panelistas activos con perfil_objetivo coincidente.
 * Body: { surveyId: string }
 * Solo puede ser invocado por usuario con role=cliente o admin.
 */
export async function POST(req: NextRequest) {
  try {
    const { surveyId } = await req.json();
    if (!surveyId) {
      return NextResponse.json({ error: "surveyId requerido" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role para leer emails de participantes
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    // Verificar que quien llama es cliente o admin
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );
    const { data: { user } } = await anonClient.auth.getUser();
    const role = user?.user_metadata?.role ?? "";
    if (!user || !["cliente", "admin"].includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Obtener datos de la encuesta y proyecto
    const { data: survey, error: surveyError } = await supabase
      .from("surveys")
      .select("id, name, perfil_objetivo, project_id, projects(name)")
      .eq("id", surveyId)
      .single();

    if (surveyError || !survey) {
      return NextResponse.json({ error: "Encuesta no encontrada" }, { status: 404 });
    }

    const proyectoRaw = survey.projects as unknown;
    const proyectoNombre = (proyectoRaw && typeof proyectoRaw === "object" && "name" in proyectoRaw)
      ? (proyectoRaw as { name: string }).name
      : "Proyecto";

    // Obtener panelistas verificados con email
    // Nota: los emails están en Supabase Auth, no en la tabla participants
    // Usamos service role para acceder a auth.users
    const { data: authUsers, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      return NextResponse.json({ error: "Error obteniendo usuarios" }, { status: 500 });
    }

    const panelistas = authUsers.users.filter(
      u => u.user_metadata?.role === "panelista" &&
           u.email_confirmed_at != null
    );

    if (panelistas.length === 0) {
      return NextResponse.json({ ok: true, enviados: 0, mensaje: "No hay panelistas verificados" });
    }

    // Enviar emails (en paralelo, máximo 10 concurrentes para no saturar Resend)
    const BATCH = 10;
    let enviados = 0;
    for (let i = 0; i < panelistas.length; i += BATCH) {
      const batch = panelistas.slice(i, i + BATCH);
      await Promise.all(
        batch.map(async (p) => {
          if (!p.email) return;
          try {
            await emailPanelistaNuevaEncuesta(
              p.email,
              p.user_metadata?.full_name ?? "Panelista",
              survey.name,
              proyectoNombre,
            );
            enviados++;
          } catch (e) {
            console.error(`[email/nueva-encuesta] Error enviando a ${p.email}:`, e);
          }
        })
      );
    }

    return NextResponse.json({ ok: true, enviados, total: panelistas.length });
  } catch (err) {
    console.error("[email/nueva-encuesta]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
