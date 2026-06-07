"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Shield, Save, Loader2, CheckCircle, SlidersHorizontal } from "lucide-react";

type IdentityConfig = { enabled: boolean; required_for: string[] };

/** Panel unificado de todos los toggles globales de la plataforma. */
export function AdminConfigToggles() {
  const [identity, setIdentity] = useState<IdentityConfig>({ enabled: true, required_for: ["panelista", "encuestador"] });
  const [fieldIdentity, setFieldIdentity] = useState({ enabled: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("platform_config").select("key, value")
      .in("key", ["identity_verification", "field_identity_verification"]);
    (data ?? []).forEach(row => {
      if (row.key === "identity_verification" && row.value) setIdentity(row.value as IdentityConfig);
      if (row.key === "field_identity_verification" && row.value) setFieldIdentity(row.value as { enabled: boolean });
    });
    setLoading(false);
  }

  async function guardar() {
    setSaving(true);
    const supabase = createClient();
    await supabase.from("platform_config").upsert([
      { key: "identity_verification", value: identity, updated_at: new Date().toISOString() },
      { key: "field_identity_verification", value: fieldIdentity, updated_at: new Date().toISOString() },
    ], { onConflict: "key" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function togglePerfil(perfil: string) {
    setIdentity(prev => ({
      ...prev,
      required_for: prev.required_for.includes(perfil)
        ? prev.required_for.filter(p => p !== perfil)
        : [...prev.required_for, perfil],
    }));
  }

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-blue-400" />
          <h2 className="text-sm font-semibold text-white">Configuración de la plataforma</h2>
        </div>
        <button onClick={guardar} disabled={saving || loading}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-xs font-semibold text-white transition-colors shrink-0">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
          {saved ? "Guardado" : saving ? "Guardando" : "Guardar"}
        </button>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-white/5" />
      ) : (
        <div className="space-y-3">
          {/* Toggle: verificación de identidad (panelista/encuestador) */}
          <ToggleRow
            icon={<Shield className="h-4 w-4 text-blue-400" />}
            title="Verificación de identidad (KYC)"
            desc={identity.enabled ? "Los usuarios verifican su identidad antes de acceder" : "Acceso sin verificación de identidad"}
            on={identity.enabled}
            onToggle={() => setIdentity(prev => ({ ...prev, enabled: !prev.enabled }))}
            color="blue"
          />
          {identity.enabled && (
            <div className="flex flex-wrap gap-2 pl-1">
              <span className="text-xs text-slate-500 self-center mr-1">Requerida para:</span>
              {[{ value: "panelista", label: "Panelistas" }, { value: "encuestador", label: "Encuestadores" }].map(({ value, label }) => {
                const activo = identity.required_for.includes(value);
                return (
                  <button key={value} type="button" onClick={() => togglePerfil(value)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                      activo ? "border-blue-500/50 bg-blue-500/15 text-blue-200" : "border-white/10 bg-white/[0.02] text-slate-400"
                    }`}>
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Toggle: identidad en encuestas de calle */}
          <ToggleRow
            icon={<Shield className="h-4 w-4 text-emerald-400" />}
            title="Identidad en encuestas de calle (global)"
            desc={fieldIdentity.enabled ? "Default: las encuestas de calle piden identidad (cada cliente puede sobrescribir por proyecto)" : "Default: las encuestas de calle NO piden identidad (cada cliente puede sobrescribir por proyecto)"}
            on={fieldIdentity.enabled}
            onToggle={() => setFieldIdentity(prev => ({ enabled: !prev.enabled }))}
            color="emerald"
          />
        </div>
      )}
    </div>
  );
}

function ToggleRow({ icon, title, desc, on, onToggle, color }: {
  icon: React.ReactNode; title: string; desc: string; on: boolean; onToggle: () => void; color: "blue" | "emerald";
}) {
  const onBg = color === "blue" ? "bg-blue-600" : "bg-emerald-600";
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-white/5 px-4 py-3">
      <div className="flex items-start gap-3 min-w-0">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
        </div>
      </div>
      <button onClick={onToggle}
        className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${on ? onBg : "bg-slate-600"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
