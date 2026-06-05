"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Plus, Search, Building2, ChevronRight, MoreHorizontal } from "lucide-react";

type Cliente = {
  id: string;
  name: string;
  type: string;
  nit: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string;
  created_at: string;
};

const TYPE_LABELS: Record<string, string> = {
  political_campaign: "Campaña política",
  municipality: "Municipio / Alcaldía",
  governorship: "Gobernación",
  guild: "Gremio empresarial",
  private: "Empresa privada",
  ngo: "ONG / Fundación",
  other: "Otro",
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", type: "political_campaign", contact_name: "", contact_email: "", contact_phone: "", nit: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase.from("clients").select("*").order("created_at", { ascending: false });
    setClientes(data ?? []);
    setLoading(false);
  }

  async function crear() {
    if (!form.name || !form.type) { setError("Nombre y tipo son obligatorios."); return; }
    setSaving(true); setError("");
    const supabase = createClient();
    const { error: e } = await supabase.from("clients").insert({
      id: crypto.randomUUID(),
      name: form.name, type: form.type,
      contact_name: form.contact_name || null,
      contact_email: form.contact_email || null,
      contact_phone: form.contact_phone || null,
      nit: form.nit || null,
      status: "active",
    });
    if (e) { setError(e.message); setSaving(false); return; }
    setShowForm(false);
    setForm({ name: "", type: "political_campaign", contact_name: "", contact_email: "", contact_phone: "", nit: "" });
    await load();
    setSaving(false);
  }

  async function setStatus(id: string, status: string) {
    const supabase = createClient();
    await supabase.from("clients").update({ status }).eq("id", id);
    // Enviar email de activación al cliente
    if (status === "active") {
      try {
        await fetch("/api/email/cliente-activado", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clienteId: id }),
        });
      } catch (e) {
        console.error("[setStatus] Error enviando email de activación:", e);
      }
    }
    await load();
  }

  const pendientes = clientes.filter(c => c.status === "pending").length;

  const filtrados = clientes.filter(c =>
    c.name.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.contact_email?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="text-slate-400 text-sm mt-1">
            {clientes.length} registrados
            {pendientes > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/20 text-amber-400 text-xs font-semibold px-2 py-0.5">
                {pendientes} pendiente{pendientes > 1 ? "s" : ""} de activar
              </span>
            )}
          </p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors">
          <Plus className="h-4 w-4" /> Nuevo cliente
        </button>
      </div>

      {/* Modal nuevo cliente */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">Nuevo cliente</h2>
            <div className="space-y-4">
              <Field label="Nombre de la organización *">
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Alcaldía de Barranquilla" className={inputCls} />
              </Field>
              <Field label="Tipo *">
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className={inputCls}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="NIT">
                  <input value={form.nit} onChange={e => setForm(p => ({ ...p, nit: e.target.value }))}
                    placeholder="900.000.000-0" className={inputCls} />
                </Field>
                <Field label="Contacto">
                  <input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
                    placeholder="Nombre del responsable" className={inputCls} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Email">
                  <input type="email" value={form.contact_email} onChange={e => setForm(p => ({ ...p, contact_email: e.target.value }))}
                    placeholder="correo@org.co" className={inputCls} />
                </Field>
                <Field label="Teléfono">
                  <input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))}
                    placeholder="300 000 0000" className={inputCls} />
                </Field>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowForm(false); setError(""); }}
                  className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button onClick={crear} disabled={saving}
                  className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 text-sm font-semibold text-white transition-colors">
                  {saving ? "Guardando..." : "Crear cliente"}
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
          placeholder="Buscar por nombre o email..."
          className="w-full rounded-xl bg-slate-900 border border-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" />
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3].map(n => <div key={n} className="h-14 animate-pulse rounded-xl bg-white/5" />)}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay clientes{busqueda ? " con ese criterio" : " aún"}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Organización</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtrados.map(c => (
                <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.nit ?? "Sin NIT"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-xs text-slate-400">{TYPE_LABELS[c.type] ?? c.type}</span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-xs text-slate-300">{c.contact_name ?? "—"}</p>
                    <p className="text-xs text-slate-500">{c.contact_email ?? ""}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      c.status === "active"  ? "bg-emerald-500/20 text-emerald-400" :
                      c.status === "pending" ? "bg-amber-500/20 text-amber-400" :
                                               "bg-slate-700 text-slate-400"
                    }`}>
                      {c.status === "active" ? "Activo" : c.status === "pending" ? "Pendiente" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {c.status === "pending" ? (
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => setStatus(c.id, "active")}
                          className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors">
                          Activar
                        </button>
                        <button onClick={() => setStatus(c.id, "inactive")}
                          className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white transition-colors">
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setStatus(c.id, c.status === "active" ? "inactive" : "active")}
                        className="text-xs text-slate-500 hover:text-white transition-colors">
                        {c.status === "active" ? "Desactivar" : "Activar"}
                      </button>
                    )}
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
