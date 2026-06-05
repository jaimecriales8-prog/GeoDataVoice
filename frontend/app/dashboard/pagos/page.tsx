"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Wallet, Save, Info, ChevronDown, ChevronUp } from "lucide-react";

type TarifaGlobal = {
  id?: string;
  encuesta_cop: number;
  audio_cop: number;
  encuesta_campo_cop: number;
  activo: boolean;
};

type TarifaCliente = {
  client_id: string;
  client_name: string;
  encuesta_cop: number | null;
  audio_cop: number | null;
  encuesta_campo_cop: number | null;
};

export default function PagosPage() {
  const [global, setGlobal] = useState<TarifaGlobal>({ encuesta_cop: 3000, audio_cop: 2000, encuesta_campo_cop: 3000, activo: true });
  const [clientes, setClientes] = useState<TarifaCliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [clienteTarifas, setClienteTarifas] = useState<Record<string, { encuesta_cop: string; audio_cop: string; encuesta_campo_cop: string }>>({});

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();

    // Tarifa global
    const { data: gData } = await supabase
      .from("payment_config")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (gData) setGlobal(gData);

    // Clientes con sus tarifas personalizadas
    const { data: cData } = await supabase
      .from("clients")
      .select("id, name")
      .eq("status", "active")
      .order("name");

    const { data: tarifas } = await supabase
      .from("client_payment_config")
      .select("*");

    const tarifasMap: Record<string, Record<string, number | null>> = {};
    (tarifas ?? []).forEach(t => { tarifasMap[t.client_id] = t; });

    setClientes((cData ?? []).map(c => ({
      client_id: c.id,
      client_name: c.name,
      encuesta_cop: tarifasMap[c.id]?.encuesta_cop ?? null,
      audio_cop: tarifasMap[c.id]?.audio_cop ?? null,
      encuesta_campo_cop: tarifasMap[c.id]?.encuesta_campo_cop ?? null,
    })));

    // Inicializar form con valores actuales
    const init: typeof clienteTarifas = {};
    (cData ?? []).forEach(c => {
      init[c.id] = {
        encuesta_cop: (tarifasMap[c.id]?.encuesta_cop ?? "").toString(),
        audio_cop: (tarifasMap[c.id]?.audio_cop ?? "").toString(),
        encuesta_campo_cop: (tarifasMap[c.id]?.encuesta_campo_cop ?? "").toString(),
      };
    });
    setClienteTarifas(init);
    setLoading(false);
  }

  async function guardarGlobal() {
    setSaving(true);
    const supabase = createClient();
    if (global.id) {
      await supabase.from("payment_config").update({
        encuesta_cop: global.encuesta_cop,
        audio_cop: global.audio_cop,
        encuesta_campo_cop: global.encuesta_campo_cop,
        activo: global.activo,
      }).eq("id", global.id);
    } else {
      await supabase.from("payment_config").insert({
        encuesta_cop: global.encuesta_cop,
        audio_cop: global.audio_cop,
        encuesta_campo_cop: global.encuesta_campo_cop,
        activo: global.activo,
      });
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function guardarCliente(clientId: string) {
    const t = clienteTarifas[clientId];
    if (!t) return;
    const supabase = createClient();
    const vals = {
      client_id: clientId,
      encuesta_cop: t.encuesta_cop ? parseInt(t.encuesta_cop) : null,
      audio_cop: t.audio_cop ? parseInt(t.audio_cop) : null,
      encuesta_campo_cop: t.encuesta_campo_cop ? parseInt(t.encuesta_campo_cop) : null,
    };
    await supabase.from("client_payment_config").upsert(vals, { onConflict: "client_id" });
    await load();
    setExpanded(null);
  }

  function updateClienteTarifa(clientId: string, field: string, value: string) {
    setClienteTarifas(prev => ({
      ...prev,
      [clientId]: { ...prev[clientId], [field]: value },
    }));
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Pagos y tarifas</h1>
        <p className="text-slate-400 text-sm mt-1">
          Define cuánto recibe cada panelista por respuesta. Las tarifas por cliente sobreescriben la global.
        </p>
      </div>

      {/* Tarifa global */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Wallet className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Tarifa global</h2>
            <p className="text-xs text-slate-500">Se aplica a todos los proyectos salvo que el cliente tenga tarifa propia</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
          {[
            { key: "encuesta_cop", label: "Encuesta web", desc: "Panelista responde desde la web" },
            { key: "audio_cop", label: "Nota de voz", desc: "Por cada audio procesado" },
            { key: "encuesta_campo_cop", label: "Encuesta en campo", desc: "Encuestador con panelista" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="rounded-xl bg-slate-800 p-4">
              <label className="block text-xs font-medium text-slate-400 mb-0.5">{label}</label>
              <p className="text-xs text-slate-600 mb-3">{desc}</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 shrink-0">$ COP</span>
                <input
                  type="number"
                  value={global[key as keyof TarifaGlobal] as number}
                  onChange={e => setGlobal(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                  className="flex-1 bg-transparent text-white text-lg font-bold focus:outline-none"
                  min={0}
                  step={500}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 cursor-pointer">
            <div
              onClick={() => setGlobal(p => ({ ...p, activo: !p.activo }))}
              className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${global.activo ? "bg-blue-600" : "bg-slate-700"}`}>
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${global.activo ? "translate-x-5" : "translate-x-0.5"}`} />
            </div>
            <span className="text-sm text-slate-300">{global.activo ? "Pagos activos" : "Pagos desactivados"}</span>
          </label>

          <button onClick={guardarGlobal} disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-5 py-2.5 text-sm font-semibold text-white transition-colors">
            <Save className="h-4 w-4" />
            {saved ? "¡Guardado!" : saving ? "Guardando..." : "Guardar tarifas"}
          </button>
        </div>
      </div>

      {/* Tarifas por cliente */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center gap-2">
          <Info className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-white">Tarifas por cliente</h2>
          <span className="text-xs text-slate-500 ml-1">— vacío usa la tarifa global</span>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(n => <div key={n} className="h-12 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : clientes.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No hay clientes activos</div>
        ) : (
          <div className="divide-y divide-white/5">
            {clientes.map(c => (
              <div key={c.client_id}>
                <button
                  onClick={() => setExpanded(expanded === c.client_id ? null : c.client_id)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors text-left">
                  <div>
                    <p className="text-sm font-medium text-white">{c.client_name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {c.encuesta_cop
                        ? `$${c.encuesta_cop.toLocaleString()} encuesta · $${c.audio_cop?.toLocaleString() ?? "—"} audio · $${c.encuesta_campo_cop?.toLocaleString() ?? "—"} campo`
                        : "Usando tarifa global"}
                    </p>
                  </div>
                  {expanded === c.client_id ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                </button>

                {expanded === c.client_id && (
                  <div className="px-6 pb-5 bg-white/[0.02]">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {[
                        { key: "encuesta_cop", label: "Encuesta web (COP)" },
                        { key: "audio_cop", label: "Nota de voz (COP)" },
                        { key: "encuesta_campo_cop", label: "Campo (COP)" },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
                          <input
                            type="number"
                            value={clienteTarifas[c.client_id]?.[key as keyof typeof clienteTarifas[string]] ?? ""}
                            onChange={e => updateClienteTarifa(c.client_id, key, e.target.value)}
                            placeholder={`Global: $${global[key as keyof TarifaGlobal]}`}
                            className="w-full rounded-xl bg-slate-800 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                            min={0} step={500}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setExpanded(null)}
                        className="rounded-xl border border-white/10 px-4 py-2 text-xs text-slate-400 hover:text-white transition-colors">
                        Cancelar
                      </button>
                      <button onClick={() => guardarCliente(c.client_id)}
                        className="rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-semibold text-white transition-colors">
                        Guardar para este cliente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
