"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Mic, Search, CheckCircle, Clock, XCircle, Filter } from "lucide-react";

type Panelista = {
  id: string;
  name: string;
  gender: string | null;
  birth_year: number | null;
  status: string;
  kyc_status: string;
  phone_verified: boolean;
  created_at: string;
};

const STATUS_CONF: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  verified:      { label: "Verificado",    color: "bg-emerald-500/20 text-emerald-400", icon: CheckCircle },
  preregistered: { label: "Pre-registrado", color: "bg-amber-500/20 text-amber-400",    icon: Clock },
  suspended:     { label: "Suspendido",    color: "bg-red-500/20 text-red-400",         icon: XCircle },
};

const KYC_CONF: Record<string, { label: string; color: string }> = {
  approved: { label: "Aprobado", color: "text-emerald-400" },
  pending:  { label: "Pendiente", color: "text-amber-400" },
  rejected: { label: "Rechazado", color: "text-red-400" },
};

function PanelistasContent() {
  const searchParams = useSearchParams();
  const estadoInicial = searchParams.get("estado") ?? "all";

  const [panelistas, setPanelistas] = useState<Panelista[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(estadoInicial);

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("participants")
      .select("id, name, gender, birth_year, status, kyc_status, phone_verified, created_at")
      .order("created_at", { ascending: false });
    setPanelistas(data ?? []);
    setLoading(false);
  }

  async function cambiarEstado(id: string, nuevoEstado: string) {
    const supabase = createClient();
    await supabase.from("participants").update({ status: nuevoEstado }).eq("id", id);
    await load();
  }

  const filtrados = panelistas.filter(p => {
    const matchBusqueda = p.name.toLowerCase().includes(busqueda.toLowerCase());
    const matchEstado = filtroEstado === "all" || p.status === filtroEstado || p.kyc_status === filtroEstado;
    return matchBusqueda && matchEstado;
  });

  const counts = {
    all: panelistas.length,
    verified: panelistas.filter(p => p.status === "verified").length,
    preregistered: panelistas.filter(p => p.status === "preregistered").length,
    suspended: panelistas.filter(p => p.status === "suspended").length,
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Panelistas</h1>
        <p className="text-slate-400 text-sm mt-1">{panelistas.length} panelistas registrados</p>
      </div>

      {/* Filtros rápidos */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: "all", label: `Todos (${counts.all})` },
          { key: "verified", label: `Verificados (${counts.verified})` },
          { key: "preregistered", label: `Pendientes (${counts.preregistered})` },
          { key: "suspended", label: `Suspendidos (${counts.suspended})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFiltroEstado(key)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filtroEstado === key
                ? "bg-blue-600 text-white"
                : "bg-slate-900 border border-white/5 text-slate-400 hover:text-white"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre..."
          className="w-full rounded-xl bg-slate-900 border border-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
      </div>

      {/* Tabla */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3,4].map(n => <div key={n} className="h-14 animate-pulse rounded-xl bg-white/5" />)}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center">
            <Mic className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No hay panelistas{busqueda ? " con ese criterio" : " aún"}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Panelista</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Identidad</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Celular</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Registro</th>
                <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtrados.map(p => {
                const sc = STATUS_CONF[p.status] ?? STATUS_CONF.preregistered;
                const kc = KYC_CONF[p.kyc_status] ?? KYC_CONF.pending;
                return (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 text-sm font-bold text-amber-400">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{p.name}</p>
                          <p className="text-xs text-slate-500">
                            {p.gender ?? "—"} {p.birth_year ? `· ${new Date().getFullYear() - p.birth_year} años` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sc.color}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium ${kc.color}`}>{kc.label}</span>
                    </td>
                    <td className="px-5 py-4">
                      {p.phone_verified
                        ? <span className="text-xs text-emerald-400">✓ Verificado</span>
                        : <span className="text-xs text-slate-500">Pendiente</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs text-slate-500">
                        {new Date(p.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <select
                        value={p.status}
                        onChange={e => cambiarEstado(p.id, e.target.value)}
                        className="rounded-lg bg-slate-800 border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer">
                        <option value="preregistered">Pre-registrado</option>
                        <option value="verified">Verificar</option>
                        <option value="suspended">Suspender</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function PanelistasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-400 text-sm">Cargando...</div>}>
      <PanelistasContent />
    </Suspense>
  );
}
