import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

// Llamado por el cron de Vercel cada 5 días para evitar pausa de Supabase
export async function GET() {
  const supabase = createServiceClient();
  const { error } = await supabase.from("surveys").select("id").limit(1);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
