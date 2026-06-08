"use client";

import { useEffect, useState } from "react";
import { Users, Save, Loader2, CheckCircle, ToggleLeft, ToggleRight } from "lucide-react";

type QuotaVar = { enabled: boolean; max?: number; cupos?: Record<string, number> };
type PanelQuotas = {
  total: { enabled: boolean; max: number };
  gender: QuotaVar & { cupos: Record<string, number> };
  estrato: QuotaVar & { cupos: Record<string, number> };
  sisben_grupo: QuotaVar & { cupos: Record<string, number> };
  actividades: QuotaVar & { cupos: Record<string, number> };
};

const DEFAULT_QUOTAS: PanelQuotas = {
  total: { enabled: false, max: 500 },
  gender: { enabled: false, cupos: { male: 200, female: 200, other: 100 } },
  estrato: { enabled: false, cupos: { "1": 100, "2": 150, "3": 150, "4": 60, "5": 25, "6": 15 } },
  sisben_grupo: { enabled: false, cupos: { no: 100, A: 100, B: 100, C: 100, D: 100 } },
  actividades: { enabled: false, cupos: { empleado: 150, independiente: 100, desempleado: 60, estudiante: 80, ama_de_casa: 50, pensionado: 30, empresario: 20, otro: 10 } },
};

const GENDER_LABELS: Record<string, string> = { male: "Hombre", female: "Mujer", other: "Otro" };
const ACTIVIDAD_LABELS: Record<string, string> = {
  empleado: "Empleado", independiente: "Independiente", desempleado: "Desempleado",
  estudiante: "Estudiante", ama_de_casa: "Ama de casa", pensionado: "Pensionado",
  empresario: "Empresario/a", otro: "Otro",
};
const SISBEN_LABELS: Record<string, string> = { no: "Sin SISBEN", A: "Grupo A", B: "Grupo B", C: "Grupo C", D: "Grupo D" };

export function PanelQuotasEditor() {
  const [quotas, setQuotas] = useState<PanelQuotas>(DEFAULT_QUOTAS);
  const [counts, setCounts] = useState<{ total: number; gender: Record<string, number>; estrato: Record<string, number>; sisben_grupo: Record<string, number>; actividades: Record<string, number> } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [cfgRes, countRes] = await Promise.all([
      fetch("/api/admin/config?key=panel_quotas"),
      fetch("/api/cuotas"),
    ]);
    const cfg = await cfgRes.json();
    const countData = await countRes.json();
    if (cfg.value) setQuotas({ ...DEFAULT_QUOTAS, ...cfg.value });
    if (countData.counts) setCounts(countData.counts);
    setLoading(false);
  }

  async function guardar() {
    setSaving(true);
    await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "panel_quotas", value: quotas }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function toggleSection(key: keyof PanelQuotas) {
    setQuotas(prev => ({ ...prev, [key]: { ...prev[key], enabled: !prev[key].enabled } }));
  }

  function setMax(key: keyof PanelQuotas, val: number) {
    setQuotas(prev => ({ ...prev, [key]: { ...(prev[key] as object), max: val } }));
  }

  function setCupo(section: keyof PanelQuotas, sub: string, val: number) {
    setQuotas(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] as object),
        cupos: { ...(prev[section] as QuotaVar).cupos, [sub]: val },
      },
    }));
  }

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-white/5" />;

  const totalActual = counts?.total ?? 0;

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-purple-400" />
          <h2 className="text-sm font-semibold text-white">Cuotas del panel</h2>
          <span className="text-xs text-slate-500">— {totalActual} panelistas registrados</span>
        </div>
        <button onClick={guardar} disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-colors shrink-0">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? "Guardado" : saving ? "Guardando" : "Guardar"}
        </button>
      </div>

      {/* Total */}
      <Section
        enabled={quotas.total.enabled}
        onToggle={() => toggleSection("total")}
        title="Total de panelistas"
        desc="Cupo máximo de personas registradas en el panel"
        actual={totalActual}
      >
        <NumInput label="Cupo máximo" value={quotas.total.max} onChange={v => setMax("total", v)} />
      </Section>

      {/* Género */}
      <Section
        enabled={quotas.gender.enabled}
        onToggle={() => toggleSection("gender")}
        title="Por género"
        desc="Cupos independientes por género"
        actual={null}
      >
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(quotas.gender.cupos).map(([k, v]) => (
            <NumInput key={k} label={GENDER_LABELS[k] ?? k} value={v} actual={counts?.gender[k]}
              onChange={val => setCupo("gender", k, val)} />
          ))}
        </div>
      </Section>

      {/* Estrato */}
      <Section
        enabled={quotas.estrato.enabled}
        onToggle={() => toggleSection("estrato")}
        title="Por estrato socioeconómico"
        desc="Cupos por cada estrato (1-6)"
        actual={null}
      >
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(quotas.estrato.cupos).map(([k, v]) => (
            <NumInput key={k} label={`Estrato ${k}`} value={v} actual={counts?.estrato[k]}
              onChange={val => setCupo("estrato", k, val)} />
          ))}
        </div>
      </Section>

      {/* SISBEN */}
      <Section
        enabled={quotas.sisben_grupo.enabled}
        onToggle={() => toggleSection("sisben_grupo")}
        title="Por grupo SISBEN"
        desc="Cupos por grupo del SISBEN"
        actual={null}
      >
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(quotas.sisben_grupo.cupos).map(([k, v]) => (
            <NumInput key={k} label={SISBEN_LABELS[k] ?? k} value={v} actual={counts?.sisben_grupo[k]}
              onChange={val => setCupo("sisben_grupo", k, val)} />
          ))}
        </div>
      </Section>

      {/* Actividades */}
      <Section
        enabled={quotas.actividades.enabled}
        onToggle={() => toggleSection("actividades")}
        title="Por actividad principal"
        desc="Cupos por ocupación"
        actual={null}
      >
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(quotas.actividades.cupos).map(([k, v]) => (
            <NumInput key={k} label={ACTIVIDAD_LABELS[k] ?? k} value={v} actual={counts?.actividades[k]}
              onChange={val => setCupo("actividades", k, val)} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({ enabled, onToggle, title, desc, children, actual }: {
  enabled: boolean; onToggle: () => void; title: string; desc: string;
  children: React.ReactNode; actual: number | null;
}) {
  return (
    <div className={`rounded-xl border transition-colors ${enabled ? "border-purple-500/30 bg-purple-500/5" : "border-white/5 bg-white/[0.02]"}`}>
      <div className="flex items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white">{title}</p>
            {actual !== null && <span className="text-xs text-slate-500">({actual} actuales)</span>}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
        </div>
        <button onClick={onToggle} className="shrink-0 text-purple-400 hover:text-purple-300 transition-colors">
          {enabled ? <ToggleRight className="h-7 w-7" /> : <ToggleLeft className="h-7 w-7 text-slate-500" />}
        </button>
      </div>
      {enabled && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function NumInput({ label, value, onChange, actual }: {
  label: string; value: number; onChange: (v: number) => void; actual?: number;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">
        {label}{actual !== undefined ? <span className="text-slate-600 ml-1">({actual ?? 0})</span> : null}
      </label>
      <input
        type="number" min={0} value={value}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="w-full rounded-lg bg-slate-800 border border-white/10 px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500 transition-colors"
      />
    </div>
  );
}
