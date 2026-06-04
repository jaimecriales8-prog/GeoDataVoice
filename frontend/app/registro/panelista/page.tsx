"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, Loader2, ArrowLeft, CheckCircle, Phone, MapPin, User } from "lucide-react";

export default function RegistroPanelistaPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    documento: "",
    municipio: "",
    barrio: "",
    birth_year: "",
    gender: "",
    nequi_or_daviplata: "",
  });

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.phone || !form.documento || !form.municipio) {
      setError("Completa los campos obligatorios."); return;
    }
    if (!/^3\d{9}$/.test(form.phone)) {
      setError("Ingresa un celular colombiano válido (ej: 3001234567)."); return;
    }

    setLoading(true);
    setError("");

    // En MVP: guardamos en Supabase como participante pre-registrado
    // El equipo lo valida y activa manualmente
    await new Promise(r => setTimeout(r, 1500)); // simula envío

    setStep("done");
    setLoading(false);
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-950 to-slate-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-full bg-amber-400/20 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">¡Ya estás en la lista!</h1>
        <p className="text-slate-300 mb-2 max-w-xs">
          Un encuestador de GeoDataVoice visitará tu casa para verificar tu identidad y activar tu cuenta en el panel.
        </p>
        <div className="rounded-2xl bg-white/10 border border-white/20 p-5 mb-8 w-full max-w-xs space-y-2 text-left">
          <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide mb-3">¿Qué sigue?</p>
          {[
            "Un encuestador te visitará en los próximos días",
            "Verificarán tu identidad y residencia",
            "Activarás tu cuenta y recibirás la primera encuesta por WhatsApp",
            "Ganarás $2.000–$3.000 por cada encuesta respondida",
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="h-5 w-5 rounded-full bg-amber-500/30 text-amber-300 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
              {s}
            </div>
          ))}
        </div>
        <button onClick={() => router.push("/")}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 px-7 py-3 text-white font-semibold transition-colors">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-950 to-slate-900 px-4 py-10">
      <div className="mx-auto w-full max-w-md">

        <button onClick={() => router.push("/#perfiles")} className="flex items-center gap-2 text-amber-300 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
            <Mic className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-amber-300 uppercase tracking-wider font-semibold">Registro</p>
            <h1 className="text-2xl font-bold text-white">Quiero ser panelista</h1>
          </div>
        </div>

        {/* Beneficios rápidos */}
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 mb-6">
          <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide mb-2">¿Qué ganas?</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { v: "$2.000–3.000", l: "por encuesta" },
              { v: "15 min", l: "de tu tiempo" },
              { v: "Nequi", l: "o Daviplata" },
            ].map(({ v, l }) => (
              <div key={l} className="rounded-xl bg-white/10 p-2">
                <p className="text-amber-300 font-bold text-sm">{v}</p>
                <p className="text-xs text-slate-400 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="flex items-center gap-2 mb-1">
              <User className="h-4 w-4 text-amber-400" />
              <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">Tus datos</p>
            </div>

            <Field label="Nombre completo *">
              <input value={form.full_name} onChange={e => update("full_name", e.target.value)}
                placeholder="Como aparece en tu cédula" className={inputCls} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cédula *">
                <input value={form.documento} onChange={e => update("documento", e.target.value)}
                  placeholder="N° documento" inputMode="numeric" className={inputCls} />
              </Field>
              <Field label="Año nacimiento">
                <input value={form.birth_year} onChange={e => update("birth_year", e.target.value)}
                  placeholder="Ej: 1990" inputMode="numeric" className={inputCls} />
              </Field>
            </div>

            <Field label="Género">
              <select value={form.gender} onChange={e => update("gender", e.target.value)} className={inputCls}>
                <option value="">Prefiero no decir</option>
                <option value="female">Mujer</option>
                <option value="male">Hombre</option>
                <option value="other">Otro</option>
              </select>
            </Field>

            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-amber-400" />
                <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">Tu ubicación</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Municipio *">
                  <input value={form.municipio} onChange={e => update("municipio", e.target.value)}
                    placeholder="Ej: Barranquilla" className={inputCls} />
                </Field>
                <Field label="Barrio">
                  <input value={form.barrio} onChange={e => update("barrio", e.target.value)}
                    placeholder="Tu barrio" className={inputCls} />
                </Field>
              </div>
            </div>

            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="h-4 w-4 text-amber-400" />
                <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">Contacto y pagos</p>
              </div>
              <div className="space-y-3">
                <Field label="Celular (WhatsApp) *">
                  <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
                    placeholder="3001234567" inputMode="tel" className={inputCls} />
                </Field>
                <Field label="Número Nequi o Daviplata">
                  <input type="tel" value={form.nequi_or_daviplata} onChange={e => update("nequi_or_daviplata", e.target.value)}
                    placeholder="Mismo número o diferente" inputMode="tel" className={inputCls} />
                </Field>
              </div>
            </div>

            {error && <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 py-4 text-white font-bold text-base transition-colors">
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? "Enviando..." : "Quiero unirme al panel 🎤"}
            </button>

            <p className="text-xs text-slate-500 text-center">
              Un encuestador te visitará para verificar tu identidad antes de activar tu cuenta.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-amber-300 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
