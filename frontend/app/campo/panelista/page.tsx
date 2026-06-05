"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mic, ClipboardList, Wallet, Bell, ChevronRight,
  CheckCircle, Clock, Star, TrendingUp
} from "lucide-react";

type Survey = {
  id: string;
  name: string;
  wave: number;
  closes_at: string | null;
  status: string;
};

// Mock data — conectar a Supabase cuando las tablas estén creadas
const MOCK_SURVEYS: Survey[] = [
  { id: "s1", name: "Pulso ciudadano — Junio 2026", wave: 3, closes_at: "2026-06-10", status: "pending" },
  { id: "s2", name: "Satisfacción servicios públicos", wave: 2, closes_at: "2026-06-07", status: "pending" },
];

const MOCK_PAYMENTS = [
  { id: "p1", concept: "Encuesta Ola 2", amount: 3000, status: "paid", date: "2026-05-28" },
  { id: "p2", concept: "Audio Ola 2", amount: 2000, status: "paid", date: "2026-05-28" },
  { id: "p3", concept: "Encuesta Ola 3", amount: 3000, status: "pending", date: "—" },
];

export default function PanelistaHome() {
  const [hora, setHora] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setHora(h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches");
  }, []);

  const pendientes = MOCK_SURVEYS.filter(s => s.status === "pending").length;
  const totalGanado = MOCK_PAYMENTS.filter(p => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const pendientePago = MOCK_PAYMENTS.filter(p => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-br from-blue-700 to-blue-900 px-5 pt-12 pb-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-blue-200 text-sm">{hora}</p>
            <h1 className="text-2xl font-bold mt-0.5">Panel GeoDataVoice</h1>
          </div>
          <div className="h-11 w-11 rounded-full bg-white/20 flex items-center justify-center">
            <Star className="h-5 w-5 text-yellow-300" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Encuestas\npendientes", value: pendientes, color: "text-yellow-300" },
            { label: "Total\nganado", value: `$${totalGanado.toLocaleString()}`, color: "text-emerald-300" },
            { label: "Por\ncobrar", value: `$${pendientePago.toLocaleString()}`, color: "text-blue-200" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded-2xl bg-white/10 p-3 text-center">
              <div className={`text-lg font-bold ${color}`}>{value}</div>
              <div className="text-xs text-blue-200 mt-0.5 whitespace-pre-line leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 py-6 space-y-6">
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <Bell className="h-4 w-4 text-blue-600" />
              Encuestas pendientes
            </h2>
            {pendientes > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {pendientes}
              </span>
            )}
          </div>

          {MOCK_SURVEYS.length === 0 ? (
            <div className="rounded-2xl bg-white border border-slate-200 p-6 text-center">
              <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">¡Al día!</p>
              <p className="text-xs text-slate-500 mt-1">No tienes encuestas pendientes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {MOCK_SURVEYS.map(survey => (
                <Link key={survey.id} href={`/campo/panelista/encuesta/${survey.id}`}>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-4 active:bg-slate-50 transition-colors shadow-sm">
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                      <ClipboardList className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm leading-tight">{survey.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-500">Ola {survey.wave}</span>
                        {survey.closes_at && (
                          <span className="flex items-center gap-1 text-xs text-amber-600">
                            <Clock className="h-3 w-3" />
                            Cierra {new Date(survey.closes_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        +$3.000
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="font-bold text-slate-800 mb-3">Acceso rápido</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/campo/panelista/pagos">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col items-center gap-2 text-center active:bg-slate-50 transition-colors shadow-sm">
                <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-emerald-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Mis pagos</p>
                <p className="text-xs text-slate-500">Ver historial</p>
              </div>
            </Link>
            <Link href="/campo/panelista/encuesta/demo">
              <div className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col items-center gap-2 text-center active:bg-slate-50 transition-colors shadow-sm">
                <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center">
                  <Mic className="h-6 w-6 text-violet-600" />
                </div>
                <p className="text-sm font-semibold text-slate-800">Encuesta demo</p>
                <p className="text-xs text-slate-500">Probar flujo</p>
              </div>
            </Link>
          </div>
        </section>

        <section className="rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-5 text-white">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-blue-200" />
            <h2 className="font-bold text-sm">Mi progreso en el panel</h2>
          </div>
          <div className="space-y-3">
            {[
              { label: "Encuestas respondidas", value: 8, total: 10 },
              { label: "Audios enviados", value: 6, total: 10 },
              { label: "Pagos recibidos", value: 5, total: 6 },
            ].map(({ label, value, total }) => (
              <div key={label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-blue-200">{label}</span>
                  <span className="font-semibold">{value}/{total}</span>
                </div>
                <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                  <div className="h-full bg-white rounded-full transition-all"
                    style={{ width: `${(value / total) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-3 grid grid-cols-3 gap-1">
        {[
          { icon: ClipboardList, label: "Encuestas", href: "/campo/panelista", active: true },
          { icon: Mic, label: "Audio", href: "/campo/panelista/encuesta/demo", active: false },
          { icon: Wallet, label: "Pagos", href: "/campo/panelista/pagos", active: false },
        ].map(({ icon: Icon, label, href, active }) => (
          <Link key={label} href={href}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-colors ${active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}>
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </Link>
        ))}
      </div>
      <div className="h-20" />
    </div>
  );
}
