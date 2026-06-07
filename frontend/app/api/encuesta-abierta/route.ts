import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-service";

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.toUpperCase().trim());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      surveyId,
      // Identificación (solo si !abierta_anonima y respondente eligió identificarse)
      nombre, documento, phone, paymentWallet, paymentNumber,
      // Demografía
      gender, birth_year, municipio, barrio, estrato, nivel_estudios, actividades,
      estado_civil, num_hijos, regimen_salud, sisben_grupo, tenencia_vivienda,
      grupo_etnico, antiguedad_barrio, recibe_subsidios, acceso_internet, registrado_votar,
      // Anonimato
      is_anonymous,
      // Respuestas: [{ question_id, value }]
      respuestas,
    } = body;

    if (!surveyId || !Array.isArray(respuestas)) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Deduplicación por documento (solo si no es anónimo y hay documento)
    let participantId: string | null = null;
    if (!is_anonymous && documento) {
      const docHash = await sha256(documento);
      const { data: existing } = await supabase
        .from("participants")
        .select("id")
        .eq("document_hash", docHash)
        .maybeSingle();
      if (existing) participantId = existing.id;
    }

    // Crear participante si no existe
    if (!participantId) {
      const newId = crypto.randomUUID();
      const docHash = documento ? await sha256(documento) : null;
      const phoneHash = phone ? await sha256(phone) : null;

      const { error: pErr } = await supabase.from("participants").insert({
        id: newId,
        user_id: null,
        is_anonymous,
        name_encrypted: is_anonymous ? null : (nombre ?? null),
        document_hash: docHash,
        phone_hash: phoneHash,
        phone: is_anonymous ? null : (phone ?? null),
        payment_wallet: is_anonymous ? null : (paymentWallet ?? null),
        payment_number: is_anonymous ? null : (paymentNumber ?? null),
        gender: gender ?? null,
        birth_year: birth_year ? parseInt(birth_year) : null,
        municipio: municipio ?? null,
        barrio: barrio ?? null,
        estrato: estrato ? parseInt(estrato) : null,
        nivel_estudios: nivel_estudios ?? null,
        actividades: actividades ?? null,
        estado_civil: estado_civil ?? null,
        num_hijos: num_hijos ? parseInt(num_hijos) : 0,
        regimen_salud: regimen_salud ?? null,
        sisben_grupo: sisben_grupo ?? null,
        tenencia_vivienda: tenencia_vivienda ?? null,
        grupo_etnico: grupo_etnico ?? null,
        antiguedad_barrio: antiguedad_barrio ?? null,
        recibe_subsidios: recibe_subsidios ?? false,
        acceso_internet: acceso_internet ?? false,
        registrado_votar: registrado_votar ?? false,
        status: "unverified",
        kyc_status: "none",
      });
      if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
      participantId = newId;
    }

    // Insertar respuestas
    const rows = respuestas.map((r: { question_id: string; value: string }) => ({
      id: crypto.randomUUID(),
      survey_id: surveyId,
      participant_id: participantId,
      question_id: r.question_id,
      value: r.value ?? null,
    }));

    const { error: rErr } = await supabase.from("responses").insert(rows);
    if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 });

    return NextResponse.json({ ok: true, participantId });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
