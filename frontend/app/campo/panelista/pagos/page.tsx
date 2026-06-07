"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { ArrowLeft, CheckCircle, Clock, Wallet, Loader2, Mic, ClipboardList } from "lucide-react";

type Item = { id: string; concept: string; amount: number; date: string; tipo: "encuesta" | "audio" };

export default function PagosPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) { setLoading(false); return; }

      // Tarifas
      const { data: cfg } = await supabase
        .from("payment_config").select("encuesta_cop, audio_cop")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const encuestaCop = cfg?.encuesta_cop ?? 0;
      const audioCop = cfg?.audio_cop ?? 0;

      // Respuestas auto-respondidas por el panelista (NO las aplicadas por un encuestador)
      const { data: resp } = await supabase
        .from("responses")
        .select("id, survey_id, responded_at, surveys(name)")
        .eq("participant_id", user.id)
        .is("encuestador_id", null);
      const rows = resp ?? [];

      // Una línea de "encuesta" por cada encuesta distinta respondida
      const porSurvey = new Map<string, { name: string; date: string }>();
      for (const r of rows) {
        const name = (r.surveys as { name?: string } | null)?.name ?? "Encuesta";
        if (!porSurvey.has(r.survey_id)) porSurvey.set(r.survey_id, { name, date: r.responded_at });
      }

      const lineas: Item[] = [];
      for (const [sid, e] of porSurvey.entries()) {
        lineas.push({ id: "s-" + sid, concept: e.name, amount: encuestaCop, date: e.date, tipo: "encuesta" });
      }

      // Audios (uno por nota de voz enviada)
      const allRespIds = rows.map(r => r.id);
      if (allRespIds.length > 0) {
        const { data: audios } = await supabase
          .from("audio_responses").select("id, created_at").in("response_id", allRespIds);
        (audios ?? []).forEach(a => {
          lineas.push({ id: "a-" + a.id, concept: "Nota de voz", amount: audioCop, date: a.created_at, tipo: "audio" });
        });
      }

      lineas.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setItems(lineas);
      setLoading(false);
    });
  }, []);

  const total = items.reduce((s, p) => s + p.amount, 0);

  const fmtFecha = (d: string) => d ? new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" }) : "—";

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto relative shadow-xl">
      <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-slate-500"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-bold text-slate-900">Mis pagos</h1>
      </div>

      {/* Total ganado */}
      <div className="px-5 py-5">
        <div className="rounded-2xl bg-emerald-600 p-5 text-white">
          <p className="text-xs text-emerald-200 mb-1">Total ganado (acumulado)</p>
          <p className="text-3xl font-extrabold">{loading ? "—" : `$${total.toLocaleString("es-CO")}`}</p>
          <p className="text-xs text-emerald-200 mt-0.5">COP</p>
        </div>
      </div>

      <div className="mx-5 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 mb-5">
        <div className="flex items-start gap-2">
          <Wallet className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Esto es lo que has ganado por tus respuestas. La dispersión a tu Nequi/Daviplata la realiza el equipo de GeoDataVoice.
          </p>
        </div>
      </div>

      <div className="px-5 space-y-3 pb-8">
        <h2 className="font-semibold text-slate-800 text-sm">Detalle</h2>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-emerald-500 animate-spin" /></div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
            <Clock className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">Aún no has ganado</p>
            <p className="text-xs text-slate-500 mt-1">Responde tu primera encuesta para empezar a ganar.</p>
          </div>
        ) : (
          items.map(p => (
            <div key={p.id} className="rounded-2xl bg-white border border-slate-200 px-4 py-3.5 flex items-center gap-4">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${p.tipo === "audio" ? "bg-violet-100" : "bg-blue-100"}`}>
                {p.tipo === "audio" ? <Mic className="h-5 w-5 text-violet-600" /> : <ClipboardList className="h-5 w-5 text-blue-600" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{p.concept}</p>
                <p className="text-xs text-slate-500 mt-0.5">{fmtFecha(p.date)}</p>
              </div>
              <p className="font-bold text-sm text-emerald-600 shrink-0">+${p.amount.toLocaleString("es-CO")}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
