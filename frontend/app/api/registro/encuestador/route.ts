import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { emailAdminNuevoEncuestador } from "@/lib/email";

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = createServiceClient();
  const { error } = await supabase.from("field_operators").insert(body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Notificar al admin (fire and forget — no bloquea el registro)
  emailAdminNuevoEncuestador(body.name ?? "", body.document ?? "", body.municipio ?? "").catch(console.error);

  return NextResponse.json({ ok: true });
}
