"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { BarChart3, ClipboardList, Users, ArrowRight, MapPinned } from "lucide-react";

type Proyecto = { id: string; name: string; type: string; status: string };
type Stats = { proyectos: number; encuestas: number; panelistas: number };

const TYPE_LABELS: Record<string, string> = {
  favorability: "Favorabilidad", satisfaction: "Satisfacción",
  pulse: "Pulso ciudadano", custom: "Personalizado",
};

export default function ClienteHome() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [stats, setStats] = useState<Stats>({ proyectos: 0, encuestas: 0, panelistas: 0 });
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setClienteId(data.user.id);

      const [{ data: proyData }, { count: encCount }, { count: panCount }] = await Promise.all([
        supabase.from("projects").select("id, name, type, status").eq("client_id", data.user.id).eq("status", "active").order("created_at", { ascending: false }).limit(5),
        supabase.from("surveys").select("id", { count: "exact", head: true }),
        supabase.from("panel_memberships").select("id", { count: "exact", head: true }),
      ]);

      setProyectos(proyData ?? []);
      setStats({
        proyectos: proyData?.length ?? 0,
        encuestas: encCount ?? 0,
        panelistas: panCount ?? 0,
      });
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Mi panel</h1>
        <p className="text-slate-400 text-sm mt-1">Resumen de tus proyectos y mediciones</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          { label: "Proyectos activos", value: stats.proyectos, icon: MapPinned, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Encuestas creadas", value: stats.encuestas, icon: ClipboardList, color: "text-blue-400", bg: "bg-blue-500/10" },
          { label: "Panelistas en panel", value: stats.panelistas, icon: Users, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-slate-900 p-5">
            <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-white">
              {loading ? <span className="text-slate-600">—</span> : value}
            </div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Proyectos recientes */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Proyectos activos</h2>
          <Link href="/cliente/proyectos" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
            Ver todos →
          </Link>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3].map(n => <div key={n} className="h-14 animate-pulse rounded-xl bg-white/5" />)}</div>
        ) : proyectos.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-4">Aún no tienes proyectos activos</p>
            <Link href="/cliente/proyectos"
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors">
              Crear primer proyecto
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {proyectos.map(p => (
              <Link key={p.id} href={`/cliente/proyectos/${p.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="h-9 w-9 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-4 w-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <p className="text-xs text-slate-500">{TYPE_LABELS[p.type] ?? p.type}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-600" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
