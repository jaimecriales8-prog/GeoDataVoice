"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { MapPin, Loader2, Eye, EyeOff, LogOut, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeUser, setActiveUser] = useState<{ email: string; name: string; role: string } | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Check if already logged in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setActiveUser({
          email: data.user.email ?? "",
          name: data.user.user_metadata?.full_name ?? data.user.email ?? "Usuario",
          role: data.user.user_metadata?.role ?? "admin",
        });
      }
      setCheckingSession(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Ingresa tu email y contraseña."); return; }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError("Credenciales incorrectas. Verifica tu email y contraseña.");
      setLoading(false);
      return;
    }
    const role = data.user?.user_metadata?.role ?? "admin";
    const destino: Record<string, string> = {
      admin:       "/dashboard",
      cliente:     "/cliente",
      panelista:   "/campo/panelista",
      encuestador: "/campo/encuestador",
    };
    router.push(destino[role] ?? "/dashboard");
    router.refresh();
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setActiveUser(null);
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <MapPin className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">GeoDataVoice</h1>
          <p className="text-blue-300 text-sm mt-1">Inteligencia territorial validada</p>
        </div>

        {/* Ya hay sesión activa */}
        {activeUser && (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 mb-5">
            <p className="text-sm text-blue-300 mb-1">Sesión activa como</p>
            <p className="font-semibold text-white">{activeUser.name}</p>
            <p className="text-xs text-blue-300 mb-4">{activeUser.email}</p>
            <div className="flex gap-2">
              <button onClick={() => {
                const destino: Record<string, string> = { admin: "/dashboard", cliente: "/cliente", panelista: "/campo/panelista", encuestador: "/campo/encuestador" };
                router.push(destino[activeUser.role] ?? "/dashboard");
              }}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 py-2.5 text-sm font-semibold text-white transition-colors">
                Continuar <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 rounded-xl border border-white/20 hover:bg-white/10 px-3 py-2.5 text-sm text-white transition-colors">
                <LogOut className="h-3.5 w-3.5" /> Salir
              </button>
            </div>
          </div>
        )}

        {/* Formulario de login */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8">
          <h2 className="text-lg font-semibold text-white mb-1">
            {activeUser ? "Iniciar sesión con otra cuenta" : "Iniciar sesión"}
          </h2>
          {activeUser && (
            <p className="text-xs text-blue-300 mb-5">Ingresa credenciales de otra cuenta</p>
          )}
          {!activeUser && <div className="mb-6" />}

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

            <div>
              <label className="block text-xs font-medium text-blue-300 mb-1.5 uppercase tracking-wide">Contraseña</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 pr-11 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-3 text-white font-semibold text-sm transition-colors mt-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        {/* Registrarse */}
        <div className="mt-5 text-center">
          <p className="text-sm text-slate-500">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              Registrarse
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          GeoDataVoice © 2026 ·{" "}
          <a href="/" className="hover:text-slate-400 transition-colors">Volver al inicio</a>
        </p>
      </div>
    </div>
  );
}
