"use client";

import { useEffect, useState } from "react";
import { MapPin, Plus, Search, CheckCircle, XCircle, Clock, Shield, Settings } from "lucide-react";

type Encuestador = {
  id: string;
  name: string;
  document: string;
  phone: string | null;
  email: string | null;
  role: string;
  status: string;
  created_at: string;
  recruiter_code: string | null;
  reclutados: number;
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
  const [tab, setTab] = useState<"pendientes" | "activos">("pendientes");
  const [showForm, setShowForm] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [form, setForm] = useState({ name: "", document: "", phone: "", role: "encuestador" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Config max encuestadores
  const [maxEnc, setMaxEnc] = useState<number>(50);
  const [requireApproval, setRequireApproval] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);

  useEffect(() => { load(); loadConfig(); }, []);

  async function load() {
    const res = await fetch("/api/admin/encuestadores");
    const data = await res.json();
    setEncuestadores(data ?? []);
    setLoading(false);
    // Cambiar a "activos" si no hay pendientes
    if ((data ?? []).filter((e: Encuestador) => e.status === "pending").length === 0) {
      setTab("activos");
    }
  }

  async function loadConfig() {
    const res = await fetch("/api/admin/config?key=encuestadores_config");
    if (res.ok) {
      const { value } = await res.json();
      if (value) { setMaxEnc(value.max ?? 50); setRequireApproval(value.require_approval ?? true); }
    }
  }

  async function saveConfig() {
    setSavingConfig(true);
    await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "encuestadores_config", value: { max: maxEnc, require_approval: requireApproval } }),
    });
    setSavingConfig(false);
    setShowConfig(false);
  }

  async function crear() {
    if (!form.name || !form.document) { setError("Nombre y documento son obligatorios."); return; }
    setSaving(true); setError("");
    const letras = ((form.name.replace(/[^A-Za-z]/g, "").toUpperCase()) + "GD").slice(0, 2);
    const code = `${letras}-${Math.floor(1000 + Math.random() * 9000)}`;
    const res = await fetch("/api/admin/encuestadores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: crypto.randomUUID(), name: form.name, document: form.document, phone: form.phone || null, role: form.role, status: "active", recruiter_code: code }),
    });
    const json = await res.json();
    if (json.error) { setError(json.error); setSaving(false); return; }
    setShowForm(false);
    setForm({ name: "", document: "", phone: "", role: "encuestador" });
    await load();
    setSaving(false);
  }

  async function aprobar(id: string) {
    const op = encuestadores.find(e => e.id === id);
    await fetch("/api/admin/encuestadores", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "active", email: op?.email, name: op?.name }) });
    await load();
  }

  async function rechazar(id: string) {
    await fetch("/api/admin/encuestadores", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: "inactive" }) });
    await load();
  }

  async function toggleStatus(id: string, current: string) {
    const next = current === "active" ? "inactive" : "active";
    await fetch("/api/admin/encuestadores", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status: next }) });
    await load();
  }

  const pendientes = encuestadores.filter(e => e.status === "pending");
  const activos = encuestadores.filter(e => e.status !== "pending");

  const lista = (tab === "pendientes" ? pendientes : activos).filter(e =>
    e.name.toLowerCase().includes(busqueda.toLowerCase()) || e.document.includes(busqueda)
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Encuestadores</h1>
          <p className="text-slate-400 text-sm mt-1">
            {encuestadores.filter(e => e.status === "active").length} activos
            {pendientes.length > 0 && <span className="ml-2 text-amber-400 font-semibold">· {pendientes.length} pendiente{pendientes.length > 1 ? "s" : ""}</span>}
            {" "}· máx. {maxEnc}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowConfig(true)}
            className="flex items-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 px-3.5 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">
            <Settings className="h-4 w-4" /> Configurar
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors">
            <Plus className="h-4 w-4" /> Nuevo
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 rounded-xl p-1 mb-6 w-fit">
        <button onClick={() => setTab("pendientes")}
          className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "pendientes" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>
          <Clock className="h-3.5 w-3.5" /> Pendientes
          {pendientes.length > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center">
              {pendientes.length}
            </span>
          )}
        </button>
        <button onClick={() => setTab("activos")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "activos" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"}`}>
          <Shield className="h-3.5 w-3.5" /> Activos / Inactivos
        </button>
      </div>

      {/* Modal Config */}
      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">Configuración de encuestadores</h2>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Máximo de encuestadores permitidos</label>
                <input type="number" min={1} value={maxEnc} onChange={e => setMaxEnc(parseInt(e.target.value) || 1)}
                  className={inputCls} />
                <p className="text-xs text-slate-500 mt-1">Actualmente hay {encuestadores.filter(e => e.status === "active").length} activos.</p>
              </div>
              <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 cursor-pointer">
                <div>
                  <p className="text-sm text-white font-medium">Requerir aprobación</p>
                  <p className="text-xs text-slate-500 mt-0.5">Los nuevos encuestadores quedan pendientes hasta que el admin apruebe</p>
                </div>
                <button type="button" onClick={() => setRequireApproval(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ml-4 ${requireApproval ? "bg-blue-600" : "bg-slate-600"}`}>
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${requireApproval ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </label>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowConfig(false)}
                className="flex-1 rounded-xl border border-white/10 py-2.5 text-sm text-slate-400 hover:text-white transition-colors">
                Cancelar
              </button>
              <button onClick={saveConfig} disabled={savingConfig}
                className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-2.5 text-sm font-semibold text-white transition-colors">
                {savingConfig ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nuevo */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-white mb-5">Nuevo encuestador</h2>
            <div className="space-y-4">
              <Field label="Nombre completo *">
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Como aparece en la cédula" className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Documento *">
                  <input value={form.document} onChange={e => setForm(p => ({ ...p, document: e.target.value }))} placeholder="Cédula" className={inputCls} />
                </Field>
                <Field label="Celular">
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="3001234567" className={inputCls} />
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
        ) : lista.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">
              {tab === "pendientes" ? "No hay encuestadores pendientes de aprobación" : "No hay encuestadores"}
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Encuestador</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Documento</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Código</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reclutados</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {lista.map(e => (
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
                  <td className="px-5 py-4">
                    {e.recruiter_code
                      ? <span className="font-mono text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded">{e.recruiter_code}</span>
                      : <span className="text-xs text-slate-600">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-bold text-white">{e.reclutados}</span>
                    <span className="text-xs text-slate-500"> panelista{e.reclutados === 1 ? "" : "s"}</span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      e.status === "active" ? "bg-emerald-500/20 text-emerald-400"
                      : e.status === "pending" ? "bg-amber-500/20 text-amber-400"
                      : "bg-slate-700 text-slate-400"
                    }`}>
                      {e.status === "active" ? "Activo" : e.status === "pending" ? "Pendiente" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {e.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => aprobar(e.id)}
                          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-semibold">
                          <CheckCircle className="h-3.5 w-3.5" /> Aprobar
                        </button>
                        <span className="text-slate-600">·</span>
                        <button onClick={() => rechazar(e.id)}
                          className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors">
                          <XCircle className="h-3.5 w-3.5" /> Rechazar
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => toggleStatus(e.id, e.status)}
                        className="text-xs text-slate-400 hover:text-white transition-colors">
                        {e.status === "active" ? "Desactivar" : "Activar"}
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
