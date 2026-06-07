import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { participantId, surveyId, questionId, audioPath } = await req.json();
  if (!participantId || !surveyId || !questionId || !audioPath) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }
  const supabase = createServiceClient();
  const { data: response } = await supabase
    .from("responses")
    .select("id")
    .eq("participant_id", participantId)
    .eq("survey_id", surveyId)
    .eq("question_id", questionId)
    .maybeSingle();

  if (!response) return NextResponse.json({ error: "response not found" }, { status: 404 });

  const { error } = await supabase.from("audio_responses").insert({
    id: crypto.randomUUID(),
    response_id: response.id,
    audio_url: audioPath,
    quality: "pending",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
