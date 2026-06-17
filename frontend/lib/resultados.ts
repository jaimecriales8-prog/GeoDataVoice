import { createClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

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

export type Transcripcion = {
  transcript: string;
  sentiment: string;
  emotion: string;
  topic: string;
  intensity: number | null;
};

export type FiltroDemo = { variable: string; valor: string | number };

export type NLPParticipante = {
  transcript: string;
  sentiment: string;
  emotion: string;
  topic: string;
  intensity: number | null;
};

export type RespuestaIndividual = {
  participantId: string;
  nombre: string;
  gender: string | null;
  birth_year: number | null;
  estrato: string | null;
  municipio: string | null;
  nivel_estudios: string | null;
  estado_civil: string | null;
  num_hijos: number | null;
  regimen_salud: string | null;
  sisben_grupo: string | null;
  tenencia_vivienda: string | null;
  grupo_etnico: string | null;
  actividades: string | null;
  antiguedad_barrio: string | null;
  recibe_subsidios: boolean | null;
  acceso_internet: boolean | null;
  registrado_votar: boolean | null;
  fecha: string;
  respuestas: Record<string, string>; // question_id → value
  nlp: NLPParticipante[];            // notas de voz analizadas
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
  transcripciones: Transcripcion[];
  individuales: RespuestaIndividual[];
  totalSinFiltro: number; // total de respuestas antes de aplicar filtro demográfico
};

export const TEMA_LABELS: Record<string, string> = {
  // Política y gobierno
  seguridad: "Seguridad", corrupcion: "Corrupción", corrupción: "Corrupción",
  gobernanza: "Gobernanza", instituciones: "Instituciones", democracia: "Democracia",
  politica: "Política", política: "Política", elecciones: "Elecciones",
  candidato: "Candidato/a", gobierno: "Gobierno", estado: "Estado",
  // Economía y empleo
  economia: "Economía", economía: "Economía", empleo: "Empleo",
  desempleo: "Desempleo", pobreza: "Pobreza", costo_vida: "Costo de vida",
  inflation: "Inflación", inflacion: "Inflación", impuestos: "Impuestos",
  // Social
  salud: "Salud", educacion: "Educación", educación: "Educación",
  vivienda: "Vivienda", familia: "Familia", juventud: "Juventud",
  genero: "Género", género: "Género", igualdad: "Igualdad",
  // Infraestructura y servicios
  servicios_publicos: "Servicios públicos", servicios_públicos: "Servicios públicos",
  movilidad: "Movilidad", transporte: "Transporte", infraestructura: "Infraestructura",
  agua: "Agua", energia: "Energía", energía: "Energía",
  // Medioambiente
  medio_ambiente: "Medio ambiente", ambiente: "Medio ambiente",
  cambio_climatico: "Cambio climático", cambio_climático: "Cambio climático",
  // Orden público
  violencia: "Violencia", conflicto: "Conflicto", paz: "Paz",
  drogas: "Drogas", crimen: "Crimen organizado",
  // Otros
  otro: "Otro", other: "Otro", ninguno: "Sin categoría",
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
export async function fetchResultados(surveyIds: string[], filtro?: FiltroDemo | null, client?: SupabaseClient): Promise<Resultados> {
  const vacio: Resultados = {
    respuestas: 0, participantes: 0, audios: 0, audiosProcesados: 0,
    preguntas: [], sentimiento: [], emociones: [], temas: [], intensidadProm: null, citas: [], transcripciones: [], individuales: [], totalSinFiltro: 0,
  };
  if (surveyIds.length === 0) return vacio;

  const supabase = client ?? createClient();

  // 1. Preguntas
  const { data: preguntas } = await supabase
    .from("questions")
    .select("id, survey_id, text, type, options, order")
    .in("survey_id", surveyIds)
    .order("order", { ascending: true });

  // 2. Respuestas
  const { data: responses } = await supabase
    .from("responses")
    .select("id, survey_id, question_id, participant_id, value, responded_at")
    .in("survey_id", surveyIds);

  const totalSinFiltro = (responses ?? []).length;

  // 2b. Ponderación demográfica + demografía de participantes (siempre se fetcha)
  const { data: surveysPond } = await supabase
    .from("surveys").select("id, ponderacion").in("id", surveyIds);
  const pondPorSurvey = new Map<string, Ponderacion | null>(
    (surveysPond ?? []).map(s => [s.id, (s.ponderacion as Ponderacion) ?? null])
  );
  const hayPonderacion = (surveysPond ?? []).some(s => !ponderacionVacia(s.ponderacion as Ponderacion));

  const allPartIds = [...new Set((responses ?? []).map(r => r.participant_id))].filter(Boolean) as string[];
  const demoPorParticipante = new Map<string, Record<string, unknown>>();
  if (allPartIds.length > 0) {
    const { data: parts } = await supabase
      .from("participants")
      .select("id, name_encrypted, gender, birth_year, estrato, municipio, nivel_estudios, estado_civil, num_hijos, regimen_salud, sisben_grupo, tenencia_vivienda, grupo_etnico, actividades, antiguedad_barrio, recibe_subsidios, acceso_internet, registrado_votar")
      .in("id", allPartIds);
    (parts ?? []).forEach(p => demoPorParticipante.set(p.id, p as Record<string, unknown>));
  }

  // Aplicar filtro demográfico: solo respuestas de participantes que coincidan
  let resp = responses ?? [];
  if (filtro) {
    const partIdsFiltrados = new Set(
      allPartIds.filter(pid => {
        const demo = demoPorParticipante.get(pid);
        if (!demo) return false;
        const val = demo[filtro.variable];
        if (Array.isArray(val)) return val.includes(filtro.valor);
        return String(val) === String(filtro.valor);
      })
    );
    resp = resp.filter(r => r.participant_id && partIdsFiltrados.has(r.participant_id));
  }

  const partIds = [...new Set(resp.map(r => r.participant_id))].filter(Boolean) as string[];
  const participantes = new Set(resp.map(r => r.participant_id)).size;

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
  let transcripciones: Transcripcion[] = [];
  const nlpPorParticipante = new Map<string, NLPParticipante[]>();

  // audioId → participantId (para vincular NLP a participante)
  const audioToParticipant = new Map<string, string>();

  if (responseIds.length > 0) {
    const { data: audioRows } = await supabase
      .from("audio_responses")
      .select("id, response_id, quality")
      .in("response_id", responseIds);
    audios = (audioRows ?? []).length;
    audiosProcesados = (audioRows ?? []).filter(a => a.quality === "processed").length;

    // construir mapa audio → participant a través de response
    const respToParticipant = new Map(resp.map(r => [r.id, r.participant_id]));
    for (const a of audioRows ?? []) {
      const pid = respToParticipant.get(a.response_id);
      if (pid) audioToParticipant.set(a.id, pid);
    }

    const audioIds = (audioRows ?? []).map(a => a.id);
    if (audioIds.length > 0) {
      const { data: nlp } = await supabase
        .from("nlp_outputs")
        .select("audio_id, sentiment, emotion, intensity, main_topic, narrative, citizen_quote, transcript")
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
      transcripciones = n
        .filter(x => x.transcript)
        .map(x => ({
          transcript: x.transcript,
          sentiment: x.sentiment ?? "neutral",
          emotion: x.emotion ?? "",
          topic: TEMA_LABELS[x.main_topic] ?? x.main_topic ?? "Sin categoría",
          intensity: x.intensity ? parseInt(x.intensity) : null,
        }));

      // indexar NLP por participante
      for (const x of n) {
        const pid = audioToParticipant.get(x.audio_id);
        if (!pid || !x.transcript) continue;
        const cur = nlpPorParticipante.get(pid) ?? [];
        cur.push({
          transcript: x.transcript,
          sentiment: x.sentiment ?? "neutral",
          emotion: x.emotion ?? "",
          topic: TEMA_LABELS[x.main_topic] ?? x.main_topic ?? "Sin categoría",
          intensity: x.intensity ? parseInt(x.intensity) : null,
        });
        nlpPorParticipante.set(pid, cur);
      }
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

  // 5. Respuestas individuales (una fila por participante, reutiliza demoPorParticipante)
  const byPart = new Map<string, { fecha: string; respuestas: Record<string, string> }>();
  for (const r of resp) {
    if (!r.participant_id) continue;
    const cur = byPart.get(r.participant_id) ?? { fecha: (r as { responded_at?: string }).responded_at ?? "", respuestas: {} };
    const rDate = (r as { responded_at?: string }).responded_at ?? "";
    if (!cur.fecha || (rDate && rDate < cur.fecha)) cur.fecha = rDate;
    cur.respuestas[r.question_id] = r.value ?? "";
    byPart.set(r.participant_id, cur);
  }
  const individuales: RespuestaIndividual[] = [...byPart.entries()].map(([pid, d]) => {
    const p = demoPorParticipante.get(pid) as Record<string, unknown> | undefined;
    const n = (v: unknown) => (v != null ? String(v) : null);
    return {
      participantId: pid,
      nombre: (p?.name_encrypted as string | undefined) ?? "—",
      gender: n(p?.gender),
      birth_year: p?.birth_year != null ? Number(p.birth_year) : null,
      estrato: p?.estrato != null ? String(p.estrato) : null,
      municipio: n(p?.municipio),
      nivel_estudios: n(p?.nivel_estudios),
      estado_civil: n(p?.estado_civil),
      num_hijos: p?.num_hijos != null ? Number(p.num_hijos) : null,
      regimen_salud: n(p?.regimen_salud),
      sisben_grupo: n(p?.sisben_grupo),
      tenencia_vivienda: n(p?.tenencia_vivienda),
      grupo_etnico: n(p?.grupo_etnico),
      actividades: p?.actividades != null ? String(p.actividades) : null,
      antiguedad_barrio: n(p?.antiguedad_barrio),
      recibe_subsidios: p?.recibe_subsidios != null ? Boolean(p.recibe_subsidios) : null,
      acceso_internet: p?.acceso_internet != null ? Boolean(p.acceso_internet) : null,
      registrado_votar: p?.registrado_votar != null ? Boolean(p.registrado_votar) : null,
      fecha: d.fecha,
      respuestas: d.respuestas,
      nlp: nlpPorParticipante.get(pid) ?? [],
    };
  }).sort((a, b) => a.fecha.localeCompare(b.fecha));

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
    transcripciones,
    individuales,
    totalSinFiltro,
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

export async function fetchResultadosProyecto(surveys: { id: string; wave: number }[], client?: SupabaseClient): Promise<ResultadosProyecto> {
  const ids = surveys.map(s => s.id);
  const agregado = await fetchResultados(ids, null, client);
  if (ids.length === 0) return { agregado, porOla: [], indicadores: [] };

  const supabase = client ?? createClient();
  const waveOf = new Map(surveys.map(s => [s.id, s.wave]));

  const { data: questions } = await supabase
    .from("questions")
    .select("id, survey_id, text, type, tracking_key, favorability, favorable_values")
    .in("survey_id", ids);
  const { data: responses } = await supabase
    .from("responses")
    .select("id, survey_id, question_id, participant_id, value")
    .in("survey_id", ids);

  const qs = questions ?? [];
  const resp = responses ?? [];
  const respById = new Map(resp.map(r => [r.id, r]));

  // Ponderación demográfica por encuesta + demografía de participantes
  const { data: surveysPond } = await supabase
    .from("surveys").select("id, ponderacion").in("id", ids);
  const pondPorSurvey = new Map<string, Ponderacion | null>(
    (surveysPond ?? []).map(s => [s.id, (s.ponderacion as Ponderacion) ?? null])
  );
  const hayPonderacion = (surveysPond ?? []).some(s => !ponderacionVacia(s.ponderacion as Ponderacion));
  const demoPorParticipante = new Map<string, Record<string, unknown>>();
  if (hayPonderacion) {
    const partIds = [...new Set(resp.map(r => r.participant_id))].filter(Boolean) as string[];
    if (partIds.length > 0) {
      const { data: parts } = await supabase
        .from("participants")
        .select("id, gender, estrato, nivel_estudios, estado_civil, regimen_salud, sisben_grupo, tenencia_vivienda, grupo_etnico, antiguedad_barrio")
        .in("id", partIds);
      (parts ?? []).forEach(p => demoPorParticipante.set(p.id, p as Record<string, unknown>));
    }
  }
  function pesoDeResp(r: { survey_id: string; participant_id: string } | undefined): number {
    if (!hayPonderacion || !r) return 1;
    const pond = pondPorSurvey.get(r.survey_id);
    if (ponderacionVacia(pond)) return 1;
    return pesoParticipante(pond, demoPorParticipante.get(r.participant_id));
  }

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
        const w = pesoDeResp(r);
        const b = porOlaMap.get(wave) ?? { pos: 0, neg: 0, neu: 0, mix: 0, total: 0 };
        if (n.sentiment === "positivo") b.pos += w;
        else if (n.sentiment === "negativo") b.neg += w;
        else if (n.sentiment === "mixto") b.mix += w;
        else b.neu += w;
        b.total += w;
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
    for (const r of rs) { const w = pesoDeResp(r); b.total += w; if (positivos.includes(r.value)) b.fav += w; }
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
        const ponderada = hayPonderacion && !ponderacionVacia(pondPorSurvey.get(q.survey_id));
        // favorabilidad ponderada = peso favorable / peso total
        let fav: number | null = null;
        if (q.favorability && positivos.length) {
          let favW = 0, totW = 0;
          for (const r of rs) { const w = pesoDeResp(r); totW += w; if (positivos.includes(r.value)) favW += w; }
          fav = Math.round((favW / (totW || 1)) * 100);
        }
        // distribución ponderada por opción
        const m = new Map<string, { count: number; peso: number }>();
        for (const r of rs) {
          if (!r.value) continue;
          const cur = m.get(r.value) ?? { count: 0, peso: 0 };
          cur.count += 1; cur.peso += pesoDeResp(r);
          m.set(r.value, cur);
        }
        const distribucion = [...m.entries()]
          .map(([label, v]) => ({ label, count: v.count, peso: ponderada ? v.peso : undefined }))
          .sort((a, b) => (ponderada ? (b.peso ?? 0) - (a.peso ?? 0) : b.count - a.count));
        return { wave, total: rs.length, favorablePct: fav, distribucion };
      })
      .sort((a, b) => a.wave - b.wave);
    return { key, text: preguntas[0].text, esFavorabilidad: esFav, olas };
  });

  return { agregado, porOla, indicadores };
}
