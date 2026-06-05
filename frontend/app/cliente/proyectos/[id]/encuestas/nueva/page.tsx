"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ArrowLeft, Plus, Trash2, Mic, MapPin, Users,
  GripVertical, ChevronDown, Save
} from "lucide-react";

type TipoPregunta = "single_choice" | "multiple_choice" | "scale" | "open_text" | "audio";
type PerfilObjetivo = "panelista" | "encuestador" | "ambos";

type Pregunta = {
  id: string;
  type: TipoPregunta;
  text: string;
  required: boolean;
  options: string[];
  audio_prompt: string;
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
  const [preguntas, setPreguntas] = useState<Pregunta[]>([
    { id: uid(), type: "single_choice", text: "", required: true, options: ["", ""], audio_prompt: "" },
  ]);
  const [expandida, setExpandida] = useState<string | null>(preguntas[0].id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Preguntas ────────────────────────────────────────────────

  function addPregunta() {
    const nueva: Pregunta = { id: uid(), type: "single_choice", text: "", required: true, options: ["", ""], audio_prompt: "" };
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
      audio_prompt: p.audio_prompt.trim() || null,
    }));

    const { error: qErr } = await supabase.from("questions").insert(preguntasRows);
    if (qErr) { setError(qErr.message); setSaving(false); return; }

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

                  {/* Prompt de audio — para preguntas que no son solo audio */}
                  {p.type !== "audio" && (
                    <Field label="Prompt de nota de voz (opcional)">
                      <input value={p.audio_prompt}
                        onChange={e => updatePregunta(p.id, { audio_prompt: e.target.value })}
                        placeholder="Ej: ¿Por qué diste esa respuesta? Cuéntanos con tus palabras."
                        className={inputCls} />
                    </Field>
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
