"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { fetchResultadosProyecto, ResultadosProyecto } from "@/lib/resultados";
import ResultadosProyectoView from "@/components/resultados-proyecto-view";
import { ArrowLeft, Loader2, BarChart3 } from "lucide-react";

export default function ResultadosProyectoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nombre, setNombre] = useState("");
  const [numEncuestas, setNumEncuestas] = useState(0);
  const [data, setData] = useState<ResultadosProyecto | null>(null);
  const [loading, setLoading] = useState(true);
  const [denegado, setDenegado] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: proyecto } = await supabase
        .from("projects").select("name, client_id").eq("id", id).maybeSingle();

      // Ownership: el proyecto debe ser del cliente logueado (admin puede ver todo)
      const role = user?.user_metadata?.role;
      if (!proyecto || (role !== "admin" && proyecto.client_id !== user?.id)) {
        setDenegado(true); setLoading(false); return;
      }
      setNombre(proyecto.name ?? "Proyecto");

      const { data: surveys } = await supabase
        .from("surveys").select("id, wave").eq("project_id", id);
      const lista = (surveys ?? []).map(s => ({ id: s.id, wave: s.wave ?? 1 }));
      setNumEncuestas(lista.length);
      setData(await fetchResultadosProyecto(lista));
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
        {numEncuestas} encuesta{numEncuestas === 1 ? "" : "s"} · evolución por ola + indicadores
      </p>

      {data && <ResultadosProyectoView data={data} />}
    </div>
  );
}
