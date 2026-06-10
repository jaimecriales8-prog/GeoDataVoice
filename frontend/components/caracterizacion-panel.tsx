"use client";

type Grupo = { label: string; n: number; pct: number };

type Caracterizacion = {
  total: number;
  verificados?: number;
  activos?: number;
  tipo?: Grupo[];
  genero: Grupo[];
  edad: Grupo[];
  estrato: Grupo[];
  nivel_estudios: Grupo[];
  departamento: Grupo[];
  estado?: Grupo[];
};

const COLORES = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-orange-500", "bg-slate-500",
];

function BarraGrupo({ grupos, titulo }: { grupos: Grupo[]; titulo: string }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{titulo}</h4>
      <div className="space-y-2">
        {grupos.map((g, i) => (
          <div key={g.label}>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span>{g.label}</span>
              <span className="tabular-nums">{g.n.toLocaleString("es-CO")} <span className="text-slate-500">({g.pct}%)</span></span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full rounded-full ${COLORES[i % COLORES.length]}`} style={{ width: `${g.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CaracterizacionPanel({ data, titulo = "Caracterización del panel" }: { data: Caracterizacion; titulo?: string }) {
  const tasaVerif = data.verificados !== undefined ? Math.round((data.verificados / (data.total || 1)) * 100) : null;

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-white">{titulo}</h3>
        <span className="text-xs text-slate-500">{data.total.toLocaleString("es-CO")} personas</span>
      </div>

      {/* KPIs superiores */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-white/5 p-3 text-center">
          <div className="text-xl font-bold text-white">{data.total.toLocaleString("es-CO")}</div>
          <div className="text-xs text-slate-500 mt-0.5">Total</div>
        </div>
        {tasaVerif !== null && (
          <div className="rounded-xl bg-emerald-500/10 p-3 text-center">
            <div className="text-xl font-bold text-emerald-400">{tasaVerif}%</div>
            <div className="text-xs text-slate-500 mt-0.5">Identidad verificada</div>
          </div>
        )}
        {data.activos !== undefined && (
          <div className="rounded-xl bg-violet-500/10 p-3 text-center">
            <div className="text-xl font-bold text-violet-400">{data.activos.toLocaleString("es-CO")}</div>
            <div className="text-xs text-slate-500 mt-0.5">Verificados KYC</div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.tipo && <BarraGrupo grupos={data.tipo} titulo="Tipo de respondente" />}
        {data.estado && <BarraGrupo grupos={data.estado} titulo="Estado" />}
        <BarraGrupo grupos={data.genero} titulo="Género" />
        <BarraGrupo grupos={data.edad} titulo="Edad" />
        <BarraGrupo grupos={data.estrato} titulo="Estrato" />
        <BarraGrupo grupos={data.nivel_estudios.slice(0, 5)} titulo="Nivel de estudios" />
        <BarraGrupo grupos={data.departamento} titulo="Departamento (top 8)" />
      </div>
    </div>
  );
}
