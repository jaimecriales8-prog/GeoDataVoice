import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { emailClienteActivado, emailAdminNuevoCliente } from "@/lib/email";

/**
 * POST /api/email/cliente-activado
 * Llamado desde dashboard/clientes cuando admin activa un cliente.
 * Body: { clienteId: string }
 * Solo puede ser invocado por un usuario con role=admin.
 */
export async function POST(req: NextRequest) {
  try {
    const { clienteId } = await req.json();
    if (!clienteId) {
      return NextResponse.json({ error: "clienteId requerido" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: () => {},
        },
      }
    );

    // Verificar que quien llama es admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || user.user_metadata?.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    // Obtener datos del cliente
    const { data: cliente, error } = await supabase
      .from("clients")
      .select("contact_name, contact_email, org_name")
      .eq("id", clienteId)
      .single();

    if (error || !cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    // Enviar email al cliente
    const result = await emailClienteActivado(
      cliente.contact_email,
      cliente.contact_name,
    );

    return NextResponse.json({ ok: true, emailId: result.data?.id });
  } catch (err) {
    console.error("[email/cliente-activado]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
