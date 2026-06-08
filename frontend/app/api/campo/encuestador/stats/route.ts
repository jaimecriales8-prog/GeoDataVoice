import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const operadorId = searchParams.get("operador_id");
  if (!operadorId) return NextResponse.json({ error: "operador_id required" }, { status: 400 });

  const supabase = createServiceClient();
  const hoy = new Date().toISOString().split("T")[0];
  const mesInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

  const [
    { count: reclutadosMes },
    { data: respHoy },
    { data: respMes },
    { data: cfg },
  ] = await Promise.all([
    supabase.from("participants").select("id", { count: "exact", head: true })
      .eq("recruited_by", operadorId).gte("created_at", mesInicio),
    supabase.from("responses").select("participant_id, survey_id")
      .eq("encuestador_id", operadorId).gte("responded_at", hoy + "T00:00:00"),
    supabase.from("responses").select("participant_id, survey_id")
      .eq("encuestador_id", operadorId).gte("responded_at", mesInicio),
    supabase.from("payment_config").select("encuesta_campo_cop, bono_reclutamiento_cop")
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const encHoy = new Set((respHoy ?? []).map(r => `${r.participant_id}|${r.survey_id}`)).size;
  const encMes = new Set((respMes ?? []).map(r => `${r.participant_id}|${r.survey_id}`)).size;
  const campoCop = cfg?.encuesta_campo_cop ?? 0;
  const bonoCop = cfg?.bono_reclutamiento_cop ?? 0;

  return NextResponse.json({
    stats: { reclutados: reclutadosMes ?? 0, encuestas: encHoy, mes: encMes },
    mes: {
      reclutados: reclutadosMes ?? 0,
      encuestas: encMes,
      ganadoReclutamiento: (reclutadosMes ?? 0) * bonoCop,
      ganadoEncuestas: encMes * campoCop,
    },
  });
}
