import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export async function GET() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("participants")
    .select("id, user_id, name_encrypted, gender, birth_year, status, kyc_status, phone_verified, created_at")
    .not("user_id", "is", null)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const emailMap: Record<string, string> = {};
  for (const u of authList?.users ?? []) emailMap[u.id] = u.email ?? "";

  const enriched = (data ?? []).map(p => ({ ...p, email: emailMap[p.user_id] ?? "" }));
  return NextResponse.json(enriched);
}

export async function PATCH(req: Request) {
  const { id, status } = await req.json();
  const supabase = createServiceClient();
  const { error } = await supabase.from("participants").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
