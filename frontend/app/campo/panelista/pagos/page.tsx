"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle, Clock, Wallet, TrendingUp } from "lucide-react";

const PAYMENTS = [
  { id: "p1", concept: "Encuesta Ola 3", amount: 3000, status: "pending", date: "Pendiente" },
  { id: "p2", concept: "Audio Ola 2", amount: 2000, status: "paid", date: "28 mayo 2026" },
  { id: "p3", concept: "Encuesta Ola 2", amount: 3000, status: "paid", date: "28 mayo 2026" },
  { id: "p4", concept: "Audio Ola 1", amount: 2000, status: "paid", date: "14 mayo 2026" },
  { id: "p5", concept: "Encuesta Ola 1", amount: 3000, status: "paid", date: "14 mayo 2026" },
];

export default function PagosPage() {
  const router = useRouter();
  const total = PAYMENTS.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pendiente = PAYMENTS.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-bold text-slate-900">Mis pagos</h1>
      </div>

      {/* Summary */}
      <div className="px-5 py-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-emerald-600 p-4 text-white">
          <p className="text-xs text-emerald-200 mb-1">Total recibido</p>
          <p className="text-2xl font-extrabold">${total.toLocaleString()}</p>
          <p className="text-xs text-emerald-200 mt-0.5">COP</p>
        </div>
        <div className="rounded-2xl bg-amber-500 p-4 text-white">
          <p className="text-xs text-amber-100 mb-1">Por recibir</p>
          <p className="text-2xl font-extrabold">${pendiente.toLocaleString()}</p>
          <p className="text-xs text-amber-100 mt-0.5">COP · en 48h</p>
        </div>
      </div>

      {/* Info */}
      <div className="mx-5 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 mb-5">
        <div className="flex items-start gap-2">
          <Wallet className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            Los pagos se envían a tu Nequi o Daviplata registrado dentro de las 48 horas
            siguientes a la aprobación de la respuesta.
          </p>
        </div>
      </div>

      {/* Payment list */}
      <div className="px-5 space-y-3 pb-8">
        <h2 className="font-semibold text-slate-800 text-sm">Historial de pagos</h2>
        {PAYMENTS.map(p => (
          <div key={p.id}
            className="rounded-2xl bg-white border border-slate-200 px-4 py-3.5 flex items-center gap-4">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
              p.status === "paid" ? "bg-emerald-100" : "bg-amber-100"
            }`}>
              {p.status === "paid"
                ? <CheckCircle className="h-5 w-5 text-emerald-600" />
                : <Clock className="h-5 w-5 text-amber-500" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-800 text-sm">{p.concept}</p>
              <p className="text-xs text-slate-500 mt-0.5">{p.date}</p>
            </div>
            <div className="text-right">
              <p className={`font-bold text-sm ${p.status === "paid" ? "text-emerald-600" : "text-amber-500"}`}>
                +${p.amount.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">
                {p.status === "paid" ? "Pagado" : "Pendiente"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
