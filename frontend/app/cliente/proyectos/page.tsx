"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { BarChart3, Plus, ArrowRight } from "lucide-react";

type Proyecto = { id: string; name: string; type: string; purpose: string; status: string; start_date: string | null };

const TYPE_LABELS: Record<string, string> = {
  favorability: "Favorabilidad", satisfaction: "Satisfacción",
  pulse: "Pulso ciudadano", custom: "Personalizado",
};
const PURPOSE_LABELS: Record<string, string> = {
  political: "Electoral", public_management: "Gestión pública", private: "Privado",
};

export default function ClienteProyectos() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase
        .from("projects").select("*")
        .eq("client_id", data.user.id)
        .order("created_at", { ascending: false });
      setProyectos(p ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Mis proyectos</h1>
          <p className="text-slate-400 text-sm mt-1">{proyectos.length} proyectos</p>
        </div>
        <Link href="/cliente/proyectos/nuevo"
          className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors">
          <Plus className="h-4 w-4" /> Nuevo proyecto
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(n => <div key={n} className="h-20 animate-pulse rounded-2xl bg-slate-900" />)}</div>
      ) : proyectos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <BarChart3 className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aún no tienes proyectos asignados</p>
          <p className="text-xs text-slate-600 mt-1">Contacta al administrador para activar tu primer proyecto</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proyectos.map(p => (
            <Link key={p.id} href={`/cliente/proyectos/${p.id}`}
              className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900 px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{p.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-500">{TYPE_LABELS[p.type] ?? p.type}</span>
                  <span className="text-xs text-slate-600">·</span>
                  <span className="text-xs text-slate-500">{PURPOSE_LABELS[p.purpose] ?? p.purpose}</span>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${
                p.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
              }`}>
                {p.status === "active" ? "Activo" : p.status}
              </span>
              <ArrowRight className="h-4 w-4 text-slate-600 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
