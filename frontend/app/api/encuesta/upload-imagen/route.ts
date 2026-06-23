import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  const surveyId = form.get("survey_id") as string | null;

  if (!file || !surveyId) {
    return NextResponse.json({ error: "file y survey_id requeridos" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Solo se permiten imágenes" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Imagen máximo 5 MB" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `survey-images/${surveyId}/welcome.${ext}`;

  const { error: upErr } = await supabase.storage
    .from("geodatavoice-public")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = supabase.storage
    .from("geodatavoice-public")
    .getPublicUrl(path);

  const { error: dbErr } = await supabase
    .from("surveys")
    .update({ welcome_image_url: publicUrl })
    .eq("id", surveyId);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ url: publicUrl });
}
