"use client";

import { Check, X } from "lucide-react";

type Props = {
  password: string;
  confirm?: string;
  /** Paleta del color de acento (según el perfil): blue | emerald | amber */
  accent?: "blue" | "emerald" | "amber";
};

const reglas = [
  { id: "len", label: "Al menos 8 caracteres", test: (p: string) => p.length >= 8 },
  { id: "may", label: "Una letra mayúscula", test: (p: string) => /[A-Z]/.test(p) },
  { id: "min", label: "Una letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { id: "num", label: "Un número", test: (p: string) => /\d/.test(p) },
];

export function passwordCumple(password: string) {
  return reglas.every((r) => r.test(password));
}

export function PasswordStrength({ password, confirm, accent = "blue" }: Props) {
  if (!password) return null;

  const cumplidas = reglas.filter((r) => r.test(password)).length;
  const nivel = cumplidas <= 1 ? 1 : cumplidas <= 3 ? 2 : 3; // 1 débil, 2 media, 3 fuerte
  const label = nivel === 1 ? "Débil" : nivel === 2 ? "Media" : "Fuerte";
  const barColor = nivel === 1 ? "bg-red-500" : nivel === 2 ? "bg-amber-500" : "bg-emerald-500";
  const labelColor = nivel === 1 ? "text-red-400" : nivel === 2 ? "text-amber-400" : "text-emerald-400";

  return (
    <div className="mt-2 space-y-2">
      {/* Barra de fortaleza */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${n <= nivel ? barColor : "bg-white/15"}`}
            />
          ))}
        </div>
        <span className={`text-xs font-semibold ${labelColor}`}>{label}</span>
      </div>

      {/* Condiciones */}
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {reglas.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.id} className={`flex items-center gap-1.5 text-[11px] ${ok ? "text-emerald-400" : "text-slate-400"}`}>
              {ok ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0 text-slate-500" />}
              {r.label}
            </li>
          );
        })}
      </ul>

      {/* Coincidencia */}
      {confirm !== undefined && confirm.length > 0 && (
        <div className={`flex items-center gap-1.5 text-[11px] ${password === confirm ? "text-emerald-400" : "text-red-400"}`}>
          {password === confirm ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
          {password === confirm ? "Las contraseñas coinciden" : "Las contraseñas no coinciden"}
        </div>
      )}
    </div>
  );
}
