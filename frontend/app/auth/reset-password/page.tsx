"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { MapPin, Lock, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
      setChecking(false);
    });
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pass.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (pass !== pass2) { setError("Las contraseñas no coinciden."); return; }
    setSaving(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password: pass });
    if (err) { setError(err.message); setSaving(false); return; }
    setDone(true);
    setSaving(false);
    setTimeout(() => router.push("/login"), 2500);
  }

  const inputCls = "w-full rounded-xl bg-slate-800 border border-white/15 px-4 py-3 text-white placeholder-slate-400 text-base focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <MapPin className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">GeoDataVoice</h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 space-y-5">
          {checking ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 text-blue-400 animate-spin" /></div>
          ) : done ? (
            <div className="text-center space-y-3">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Contraseña actualizada</h2>
              <p className="text-slate-400 text-sm">Te llevamos a iniciar sesión…</p>
            </div>
          ) : !hasSession ? (
            <div className="text-center space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Enlace inválido o expirado</h2>
              <p className="text-slate-400 text-sm">Solicita un nuevo enlace para restablecer tu contraseña.</p>
              <a href="/login" className="block w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-semibold text-white text-center transition-colors">Ir a iniciar sesión</a>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold text-white mb-1">Nueva contraseña</h2>
                <p className="text-slate-400 text-sm">Crea una contraseña para tu cuenta.</p>
              </div>
              <form onSubmit={guardar} className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type={show ? "text" : "password"} value={pass} onChange={e => setPass(e.target.value)}
                    placeholder="Mínimo 8 caracteres" className={`${inputCls} pl-10 pr-11`} />
                  <button type="button" onClick={() => setShow(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input type={show ? "text" : "password"} value={pass2} onChange={e => setPass2(e.target.value)}
                    placeholder="Repite tu contraseña" className={`${inputCls} pl-10`} />
                </div>
                {error && <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">{error}</div>}
                <button type="submit" disabled={saving}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 py-3.5 text-white font-semibold transition-colors">
                  {saving && <Loader2 className="h-5 w-5 animate-spin" />}
                  {saving ? "Guardando…" : "Guardar contraseña"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
