"use client";

import { Resultados, Distribucion, SENTIMENT_COLOR } from "@/lib/resultados";
import { MessageSquareQuote, Users, ClipboardCheck, Mic, Activity } from "lucide-react";

function Barras({ data, colorClass, colorMap }: {
  data: Distribucion;
  colorClass?: string;
  colorMap?: Record<string, string>;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="text-sm text-slate-500">Sin datos aún.</p>;
  // colorMap usa la clave original (label ya viene traducida en sentimiento)
  return (
    <div className="space-y-2.5">
      {data.map(d => {
        const pct = Math.round((d.count / total) * 100);
        const cls = colorMap?.[d.label.toLowerCase()] ?? colorClass ?? "bg-violet-500";
        return (
          <div key={d.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300">{d.label}</span>
              <span className="text-slate-400 font-medium">{d.count} · {pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full rounded-full ${cls}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900 p-5">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-violet-400" />}{title}
      </h3>
      {children}
    </div>
  );
}

export default function ResultadosView({ r }: { r: Resultados }) {
  if (r.respuestas === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
        <Activity className="h-10 w-10 text-slate-700 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">Aún no hay respuestas registradas</p>
        <p className="text-xs text-slate-600 mt-1">Los indicadores aparecerán cuando los panelistas respondan.</p>
      </div>
    );
  }

  // sentimiento usa colores por tipo (la label ya viene traducida → mapear por original no aplica; uso heurística)
  const sentColor: Record<string, string> = {
    positivo: SENTIMENT_COLOR.positivo, negativo: SENTIMENT_COLOR.negativo,
    neutral: SENTIMENT_COLOR.neutral, mixto: SENTIMENT_COLOR.mixto,
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Respuestas", value: r.respuestas, icon: ClipboardCheck, color: "text-violet-400" },
          { label: "Participantes", value: r.participantes, icon: Users, color: "text-blue-400" },
          { label: "Notas de voz analizadas", value: `${r.audiosProcesados}/${r.audios}`, icon: Mic, color: "text-emerald-400" },
          { label: "Intensidad promedio", value: r.intensidadProm != null ? r.intensidadProm.toFixed(1) + " / 5" : "—", icon: Activity, color: "text-amber-400" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-2xl border border-white/5 bg-slate-900 p-4">
            <Icon className={`h-4 w-4 ${color} mb-2`} />
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Análisis de voz (IA) */}
      {(r.sentimiento.length > 0 || r.temas.length > 0) && (
        <div className="grid lg:grid-cols-2 gap-4">
          <Card title="Sentimiento" icon={Activity}>
            <Barras data={r.sentimiento} colorMap={sentColor} />
          </Card>
          <Card title="Temas dominantes" icon={Activity}>
            <Barras data={r.temas} colorClass="bg-violet-500" />
          </Card>
          {r.emociones.length > 0 && (
            <Card title="Emociones" icon={Activity}>
              <Barras data={r.emociones} colorClass="bg-blue-500" />
            </Card>
          )}
          {r.citas.length > 0 && (
            <Card title="Voces ciudadanas" icon={MessageSquareQuote}>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {r.citas.map((c, i) => (
                  <div key={i} className="rounded-xl bg-white/[0.03] border border-white/5 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`h-2 w-2 rounded-full ${SENTIMENT_COLOR[c.sentiment] ?? "bg-slate-400"}`} />
                      <span className="text-[11px] text-slate-500">{c.topic}</span>
                    </div>
                    <p className="text-sm text-slate-200 italic">“{c.quote}”</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Resultados por pregunta */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Resultados por pregunta</h2>
        <div className="space-y-3">
          {r.preguntas.map((q, i) => (
            <div key={q.id} className="rounded-2xl border border-white/5 bg-slate-900 p-5">
              <p className="text-sm font-medium text-white mb-1">
                <span className="text-violet-400">{i + 1}.</span> {q.text}
              </p>
              <p className="text-xs text-slate-500 mb-4">{q.total} respuesta{q.total === 1 ? "" : "s"}</p>
              {q.distribucion.length > 0 ? (
                <Barras data={q.distribucion} colorClass="bg-violet-500" />
              ) : q.abiertas.length > 0 ? (
                <div className="space-y-2">
                  {q.abiertas.map((t, j) => (
                    <p key={j} className="text-sm text-slate-300 rounded-lg bg-white/[0.03] px-3 py-2">{t}</p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Sin respuestas aún.</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
