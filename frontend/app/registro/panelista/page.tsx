"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Mic, Loader2, ArrowLeft, CheckCircle, Phone, MapPin, User, Lock, Eye, EyeOff, Mail } from "lucide-react";

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.toUpperCase().trim());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function RegistroPanelistaPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [email, setEmail] = useState("");

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    documento: "",
    municipio: "",
    barrio: "",
    birth_year: "",
    gender: "",
    nequi_or_daviplata: "",
    email: "",
    password: "",
    password2: "",
  });

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validaciones
    if (!form.full_name || !form.phone || !form.documento || !form.municipio || !form.email || !form.password) {
      setError("Completa todos los campos obligatorios."); return;
    }
    if (!/^3\d{9}$/.test(form.phone)) {
      setError("Ingresa un celular colombiano válido (ej: 3001234567)."); return;
    }
    if (!/^\d{7,12}$/.test(form.documento)) {
      setError("El número de documento debe tener entre 7 y 12 dígitos."); return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres."); return;
    }
    if (form.password !== form.password2) {
      setError("Las contraseñas no coinciden."); return;
    }

    setLoading(true);
    setError("");
    const supabase = createClient();

    // 1. Crear cuenta en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          role: "panelista",
          municipio: form.municipio,
        },
      },
    });

    if (authError) {
      setError(authError.message === "User already registered"
        ? "Este email ya está registrado. Intenta iniciar sesión."
        : "Error al crear la cuenta. Intenta de nuevo.");
      setLoading(false); return;
    }

    // 2. Insertar en tabla participants
    if (authData.user) {
      const [docHash, phoneHash] = await Promise.all([
        sha256(form.documento),
        sha256(form.phone),
      ]);

      await supabase.from("participants").insert({
        id: authData.user.id,
        document_hash: docHash,
        phone_hash: phoneHash,
        name: form.full_name,
        gender: form.gender || null,
        birth_year: form.birth_year ? parseInt(form.birth_year) : null,
        status: "preregistered",
        kyc_status: "pending",
        phone_verified: false,
      });
    }

    setEmail(form.email || form.email);
    setStep("done");
    // Supabase enviará el email con el link → /auth/callback → /campo/verificar-identidad
    setLoading(false);
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-950 to-slate-900 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-full bg-amber-400/20 flex items-center justify-center mx-auto mb-5">
          <Mail className="h-10 w-10 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-3">¡Revisa tu correo!</h1>
        <p className="text-slate-300 mb-1 max-w-xs">
          Te enviamos un enlace de confirmación a
        </p>
        <p className="text-amber-300 font-semibold mb-6">{email}</p>

        <div className="rounded-2xl bg-white/10 border border-white/20 p-5 mb-8 w-full max-w-xs space-y-2 text-left">
          <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide mb-3">¿Qué sigue?</p>
          {[
            "Abre el correo que te enviamos y haz clic en el enlace",
            "Tu cuenta queda activa automáticamente",
            "Inicia sesión y responde tu primera encuesta",
            "Gana dinero por cada respuesta válida",
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
              <span className="h-5 w-5 rounded-full bg-amber-500/30 text-amber-300 text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{i + 1}</span>
              {s}
            </div>
          ))}
        </div>

        <button onClick={() => router.push("/login")}
          className="rounded-xl bg-amber-500 hover:bg-amber-600 px-7 py-3 text-white font-semibold transition-colors">
          Ir a iniciar sesión
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-950 to-slate-900 px-4 py-10">
      <div className="mx-auto w-full max-w-md">

        <button onClick={() => router.push("/registro")} className="flex items-center gap-2 text-amber-300 hover:text-white transition-colors mb-8 text-sm">
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

        {/* Beneficios */}
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 mb-6">
          <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide mb-2">¿Qué ganas?</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { v: "Pago", l: "por encuesta" },
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

            {/* Datos personales */}
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

            {/* Ubicación */}
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

            {/* Contacto y pagos */}
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center gap-2 mb-3">
                <Phone className="h-4 w-4 text-amber-400" />
                <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">Contacto y pagos</p>
              </div>
              <div className="space-y-3">
                <Field label="Celular *">
                  <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
                    placeholder="3001234567" inputMode="tel" className={inputCls} />
                </Field>
                <Field label="Número Nequi o Daviplata">
                  <input type="tel" value={form.nequi_or_daviplata} onChange={e => update("nequi_or_daviplata", e.target.value)}
                    placeholder="Mismo número o diferente" inputMode="tel" className={inputCls} />
                </Field>
              </div>
            </div>

            {/* Acceso */}
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center gap-2 mb-3">
                <Lock className="h-4 w-4 text-amber-400" />
                <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">Datos de acceso</p>
              </div>
              <div className="space-y-3">
                <Field label="Email *">
                  <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                    placeholder="tu@email.com" autoComplete="email" className={inputCls} />
                </Field>

                <Field label="Contraseña *">
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={form.password}
                      onChange={e => update("password", e.target.value)}
                      placeholder="Mínimo 8 caracteres" className={`${inputCls} pr-11`} />
                    <button type="button" onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                <Field label="Confirmar contraseña *">
                  <div className="relative">
                    <input type={showPass2 ? "text" : "password"} value={form.password2}
                      onChange={e => update("password2", e.target.value)}
                      placeholder="Repite tu contraseña" className={`${inputCls} pr-11`} />
                    <button type="button" onClick={() => setShowPass2(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {showPass2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 py-4 text-white font-bold text-base transition-colors">
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? "Creando cuenta..." : "Unirme al panel 🎤"}
            </button>

            <p className="text-xs text-slate-500 text-center">
              Al registrarte aceptas nuestra política de privacidad y el uso de tus datos bajo la Ley 1581/2012.
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-amber-400 hover:text-white transition-colors">Iniciar sesión</a>
        </p>
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
