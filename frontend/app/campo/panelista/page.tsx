"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { participanteCoincide, type Audiencia } from "@/lib/segmentacion";
import {
  Mic, ClipboardList, Wallet, Bell, ChevronRight,
  CheckCircle, Clock, User, TrendingUp, Loader2, LogOut
} from "lucide-react";

type Survey = {
  id: string;
  name: string;
  wave: number;
  closes_at: string | null;
  preguntas: number;
};

export default function PanelistaHome() {
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [loading, setLoading] = useState(true);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [totalGanado, setTotalGanado] = useState(0);
  const [ganadoMes, setGanadoMes] = useState(0);
  const [respondidas, setRespondidas] = useState(0);

  useEffect(() => {
    const h = new Date().getHours();
    setHora(h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches");

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) { setLoading(false); return; }

      const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
      setNombre((meta?.full_name || meta?.name || "").split(" ")[0] || "");

      // 0. Perfil del panelista (para segmentación de audiencia)
      const { data: perfilP } = await supabase
        .from("participants")
        .select("gender, estrato, nivel_estudios, estado_civil, regimen_salud, sisben_grupo, tenencia_vivienda, grupo_etnico, antiguedad_barrio, actividades, recibe_subsidios, acceso_internet, registrado_votar")
        .eq("id", user.id)
        .maybeSingle();

      // 1. Encuestas activas (para panelistas o ambos perfiles)
      const { data: activas } = await supabase
        .from("surveys")
        .select("id, name, wave, closes_at, audiencia, perfil_objetivo")
        .in("status", ["sent", "ready"])
        .order("created_at", { ascending: false });

      // 2. Respuestas previas del panelista (para excluir encuestas ya respondidas)
      const { data: misResp } = await supabase
        .from("responses")
        .select("id, survey_id, responded_at, encuestador_id")
        .eq("participant_id", user.id);
      const respondidasIds = new Set((misResp ?? []).map(r => r.survey_id));
      setRespondidas(respondidasIds.size);

      // 3. Filtrar: no respondidas + perfil panelista/ambos + audiencia segmentada
      const pendientes = (activas ?? []).filter(s => {
        if (respondidasIds.has(s.id)) return false;
        const po = (s as { perfil_objetivo?: string }).perfil_objetivo;
        if (po && po !== "panelista" && po !== "ambos") return false;
        return participanteCoincide((s as { audiencia?: Audiencia }).audiencia, perfilP ?? {});
      });
      const conPreguntas: Survey[] = await Promise.all(
        pendientes.map(async (s) => {
          const { count } = await supabase
            .from("questions")
            .select("id", { count: "exact", head: true })
            .eq("survey_id", s.id);
          return { ...s, preguntas: count ?? 0 };
        })
      );
      setSurveys(conPreguntas);

      // 4. Ganado (devengado): encuestas respondidas × tarifa + audios × tarifa
      const { data: cfg } = await supabase
        .from("payment_config").select("encuesta_cop, audio_cop")
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      const encuestaCop = cfg?.encuesta_cop ?? 0;
      const audioCop = cfg?.audio_cop ?? 0;

      // Solo cuentan las encuestas que el panelista respondió por sí mismo (no las de campo)
      const rows = (misResp ?? []).filter(r => !r.encuestador_id);
      const mesInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const surveysTotal = new Set(rows.map(r => r.survey_id)).size;
      const surveysMes = new Set(rows.filter(r => new Date(r.responded_at) >= mesInicio).map(r => r.survey_id)).size;

      // audios del panelista (vía sus responses)
      let audiosTotal = 0, audiosMes = 0;
      if (rows.length > 0) {
        const { data: audioRows } = await supabase
          .from("audio_responses").select("response_id, created_at")
          .in("response_id", rows.map(r => r.id));
        audiosTotal = (audioRows ?? []).length;
        audiosMes = (audioRows ?? []).filter(a => a.created_at && new Date(a.created_at) >= mesInicio).length;
      }

      setTotalGanado(surveysTotal * encuestaCop + audiosTotal * audioCop);
      setGanadoMes(surveysMes * encuestaCop + audiosMes * audioCop);

      setLoading(false);
    });
  }, []);

  const pendientes = surveys.length;

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto relative shadow-xl">
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-12 pb-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="min-w-0">
            <p className="text-blue-200 text-sm">{hora}</p>
            <h1 className="text-2xl font-bold mt-0.5 truncate">{nombre ? nombre : "Panel GeoDataVoice"}</h1>
            {nombre && <p className="text-blue-200/80 text-xs mt-0.5">Panel GeoDataVoice</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/campo/panelista/perfil"
              aria-label="Mi perfil"
              className="h-11 w-11 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30 transition-colors"
            >
              <User className="h-5 w-5 text-white" />
            </Link>
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                window.location.href = "/login";
              }}
              aria-label="Cerrar sesión"
              className="h-11 w-11 rounded-full bg-white/20 flex items-center justify-center active:bg-white/30 transition-colors"
            >
              <LogOut className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Encuestas\npendientes", value: loading ? "—" : pendientes, color: "text-yellow-300" },
            { label: "Ganado\neste mes", value: loading ? "—" : `$${ganadoMes.toLocaleString("es-CO")}`, color: "text-emerald-300" },
            { label: "Total\nganado", value: loading ? "—" : `$${totalGanado.toLocaleString("es-CO")}`, color: "text-blue-200" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl bg-white/10 p-3 text-center">
              <div className={`text-lg font-bold ${color}`}>{value}</div>
              <div className="text-xs text-blue-200 mt-0.5 whitespace-pre-line leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              Encuestas pendientes
            </h2>
            {pendientes > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {pendientes}
              </span>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(n => <div key={n} className="h-20 animate-pulse rounded-2xl bg-white border border-slate-100" />)}
            </div>
          ) : surveys.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">¡Al día!</p>
              <p className="text-xs text-slate-500 mt-1">No tienes encuestas pendientes por ahora.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {surveys.map(survey => (
                <Link key={survey.id} href={`/campo/panelista/encuesta/${survey.id}`}>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-4 active:bg-slate-50 transition-colors shadow-sm">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <ClipboardList className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{survey.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">Ola {survey.wave} · {survey.preguntas} pregunta{survey.preguntas === 1 ? "" : "s"}</span>
                        {survey.closes_at && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <Clock className="h-3 w-3" />
                            Cierra {new Date(survey.closes_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        Pago
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-3">Acceso rápido</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/campo/panelista/pagos">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col items-center gap-2 text-center active:bg-slate-50 transition-colors shadow-sm">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Mis pagos</p>
                <p className="text-xs text-slate-500">Ver historial</p>
              </div>
            </Link>
            <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col items-center gap-2 text-center shadow-sm">
              <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-violet-600" />
              </div>
              <p className="text-sm font-semibold text-slate-800">{respondidas}</p>
              <p className="text-xs text-slate-500">Encuestas respondidas</p>
            </div>
          </div>
        </section>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 px-6 py-3 grid grid-cols-3 gap-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {[
          { icon: ClipboardList, label: "Encuestas", href: "/campo/panelista", active: true },
          { icon: Wallet, label: "Pagos", href: "/campo/panelista/pagos", active: false },
          { icon: User, label: "Perfil", href: "/campo/panelista/perfil", active: false },
        ].map(({ icon: Icon, label, href, active }) => (
          <Link key={label} href={href}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-colors ${active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}>
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
      <div className="h-20" />
      {loading && <Loader2 className="hidden" />}
    </div>
  );
}
