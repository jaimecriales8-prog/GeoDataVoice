"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { MapPin, Loader2, CheckCircle, ArrowLeft } from "lucide-react";

export default function OlvideContrasenaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) { setError("Ingresa tu email."); return; }
    setLoading(true); setError("");
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (err) { setError("No se pudo enviar el correo. Verifica el email."); setLoading(false); return; }
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-2 mb-8">
          <MapPin className="h-6 w-6 text-blue-400" />
          <span className="text-white font-bold text-lg">GeoDataVoice</span>
        </div>

        {sent ? (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8 text-center">
            <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="text-white font-bold text-lg mb-2">Correo enviado</h2>
            <p className="text-slate-400 text-sm mb-6">
              Revisa tu bandeja de entrada y sigue el link para crear una nueva contraseña.
            </p>
            <Link href="/login" className="text-blue-400 text-sm hover:text-blue-300 transition-colors">
              Volver al inicio de sesión
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
            <h2 className="text-white font-bold text-xl mb-1">¿Olvidaste tu contraseña?</h2>
            <p className="text-slate-400 text-sm mb-6">
              Ingresa tu email y te enviamos un link para restablecerla.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-blue-300 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">{error}</div>
              )}
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-3 text-white font-semibold text-sm transition-colors">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? "Enviando..." : "Enviar link"}
              </button>
            </form>
          </div>
        )}

        <div className="mt-5 text-center">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
