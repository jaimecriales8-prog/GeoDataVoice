"use client";

type Grupo = { label: string; n: number; pct: number };

type Caracterizacion = {
  total: number;
  verificados?: number;
  activos?: number;
  tipo?: Grupo[];
  genero?: Grupo[];
  edad?: Grupo[];
  estrato?: Grupo[];
  nivel_estudios?: Grupo[];
  departamento?: Grupo[];
  municipio?: Grupo[];
  estado_civil?: Grupo[];
  actividades?: Grupo[];
  regimen_salud?: Grupo[];
  tenencia_vivienda?: Grupo[];
  grupo_etnico?: Grupo[];
  registrado_votar?: Grupo[];
  recibe_subsidios?: Grupo[];
  acceso_internet?: Grupo[];
  estado?: Grupo[];
};

const COLORES = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-orange-500", "bg-slate-500",
];

function BarraGrupo({ grupos, titulo }: { grupos: Grupo[]; titulo: string }) {
  if (!grupos?.length) return null;
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
              <div className={`h-full rounded-full ${COLORES[i % COLORES.length]}`} style={{ width: `${Math.max(g.pct, 2)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CaracterizacionPanel({ data, titulo = "Caracterización del panel" }: { data: Caracterizacion; titulo?: string }) {
  const tasaVerif = data.verificados !== undefined ? Math.round((data.verificados / (data.total || 1)) * 100) : null;

  const secciones: { grupos: Grupo[] | undefined; titulo: string }[] = [
    { grupos: data.tipo,            titulo: "Tipo de respondente" },
    { grupos: data.estado,          titulo: "Estado" },
    { grupos: data.genero,          titulo: "Género" },
    { grupos: data.edad,            titulo: "Edad" },
    { grupos: data.estrato,         titulo: "Estrato socioeconómico" },
    { grupos: data.nivel_estudios,  titulo: "Nivel de estudios" },
    { grupos: data.estado_civil,    titulo: "Estado civil" },
    { grupos: data.actividades,     titulo: "Actividad económica" },
    { grupos: data.regimen_salud,   titulo: "Régimen de salud" },
    { grupos: data.tenencia_vivienda, titulo: "Vivienda" },
    { grupos: data.grupo_etnico,    titulo: "Grupo étnico" },
    { grupos: data.departamento,    titulo: "Departamento (top 8)" },
    { grupos: data.municipio,       titulo: "Municipio (top 8)" },
    { grupos: data.registrado_votar, titulo: "Registro electoral" },
    { grupos: data.recibe_subsidios, titulo: "Recibe subsidios" },
    { grupos: data.acceso_internet,  titulo: "Acceso a internet" },
  ].filter(s => s.grupos && s.grupos.length > 0);

  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold text-white">{titulo}</h3>
        <span className="text-xs text-slate-500">{data.total.toLocaleString("es-CO")} personas</span>
      </div>

      {/* KPIs */}
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

      {secciones.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-4">Los panelistas aún no han completado su perfil demográfico.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {secciones.map(s => <BarraGrupo key={s.titulo} grupos={s.grupos!} titulo={s.titulo} />)}
        </div>
      )}
    </div>
  );
}
