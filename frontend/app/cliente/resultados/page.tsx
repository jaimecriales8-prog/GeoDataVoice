"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";

type Proyecto = { id: string; name: string; status: string };

export default function ClienteResultados() {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: p } = await supabase
        .from("projects").select("id, name, status")
        .eq("client_id", data.user.id)
        .order("created_at", { ascending: false });
      setProyectos(p ?? []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Resultados</h1>
        <p className="text-slate-400 text-sm mt-1">Elige un proyecto para ver favorabilidad, sentimiento y temas</p>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(n => <div key={n} className="h-16 animate-pulse rounded-2xl bg-slate-900" />)}</div>
      ) : proyectos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
          <BarChart3 className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aún no tienes proyectos</p>
        </div>
      ) : (
        <div className="space-y-3">
          {proyectos.map(p => (
            <Link key={p.id} href={`/cliente/proyectos/${p.id}/resultados`}
              className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900 px-5 py-4 hover:bg-white/[0.02] transition-colors">
              <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                <BarChart3 className="h-5 w-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{p.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">Ver resultados del proyecto</p>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-600 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
