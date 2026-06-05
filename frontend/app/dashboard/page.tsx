"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Users, Mic, MapPin, BarChart3, TrendingUp, Clock, CheckCircle, AlertCircle } from "lucide-react";

type Stats = {
  clientes: number;
  panelistas: number;
  panelistas_verificados: number;
  encuestadores: number;
  proyectos_activos: number;
};

export default function DashboardHome() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      supabase.from("clients").select("id", { count: "exact", head: true }),
      supabase.from("participants").select("id", { count: "exact", head: true }),
      supabase.from("participants").select("id", { count: "exact", head: true }).eq("status", "verified"),
      supabase.from("field_operators").select("id", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]).then(([c, p, pv, e, pr]) => {
      setStats({
        clientes: c.count ?? 0,
        panelistas: p.count ?? 0,
        panelistas_verificados: pv.count ?? 0,
        encuestadores: e.count ?? 0,
        proyectos_activos: pr.count ?? 0,
      });
      setLoading(false);
    });
  }, []);

  const kpis = [
    { label: "Clientes activos", value: stats?.clientes, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
    { label: "Panelistas totales", value: stats?.panelistas, icon: Mic, color: "text-amber-400", bg: "bg-amber-500/10" },
    { label: "Verificados", value: stats?.panelistas_verificados, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Encuestadores", value: stats?.encuestadores, icon: MapPin, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Proyectos activos", value: stats?.proyectos_activos, icon: BarChart3, color: "text-pink-400", bg: "bg-pink-500/10" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Panel de administración</h1>
        <p className="text-slate-400 text-sm mt-1">Visión general de la plataforma</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
        {kpis.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-slate-900 p-5">
            <div className={`h-9 w-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="text-2xl font-bold text-white">
              {loading ? <span className="text-slate-600">—</span> : (value ?? 0)}
            </div>
            <div className="text-xs text-slate-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp className="h-4 w-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Tasa de verificación</h2>
          </div>
          {loading ? (
            <div className="h-20 animate-pulse rounded-xl bg-white/5" />
          ) : (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-3xl font-bold text-white">
                  {stats && stats.panelistas > 0
                    ? Math.round((stats.panelistas_verificados / stats.panelistas) * 100)
                    : 0}%
                </span>
                <span className="text-sm text-slate-400 mb-1">de panelistas verificados</span>
              </div>
              <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: stats && stats.panelistas > 0
                      ? `${(stats.panelistas_verificados / stats.panelistas) * 100}%`
                      : "0%"
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>{stats?.panelistas_verificados ?? 0} verificados</span>
                <span>{(stats?.panelistas ?? 0) - (stats?.panelistas_verificados ?? 0)} pendientes</span>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
          <div className="flex items-center gap-2 mb-5">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold text-white">Accesos rápidos</h2>
          </div>
          <div className="space-y-2">
            {[
              { label: "Panelistas pendientes de verificación", href: "/dashboard/panelistas?estado=pending" },
              { label: "Configurar tarifas de pago", href: "/dashboard/pagos" },
              { label: "Crear nuevo proyecto", href: "/dashboard/proyectos/nuevo" },
              { label: "Añadir encuestador", href: "/dashboard/encuestadores/nuevo" },
            ].map(({ label, href }) => (
              <a key={href} href={href}
                className="flex items-center justify-between rounded-xl bg-white/5 hover:bg-white/10 px-4 py-3 text-sm text-slate-300 hover:text-white transition-colors">
                <span>{label}</span>
                <Clock className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
