"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { type ResultadosProyecto } from "@/lib/resultados";
import ResultadosProyectoView from "@/components/resultados-proyecto-view";
import ResultadosView from "@/components/resultados-view";
import { ArrowLeft, Loader2, BarChart3, GitCompare } from "lucide-react";

async function fetchResultados(surveys: { id: string; wave: number }[]): Promise<ResultadosProyecto> {
  const res = await fetch("/api/resultados/proyecto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ surveys }) });
  return res.json();
}

type SurveyRef = { id: string; wave: number; name: string };

export default function ResultadosProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nombre, setNombre] = useState("");
  const [surveys, setSurveys] = useState<SurveyRef[]>([]);
  const [allData, setAllData] = useState<ResultadosProyecto | null>(null);
  const [olaData, setOlaData] = useState<Record<number, ResultadosProyecto>>({});
  const [selectedWave, setSelectedWave] = useState<number | "comparacion">("comparacion");
  const [loading, setLoading] = useState(true);
  const [loadingOla, setLoadingOla] = useState(false);
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
        .from("surveys").select("id, wave, name").eq("project_id", id).order("wave");
      const lista: SurveyRef[] = (sv ?? []).map(s => ({ id: s.id, wave: s.wave ?? 1, name: s.name }));
      setSurveys(lista);

      // Fetch all data + per-ola data in parallel
      const [all, ...perOla] = await Promise.all([
        fetchResultados(lista.map(s => ({ id: s.id, wave: s.wave }))),
        ...lista.map(s => fetchResultados([{ id: s.id, wave: s.wave }])),
      ]);
      setAllData(all);
      const byWave: Record<number, ResultadosProyecto> = {};
      lista.forEach((s, i) => { byWave[s.wave] = perOla[i]; });
      setOlaData(byWave);
      setLoading(false);
    })();
  }, [id]);

  async function selectWave(wave: number | "comparacion") {
    setSelectedWave(wave);
    if (wave === "comparacion" || olaData[wave as number]) return;
    setLoadingOla(true);
    const survey = surveys.find(s => s.wave === wave)!;
    const data = await fetchResultados([{ id: survey.id, wave: survey.wave }]);
    setOlaData(prev => ({ ...prev, [wave as number]: data }));
    setLoadingOla(false);
  }

  const waves = [...new Set(surveys.map(s => s.wave))].sort((a, b) => a - b);

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
      <p className="text-slate-400 text-sm mb-6">
        {surveys.length} encuesta{surveys.length === 1 ? "" : "s"} · {waves.length} ola{waves.length === 1 ? "" : "s"}
      </p>

      {/* Tabs */}
      {waves.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => selectWave("comparacion")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              selectedWave === "comparacion"
                ? "bg-violet-600 text-white"
                : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}
          >
            <GitCompare className="h-3.5 w-3.5" /> Comparación entre olas
          </button>
          {waves.map(w => (
            <button
              key={w}
              onClick={() => selectWave(w)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                selectedWave === w
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              Ola {w}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {selectedWave === "comparacion" ? (
        <>
          {allData && <ResultadosProyectoView data={allData} />}
          {waves.length > 1 && Object.keys(olaData).length === waves.length && (
            <section className="mt-10">
              <h2 className="text-sm font-semibold text-white mb-5 flex items-center gap-2">
                <GitCompare className="h-4 w-4 text-violet-400" /> Resultados por ola — comparación
              </h2>
              <div className={`grid gap-6 ${waves.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
                {waves.map(w => (
                  <div key={w} className="rounded-2xl border border-white/5 bg-slate-900/50 p-5">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2.5 py-1 rounded-full">Ola {w}</span>
                      <span className="text-xs text-slate-500">{olaData[w]?.agregado.respuestas ?? 0} respuestas</span>
                    </div>
                    {olaData[w] && <ResultadosView r={olaData[w].agregado} />}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      ) : loadingOla ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 text-violet-400 animate-spin" /></div>
      ) : olaData[selectedWave] ? (
        <div>
          <p className="text-slate-500 text-sm mb-6">
            {surveys.find(s => s.wave === selectedWave)?.name} — {olaData[selectedWave].agregado.respuestas} respuestas
          </p>
          <ResultadosView r={olaData[selectedWave].agregado} />
        </div>
      ) : null}
    </div>
  );
}
