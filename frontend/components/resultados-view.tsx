"use client";

import { useState } from "react";
import { Resultados, Distribucion, SENTIMENT_COLOR, SENTIMENT_LABELS } from "@/lib/resultados";
import { MessageSquareQuote, Users, ClipboardCheck, Mic, Activity, ChevronDown, ChevronUp, List } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
} from "recharts";

const SENTIMENT_HEX: Record<string, string> = {
  positivo: "#10b981", negativo: "#ef4444", neutral: "#94a3b8", mixto: "#f59e0b",
};

function Barras({ data, colorClass, colorMap }: {
  data: Distribucion; colorClass?: string; colorMap?: Record<string, string>;
}) {
  const totalCount = data.reduce((s, d) => s + d.count, 0);
  if (totalCount === 0) return <p className="text-sm text-slate-500">Sin datos aún.</p>;
  const ponderada = data.some(d => d.peso != null);
  const totalPeso = data.reduce((s, d) => s + (d.peso ?? 0), 0) || 1;
  return (
    <div className="space-y-2.5">
      {data.map(d => {
        const pctCrudo = Math.round((d.count / totalCount) * 100);
        const pct = ponderada ? Math.round(((d.peso ?? 0) / totalPeso) * 100) : pctCrudo;
        const cls = colorMap?.[d.label.toLowerCase()] ?? colorClass ?? "bg-violet-500";
        return (
          <div key={d.label}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 capitalize">{d.label}</span>
              <span className="text-slate-400 font-medium">
                {ponderada
                  ? <>{pct}% <span className="text-slate-600">· {pctCrudo}% sin ponderar · {d.count}</span></>
                  : <>{d.count} · {pct}%</>}
              </span>
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

function SentimentDonut({ data }: { data: Distribucion }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="text-sm text-slate-500">Sin datos aún.</p>;
  const chart = data.map(d => ({
    name: SENTIMENT_LABELS[d.label] ?? d.label, raw: d.label, value: d.count,
  }));
  return (
    <div className="flex items-center gap-4">
      <div className="h-40 w-40 shrink-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chart} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
              {chart.map((e) => <Cell key={e.raw} fill={SENTIMENT_HEX[e.raw] ?? "#94a3b8"} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-white">{total}</span>
          <span className="text-[10px] text-slate-500">análisis</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        {chart.map(e => {
          const pct = Math.round((e.value / total) * 100);
          return (
            <div key={e.raw} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: SENTIMENT_HEX[e.raw] ?? "#94a3b8" }} />
              <span className="text-slate-300 flex-1">{e.name}</span>
              <span className="text-slate-400 font-medium">{e.value} · {pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopicsBar({ data }: { data: Distribucion }) {
  if (data.length === 0) return <p className="text-sm text-slate-500">Sin datos aún.</p>;
  const chart = data.slice(0, 6);
  return (
    <div style={{ height: Math.max(chart.length * 38, 80) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chart} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" width={110} tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
          <Tooltip cursor={{ fill: "rgba(255,255,255,0.04)" }} contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, fontSize: 12 }} />
          <Bar dataKey="count" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const GENDER_LABELS: Record<string, string> = {
  male: "Hombre", female: "Mujer", non_binary: "No binario", prefer_not: "Prefiere no decir",
};

function ListadoRespuestas({ r }: { r: Resultados }) {
  const [open, setOpen] = useState(false);
  const [limite, setLimite] = useState(25);
  if (r.individuales.length === 0) return null;

  const preguntas = r.preguntas;
  const filas = r.individuales.slice(0, limite);

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900 overflow-hidden print:hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-white">
          <List className="h-4 w-4 text-violet-400" />
          Respuestas individuales
          <span className="rounded-full bg-violet-500/15 text-violet-300 text-[11px] px-2 py-0.5 font-medium">{r.individuales.length}</span>
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
      </button>

      {open && (
        <div className="border-t border-white/5 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/5 text-slate-500">
                <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">#</th>
                <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Nombre</th>
                <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Estrato</th>
                <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Género</th>
                <th className="text-left px-4 py-2.5 font-medium whitespace-nowrap">Fecha</th>
                {preguntas.map((q, i) => (
                  <th key={q.id} className="text-left px-4 py-2.5 font-medium whitespace-nowrap max-w-[160px]">
                    <span className="text-violet-400">P{i + 1}</span> {q.text.slice(0, 40)}{q.text.length > 40 ? "…" : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((ind, idx) => (
                <tr key={ind.participantId} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-2.5 text-slate-300 whitespace-nowrap">{ind.nombre}</td>
                  <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{ind.estrato ?? "—"}</td>
                  <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{ind.gender ? (GENDER_LABELS[ind.gender] ?? ind.gender) : "—"}</td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                    {ind.fecha ? new Date(ind.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                  </td>
                  {preguntas.map(q => (
                    <td key={q.id} className="px-4 py-2.5 text-slate-300 max-w-[200px] truncate">
                      {ind.respuestas[q.id] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {r.individuales.length > limite && (
            <div className="px-5 py-3 border-t border-white/5">
              <button
                onClick={() => setLimite(v => v + 25)}
                className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
              >
                Ver más ({r.individuales.length - limite} restantes)
              </button>
            </div>
          )}
        </div>
      )}
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
          <Card title="Sentimiento" icon={Activity}><SentimentDonut data={r.sentimiento} /></Card>
          <Card title="Temas dominantes" icon={Activity}><TopicsBar data={r.temas} /></Card>
          {r.emociones.length > 0 && (
            <Card title="Emociones" icon={Activity}><Barras data={r.emociones} colorClass="bg-blue-500" /></Card>
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
              <p className="text-xs text-slate-500 mb-4 flex items-center gap-2">
                {q.total} respuesta{q.total === 1 ? "" : "s"}
                {q.ponderada && (
                  <span className="rounded-full bg-amber-500/15 text-amber-300 px-2 py-0.5 text-[10px] font-semibold">⚖ Ponderado por demografía</span>
                )}
              </p>
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

      {/* Listado individual */}
      <ListadoRespuestas r={r} />
    </div>
  );
}
