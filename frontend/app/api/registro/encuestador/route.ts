import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function POST(req: Request) {
  const body = await req.json();
  const supabase = createServiceClient();
  const { error } = await supabase.from("field_operators").insert(body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
