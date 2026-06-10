"use client";

import { ResultadosProyecto } from "@/lib/resultados";
import ResultadosView from "@/components/resultados-view";
import { TrendingUp, Target } from "lucide-react";
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend, BarChart, Bar, Cell,
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

export default function ResultadosProyectoView({ data, hideAgregado }: { data: ResultadosProyecto; hideAgregado?: boolean }) {
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

      {/* 2. Evolución por pregunta */}
      {indicadores.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-400" /> Evolución por pregunta
          </h2>
          <div className="space-y-4">
            {indicadores.map(ind => {
              // Recolectar todas las opciones únicas que aparecen en alguna ola
              const opciones = [...new Set(ind.olas.flatMap(o => o.distribucion.map(d => d.label)))];
              // Construir serie: una fila por ola con % de cada opción
              const serie = ind.olas.map(o => {
                const total = o.distribucion.reduce((s, d) => s + d.count, 0) || 1;
                const row: Record<string, string | number> = { name: `Ola ${o.wave}` };
                opciones.forEach(op => {
                  const d = o.distribucion.find(d => d.label === op);
                  row[op] = d ? Math.round((d.count / total) * 100) : 0;
                });
                if (ind.esFavorabilidad && o.favorablePct != null) row["Favorabilidad"] = o.favorablePct;
                return row;
              });

              // Paleta de colores
              const COLORS = ["#8b5cf6","#10b981","#f59e0b","#3b82f6","#ef4444","#ec4899","#14b8a6","#f97316"];

              return (
                <div key={ind.key} className="rounded-2xl border border-white/5 bg-slate-900 p-5">
                  <div className="flex items-start gap-2 mb-4">
                    <span className="mt-0.5 shrink-0 rounded-full bg-violet-500/20 text-violet-400 text-[10px] font-bold px-2 py-0.5">P{indicadores.indexOf(ind) + 1}</span>
                    <p className="text-sm font-semibold text-white leading-snug">{ind.text}</p>
                  </div>
                  {ind.esFavorabilidad ? (
                    <div style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={serie} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`${v}%`]} />
                          <Line type="monotone" dataKey="Favorabilidad" stroke="#10b981" strokeWidth={2.5} dot />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : opciones.length <= 8 ? (
                    <div style={{ height: Math.max(200, opciones.length * 28) }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={serie} margin={{ left: -20, right: 8, top: 4, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} unit="%" />
                          <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => [`${v}%`]} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          {opciones.map((op, i) => (
                            <Line key={op} type="monotone" dataKey={op} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    // Muchas opciones: mostrar barras por ola
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${ind.olas.length}, minmax(0,1fr))` }}>
                      {ind.olas.map(o => {
                        const total = o.distribucion.reduce((s, d) => s + d.count, 0) || 1;
                        const barData = o.distribucion.slice(0, 8).map(d => ({ name: d.label, pct: Math.round((d.count / total) * 100) }));
                        return (
                          <div key={o.wave}>
                            <p className="text-xs text-slate-500 mb-2 text-center">Ola {o.wave}</p>
                            <ResponsiveContainer width="100%" height={180}>
                              <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 8 }}>
                                <XAxis type="number" domain={[0,100]} tick={{ fill:"#94a3b8", fontSize:10 }} unit="%" axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="name" tick={{ fill:"#94a3b8", fontSize:10 }} axisLine={false} tickLine={false} width={80} />
                                <Tooltip contentStyle={{ background:"#0f172a", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, fontSize:11 }} formatter={(v:number) => [`${v}%`]} />
                                <Bar dataKey="pct" radius={[0,4,4,0]}>
                                  {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Foto agregada del proyecto */}
      {!hideAgregado && (
        <section>
          <h2 className="text-sm font-semibold text-white mb-3">Foto agregada del proyecto</h2>
          <ResultadosView r={agregado} />
        </section>
      )}
    </div>
  );
}
