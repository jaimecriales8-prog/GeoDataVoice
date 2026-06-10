"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { ArrowLeft, ArrowRight, BarChart3, Loader2, ClipboardList } from "lucide-react";

type Survey = { id: string; wave: number; name: string; status: string; respuestas?: number };

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft:  { label: "Borrador",  cls: "bg-slate-700 text-slate-400" },
  ready:  { label: "Publicada", cls: "bg-emerald-500/20 text-emerald-400" },
  sent:   { label: "Activa",    cls: "bg-emerald-500/20 text-emerald-400" },
  closed: { label: "Cerrada",   cls: "bg-slate-700 text-slate-400" },
};

export default function ResultadosProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nombre, setNombre] = useState("");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [denegado, setDenegado] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: proyecto } = await supabase
        .from("projects").select("name, client_id").eq("id", id).maybeSingle();
      const role = user?.user_metadata?.role;
      if (!proyecto || (role !== "admin" && proyecto.client_id !== user?.id)) {
        setDenegado(true); setLoading(false); return;
      }
      setNombre(proyecto.name ?? "Proyecto");

      const { data: sv } = await supabase
        .from("surveys").select("id, wave, name, status").eq("project_id", id).order("wave");

      if (!sv?.length) { setSurveys([]); setLoading(false); return; }

      // Contar respuestas por encuesta
      const counts = await Promise.all(sv.map(s =>
        supabase.from("responses").select("id", { count: "exact", head: true }).eq("survey_id", s.id)
      ));

      setSurveys(sv.map((s, i) => ({
        id: s.id, wave: s.wave ?? 1, name: s.name, status: s.status,
        respuestas: counts[i].count ?? 0,
      })));
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div className="p-8 flex justify-center"><Loader2 className="h-7 w-7 text-violet-400 animate-spin mt-12" /></div>
  );

  if (denegado) return (
    <div className="p-8">
      <p className="text-slate-400">No tienes acceso a los resultados de este proyecto.</p>
      <Link href="/cliente/proyectos" className="text-violet-400 text-sm mt-2 inline-block">← Mis proyectos</Link>
    </div>
  );

  return (
    <div className="p-8">
      <Link href={`/cliente/proyectos/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" /> Volver al proyecto
      </Link>
      <div className="flex items-center gap-2 mb-1">
        <BarChart3 className="h-6 w-6 text-violet-400" />
        <h1 className="text-2xl font-bold text-white">Resultados — {nombre}</h1>
      </div>
      <p className="text-slate-400 text-sm mb-8">
        Selecciona una encuesta para ver sus resultados
      </p>

      {surveys.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center">
          <ClipboardList className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Este proyecto aún no tiene encuestas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {surveys.map(s => {
            const st = STATUS_LABELS[s.status] ?? STATUS_LABELS.draft;
            return (
              <Link
                key={s.id}
                href={`/cliente/proyectos/${id}/encuestas/${s.id}`}
                className="flex items-center gap-4 rounded-2xl border border-white/5 bg-slate-900 px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-5 w-5 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{s.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ola {s.wave} · {(s.respuestas ?? 0).toLocaleString("es-CO")} respuesta{s.respuestas === 1 ? "" : "s"}
                  </p>
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
