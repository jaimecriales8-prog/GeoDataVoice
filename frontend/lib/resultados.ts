import { createClient } from "@/lib/supabase";

export type DistItem = { label: string; count: number; peso?: number };
export type Distribucion = DistItem[];

// Ponderación por variable: { estrato: { "1": 3, "2": 2, ... }, ... }
export type Ponderacion = Record<string, Record<string, number>>;

export type PreguntaResultado = {
  id: string;
  text: string;
  type: string;
  total: number;
  distribucion: Distribucion; // para preguntas cerradas
  abiertas: string[];         // para open_text
  ponderada: boolean;         // si se aplicó balanceo demográfico
};

/** Peso de un participante según la ponderación de la encuesta (producto entre variables). */
export function pesoParticipante(pond: Ponderacion | null | undefined, p: Record<string, unknown> | undefined): number {
  if (!pond || !p) return 1;
  let w = 1;
  for (const [variable, pesos] of Object.entries(pond)) {
    if (!pesos || Object.keys(pesos).length === 0) continue;
    const val = p[variable];
    if (val === null || val === undefined) continue;
    const factor = pesos[String(val)];
    if (typeof factor === "number" && factor > 0) w *= factor;
  }
  return w;
}

export function ponderacionVacia(p: Ponderacion | null | undefined): boolean {
  if (!p) return true;
  return Object.values(p).every(v => !v || Object.keys(v).length === 0);
}

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
    .select("id, survey_id, question_id, participant_id, value")
    .in("survey_id", surveyIds);

  const resp = responses ?? [];
  const participantes = new Set(resp.map(r => r.participant_id)).size;

  // 2b. Ponderación demográfica (balanceo): por encuesta + demografía de participantes
  const { data: surveysPond } = await supabase
    .from("surveys").select("id, ponderacion").in("id", surveyIds);
  const pondPorSurvey = new Map<string, Ponderacion | null>(
    (surveysPond ?? []).map(s => [s.id, (s.ponderacion as Ponderacion) ?? null])
  );
  const hayPonderacion = (surveysPond ?? []).some(s => !ponderacionVacia(s.ponderacion as Ponderacion));

  const partIds = [...new Set(resp.map(r => r.participant_id))].filter(Boolean) as string[];
  const demoPorParticipante = new Map<string, Record<string, unknown>>();
  if (hayPonderacion && partIds.length > 0) {
    const { data: parts } = await supabase
      .from("participants")
      .select("id, gender, estrato, nivel_estudios, estado_civil, regimen_salud, sisben_grupo, tenencia_vivienda, grupo_etnico, antiguedad_barrio")
      .in("id", partIds);
    (parts ?? []).forEach(p => demoPorParticipante.set(p.id, p as Record<string, unknown>));
  }
  // peso por respuesta = peso del participante según la ponderación de su encuesta
  function pesoDeRespuesta(r: { survey_id: string; participant_id: string }): number {
    if (!hayPonderacion) return 1;
    const pond = pondPorSurvey.get(r.survey_id);
    if (ponderacionVacia(pond)) return 1;
    return pesoParticipante(pond, demoPorParticipante.get(r.participant_id));
  }

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

  // 4. Distribución por pregunta (con peso demográfico si la encuesta tiene ponderación)
  const porPregunta: PreguntaResultado[] = (preguntas ?? []).map(q => {
    const rs = resp.filter(r => r.question_id === q.id);
    const cerrada = ["single_choice", "multiple_choice", "scale"].includes(q.type);
    const pondQ = pondPorSurvey.get(q.survey_id);
    const ponderada = hayPonderacion && !ponderacionVacia(pondQ);

    let distribucion: Distribucion = [];
    if (cerrada) {
      const m = new Map<string, { count: number; peso: number }>();
      for (const r of rs) {
        if (!r.value) continue;
        const cur = m.get(r.value) ?? { count: 0, peso: 0 };
        cur.count += 1;
        cur.peso += pesoDeRespuesta(r);
        m.set(r.value, cur);
      }
      distribucion = [...m.entries()]
        .map(([label, v]) => ({ label, count: v.count, peso: ponderada ? v.peso : undefined }))
        .sort((a, b) => (ponderada ? (b.peso ?? 0) - (a.peso ?? 0) : b.count - a.count));
    }

    return {
      id: q.id,
      text: q.text,
      type: q.type,
      total: rs.length,
      distribucion,
      abiertas: !cerrada ? rs.map(r => r.value).filter(Boolean).slice(0, 10) : [],
      ponderada,
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

// ── Resultados a nivel PROYECTO: foto + evolución por ola + indicadores ──────────

export type SerieOla = {
  wave: number;
  total: number;            // nlp analizados en la ola
  positivo: number; negativo: number; neutral: number; mixto: number; // % 0-100
  favorabilidad: number | null; // % positivo en preguntas de favorabilidad de la ola
};

export type IndicadorOla = { wave: number; favorablePct: number | null; total: number; distribucion: Distribucion };
export type Indicador = {
  key: string;
  text: string;
  esFavorabilidad: boolean;
  olas: IndicadorOla[];
};

export type ResultadosProyecto = {
  agregado: Resultados;
  porOla: SerieOla[];
  indicadores: Indicador[];
};

export async function fetchResultadosProyecto(surveys: { id: string; wave: number }[]): Promise<ResultadosProyecto> {
  const ids = surveys.map(s => s.id);
  const agregado = await fetchResultados(ids);
  if (ids.length === 0) return { agregado, porOla: [], indicadores: [] };

  const supabase = createClient();
  const waveOf = new Map(surveys.map(s => [s.id, s.wave]));

  const { data: questions } = await supabase
    .from("questions")
    .select("id, survey_id, text, type, tracking_key, favorability, favorable_values")
    .in("survey_id", ids);
  const { data: responses } = await supabase
    .from("responses")
    .select("id, survey_id, question_id, value")
    .in("survey_id", ids);

  const qs = questions ?? [];
  const resp = responses ?? [];
  const respById = new Map(resp.map(r => [r.id, r]));

  // sentimiento por ola (audio → response → survey.wave)
  const porOlaMap = new Map<number, { pos: number; neg: number; neu: number; mix: number; total: number }>();
  const responseIds = resp.map(r => r.id);
  if (responseIds.length > 0) {
    const { data: audioRows } = await supabase
      .from("audio_responses").select("id, response_id").in("response_id", responseIds);
    const audioToResp = new Map((audioRows ?? []).map(a => [a.id, a.response_id]));
    const audioIds = (audioRows ?? []).map(a => a.id);
    if (audioIds.length > 0) {
      const { data: nlp } = await supabase
        .from("nlp_outputs").select("audio_id, sentiment").in("audio_id", audioIds);
      for (const n of nlp ?? []) {
        const rId = audioToResp.get(n.audio_id);
        const r = rId ? respById.get(rId) : undefined;
        const wave = r ? waveOf.get(r.survey_id) : undefined;
        if (wave == null) continue;
        const b = porOlaMap.get(wave) ?? { pos: 0, neg: 0, neu: 0, mix: 0, total: 0 };
        if (n.sentiment === "positivo") b.pos++;
        else if (n.sentiment === "negativo") b.neg++;
        else if (n.sentiment === "mixto") b.mix++;
        else b.neu++;
        b.total++;
        porOlaMap.set(wave, b);
      }
    }
  }

  // favorabilidad por ola (preguntas favorability con favorable_values)
  const favQ = qs.filter(q => q.favorability && Array.isArray(q.favorable_values));
  const favByWave = new Map<number, { fav: number; total: number }>();
  for (const q of favQ) {
    const wave = waveOf.get(q.survey_id);
    if (wave == null) continue;
    const positivos: string[] = q.favorable_values ?? [];
    const rs = resp.filter(r => r.question_id === q.id);
    const b = favByWave.get(wave) ?? { fav: 0, total: 0 };
    for (const r of rs) { b.total++; if (positivos.includes(r.value)) b.fav++; }
    favByWave.set(wave, b);
  }

  const porOla: SerieOla[] = surveys
    .map(s => s.wave)
    .filter((w, i, a) => a.indexOf(w) === i)
    .sort((a, b) => a - b)
    .map(wave => {
      const b = porOlaMap.get(wave) ?? { pos: 0, neg: 0, neu: 0, mix: 0, total: 0 };
      const t = b.total || 1;
      const f = favByWave.get(wave);
      return {
        wave,
        total: b.total,
        positivo: Math.round((b.pos / t) * 100),
        negativo: Math.round((b.neg / t) * 100),
        neutral: Math.round((b.neu / t) * 100),
        mixto: Math.round((b.mix / t) * 100),
        favorabilidad: f && f.total > 0 ? Math.round((f.fav / f.total) * 100) : null,
      };
    });

  // indicadores de seguimiento (agrupar por tracking_key)
  const porKey = new Map<string, typeof qs>();
  for (const q of qs) {
    if (!q.tracking_key) continue;
    const arr = porKey.get(q.tracking_key) ?? [];
    arr.push(q);
    porKey.set(q.tracking_key, arr);
  }
  const indicadores: Indicador[] = [...porKey.entries()].map(([key, preguntas]) => {
    const esFav = preguntas.some(q => q.favorability);
    const olas: IndicadorOla[] = preguntas
      .map(q => {
        const wave = waveOf.get(q.survey_id) ?? 0;
        const rs = resp.filter(r => r.question_id === q.id);
        const positivos: string[] = q.favorable_values ?? [];
        const fav = q.favorability && positivos.length
          ? Math.round((rs.filter(r => positivos.includes(r.value)).length / (rs.length || 1)) * 100)
          : null;
        return { wave, total: rs.length, favorablePct: fav, distribucion: contar(rs.map(r => r.value)) };
      })
      .sort((a, b) => a.wave - b.wave);
    return { key, text: preguntas[0].text, esFavorabilidad: esFav, olas };
  });

  return { agregado, porOla, indicadores };
}
