import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = createServiceClient();
  const { error } = await supabase.from("projects").insert(body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });
  const supabase = createServiceClient();
  const { error } = await supabase.from("projects").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
