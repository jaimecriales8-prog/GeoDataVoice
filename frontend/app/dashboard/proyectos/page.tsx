"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { BarChart3, Plus, Search, ArrowRight } from "lucide-react";
import Link from "next/link";

type Proyecto = {
  id: string;
  name: string;
  type: string;
  purpose: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  clients?: { name: string } | null;
};

const TYPE_LABELS: Record<string, string> = {
  favorability: "Favorabilidad",
  satisfaction: "Satisfacción",
  pulse: "Pulso ciudadano",
  custom: "Personalizado",
};

const PURPOSE_LABELS: Record<string, string> = {
  political: "Electoral",
  public_management: "Gestión pública",
  private: "Privado",
};

export default function ProyectosPage() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const supabase = createClient();
    const { data } = await supabase
      .from("projects")
      .select("*, clients(name)")
      .order("created_at", { ascending: false });
    setProyectos(data ?? []);
    setLoading(false);
  }

  async function toggleStatus(id: string, current: string) {
    const supabase = createClient();
    await supabase.from("projects").update({ status: current === "active" ? "paused" : "active" }).eq("id", id);
    await load();
  }

  const filtrados = proyectos.filter(p =>
    p.name.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.clients as any)?.name?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Proyectos</h1>
          <p className="text-slate-400 text-sm mt-1">{proyectos.filter(p => p.status === "active").length} activos</p>
        </div>
        <Link href="/dashboard/proyectos/nuevo"
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors">
          <Plus className="h-4 w-4" /> Nuevo proyecto
        </Link>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o cliente..."
          className="w-full rounded-xl bg-slate-900 border border-white/5 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500" />
      </div>

      {loading ? (
        <div className="grid gap-4">{[1,2,3].map(n => <div key={n} className="h-24 animate-pulse rounded-2xl bg-slate-900" />)}</div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <BarChart3 className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">No hay proyectos{busqueda ? " con ese criterio" : " aún"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map(p => (
            <div key={p.id} className="rounded-2xl border border-white/5 bg-slate-900 px-5 py-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
              <div className="h-10 w-10 rounded-xl bg-pink-500/20 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-pink-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{p.name}</p>
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs text-slate-400">{(p.clients as any)?.name ?? "Sin cliente"}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-slate-500">{TYPE_LABELS[p.type] ?? p.type}</span>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs text-slate-500">{PURPOSE_LABELS[p.purpose] ?? p.purpose}</span>
                  {p.start_date && (
                    <>
                      <span className="text-xs text-slate-600">·</span>
                      <span className="text-xs text-slate-500">
                        Desde {new Date(p.start_date).toLocaleDateString("es-CO", { month: "short", year: "numeric" })}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button onClick={() => toggleStatus(p.id, p.status)}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    p.status === "active"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : "bg-slate-700 text-slate-400"
                  }`}>
                  {p.status === "active" ? "Activo" : p.status === "paused" ? "Pausado" : p.status}
                </button>
                <Link href={`/dashboard/projects/${p.id}`}>
                  <ArrowRight className="h-4 w-4 text-slate-600 hover:text-white transition-colors" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
