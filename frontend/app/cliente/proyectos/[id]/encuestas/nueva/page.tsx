"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Trash2, Mic, MapPin, Users,
  GripVertical, ChevronDown, Save, Target, Scale
} from "lucide-react";
import { SEGMENT_VARS, type Audiencia, audienciaVacia } from "@/lib/segmentacion";
import { type Ponderacion, ponderacionVacia } from "@/lib/resultados";

// Variables aptas para ponderar (discretas, no listas ni booleanas)
const PONDERAR_VARS = SEGMENT_VARS.filter(v => v.tipo === "opciones");

type TipoPregunta = "single_choice" | "multiple_choice" | "scale" | "open_text" | "audio";
type PerfilObjetivo = "panelista" | "encuestador" | "ambos";

type Pregunta = {
  id: string;
  type: TipoPregunta;
  text: string;
  required: boolean;
  options: string[];
  pide_audio: boolean;         // pedir nota de voz en esta pregunta
  audio_prompt: string;        // texto que invita a grabar
  tracking_key: string;        // código para comparar la misma pregunta entre olas
  favorability: boolean;       // marcar como pregunta de favorabilidad
  favorable_values: string[];  // opciones que cuentan como "positivas" (top-box)
};

const TIPOS_PREGUNTA: { value: TipoPregunta; label: string; desc: string }[] = [
  { value: "single_choice", label: "Opción única", desc: "El panelista elige una respuesta" },
  { value: "multiple_choice", label: "Múltiple selección", desc: "Puede elegir varias" },
  { value: "scale", label: "Escala 1–5", desc: "Calificación numérica" },
  { value: "open_text", label: "Texto libre", desc: "Respuesta abierta escrita" },
  { value: "audio", label: "Nota de voz", desc: "Solo grabación de audio" },
];

const PERFILES: { value: PerfilObjetivo; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { value: "panelista", label: "Panelistas", desc: "Solo panelistas registrados responden esta encuesta desde su cuenta", icon: Mic, color: "border-amber-400 bg-amber-500/10 text-amber-300" },
  { value: "encuestador", label: "Encuestadores", desc: "El encuestador la aplica a un panelista en campo desde su dispositivo", icon: MapPin, color: "border-emerald-400 bg-emerald-500/10 text-emerald-300" },
  { value: "ambos", label: "Ambos perfiles", desc: "Tanto panelistas como encuestadores pueden responderla", icon: Users, color: "border-blue-400 bg-blue-500/10 text-blue-300" },
];

function uid() { return Math.random().toString(36).slice(2, 9); }

