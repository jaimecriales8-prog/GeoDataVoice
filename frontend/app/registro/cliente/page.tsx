"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { BarChart3, Loader2, Eye, EyeOff, ArrowLeft, CheckCircle } from "lucide-react";

const TIPOS_CLIENTE = [
  "Campaña electoral",
  "Alcaldía / Gobernación",
  "Municipio",
  "Gremio empresarial",
  "Empresa privada",
  "ONG / Fundación",
  "Otro",
];

export default function RegistroClientePage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "done">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    org_name: "",
    org_type: "",
    municipio: "",
    email: "",
    phone: "",
    password: "",
    password2: "",
  });
  const [showPass2, setShowPass2] = useState(false);

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name || !form.email || !form.password || !form.org_name || !form.org_type) {
      setError("Completa los campos obligatorios.");
      return;
    }
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (form.password !== form.password2) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    setError("");

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.full_name,
          role: "cliente",
        },
      },
    });

    if (authError) {
      setError(authError.message === "User already registered"
        ? "Este email ya está registrado. Intenta iniciar sesión."
        : "Error al crear la cuenta. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    // Insertar en tabla clients para que aparezca en el panel admin
    if (authData.user) {
      const TYPE_MAP: Record<string, string> = {
        "Campaña electoral": "political_campaign",
        "Alcaldía / Gobernación": "municipality",
        "Municipio": "municipality",
        "Gremio empresarial": "guild",
        "Empresa privada": "private",
        "ONG / Fundación": "ngo",
        "Otro": "other",
      };

      await supabase.from("clients").insert({
        id: authData.user.id,
        name: form.org_name,
        type: TYPE_MAP[form.org_type] ?? "other",
        contact_name: form.full_name,
        contact_email: form.email,
        contact_phone: form.phone || null,
        status: "pending",
      });
    }

    setStep("done");
    setLoading(false);
  }

  if (step === "done") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="h-20 w-20 rounded-full bg-violet-500/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="h-10 w-10 text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">¡Solicitud enviada!</h1>
          <p className="text-slate-300 mb-2">
            Tu cuenta como cliente ha sido creada. El equipo de GeoDataVoice revisará tu solicitud y te contactará en menos de 24 horas para activar tu acceso.
          </p>
          <p className="text-sm text-blue-300 mb-8">
            Revisa tu bandeja de entrada — te enviamos un correo de confirmación a <strong>{form.email}</strong>
          </p>
          <button onClick={() => router.push("/")}
            className="rounded-xl bg-violet-600 hover:bg-violet-700 px-7 py-3 text-white font-semibold transition-colors">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-10">
      <div className="mx-auto w-full max-w-md">

        <button onClick={() => router.push("/#perfiles")} className="flex items-center gap-2 text-blue-300 hover:text-white transition-colors mb-8 text-sm">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-xs text-violet-300 uppercase tracking-wider font-semibold">Registro</p>
            <h1 className="text-2xl font-bold text-white leading-tight">Soy cliente</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-7">
          <form onSubmit={handleSubmit} className="space-y-4">

            <Field label="Nombre completo *">
              <input value={form.full_name} onChange={e => update("full_name", e.target.value)}
                placeholder="Tu nombre" className={inputCls} />
            </Field>

            <Field label="Organización o campaña *">
              <input value={form.org_name} onChange={e => update("org_name", e.target.value)}
                placeholder="Nombre de tu organización" className={inputCls} />
            </Field>

            <Field label="Tipo de organización *">
              <select value={form.org_type} onChange={e => update("org_type", e.target.value)} className={inputCls}>
                <option value="">Selecciona...</option>
                {TIPOS_CLIENTE.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="Municipio o territorio de interés">
              <input value={form.municipio} onChange={e => update("municipio", e.target.value)}
                placeholder="Ej: Barranquilla, Atlántico" className={inputCls} />
            </Field>

            <div className="border-t border-white/10 pt-4">
              <p className="text-xs text-blue-300 mb-3 uppercase tracking-wide font-semibold">Datos de acceso</p>

              <div className="space-y-4">
                <Field label="Email *">
                  <input type="email" value={form.email} onChange={e => update("email", e.target.value)}
                    placeholder="tu@email.com" autoComplete="email" className={inputCls} />
                </Field>

                <Field label="Teléfono">
                  <input type="tel" value={form.phone} onChange={e => update("phone", e.target.value)}
                    placeholder="300 000 0000" className={inputCls} />
                </Field>

                <Field label="Contraseña *">
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={form.password}
                      onChange={e => update("password", e.target.value)}
                      placeholder="Mínimo 8 caracteres" autoComplete="new-password" className={`${inputCls} pr-11`} />
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
                      placeholder="Repite tu contraseña" autoComplete="new-password" className={`${inputCls} pr-11`} />
                    <button type="button" onClick={() => setShowPass2(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                      {showPass2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
              </div>
            </div>

            {error && <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 py-3.5 text-white font-semibold transition-colors">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Creando cuenta..." : "Solicitar acceso como cliente"}
            </button>

            <p className="text-xs text-slate-500 text-center">
              Al registrarte aceptas que el equipo de GeoDataVoice te contacte para activar tu cuenta.
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 mt-5">
          ¿Ya tienes cuenta?{" "}
          <a href="/login" className="text-blue-400 hover:text-white transition-colors">Ingresar</a>
        </p>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-blue-300 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
