import { createClient } from "@/lib/supabase";

export type Distribucion = { label: string; count: number }[];

export type PreguntaResultado = {
  id: string;
  text: string;
  type: string;
  total: number;
  distribucion: Distribucion; // para preguntas cerradas
  abiertas: string[];         // para open_text
};

export type Cita = {
  quote: string;
  narrative: string;
  sentiment: string;
  topic: string;
};

export type Resultados = {
  respuestas: number;
  participantes: number;
  audios: number;
  audiosProcesados: number;
  preguntas: PreguntaResultado[];
  sentimiento: Distribucion;
  emociones: Distribucion;
  temas: Distribucion;
  intensidadProm: number | null;
  citas: Cita[];
};

const TEMA_LABELS: Record<string, string> = {
  seguridad: "Seguridad", salud: "Salud", educación: "Educación", empleo: "Empleo",
  servicios_públicos: "Servicios públicos", movilidad: "Movilidad", corrupción: "Corrupción",
  medio_ambiente: "Medio ambiente", economía: "Economía", otro: "Otro",
};
export const SENTIMENT_LABELS: Record<string, string> = {
  positivo: "Positivo", negativo: "Negativo", neutral: "Neutral", mixto: "Mixto",
};
export const SENTIMENT_COLOR: Record<string, string> = {
  positivo: "bg-emerald-500", negativo: "bg-red-500", neutral: "bg-slate-400", mixto: "bg-amber-500",
};

function contar(valores: (string | null | undefined)[], labels?: Record<string, string>): Distribucion {
  const m = new Map<string, number>();
  for (const v of valores) {
    if (!v) continue;
    m.set(v, (m.get(v) ?? 0) + 1);
  }
  return [...m.entries()]
    .map(([k, count]) => ({ label: labels?.[k] ?? k, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Agrega los resultados de una o varias encuestas (por encuesta: 1 id; por proyecto: todos los ids).
 * RLS está desactivado (MVP) → el cliente puede leer estas tablas directamente.
 */
export async function fetchResultados(surveyIds: string[]): Promise<Resultados> {
  const vacio: Resultados = {
    respuestas: 0, participantes: 0, audios: 0, audiosProcesados: 0,
    preguntas: [], sentimiento: [], emociones: [], temas: [], intensidadProm: null, citas: [],
  };
  if (surveyIds.length === 0) return vacio;

  const supabase = createClient();

  // 1. Preguntas
  const { data: preguntas } = await supabase
    .from("questions")
    .select("id, survey_id, text, type, options, order")
    .in("survey_id", surveyIds)
    .order("order", { ascending: true });

  // 2. Respuestas
  const { data: responses } = await supabase
    .from("responses")
    .select("id, question_id, participant_id, value")
    .in("survey_id", surveyIds);

  const resp = responses ?? [];
  const participantes = new Set(resp.map(r => r.participant_id)).size;

  // 3. Audio + NLP
  const responseIds = resp.map(r => r.id);
  let audios = 0, audiosProcesados = 0;
  let sentimiento: Distribucion = [], emociones: Distribucion = [], temas: Distribucion = [];
  let intensidadProm: number | null = null;
  let citas: Cita[] = [];

  if (responseIds.length > 0) {
    const { data: audioRows } = await supabase
      .from("audio_responses")
      .select("id, quality")
      .in("response_id", responseIds);
    audios = (audioRows ?? []).length;
    audiosProcesados = (audioRows ?? []).filter(a => a.quality === "processed").length;

    const audioIds = (audioRows ?? []).map(a => a.id);
    if (audioIds.length > 0) {
      const { data: nlp } = await supabase
        .from("nlp_outputs")
        .select("sentiment, emotion, intensity, main_topic, narrative, citizen_quote")
        .in("audio_id", audioIds);
      const n = nlp ?? [];
      sentimiento = contar(n.map(x => x.sentiment));
      emociones = contar(n.map(x => x.emotion));
      temas = contar(n.map(x => x.main_topic), TEMA_LABELS);
      const ints = n.map(x => parseInt(x.intensity)).filter(v => !isNaN(v));
      intensidadProm = ints.length ? ints.reduce((a, b) => a + b, 0) / ints.length : null;
      citas = n
        .filter(x => x.citizen_quote)
        .slice(0, 8)
        .map(x => ({
          quote: x.citizen_quote, narrative: x.narrative ?? "",
          sentiment: x.sentiment ?? "neutral",
          topic: TEMA_LABELS[x.main_topic] ?? x.main_topic ?? "",
        }));
    }
  }

  // 4. Distribución por pregunta
  const porPregunta: PreguntaResultado[] = (preguntas ?? []).map(q => {
    const rs = resp.filter(r => r.question_id === q.id);
    const cerrada = ["single_choice", "multiple_choice", "scale"].includes(q.type);
    return {
      id: q.id,
      text: q.text,
      type: q.type,
      total: rs.length,
      distribucion: cerrada ? contar(rs.map(r => r.value)) : [],
      abiertas: !cerrada ? rs.map(r => r.value).filter(Boolean).slice(0, 10) : [],
    };
  });

  return {
    respuestas: resp.length,
    participantes,
    audios,
    audiosProcesados,
    preguntas: porPregunta,
    sentimiento,
    emociones,
    temas,
    intensidadProm,
    citas,
  };
}
