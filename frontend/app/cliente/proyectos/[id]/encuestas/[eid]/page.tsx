"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { fetchResultados, Resultados, type Ponderacion } from "@/lib/resultados";
import ResultadosView from "@/components/resultados-view";
import { PonderacionEditor } from "@/components/ponderacion-editor";
import { ArrowLeft, Loader2 } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Borrador", cls: "bg-slate-700 text-slate-300" },
  ready: { label: "Publicada", cls: "bg-emerald-500/20 text-emerald-400" },
  sent: { label: "Activa", cls: "bg-emerald-500/20 text-emerald-400" },
  closed: { label: "Cerrada", cls: "bg-slate-700 text-slate-400" },
};

export default function ResultadosEncuesta({ params }: { params: Promise<{ id: string; eid: string }> }) {
  const { id, eid } = use(params);
  const [nombre, setNombre] = useState("");
  const [status, setStatus] = useState("");
  const [wave, setWave] = useState<number | null>(null);
  const [res, setRes] = useState<Resultados | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [denegado, setDenegado] = useState(false);
  const [ponderacion, setPonderacion] = useState<Ponderacion | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [recalculando, setRecalculando] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: survey } = await supabase
        .from("surveys").select("name, status, wave, project_id, ponderacion").eq("id", eid).maybeSingle();
      if (!survey) { setNotFound(true); setLoading(false); return; }

      // Ownership: la encuesta pertenece a un proyecto del cliente logueado
      const { data: proyecto } = await supabase
        .from("projects").select("client_id").eq("id", survey.project_id).maybeSingle();
      const role = user?.user_metadata?.role;
      if (role !== "admin" && proyecto?.client_id !== user?.id) {
        setDenegado(true); setLoading(false); return;
      }
      setNombre(survey.name);
      setStatus(survey.status);
      setWave(survey.wave);
      setPonderacion((survey.ponderacion as Ponderacion) ?? null);
      setPuedeEditar(role === "admin" || proyecto?.client_id === user?.id);
      setRes(await fetchResultados([eid]));
      setLoading(false);
    })();
  }, [eid]);

  async function recalcular(p: Ponderacion | null) {
    setPonderacion(p);
    setRecalculando(true);
    setRes(await fetchResultados([eid]));
    setRecalculando(false);
  }

  if (loading) return (
    <div className="p-8 flex justify-center"><Loader2 className="h-7 w-7 text-violet-400 animate-spin mt-12" /></div>
  );

  if (notFound) return (
    <div className="p-8">
      <p className="text-slate-400">Encuesta no encontrada.</p>
      <Link href={`/cliente/proyectos/${id}`} className="text-violet-400 text-sm mt-2 inline-block">← Volver al proyecto</Link>
    </div>
  );

  if (denegado) return (
    <div className="p-8">
      <p className="text-slate-400">No tienes acceso a los resultados de esta encuesta.</p>
      <Link href="/cliente/proyectos" className="text-violet-400 text-sm mt-2 inline-block">← Mis proyectos</Link>
    </div>
  );

  const st = STATUS_LABELS[status] ?? { label: status, cls: "bg-slate-700 text-slate-300" };

  return (
    <div className="p-8">
      <Link href={`/cliente/proyectos/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" /> Volver al proyecto
      </Link>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-white">{nombre}</h1>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
      </div>
      <p className="text-slate-400 text-sm mb-8">Resultados de la encuesta · Ola {wave}</p>

      {puedeEditar && (
        <PonderacionEditor surveyId={eid} inicial={ponderacion} onSaved={recalcular} />
      )}

      {recalculando ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
          <Loader2 className="h-4 w-4 animate-spin" /> Recalculando con la nueva ponderación…
        </div>
      ) : res && <ResultadosView r={res} />}
    </div>
  );
}
