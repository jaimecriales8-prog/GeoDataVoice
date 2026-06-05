"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { MapPin, Plus, Search, CheckCircle, XCircle } from "lucide-react";

type Encuestador = {
  id: string;
  name: string;
  document: string;
  phone: string | null;
  role: string;
  status: string;
  created_at: string;
};

const ROLES: Record<string, string> = {
  encuestador: "Encuestador",
  supervisor: "Supervisor",
  coordinator: "Coordinador",
};

export default function EncuestadoresPage() {
  const [encuestadores, setEncuestadores] = useState<Encuestador[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", document: "", phone: "", role: "encuestador" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("field_operators")
      .select("*")
      .order("created_at", { ascending: false });
    setEncuestadores(data ?? []);
    setLoading(false);
  }

  async function crear() {
    if (!form.name || !form.document) { setError("Nombre y documento son obligatorios."); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    const { error: e } = await supabase.from("field_operators").insert({
      id: crypto.randomUUID(),
      name: form.name,
      document: form.document,
      phone: form.phone || null,
      role: form.role,
      status: "active",
    });
    if (e) { setError(e.message); setSaving(false); return; }
    setShowForm(false);
    setForm({ name: "", document: "", phone: "", role: "encuestador" });
    await load();
    setSaving(false);
  }

  async function toggleStatus(id: string, current: string) {
    const supabase = createClient();
    await supabase.from("field_operators").update({ status: current === "active" ? "inactive" : "active" }).eq("id", id);
    await load();
  }

  const filtrados = encuestadores.filter(e =>
    e.name.toLowerCase().includes(busqueda.toLowerCase()) ||
    e.document.includes(busqueda)
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Encuestadores</h1>
          <p className="text-slate-400 text-sm mt-1">{encuestadores.filter(e => e.status === "active").length} activos</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors">
          <Plus className="h-4 w-4" /> Nuevo encuestador
        </button>
      </div>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">Nuevo encuestador</h2>
            <div className="space-y-4">
              <Field label="Nombre completo *">
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Como aparece en la cédula" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Número de documento *">
                  <input value={form.document} onChange={e => setForm(p => ({ ...p, document: e.target.value }))}
                    placeholder="Cédula" className={inputCls} />
                </Field>
                <Field label="Celular">
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="3001234567" className={inputCls} />
                </Field>
              </div>
              <Field label="Rol">
                <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} className={inputCls}>
                  {Object.entries(ROLES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setError(""); }}
                  className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button onClick={crear} disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 text-sm font-semibold text-white transition-colors">
                  {saving ? "Guardando..." : "Crear"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Búsqueda */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o documento..."
          className="w-full rounded-xl bg-slate-900 border border-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
      </div>

      <div className="rounded-2xl border border-white/5 bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[1,2,3].map(n => <div key={n} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay encuestadores{busqueda ? " con ese criterio" : " aún"}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Encuestador</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Documento</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rol</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtrados.map(e => (
                <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-blue-500/20 flex items-center justify-center text-sm font-bold text-blue-400 shrink-0">
                        {e.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{e.name}</p>
                        <p className="text-xs text-slate-500">{e.phone ?? "Sin teléfono"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-400">{e.document}</td>
                  <td className="px-5 py-4 text-xs text-slate-400">{ROLES[e.role] ?? e.role}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      e.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
                    }`}>
                      {e.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => toggleStatus(e.id, e.status)}
                      className="text-xs text-slate-400 hover:text-white transition-colors">
                      {e.status === "active" ? "Desactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl bg-slate-800 border border-white/10 px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
