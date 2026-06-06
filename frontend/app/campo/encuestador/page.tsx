"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserPlus, ClipboardList, MapPin, CheckCircle,
  ChevronRight, Clock, LogOut, TrendingUp, Wallet
} from "lucide-react";

type Survey = {
  id: string;
  name: string;
  wave: number;
  closes_at: string | null;
  perfil_objetivo: string;
};

type DayStats = {
  registrados: number;
  verificados: number;
  encuestas: number;
};

export default function EncuestadorHome() {
  const router = useRouter();
  const [operadorId, setOperadorId] = useState<string | null>(null);
  const [nombre, setNombre] = useState("");
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [stats, setStats] = useState<DayStats>({ registrados: 0, verificados: 0, encuestas: 0 });
  const [mes, setMes] = useState({ reclutados: 0, encuestas: 0, ganadoReclutamiento: 0, ganadoEncuestas: 0 });
  const [codigo, setCodigo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hora, setHora] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setHora(h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches");

    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setNombre(data.user.user_metadata?.full_name?.split(" ")[0] ?? "Encuestador");

      // Obtener operador de campo
      const { data: op } = await supabase
        .from("field_operators")
        .select("id, recruiter_code")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (op) { setOperadorId(op.id); setCodigo(op.recruiter_code); }

      // Encuestas asignadas a encuestadores
      const { data: sv } = await supabase
        .from("surveys")
        .select("id, name, wave, closes_at, perfil_objetivo")
        .in("perfil_objetivo", ["encuestador", "ambos"])
        .eq("status", "sent")
        .order("created_at", { ascending: false });

      setSurveys(sv ?? []);

      // Stats del día
      const hoy = new Date().toISOString().split("T")[0];
      if (op) {
        const { count: regCount } = await supabase
          .from("field_visits")
          .select("id", { count: "exact", head: true })
          .eq("operator_id", op.id)
          .gte("visited_at", hoy);

        const { count: encCount } = await supabase
          .from("responses")
          .select("id", { count: "exact", head: true })
          .eq("encuestador_id", op.id)
          .gte("responded_at", hoy + "T00:00:00");

        setStats({
          registrados: regCount ?? 0,
          verificados: regCount ?? 0,
          encuestas: encCount ?? 0,
        });

        // Ganancias del mes (devengado): reclutamiento + encuestas en campo
        const mesInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const { data: cfg } = await supabase
          .from("payment_config").select("encuesta_campo_cop, bono_reclutamiento_cop")
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        const campoCop = cfg?.encuesta_campo_cop ?? 0;
        const bonoCop = cfg?.bono_reclutamiento_cop ?? 0;

        const { count: reclutadosMes } = await supabase
          .from("participants").select("id", { count: "exact", head: true })
          .eq("recruited_by", op.id).gte("created_at", mesInicio);

        const { data: respMes } = await supabase
          .from("responses").select("participant_id, survey_id")
          .eq("encuestador_id", op.id).gte("responded_at", mesInicio);
        const encuestasMes = new Set((respMes ?? []).map(r => `${r.participant_id}|${r.survey_id}`)).size;

        setMes({
          reclutados: reclutadosMes ?? 0,
          encuestas: encuestasMes,
          ganadoReclutamiento: (reclutadosMes ?? 0) * bonoCop,
          ganadoEncuestas: encuestasMes * campoCop,
        });
      }

      setLoading(false);
    });
  }, [router]);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 px-5 pt-12 pb-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-emerald-300 text-sm">{hora}, {nombre}</p>
            <h1 className="text-2xl font-bold mt-0.5">Panel de Campo</h1>
            <p className="text-emerald-400 text-xs mt-0.5">GeoDataVoice · Encuestador</p>
          </div>
          <button onClick={logout}
            className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-emerald-300 hover:text-white hover:bg-white/20 transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>

        {/* Stats del día */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Registrados\nhoy", value: stats.registrados, color: "text-emerald-300" },
            { label: "Verificados\nhoy", value: stats.verificados, color: "text-white" },
            { label: "Encuestas\naplicadas", value: stats.encuestas, color: "text-yellow-300" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl bg-white/10 p-3 text-center">
              <div className={`text-2xl font-bold ${color}`}>
                {loading ? "—" : value}
              </div>
              <div className="text-xs text-emerald-300 mt-0.5 whitespace-pre-line leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">

        {/* Ganado este mes (devengado) */}
        <section className="rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 border border-emerald-500/20 p-5 text-white">
          <div className="flex items-center gap-2 mb-3">
            <Wallet className="h-4 w-4 text-emerald-300" />
            <h2 className="font-bold text-sm">Ganado este mes</h2>
          </div>
          <p className="text-3xl font-bold mb-3">
            ${(mes.ganadoReclutamiento + mes.ganadoEncuestas).toLocaleString("es-CO")}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xs text-emerald-300">Reclutamiento</p>
              <p className="font-bold">${mes.ganadoReclutamiento.toLocaleString("es-CO")}</p>
              <p className="text-[11px] text-emerald-200/70">{mes.reclutados} panelista{mes.reclutados === 1 ? "" : "s"}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-xs text-emerald-300">Encuestas en campo</p>
              <p className="font-bold">${mes.ganadoEncuestas.toLocaleString("es-CO")}</p>
              <p className="text-[11px] text-emerald-200/70">{mes.encuestas} aplicada{mes.encuestas === 1 ? "" : "s"}</p>
            </div>
          </div>
        </section>

        {/* Acción principal */}
        <Link href="/campo/encuestador/registrar">
          <div className="flex items-center gap-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 p-5 transition-colors active:scale-[0.98]">
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <UserPlus className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-white text-lg">Encuestar en campo</p>
              <p className="text-emerald-200 text-sm mt-0.5">
                Datos · Identidad · Consentimientos · GPS · Encuesta
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-emerald-200 shrink-0" />
          </div>
        </Link>

        {/* Código de reclutador */}
        {codigo && (
          <section className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide mb-0.5">Tu código de reclutador</p>
                <p className="text-xs text-amber-200/70 leading-relaxed">
                  Para que alguien sea panelista, que se registre <strong>desde su celular</strong> con este código. Así ganas tu bono.
                </p>
              </div>
              <div className="rounded-xl bg-amber-500/15 px-3 py-2 text-center shrink-0">
                <p className="text-xl font-bold text-white font-mono tracking-wider">{codigo}</p>
              </div>
            </div>
          </section>
        )}

        {/* Encuestas para aplicar */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList className="h-4 w-4 text-emerald-400" />
            <h2 className="font-bold text-white text-sm">Encuestas para aplicar en campo</h2>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2].map(n => <div key={n} className="h-16 animate-pulse rounded-2xl bg-slate-800" />)}
            </div>
          ) : surveys.length === 0 ? (
            <div className="rounded-2xl bg-slate-800 border border-white/5 p-5 text-center">
              <CheckCircle className="h-7 w-7 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No hay encuestas activas para campo</p>
            </div>
          ) : (
            <div className="space-y-3">
              {surveys.map(s => (
                <Link key={s.id} href={`/campo/encuestador/registrar?survey_id=${s.id}`}>
                  <div className="rounded-2xl bg-slate-800 border border-white/5 p-4 flex items-center gap-4 hover:bg-slate-700 transition-colors active:scale-[0.98]">
                    <div className="h-11 w-11 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <ClipboardList className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm leading-tight">{s.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400">Ola {s.wave}</span>
                        {s.closes_at && (
                          <span className="flex items-center gap-1 text-xs text-amber-400">
                            <Clock className="h-3 w-3" />
                            Cierra {new Date(s.closes_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                        Aplicar
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-500" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Progreso del día */}
        {!loading && stats.registrados > 0 && (
          <section className="rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-900 p-5 text-white">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-4 w-4 text-emerald-300" />
              <h2 className="font-bold text-sm">Progreso de hoy</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Personas registradas", value: stats.registrados, total: 10 },
                { label: "Encuestas aplicadas", value: stats.encuestas, total: 10 },
              ].map(({ label, value, total }) => (
                <div key={label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-200">{label}</span>
                    <span className="font-semibold">{value}/{total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full bg-white rounded-full transition-all"
                      style={{ width: `${Math.min((value / total) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