export default function NuevaEncuesta({ params }: { params: Promise<{ id: string }> }) {
  const { id: proyectoId } = use(params);
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [wave, setWave] = useState(1);
  const [closesAt, setClosesAt] = useState("");
  const [perfil, setPerfil] = useState<PerfilObjetivo>("panelista");
  const [segmentar, setSegmentar] = useState(false);
  const [audiencia, setAudiencia] = useState<Audiencia>({});
  const [ponderar, setPonderar] = useState(false);
  const [ponderacion, setPonderacion] = useState<Ponderacion>({});
  const [preguntas, setPreguntas] = useState<Pregunta[]>([
    { id: uid(), type: "single_choice", text: "", required: true, options: ["", ""], pide_audio: true, audio_prompt: "", tracking_key: "", favorability: false, favorable_values: [] },
  ]);
  const [expandida, setExpandida] = useState<string | null>(preguntas[0].id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Audiencia ────────────────────────────────────────────────
  function toggleAudiencia(key: string, value: string | number | boolean) {
    setAudiencia(prev => {
      const actuales = prev[key] ?? [];
      const existe = actuales.some(v => v === value);
      const nuevos = existe ? actuales.filter(v => v !== value) : [...actuales, value];
      const next = { ...prev, [key]: nuevos };
      if (nuevos.length === 0) delete next[key];
      return next;
    });
  }

  // ── Ponderación ──────────────────────────────────────────────
  function setPeso(variable: string, valor: string, peso: string) {
    setPonderacion(prev => {
      const next = { ...prev };
      const grupo = { ...(next[variable] ?? {}) };
      const num = parseFloat(peso);
      if (peso.trim() === "" || isNaN(num)) { delete grupo[valor]; }
      else { grupo[valor] = num; }
      if (Object.keys(grupo).length === 0) delete next[variable];
      else next[variable] = grupo;
      return next;
    });
  }

  // ── Preguntas ────────────────────────────────────────────────

  function addPregunta() {
    const nueva: Pregunta = { id: uid(), type: "single_choice", text: "", required: true, options: ["", ""], pide_audio: true, audio_prompt: "", tracking_key: "", favorability: false, favorable_values: [] };
    setPreguntas(prev => [...prev, nueva]);
    setExpandida(nueva.id);
  }

  function removePregunta(id: string) {
    setPreguntas(prev => prev.filter(p => p.id !== id));
  }

  function updatePregunta(id: string, changes: Partial<Pregunta>) {
    setPreguntas(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  }

  function addOpcion(preguntaId: string) {
    setPreguntas(prev => prev.map(p =>
      p.id === preguntaId ? { ...p, options: [...p.options, ""] } : p
    ));
  }

  function updateOpcion(preguntaId: string, idx: number, value: string) {
    setPreguntas(prev => prev.map(p => {
      if (p.id !== preguntaId) return p;
      const opts = [...p.options];
      opts[idx] = value;
      return { ...p, options: opts };
    }));
  }

  function removeOpcion(preguntaId: string, idx: number) {
    setPreguntas(prev => prev.map(p => {
      if (p.id !== preguntaId) return p;
      return { ...p, options: p.options.filter((_, i) => i !== idx) };
    }));
  }

  // ── Guardar ──────────────────────────────────────────────────

  async function guardar(estado: "draft" | "ready") {
    if (!nombre.trim()) { setError("El nombre de la encuesta es obligatorio."); return; }
    if (preguntas.some(p => !p.text.trim())) { setError("Todas las preguntas deben tener texto."); return; }

    setSaving(true); setError("");
    const supabase = createClient();

    const { data: survey, error: sErr } = await supabase
      .from("surveys")
      .insert({
        id: crypto.randomUUID(),
        project_id: proyectoId,
        name: nombre.trim(),
        wave,
        status: estado,
        perfil_objetivo: perfil,
        audiencia: (segmentar && !audienciaVacia(audiencia)) ? audiencia : null,
        ponderacion: (ponderar && !ponderacionVacia(ponderacion)) ? ponderacion : null,
        closes_at: closesAt || null,
      })
      .select("id")
      .single();

    if (sErr || !survey) { setError(sErr?.message ?? "Error al crear la encuesta"); setSaving(false); return; }

    const preguntasRows = preguntas.map((p, i) => ({
      id: crypto.randomUUID(),
      survey_id: survey.id,
      type: p.type,
      text: p.text.trim(),
      required: p.required,
      order: i,
      options: ["single_choice", "multiple_choice", "scale"].includes(p.type)
        ? { choices: p.options.filter(o => o.trim()) }
        : null,
      audio_prompt: p.pide_audio ? (p.audio_prompt.trim() || "¿Por qué respondiste así? Cuéntanos con tus palabras.") : null,
      tracking_key: p.tracking_key.trim() || null,
      favorability: p.favorability,
      favorable_values: p.favorability && p.favorable_values.length > 0 ? p.favorable_values : null,
    }));

    const { error: qErr } = await supabase.from("questions").insert(preguntasRows);
    if (qErr) { setError(qErr.message); setSaving(false); return; }

    // Si se publica (ready = enviada), notificar a panelistas por email
    if (estado === "ready") {
      try {
        await fetch("/api/email/nueva-encuesta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surveyId: survey.id }),
        });
      } catch (e) {
        console.error("[guardar] Error enviando notificaciones:", e);
        // No bloqueamos la navegación si el email falla
      }
    }

    router.push(`/cliente/proyectos/${proyectoId}`);
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-white">Nueva encuesta</h1>
      </div>

      {/* Info básica */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 mb-5">
        <h2 className="text-sm font-semibold text-white mb-4">Información general</h2>
        <div className="space-y-4">
          <Field label="Nombre de la encuesta *">
            <input value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Pulso ciudadano — Ola 3" className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Número de ola">
              <input type="number" value={wave} onChange={e => setWave(parseInt(e.target.value) || 1)}
                min={1} className={inputCls} />
            </Field>
            <Field label="Fecha de cierre">
              <input type="date" value={closesAt} onChange={e => setClosesAt(e.target.value)}
                className={inputCls} />
            </Field>
          </div>
        </div>
      </div>

      {/* Perfil objetivo */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 mb-5">
        <h2 className="text-sm font-semibold text-white mb-1">¿Quién responde esta encuesta?</h2>
        <p className="text-xs text-slate-500 mb-4">Define qué perfil puede ver y ejecutar esta encuesta</p>
        <div className="grid grid-cols-3 gap-3">
          {PERFILES.map(({ value, label, desc, icon: Icon, color }) => (
            <button key={value} onClick={() => setPerfil(value)}
              className={`rounded-xl border-2 p-4 text-left transition-all ${
                perfil === value ? color + " border-opacity-100" : "border-white/10 bg-white/[0.02] hover:bg-white/5"
              }`}>
              <Icon className={`h-5 w-5 mb-2 ${perfil === value ? "" : "text-slate-500"}`} />
              <p className={`text-sm font-semibold mb-1 ${perfil === value ? "" : "text-slate-300"}`}>{label}</p>
              <p className={`text-xs leading-relaxed ${perfil === value ? "opacity-80" : "text-slate-500"}`}>{desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Público objetivo (segmentación) */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-4 w-4 text-pink-400" />
          <h2 className="text-sm font-semibold text-white">Público objetivo</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">Filtra a quién se le muestra la encuesta según los datos del panelista</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => setSegmentar(false)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${!segmentar ? "border-pink-400 bg-pink-500/10 text-pink-200" : "border-white/10 bg-white/[0.02] hover:bg-white/5"}`}>
            <Users className={`h-5 w-5 mb-2 ${!segmentar ? "" : "text-slate-500"}`} />
            <p className={`text-sm font-semibold mb-1 ${!segmentar ? "" : "text-slate-300"}`}>Cualquier persona</p>
            <p className={`text-xs leading-relaxed ${!segmentar ? "opacity-80" : "text-slate-500"}`}>Todos los panelistas del perfil elegido pueden responderla</p>
          </button>
          <button onClick={() => setSegmentar(true)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${segmentar ? "border-pink-400 bg-pink-500/10 text-pink-200" : "border-white/10 bg-white/[0.02] hover:bg-white/5"}`}>
            <Target className={`h-5 w-5 mb-2 ${segmentar ? "" : "text-slate-500"}`} />
            <p className={`text-sm font-semibold mb-1 ${segmentar ? "" : "text-slate-300"}`}>Segmentar</p>
            <p className={`text-xs leading-relaxed ${segmentar ? "opacity-80" : "text-slate-500"}`}>Elige variables y los valores que quieres incluir</p>
          </button>
        </div>

        {segmentar && (
          <div className="space-y-4 border-t border-white/5 pt-4">
            <p className="text-xs text-slate-400">
              Marca los valores a incluir en cada variable. Si dejas una variable vacía, no filtra por ella.
              Una persona debe cumplir <strong className="text-slate-200">todas</strong> las variables marcadas.
            </p>
            {SEGMENT_VARS.map(v => {
              const sel = audiencia[v.key] ?? [];
              return (
                <div key={v.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-slate-300">{v.label}</p>
                    {sel.length > 0 && (
                      <span className="text-[10px] text-pink-300 bg-pink-500/10 rounded-full px-2 py-0.5">{sel.length} seleccionado{sel.length === 1 ? "" : "s"}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {v.opciones.map(o => {
                      const activo = sel.some(x => x === o.value);
                      return (
                        <button key={String(o.value)} type="button" onClick={() => toggleAudiencia(v.key, o.value)}
                          className={`rounded-lg px-3 py-1.5 text-xs border transition-colors ${activo ? "border-pink-400 bg-pink-500/15 text-pink-200" : "border-white/10 bg-white/[0.02] text-slate-400 hover:bg-white/5"}`}>
                          {o.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {audienciaVacia(audiencia) && (
              <p className="text-xs text-amber-300">Aún no seleccionaste ninguna variable → se mostrará a cualquier persona.</p>
            )}
          </div>
        )}
      </div>

      {/* Ponderación (balanceo de resultados) */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Scale className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-white">Ponderación de resultados (balanceo)</h2>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          Da más o menos peso a ciertos grupos al calcular los porcentajes. Ej: en seguridad ciudadana, una respuesta de estrato 1 puede pesar más que una de estrato 6.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={() => setPonderar(false)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${!ponderar ? "border-amber-400 bg-amber-500/10 text-amber-200" : "border-white/10 bg-white/[0.02] hover:bg-white/5"}`}>
            <Users className={`h-5 w-5 mb-2 ${!ponderar ? "" : "text-slate-500"}`} />
            <p className={`text-sm font-semibold mb-1 ${!ponderar ? "" : "text-slate-300"}`}>Sin ponderar</p>
            <p className={`text-xs leading-relaxed ${!ponderar ? "opacity-80" : "text-slate-500"}`}>Cada respuesta vale igual (1 persona = 1 voto)</p>
          </button>
          <button onClick={() => setPonderar(true)}
            className={`rounded-xl border-2 p-4 text-left transition-all ${ponderar ? "border-amber-400 bg-amber-500/10 text-amber-200" : "border-white/10 bg-white/[0.02] hover:bg-white/5"}`}>
            <Scale className={`h-5 w-5 mb-2 ${ponderar ? "" : "text-slate-500"}`} />
            <p className={`text-sm font-semibold mb-1 ${ponderar ? "" : "text-slate-300"}`}>Ponderar</p>
            <p className={`text-xs leading-relaxed ${ponderar ? "opacity-80" : "text-slate-500"}`}>Asigna un peso a cada grupo de las variables que elijas</p>
          </button>
        </div>

        {ponderar && (
          <div className="space-y-4 border-t border-white/5 pt-4">
            <p className="text-xs text-slate-400">
              Escribe el peso de cada grupo (ej. 1.0 = normal, 2.0 = doble, 0.5 = mitad). Los grupos sin peso valen 1.
              Si configuras varias variables, los pesos se multiplican.
            </p>
            {PONDERAR_VARS.map(v => (
              <div key={v.key}>
                <p className="text-xs font-semibold text-slate-300 mb-1.5">{v.label}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {v.opciones.map(o => {
                    const val = ponderacion[v.key]?.[String(o.value)];
                    return (
                      <div key={String(o.value)} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-1.5">
                        <span className="text-xs text-slate-400 flex-1 truncate">{o.label}</span>
                        <input
                          type="number" step="0.1" min="0" inputMode="decimal"
                          value={val ?? ""} onChange={e => setPeso(v.key, String(o.value), e.target.value)}
                          placeholder="1.0"
                          className="w-14 rounded-md bg-slate-800 border border-white/10 px-2 py-1 text-xs text-white text-center outline-none focus:border-amber-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {ponderacionVacia(ponderacion) && (
              <p className="text-xs text-amber-300">Aún no asignaste pesos → los resultados saldrán sin ponderar.</p>
            )}
          </div>
        )}
      </div>

      {/* Preguntas */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 overflow-hidden mb-5">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Preguntas ({preguntas.length})</h2>
          <button onClick={addPregunta}
            className="flex items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Agregar pregunta
          </button>
        </div>

        <div className="divide-y divide-white/5">
          {preguntas.map((p, idx) => (
            <div key={p.id}>
              {/* Cabecera de pregunta */}
              <div
                className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandida(expandida === p.id ? null : p.id)}>
                <GripVertical className="h-4 w-4 text-slate-700 shrink-0" />
                <span className="text-xs font-bold text-slate-500 w-5 shrink-0">{idx + 1}</span>
                <p className="flex-1 text-sm text-white truncate">{p.text || <span className="text-slate-600 italic">Sin texto</span>}</p>
                <span className="text-xs text-slate-600 hidden sm:block">{TIPOS_PREGUNTA.find(t => t.value === p.type)?.label}</span>
                <div className="flex items-center gap-2">
                  {preguntas.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); removePregunta(p.id); }}
                      className="text-slate-600 hover:text-red-400 transition-colors p-1">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${expandida === p.id ? "rotate-180" : ""}`} />
                </div>
              </div>

              {/* Edición de pregunta */}
              {expandida === p.id && (
                <div className="px-5 pb-5 bg-white/[0.01] space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Tipo de pregunta">
                      <select value={p.type}
                        onChange={e => updatePregunta(p.id, { type: e.target.value as TipoPregunta, options: e.target.value === "scale" ? ["1", "2", "3", "4", "5"] : ["", ""] })}
                        className={inputCls}>
                        {TIPOS_PREGUNTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Requerida">
                      <select value={p.required ? "si" : "no"} onChange={e => updatePregunta(p.id, { required: e.target.value === "si" })} className={inputCls}>
                        <option value="si">Sí</option>
                        <option value="no">No (opcional)</option>
                      </select>
                    </Field>
                  </div>

                  <Field label="Texto de la pregunta *">
                    <textarea value={p.text} onChange={e => updatePregunta(p.id, { text: e.target.value })}
                      placeholder="Escribe la pregunta aquí..." rows={2}
                      className={inputCls + " resize-none"} />
                  </Field>

                  {/* Opciones para single/multiple */}
                  {(p.type === "single_choice" || p.type === "multiple_choice") && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-2">Opciones de respuesta</label>
                      <div className="space-y-2">
                        {p.options.map((opt, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs text-slate-600 w-5 text-center shrink-0">{i + 1}</span>
                            <input value={opt} onChange={e => updateOpcion(p.id, i, e.target.value)}
                              placeholder={`Opción ${i + 1}`} className={inputCls + " flex-1"} />
                            {p.options.length > 2 && (
                              <button onClick={() => removeOpcion(p.id, i)}
                                className="text-slate-600 hover:text-red-400 transition-colors shrink-0">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <button onClick={() => addOpcion(p.id)}
                        className="mt-2 text-xs text-violet-400 hover:text-violet-300 transition-colors flex items-center gap-1">
                        <Plus className="h-3 w-3" /> Agregar opción
                      </button>
                    </div>
                  )}

                  {/* Opciones escala */}
                  {p.type === "scale" && (
                    <div className="rounded-xl bg-white/5 px-4 py-3 text-xs text-slate-400">
                      Escala del 1 al 5. Las etiquetas de cada valor se pueden personalizar más adelante.
                    </div>
                  )}

                  {/* Nota de voz por pregunta */}
                  {p.type !== "audio" && (
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span className="text-sm text-slate-300">🎤 Pedir nota de voz en esta pregunta</span>
                        <button type="button" onClick={() => updatePregunta(p.id, { pide_audio: !p.pide_audio })}
                          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${p.pide_audio ? "bg-violet-600" : "bg-slate-600"}`}>
                          <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${p.pide_audio ? "translate-x-5" : "translate-x-0.5"}`} />
                        </button>
                      </label>
                      {p.pide_audio && (
                        <div className="mt-3">
                          <Field label="Texto que invita a grabar (opcional)">
                            <input value={p.audio_prompt} onChange={e => updatePregunta(p.id, { audio_prompt: e.target.value })}
                              placeholder="Ej: ¿Por qué respondiste así? Cuéntanos con tus palabras." className={inputCls} />
                          </Field>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seguimiento entre olas + favorabilidad (solo preguntas cerradas) */}
                  {["single_choice", "multiple_choice", "scale"].includes(p.type) && (
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3 space-y-3">
                      <Field label="Código de seguimiento (opcional)">
                        <input value={p.tracking_key}
                          onChange={e => updatePregunta(p.id, { tracking_key: e.target.value.toUpperCase().replace(/\s+/g, "_") })}
                          placeholder="Ej: FAV_ALCALDE — para comparar esta pregunta entre olas"
                          className={inputCls} />
                      </Field>

                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                        <input type="checkbox" checked={p.favorability}
                          onChange={e => updatePregunta(p.id, { favorability: e.target.checked, favorable_values: [] })}
                          className="h-4 w-4 rounded accent-violet-500" />
                        Es una pregunta de favorabilidad / aprobación
                      </label>

                      {p.favorability && (
                        <div>
                          <p className="text-xs text-slate-500 mb-2">Marca las opciones que cuentan como <span className="text-emerald-400">positivas</span> (favorabilidad = % de estas):</p>
                          <div className="flex flex-wrap gap-2">
                            {p.options.filter(o => o.trim()).map((opt, oi) => {
                              const sel = p.favorable_values.includes(opt);
                              return (
                                <button key={oi} type="button"
                                  onClick={() => updatePregunta(p.id, {
                                    favorable_values: sel ? p.favorable_values.filter(v => v !== opt) : [...p.favorable_values, opt],
                                  })}
                                  className={`rounded-lg px-3 py-1.5 text-xs border transition-colors ${sel ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-slate-400 hover:text-white"}`}>
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400 mb-5">
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-3">
        <button onClick={() => router.back()}
          className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white transition-colors">
          Cancelar
        </button>
        <button onClick={() => guardar("draft")} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-3 text-sm font-medium text-slate-300 disabled:opacity-50 transition-colors">
          <Save className="h-4 w-4" />
          Guardar borrador
        </button>
        <button onClick={() => guardar("ready")} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-5 py-3 text-sm font-semibold text-white transition-colors">
          {saving ? "Guardando..." : "Publicar encuesta →"}
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl bg-slate-800 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
