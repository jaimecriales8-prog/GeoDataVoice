"use client";

import { ResultadosProyecto } from "@/lib/resultados";
import ResultadosView from "@/components/resultados-view";
import { TrendingUp, Target } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";

function Card({ title, icon: Icon, hint, children }: {
  title: string; icon?: React.ElementType; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900 p-5">
      <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-violet-400" />}{title}
      </h3>
      {hint && <p className="text-xs text-slate-500 mb-4">{hint}</p>}
      {!hint && <div className="mb-4" />}
      {children}
    </div>
  );
}

export default function ResultadosProyectoView({ data }: { data: ResultadosProyecto }) {
  const { agregado, porOla, indicadores } = data;
  const hayOlas = porOla.some(o => o.total > 0 || o.favorabilidad != null);
  const serie = porOla.map(o => ({ ...o, name: `Ola ${o.wave}` }));
  const tieneFav = porOla.some(o => o.favorabilidad != null);

  return (
    <div className="space-y-8">
      {/* 1. Evolución por ola (longitudinal) */}
      {hayOlas && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-violet-400" /> Evolución por ola
          </h2>
          <div className="grid lg:grid-cols-2 gap-4">
            <Card title="Sentimiento en el tiempo" hint="% de cada sentimiento ola tras ola">
              <div style={{ height: 220 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serie} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                    <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="positivo" name="Positivo" stroke="#10b981" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="negativo" name="Negativo" stroke="#ef4444" strokeWidth={2} dot />
                    <Line type="monotone" dataKey="neutral" name="Neutral" stroke="#94a3b8" strokeWidth={2} dot strokeDasharray="4 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {tieneFav && (
              <Card title="Favorabilidad en el tiempo" hint="% de respuestas positivas en preguntas de aprobación">
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={serie} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                      <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
                      <Line type="monotone" dataKey="favorabilidad" name="Favorabilidad" stroke="#8b5cf6" strokeWidth={2.5} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}
          </div>
        </section>
      )}

      {/* 2. Indicadores de seguimiento (misma pregunta entre olas) */}
      {indicadores.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-400" /> Indicadores de seguimiento
          </h2>
          <div className="space-y-3">
            {indicadores.map(ind => (
              <div key={ind.key} className="rounded-2xl border border-white/5 bg-slate-900 p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-white">{ind.text}</p>
                  <span className="text-[11px] font-mono text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">{ind.key}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {ind.olas.map(o => (
                    <div key={o.wave} className="rounded-xl bg-white/[0.03] border border-white/5 px-4 py-3 min-w-[120px]">
                      <p className="text-xs text-slate-500 mb-1">Ola {o.wave}</p>
                      {ind.esFavorabilidad && o.favorablePct != null ? (
                        <p className="text-2xl font-bold text-emerald-400">{o.favorablePct}%</p>
                      ) : (
                        <p className="text-sm text-slate-300">{o.distribucion[0]?.label ?? "—"}</p>
                      )}
                      <p className="text-[11px] text-slate-600 mt-0.5">{o.total} resp.</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Foto agregada del proyecto */}
      <section>
        <h2 className="text-sm font-semibold text-white mb-3">Foto agregada del proyecto</h2>
        <ResultadosView r={agregado} />
      </section>
    </div>
  );
}
