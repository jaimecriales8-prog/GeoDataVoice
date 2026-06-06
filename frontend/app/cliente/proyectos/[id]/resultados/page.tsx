"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { fetchResultados, Resultados } from "@/lib/resultados";
import ResultadosView from "@/components/resultados-view";
import { ArrowLeft, Loader2, BarChart3 } from "lucide-react";

export default function ResultadosProyecto({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nombre, setNombre] = useState("");
  const [numEncuestas, setNumEncuestas] = useState(0);
  const [res, setRes] = useState<Resultados | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: proyecto } = await supabase
        .from("projects").select("name").eq("id", id).maybeSingle();
      setNombre(proyecto?.name ?? "Proyecto");

      const { data: surveys } = await supabase
        .from("surveys").select("id").eq("project_id", id);
      const ids = (surveys ?? []).map(s => s.id);
      setNumEncuestas(ids.length);
      setRes(await fetchResultados(ids));
      setLoading(false);
    })();
  }, [id]);

  if (loading) return (
    <div className="p-8 flex justify-center"><Loader2 className="h-7 w-7 text-violet-400 animate-spin mt-12" /></div>
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
        Agregado de {numEncuestas} encuesta{numEncuestas === 1 ? "" : "s"} del proyecto
      </p>

      {res && <ResultadosView r={res} />}
    </div>
  );
}
