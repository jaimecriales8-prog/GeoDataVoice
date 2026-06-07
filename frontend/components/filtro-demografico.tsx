"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import type { FiltroDemo } from "@/lib/resultados";

const VARS: { key: string; label: string; opciones: { value: string | number; label: string }[] }[] = [
  {
    key: "gender", label: "Sexo",
    opciones: [
      { value: "female", label: "Mujeres" },
      { value: "male", label: "Hombres" },
      { value: "non_binary", label: "No binario" },
      { value: "prefer_not", label: "Prefiere no decir" },
    ],
  },
  {
    key: "estrato", label: "Estrato",
    opciones: [1, 2, 3, 4, 5, 6].map(n => ({ value: n, label: `Estrato ${n}` })),
  },
  {
    key: "nivel_estudios", label: "Nivel de estudios",
    opciones: [
      { value: "primaria", label: "Primaria" },
      { value: "secundaria", label: "Bachillerato" },
      { value: "tecnico", label: "Técnico/Tecnólogo" },
      { value: "universitario", label: "Universitario" },
      { value: "posgrado", label: "Posgrado" },
      { value: "ninguno", label: "Ninguno" },
    ],
  },
  {
    key: "estado_civil", label: "Estado civil",
    opciones: [
      { value: "soltero", label: "Soltero/a" },
      { value: "casado", label: "Casado/a" },
      { value: "union_libre", label: "Unión libre" },
      { value: "separado", label: "Separado/a" },
      { value: "viudo", label: "Viudo/a" },
    ],
  },
  {
    key: "regimen_salud", label: "Régimen de salud",
    opciones: [
      { value: "contributivo", label: "Contributivo (EPS)" },
      { value: "subsidiado", label: "Subsidiado (Sisbén)" },
      { value: "especial", label: "Especial" },
      { value: "ninguno", label: "Ninguno" },
    ],
  },
  {
    key: "grupo_etnico", label: "Grupo étnico",
    opciones: [
      { value: "mestizo", label: "Mestizo/a" },
      { value: "afro", label: "Afrocolombiano/a" },
      { value: "indigena", label: "Indígena" },
      { value: "raizal", label: "Raizal" },
      { value: "rom", label: "Rom/Gitano" },
      { value: "otro", label: "Otro" },
    ],
  },
  {
    key: "tenencia_vivienda", label: "Tenencia vivienda",
    opciones: [
      { value: "propia", label: "Propia" },
      { value: "arrendada", label: "Arrendada" },
      { value: "familiar", label: "Familiar/cedida" },
      { value: "otro", label: "Otro" },
    ],
  },
];

type Props = {
  filtro: FiltroDemo | null;
  onChange: (f: FiltroDemo | null) => void;
  totalSinFiltro: number;
  totalFiltrado: number;
};

export function FiltroDemografico({ filtro, onChange, totalSinFiltro, totalFiltrado }: Props) {
  const [open, setOpen] = useState(false);
  const [varSel, setVarSel] = useState<string>(filtro?.variable ?? "");

  const varActual = VARS.find(v => v.key === varSel);
  const labelFiltro = filtro
    ? `${VARS.find(v => v.key === filtro.variable)?.label ?? filtro.variable}: ${
        VARS.find(v => v.key === filtro.variable)?.opciones.find(o => String(o.value) === String(filtro.valor))?.label ?? filtro.valor
      }`
    : null;

  function seleccionar(variable: string, valor: string | number) {
    onChange({ variable, valor });
    setOpen(false);
  }

  function limpiar() {
    onChange(null);
    setVarSel("");
    setOpen(false);
  }

  return (
    <div className="mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* Badge del filtro activo */}
        {filtro && (
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 border border-violet-500/30 px-3 py-1.5 text-xs text-violet-200">
            <Filter className="h-3 w-3" />
            <span>{labelFiltro}</span>
            <span className="text-violet-400/70">·</span>
            <span className="text-violet-300">{totalFiltrado} de {totalSinFiltro} respuestas</span>
            <button onClick={limpiar} className="ml-1 text-violet-400 hover:text-white transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Botón abrir/cerrar selector */}
        <button
          onClick={() => setOpen(v => !v)}
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
            open
              ? "border-violet-500 bg-violet-500/10 text-violet-200"
              : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          <Filter className="h-3 w-3" />
          {filtro ? "Cambiar filtro" : "Filtrar por demografía"}
        </button>
      </div>

      {/* Panel de selección */}
      {open && (
        <div className="mt-3 rounded-2xl border border-white/5 bg-slate-900 p-4">
          {/* Selector de variable */}
          <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Variable</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {VARS.map(v => (
              <button
                key={v.key}
                onClick={() => setVarSel(v.key)}
                className={`rounded-lg px-3 py-1.5 text-xs border transition-colors ${
                  varSel === v.key
                    ? "border-violet-500 bg-violet-500/15 text-violet-200"
                    : "border-white/10 text-slate-400 hover:bg-white/5"
                }`}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Valores de la variable seleccionada */}
          {varActual && (
            <>
              <p className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wide">Valor</p>
              <div className="flex flex-wrap gap-2">
                {varActual.opciones.map(o => (
                  <button
                    key={String(o.value)}
                    onClick={() => seleccionar(varActual.key, o.value)}
                    className={`rounded-lg px-3 py-1.5 text-xs border transition-colors ${
                      filtro?.variable === varActual.key && String(filtro.valor) === String(o.value)
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-200"
                        : "border-white/10 text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
