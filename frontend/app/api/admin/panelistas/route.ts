import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, name_encrypted, gender, birth_year, status, kyc_status, phone_verified, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  const supabase = createServiceClient();
  const { error } = await supabase.from("participants").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
