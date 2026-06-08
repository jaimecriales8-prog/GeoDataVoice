import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { createServiceClient } from "@/lib/supabase-service";
import { fetchResultadosProyecto } from "@/lib/resultados";

export async function POST(req: Request) {
  const { surveys } = await req.json() as { surveys: { id: string; wave: number }[] };
  try {
    const supabase = createServiceClient();
    const res = await fetchResultadosProyecto(surveys, supabase);
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
