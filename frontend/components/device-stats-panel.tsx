"use client";

import { Smartphone, Monitor, Tablet, Wifi, Globe, Clock, AlertTriangle, Navigation } from "lucide-react";

type Grupo = { label: string; n: number; pct: number };

type DeviceStats = {
  total: number;
  device_type?: Grupo[];
  os?: Grupo[];
  browser?: Grupo[];
  connection_type?: Grupo[];
  ciudad?: Grupo[];
  referrer?: Grupo[];
  duracion?: Grupo[];
  prom_duracion_seg?: number | null;
  alerta_rapidas?: boolean;
  pct_rapidas?: number;
};

const COLORES = ["bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500", "bg-slate-500"];

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  mobile:  <Smartphone className="h-3.5 w-3.5" />,
  tablet:  <Tablet className="h-3.5 w-3.5" />,
  desktop: <Monitor className="h-3.5 w-3.5" />,
};

const DURACION_ORDER = ["< 1 min", "1–2 min", "2–5 min", "5–10 min", "> 10 min"];

function Barras({ grupos, titulo }: { grupos: Grupo[] | undefined; titulo: string }) {
  if (!grupos?.length) return null;
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{titulo}</h4>
      <div className="space-y-2">
        {grupos.map((g, i) => (
          <div key={g.label}>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                {titulo === "Dispositivo" && DEVICE_ICONS[g.label]}
                {g.label}
              </span>
              <span className="tabular-nums text-slate-500">{g.n.toLocaleString("es-CO")} <span className="text-slate-600">({g.pct}%)</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full rounded-full ${COLORES[i % COLORES.length]}`} style={{ width: `${Math.max(g.pct, 2)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDuracion(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export default function DeviceStatsPanel({ data }: { data: DeviceStats }) {
  if (!data || data.total === 0) return (
    <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 text-center">
      <Globe className="h-8 w-8 text-slate-700 mx-auto mb-2" />
      <p className="text-sm text-slate-500">Aún no hay datos de dispositivo.</p>
      <p className="text-xs text-slate-600 mt-1">Se capturan desde la próxima respuesta recibida.</p>
    </div>
  );

  // Ordenar duración por orden lógico
  const duracionOrdenada = data.duracion
    ? [...data.duracion].sort((a, b) => DURACION_ORDER.indexOf(a.label) - DURACION_ORDER.indexOf(b.label))
    : undefined;

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Desde dónde respondieron</h3>
        <span className="text-xs text-slate-500">{data.total.toLocaleString("es-CO")} con datos de dispositivo</span>
      </div>

      {/* Alerta respuestas rápidas */}
      {data.alerta_rapidas && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-300">Posibles respuestas rápidas</p>
            <p className="text-xs text-amber-400/70 mt-0.5">El {data.pct_rapidas}% respondió en menos de 1 minuto. Considera revisar la calidad de esas respuestas.</p>
          </div>
        </div>
      )}

      {/* KPIs de duración */}
      {data.prom_duracion_seg !== null && data.prom_duracion_seg !== undefined && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 p-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-lg font-bold text-white">{formatDuracion(data.prom_duracion_seg)}</p>
              <p className="text-xs text-slate-500">Duración promedio</p>
            </div>
          </div>
          {data.pct_rapidas !== undefined && (
            <div className="rounded-xl bg-white/5 p-3 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${data.alerta_rapidas ? "bg-amber-500/10" : "bg-emerald-500/10"}`}>
                <Clock className={`h-4 w-4 ${data.alerta_rapidas ? "text-amber-400" : "text-emerald-400"}`} />
              </div>
              <div>
                <p className={`text-lg font-bold ${data.alerta_rapidas ? "text-amber-400" : "text-white"}`}>{data.pct_rapidas}%</p>
                <p className="text-xs text-slate-500">Respondieron &lt; 1 min</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Grilla de gráficas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Barras grupos={data.device_type} titulo="Dispositivo" />
        <Barras grupos={data.os} titulo="Sistema operativo" />
        <Barras grupos={data.browser} titulo="Navegador" />
        <Barras grupos={data.connection_type} titulo="Tipo de conexión" />
        <Barras grupos={data.referrer} titulo="Canal de llegada" />
        <Barras grupos={duracionOrdenada} titulo="Duración de respuesta" />
        {data.ciudad && data.ciudad.length > 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <div className="flex items-center gap-2 mb-3">
              <Navigation className="h-3.5 w-3.5 text-slate-400" />
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Top ciudades (por IP)</h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {data.ciudad.map((g, i) => (
                <div key={g.label} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${COLORES[i % COLORES.length]}`} />
                  <span className="text-xs text-slate-300 flex-1 truncate">{g.label}</span>
                  <span className="text-xs text-slate-500 tabular-nums">{g.n} <span className="text-slate-600">({g.pct}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
