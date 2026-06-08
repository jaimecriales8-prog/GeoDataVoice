import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { emailEncuestadorAprobado } from "@/lib/email";

export async function GET() {
  const supabase = createServiceClient();
  const [{ data: ops, error }, { data: parts }] = await Promise.all([
    supabase.from("field_operators").select("*").order("created_at", { ascending: false }),
    supabase.from("participants").select("recruited_by").not("recruited_by", "is", null),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const counts = new Map<string, number>();
  (parts ?? []).forEach(p => {
    if (p.recruited_by) counts.set(p.recruited_by, (counts.get(p.recruited_by) ?? 0) + 1);
  });
  return NextResponse.json((ops ?? []).map(o => ({ ...o, reclutados: counts.get(o.id) ?? 0 })));
}

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = createServiceClient();
  const { error } = await supabase.from("field_operators").insert(body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  const supabase = createServiceClient();
  const { error } = await supabase.from("field_operators").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Si se aprueba, notificar al encuestador por correo
  if (status === "active") {
    const { data: op } = await supabase
      .from("field_operators")
      .select("name, user_id")
      .eq("id", id)
      .maybeSingle();
    if (op?.user_id) {
      const { data: user } = await supabase.auth.admin.getUserById(op.user_id);
      const email = user?.user?.email;
      if (email) {
        emailEncuestadorAprobado(email, op.name ?? "Encuestador").catch(console.error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
