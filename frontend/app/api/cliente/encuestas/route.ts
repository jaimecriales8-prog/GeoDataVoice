import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function PATCH(req: Request) {
  const { id, ...patch } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const supabase = createServiceClient();
  const { error } = await supabase.from("surveys").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
