"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { MapPin, Loader2, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";

export default function RegistroEncuestadorPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    documento: "",
    phone: "",
    municipio: "",
    email: "",
    password: "",
    experiencia: "",
  });

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.documento || !form.phone || !form.email || !form.password) {
      setError("Completa los campos obligatorios."); return;
    }
    if (form.password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }

    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          role: "encuestador",
          documento: form.documento,
          phone: form.phone,
          municipio: form.municipio,
          experiencia: form.experiencia,
          status: "pending_approval",
        },
      },
    });

    if (authError) {
      setError(authError.message === "User already registered"
        ? "Este email ya está registrado." : "Error al crear la cuenta.");
      setLoading(false); return;
    }
    setStep("done");
    setLoading(false);
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-10 w-10 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">¡Solicitud enviada!</h1>
          <p className="text-slate-300 mb-6">
            Recibirás una llamada o mensaje del coordinador de campo para confirmar tu disponibilidad y asignarte un territorio.
          </p>
          <button onClick={() => router.push("/")}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-7 py-3 text-white font-semibold transition-colors">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 px-4 py-10">
      <div className="mx-auto w-full max-w-md">

        <button onClick={() => router.push("/#perfiles")} className="flex items-center gap-2 text-emerald-300 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-emerald-300 uppercase tracking-wider font-semibold">Registro</p>
            <h1 className="text-2xl font-bold text-white">Soy encuestador</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-7">
          <form onSubmit={handleSubmit} className="space-y-4">

            <Field label="Nombre completo *" color="emerald">
              <input value={form.full_name} onChange={e => update("full_name", e.target.value)}
                placeholder="Tu nombre completo" className={input("emerald")} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="N° de documento *" color="emerald">
                <input value={form.documento} onChange={e => update("documento", e.target.value)}
                  placeholder="CC o TI" className={input("emerald")} />
              </Field>
              <Field label="Celular *" color="emerald">
                <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
                  placeholder="300..." className={input("emerald")} />
              </Field>
            </div>

            <Field label="Municipio donde puedes trabajar" color="emerald">
              <input value={form.municipio} onChange={e => update("municipio", e.target.value)}
                placeholder="Ej: Barranquilla, Soledad" className={input("emerald")} />
            </Field>

            <Field label="¿Tienes experiencia en trabajo de campo?" color="emerald">
              <select value={form.experiencia} onChange={e => update("experiencia", e.target.value)} className={input("emerald")}>
                <option value="">Selecciona...</option>
                <option value="no">No tengo experiencia previa</option>
                <option value="menos1">Menos de 1 año</option>
                <option value="1-3">Entre 1 y 3 años</option>
                <option value="mas3">Más de 3 años</option>
              </select>
            </Field>

            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-emerald-300 mb-3 uppercase tracking-wide font-semibold">Datos de acceso</p>
              <div className="space-y-4">
                <Field label="Email *" color="emerald">
                  <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                    placeholder="tu@email.com" className={input("emerald")} />
                </Field>
                <Field label="Contraseña *" color="emerald">
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={form.password}
                      onChange={e => update("password", e.target.value)}
                      placeholder="Mínimo 8 caracteres" className={`${input("emerald")} pr-11`} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              </div>
            </div>

            {error && <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 py-3.5 text-white font-semibold transition-colors">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Enviando..." : "Aplicar como encuestador"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-emerald-400 hover:text-white transition-colors">Ingresar</a>
        </p>
      </div>
    </div>
  );
}

const input = (c: string) => `w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-${c}-500 focus:ring-1 focus:ring-${c}-500 transition-colors`;

function Field({ label, children, color }: { label: string; children: React.ReactNode; color: string }) {
  return (
    <div>
      <label className={`block text-xs font-medium text-${color}-300 mb-1.5 uppercase tracking-wide`}>{label}</label>
      {children}
    </div>
  );
}
