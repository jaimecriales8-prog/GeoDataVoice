"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  total: number;
  pagina: number;
  porPagina: number;
  onChange: (p: number) => void;
}

export default function Paginacion({ total, pagina, porPagina, onChange }: Props) {
  const totalPaginas = Math.ceil(total / porPagina);
  if (totalPaginas <= 1) return null;

  const desde = (pagina - 1) * porPagina + 1;
  const hasta = Math.min(pagina * porPagina, total);

  return (
    <div className="flex items-center justify-between pt-4 border-t border-white/5 mt-2">
      <p className="text-xs text-slate-500">
        {desde}–{hasta} de {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(pagina - 1)}
          disabled={pagina === 1}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {Array.from({ length: totalPaginas }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 1)
          .reduce<(number | "...")[]>((acc, p, i, arr) => {
            if (i > 0 && (arr[i - 1] as number) < p - 1) acc.push("...");
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "..." ? (
              <span key={`dots-${i}`} className="text-slate-600 px-1 text-xs">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onChange(p as number)}
                className={`h-8 w-8 rounded-lg text-xs font-medium transition-colors ${
                  pagina === p
                    ? "bg-violet-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {p}
              </button>
            )
          )}

        <button
          onClick={() => onChange(pagina + 1)}
          disabled={pagina === totalPaginas}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// Hook utilitario para paginar cualquier array
export function usePaginar<T>(items: T[], porPagina = 25) {
  const [pagina, setPagina] = useState(1);
  const total = items.length;
  const desde = (pagina - 1) * porPagina;
  const paginados = items.slice(desde, desde + porPagina);
  function resetPagina() { setPagina(1); }
  return { paginados, pagina, setPagina, total, resetPagina };
}
