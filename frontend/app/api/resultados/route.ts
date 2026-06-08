import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";
import { fetchResultados } from "@/lib/resultados";
import type { FiltroDemo } from "@/lib/resultados";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { surveyIds, filtro } = await req.json() as { surveyIds: string[]; filtro?: FiltroDemo | null };
  try {
    const supabase = createServiceClient();
    const res = await fetchResultados(surveyIds, filtro ?? null, supabase);
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
