"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import { Scale, ChevronDown, Save, Loader2, CheckCircle } from "lucide-react";
import { SEGMENT_VARS } from "@/lib/segmentacion";
import { type Ponderacion, ponderacionVacia } from "@/lib/resultados";

const PONDERAR_VARS = SEGMENT_VARS.filter(v => v.tipo === "opciones");

export function PonderacionEditor({ surveyId, inicial, onSaved }: {
  surveyId: string;
  inicial: Ponderacion | null;
  onSaved: (p: Ponderacion | null) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [ponderar, setPonderar] = useState(!ponderacionVacia(inicial));
  const [ponderacion, setPonderacion] = useState<Ponderacion>(inicial ?? {});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setPeso(variable: string, valor: string, peso: string) {
    setPonderacion(prev => {
      const next = { ...prev };
      const grupo = { ...(next[variable] ?? {}) };
      const num = parseFloat(peso);
      if (peso.trim() === "" || isNaN(num)) delete grupo[valor];
      else grupo[valor] = num;
      if (Object.keys(grupo).length === 0) delete next[variable];
      else next[variable] = grupo;
      return next;
    });
  }

  async function guardar() {
    setSaving(true);
    const supabase = createClient();
    const valor = (ponderar && !ponderacionVacia(ponderacion)) ? ponderacion : null;
    await supabase.from("surveys").update({ ponderacion: valor }).eq("id", surveyId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    onSaved(valor);
  }

  const activa = ponderar && !ponderacionVacia(ponderacion);

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900 mb-6 overflow-hidden">
      <button onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-white">Ponderación de resultados</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${activa ? "bg-amber-500/15 text-amber-300" : "bg-slate-700 text-slate-400"}`}>
            {activa ? "Activa" : "Sin ponderar"}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
          <p className="text-xs text-slate-500">
            Da más o menos peso a ciertos grupos al calcular los porcentajes. Ej: en seguridad ciudadana, una respuesta de estrato 1 puede pesar más que una de estrato 6.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setPonderar(false)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${!ponderar ? "border-amber-400 bg-amber-500/10 text-amber-200" : "border-white/10 bg-white/[0.02] hover:bg-white/5 text-slate-300"}`}>
              <p className="text-sm font-semibold">Sin ponderar</p>
              <p className="text-xs opacity-70 mt-0.5">1 persona = 1 voto</p>
            </button>
            <button onClick={() => setPonderar(true)}
              className={`rounded-xl border-2 p-3 text-left transition-all ${ponderar ? "border-amber-400 bg-amber-500/10 text-amber-200" : "border-white/10 bg-white/[0.02] hover:bg-white/5 text-slate-300"}`}>
              <p className="text-sm font-semibold">Ponderar</p>
              <p className="text-xs opacity-70 mt-0.5">Peso por grupo</p>
            </button>
          </div>

          {ponderar && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Peso de cada grupo (1.0 = normal, 2.0 = doble, 0.5 = mitad). Grupos sin peso valen 1. Si configuras varias variables, los pesos se multiplican.
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
                          <input type="number" step="0.1" min="0" inputMode="decimal"
                            value={val ?? ""} onChange={e => setPeso(v.key, String(o.value), e.target.value)}
                            placeholder="1.0"
                            className="w-14 rounded-md bg-slate-800 border border-white/10 px-2 py-1 text-xs text-white text-center outline-none focus:border-amber-500" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={guardar} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 px-5 py-2.5 text-xs font-semibold text-white transition-colors">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
              {saved ? "Guardado · recalculado" : saving ? "Guardando" : "Guardar y recalcular"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
