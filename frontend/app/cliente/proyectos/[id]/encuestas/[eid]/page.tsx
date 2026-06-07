"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { type Resultados, type Ponderacion, type FiltroDemo } from "@/lib/resultados";

async function fetchResultados(surveyIds: string[], filtro?: FiltroDemo | null): Promise<Resultados> {
  const res = await fetch("/api/resultados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ surveyIds, filtro }) });
  return res.json();
}
import ResultadosView from "@/components/resultados-view";
import { PonderacionEditor } from "@/components/ponderacion-editor";
import { FiltroDemografico } from "@/components/filtro-demografico";
import { ArrowLeft, Loader2, Download, Printer, Send, StopCircle } from "lucide-react";

function exportarCSV(nombre: string, res: Resultados) {
  const preguntas = res.preguntas;
  const headers = ["#", "Nombre", "Estrato", "Género", "Fecha", ...preguntas.map((q, i) => `P${i + 1}: ${q.text}`)];
  const filas = res.individuales.map((ind, idx) => [
    String(idx + 1),
    ind.nombre,
    ind.estrato ?? "",
    ind.gender ?? "",
    ind.fecha ? new Date(ind.fecha).toLocaleDateString("es-CO") : "",
    ...preguntas.map(q => ind.respuestas[q.id] ?? ""),
  ]);
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [headers, ...filas].map(row => row.map(escape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${nombre.replace(/\s+/g, "_")}_respuestas.csv`; a.click();
  URL.revokeObjectURL(url);
}

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
  const [filtro, setFiltro] = useState<FiltroDemo | null>(null);
  const [filtrando, setFiltrando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

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
    setRes(await fetchResultados([eid], filtro));
    setRecalculando(false);
  }

  async function cambiarEstado(nuevoEstado: "ready" | "closed") {
    setCambiandoEstado(true);
    const supabase = createClient();
    await supabase.from("surveys").update({ status: nuevoEstado }).eq("id", eid);
    setStatus(nuevoEstado);
    setCambiandoEstado(false);
  }

  async function aplicarFiltro(f: FiltroDemo | null) {
    setFiltro(f);
    setFiltrando(true);
    setRes(await fetchResultados([eid], f));
    setFiltrando(false);
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
      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-white flex-1">{nombre}</h1>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
        {puedeEditar && status === "draft" && (
          <button
            onClick={() => cambiarEstado("ready")}
            disabled={cambiandoEstado}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-xs text-white font-semibold transition-colors print:hidden"
          >
            {cambiandoEstado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Publicar encuesta
          </button>
        )}
        {puedeEditar && (status === "ready" || status === "sent") && (
          <button
            onClick={() => cambiarEstado("closed")}
            disabled={cambiandoEstado}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors print:hidden"
          >
            {cambiandoEstado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" />}
            Cerrar encuesta
          </button>
        )}
        {res && res.individuales.length > 0 && (
          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={() => exportarCSV(nombre, res)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-8">Resultados de la encuesta · Ola {wave}</p>

      {puedeEditar && (
        <PonderacionEditor surveyId={eid} inicial={ponderacion} onSaved={recalcular} />
      )}

      {res && (
        <FiltroDemografico
          filtro={filtro}
          onChange={aplicarFiltro}
          totalSinFiltro={res.totalSinFiltro}
          totalFiltrado={res.respuestas}
        />
      )}

      {(recalculando || filtrando) ? (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
          <Loader2 className="h-4 w-4 animate-spin" />
          {recalculando ? "Recalculando con la nueva ponderación…" : "Filtrando resultados…"}
        </div>
      ) : res && <ResultadosView r={res} />}
    </div>
  );
}
