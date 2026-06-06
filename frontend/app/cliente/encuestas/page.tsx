"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { ClipboardList, Plus, ArrowRight, Clock, Mic, MapPin, Users } from "lucide-react";

type Encuesta = {
  id: string;
  name: string;
  wave: number;
  status: string;
  perfil_objetivo: string;
  closes_at: string | null;
  project_id: string;
  project_name: string;
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:  { label: "Borrador",  cls: "bg-slate-700 text-slate-300" },
  ready:  { label: "Publicada", cls: "bg-emerald-500/20 text-emerald-400" },
  sent:   { label: "Activa",    cls: "bg-emerald-500/20 text-emerald-400" },
  closed: { label: "Cerrada",   cls: "bg-slate-700 text-slate-400" },
};

const PERFIL: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  panelista:   { label: "Panelistas",   icon: Mic,    cls: "text-amber-400" },
  encuestador: { label: "Encuestadores", icon: MapPin, cls: "text-emerald-400" },
  ambos:       { label: "Ambos",         icon: Users,  cls: "text-blue-400" },
};

export default function ClienteEncuestas() {
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;

      // 1. Proyectos del cliente
      const { data: proyectos } = await supabase
        .from("projects").select("id, name")
        .eq("client_id", data.user.id);

      const ids = (proyectos ?? []).map(p => p.id);
      if (ids.length === 0) { setEncuestas([]); setLoading(false); return; }

      const nombrePorProyecto = Object.fromEntries((proyectos ?? []).map(p => [p.id, p.name]));

      // 2. Encuestas de esos proyectos
      const { data: surveys } = await supabase
        .from("surveys")
        .select("id, name, wave, status, perfil_objetivo, closes_at, project_id")
        .in("project_id", ids)
        .order("created_at", { ascending: false });

      setEncuestas((surveys ?? []).map(s => ({
        ...s,
        project_name: nombrePorProyecto[s.project_id] ?? "Proyecto",
      })));
      setLoading(false);
    });
  }, []);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Encuestas</h1>
          <p className="text-slate-400 text-sm mt-1">
            {encuestas.length} encuesta{encuestas.length === 1 ? "" : "s"} en tus proyectos
          </p>
        </div>
        <Link href="/cliente/proyectos"
          className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors">
          <Plus className="h-4 w-4" /> Crear en un proyecto
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map(n => <div key={n} className="h-20 animate-pulse rounded-2xl bg-slate-900" />)}</div>
      ) : encuestas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <ClipboardList className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Aún no has creado encuestas</p>
          <p className="text-xs text-slate-600 mt-1">
            Entra a un proyecto y crea tu primera encuesta desde ahí
          </p>
          <Link href="/cliente/proyectos"
            className="inline-flex items-center gap-2 mt-4 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors">
            Ir a mis proyectos <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {encuestas.map(e => {
            const st = STATUS_LABELS[e.status] ?? { label: e.status, cls: "bg-slate-700 text-slate-300" };
            const perfil = PERFIL[e.perfil_objetivo] ?? PERFIL.panelista;
            const PerfilIcon = perfil.icon;
            return (
              <Link key={e.id} href={`/cliente/proyectos/${e.project_id}/encuestas/${e.id}`}
                className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                  <ClipboardList className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{e.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-slate-500">{e.project_name}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">Ola {e.wave}</span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className={`flex items-center gap-1 text-xs ${perfil.cls}`}>
                      <PerfilIcon className="h-3 w-3" /> {perfil.label}
                    </span>
                    {e.closes_at && (
                      <>
                        <span className="text-xs text-slate-600">·</span>
                        <span className="flex items-center gap-1 text-xs text-amber-500">
                          <Clock className="h-3 w-3" />
                          {new Date(e.closes_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${st.cls}`}>
                  {st.label}
                </span>
                <ArrowRight className="h-4 w-4 text-slate-600 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
