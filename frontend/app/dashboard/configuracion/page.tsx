"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Settings, Shield, Save, Loader2, CheckCircle } from "lucide-react";

type IdentityConfig = {
  enabled: boolean;
  required_for: string[];
};

export default function ConfiguracionPage() {
  const [identity, setIdentity] = useState<IdentityConfig>({
    enabled: true,
    required_for: ["panelista", "encuestador"],
  });
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
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Parámetros globales de la plataforma</p>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-2xl bg-slate-900" />
      ) : (
        <div className="space-y-5">

          {/* Verificación de identidad */}
          <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Verificación de identidad</h2>
                <p className="text-xs text-slate-500">Controla si los usuarios deben verificar su identidad para acceder</p>
              </div>
            </div>

            {/* Toggle principal */}
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-5 py-4 mb-4">
              <div>
                <p className="text-sm font-medium text-white">
                  {identity.enabled ? "Verificación activa" : "Verificación desactivada"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {identity.enabled
                    ? "Los usuarios deben verificar su identidad antes de acceder"
                    : "Los usuarios acceden sin verificación de identidad"}
                </p>
              </div>
              <button
                onClick={() => setIdentity(prev => ({ ...prev, enabled: !prev.enabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${identity.enabled ? "bg-blue-600" : "bg-slate-600"}`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${identity.enabled ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>

            {/* Perfiles que requieren verificación */}
            {identity.enabled && (
              <div>
                <p className="text-xs text-slate-400 font-medium mb-3 uppercase tracking-wide">
                  Requerida para:
                </p>
                <div className="space-y-2">
                  {[
                    { value: "panelista", label: "Panelistas", desc: "Ciudadanos que responden encuestas" },
                    { value: "encuestador", label: "Encuestadores", desc: "Operadores de campo" },
                  ].map(({ value, label, desc }) => {
                    const activo = identity.required_for.includes(value);
                    return (
                      <label key={value}
                        className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 cursor-pointer transition-all ${
                          activo ? "border-blue-500/50 bg-blue-500/10" : "border-white/10 bg-white/[0.02]"
                        }`}>
                        <div>
                          <p className={`text-sm font-medium ${activo ? "text-white" : "text-slate-400"}`}>{label}</p>
                          <p className="text-xs text-slate-500">{desc}</p>
                        </div>
                        <input type="checkbox" checked={activo} onChange={() => togglePerfil(value)}
                          className="h-4 w-4 rounded accent-blue-500 shrink-0" />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {!identity.enabled && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
                <p className="text-xs text-amber-300">
                  ⚠️ Con la verificación desactivada, cualquier usuario registrado puede acceder sin confirmar su identidad.
                  Úsalo solo en entornos de prueba.
                </p>
              </div>
            )}
          </div>

          {/* Validación de identidad en encuestas de calle */}
          <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Shield className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white">Validación de identidad en encuestas de calle</h2>
                <p className="text-xs text-slate-500">Si el encuestador debe fotografiar cédula + rostro al encuestar en campo</p>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-white/5 px-5 py-4">
              <div>
                <p className="text-sm font-medium text-white">
                  {fieldIdentity.enabled ? "Validación activa (global)" : "Validación desactivada (global)"}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {fieldIdentity.enabled
                    ? "Default: las encuestas de calle piden identidad. Cada cliente puede sobrescribirlo por proyecto."
                    : "Default: las encuestas de calle NO piden identidad. Cada cliente puede sobrescribirlo por proyecto."}
                </p>
              </div>
              <button
                onClick={() => setFieldIdentity(prev => ({ enabled: !prev.enabled }))}
                className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${fieldIdentity.enabled ? "bg-emerald-600" : "bg-slate-600"}`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${fieldIdentity.enabled ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>

          {/* Botón guardar */}
          <div className="flex justify-end">
            <button onClick={guardar} disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-6 py-3 text-sm font-semibold text-white transition-colors">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saved ? "¡Guardado!" : saving ? "Guardando..." : "Guardar configuración"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
