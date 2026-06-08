"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ArrowLeft, MapPinned, Loader2 } from "lucide-react";

const TIPOS = [
  { value: "favorability", label: "Favorabilidad", desc: "¿Cómo te percibe la ciudadanía?" },
  { value: "satisfaction", label: "Satisfacción", desc: "¿Qué tan satisfechos están con tu gestión?" },
  { value: "pulse", label: "Pulso ciudadano", desc: "Temas, problemas y narrativas del territorio" },
  { value: "custom", label: "Personalizado", desc: "Define tu propio instrumento de medición" },
];

const PROPOSITOS = [
  { value: "political", label: "Electoral", desc: "Campaña política o seguimiento de candidatura" },
  { value: "public_management", label: "Gestión pública", desc: "Gobernación, alcaldía o entidad pública" },
  { value: "private", label: "Privado / Gremio", desc: "Empresa, gremio u organización privada" },
];

export default function NuevoProyecto() {
  const router = useRouter();
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    type: "favorability",
    purpose: "political",
    start_date: "",
    end_date: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setClienteId(data.user.id);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("El nombre del proyecto es obligatorio."); return; }
    if (!clienteId) { setError("No se pudo identificar tu cuenta."); return; }

    setSaving(true); setError("");
    const newId = crypto.randomUUID();
    const res = await fetch("/api/cliente/proyectos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newId,
        client_id: clienteId,
        name: form.name.trim(),
        type: form.type,
        purpose: form.purpose,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: "active",
      }),
    });
    const json = await res.json();
    if (!res.ok || json.error) { setError(json.error ?? "Error al crear el proyecto."); setSaving(false); return; }
    router.push(`/cliente/proyectos/${newId}`);
  }

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-white">Nuevo proyecto</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Nombre */}
        <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
          <Field label="Nombre del proyecto *">
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ej: Medición territorial Barranquilla 2026" className={inputCls} />
          </Field>
        </div>

        {/* Tipo de medición */}
        <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Tipo de medición</h2>
          <div className="grid grid-cols-2 gap-3">
            {TIPOS.map(({ value, label, desc }) => (
              <button key={value} type="button" onClick={() => setForm(p => ({ ...p, type: value }))}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  form.type === value
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                }`}>
                <p className={`text-sm font-semibold mb-1 ${form.type === value ? "text-violet-300" : "text-white"}`}>{label}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Propósito */}
        <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Propósito</h2>
          <div className="space-y-2">
            {PROPOSITOS.map(({ value, label, desc }) => (
              <label key={value}
                className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all ${
                  form.purpose === value
                    ? "border-violet-500 bg-violet-500/10"
                    : "border-white/10 bg-white/[0.02] hover:bg-white/5"
                }`}>
                <input type="radio" name="purpose" value={value}
                  checked={form.purpose === value}
                  onChange={() => setForm(p => ({ ...p, purpose: value }))}
                  className="mt-0.5 accent-violet-500 shrink-0" />
                <div>
                  <p className={`text-sm font-semibold ${form.purpose === value ? "text-violet-300" : "text-white"}`}>{label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Fechas */}
        <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
          <h2 className="text-sm font-semibold text-white mb-4">Período (opcional)</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fecha de inicio">
              <input type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))}
                className={inputCls} />
            </Field>
            <Field label="Fecha de cierre estimada">
              <input type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))}
                className={inputCls} />
            </Field>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => router.back()}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 py-3 text-sm font-semibold text-white transition-colors">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Creando..." : "Crear proyecto →"}
          </button>
        </div>
      </form>
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
