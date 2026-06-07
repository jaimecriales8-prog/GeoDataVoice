"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ArrowLeft, User, Mail, Phone, Wallet, Loader2,
  CheckCircle, LogOut, AlertCircle, ClipboardList,
} from "lucide-react";

export default function PerfilPanelista() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [emailOriginal, setEmailOriginal] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentNumber, setPaymentNumber] = useState("");
  const [ok, setOk] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) { router.replace("/login"); return; }

      const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
      setNombre(meta?.full_name || meta?.name || "");
      setEmailOriginal(user.email || "");
      setEmail(user.email || "");

      const { data: p } = await supabase
        .from("participants")
        .select("phone, payment_number")
        .eq("id", user.id)
        .maybeSingle();
      if (p) {
        setPhone(p.phone || "");
        setPaymentNumber(p.payment_number || "");
      }
      setLoading(false);
    });
  }, [router]);

  async function guardar() {
    setOk(""); setError(""); setSaving(true);
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) { setSaving(false); router.replace("/login"); return; }

    try {
      // 1. Datos en participants (teléfono + número de pago)
      const { error: upErr } = await supabase
        .from("participants")
        .update({ phone: phone.trim() || null, payment_number: paymentNumber.trim() || null })
        .eq("id", user.id);
      if (upErr) throw new Error(upErr.message);

      // 2. Correo (vía Supabase Auth → envía email de confirmación al nuevo correo)
      const nuevoEmail = email.trim().toLowerCase();
      if (nuevoEmail && nuevoEmail !== emailOriginal.toLowerCase()) {
        const { error: mailErr } = await supabase.auth.updateUser({ email: nuevoEmail });
        if (mailErr) throw new Error(mailErr.message);
        setOk("Datos guardados. Te enviamos un correo a tu nueva dirección para confirmar el cambio.");
      } else {
        setOk("Datos guardados correctamente.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-slate-50 max-w-md mx-auto relative shadow-xl pb-10">
      <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-4">
        <button onClick={() => router.back()} className="text-slate-500"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="font-bold text-slate-900">Mi perfil</h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 text-blue-500 animate-spin" /></div>
      ) : (
        <div className="px-5 py-5 space-y-5">
          {/* Identidad */}
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{nombre || "Panelista"}</p>
              <p className="text-xs text-slate-500">Panelista GeoDataVoice</p>
            </div>
          </div>

          {ok && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs text-emerald-700">{ok}</p>
            </div>
          )}
          {error && (
            <div className="rounded-2xl bg-red-50 border border-red-200 px-4 py-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Campos editables */}
          <div className="space-y-4">
            <Field label="Correo electrónico" icon={<Mail className="h-4 w-4 text-slate-400" />}>
              <input
                type="email" inputMode="email" autoCapitalize="off" autoCorrect="off"
                value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="tucorreo@ejemplo.com"
                className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none"
              />
            </Field>

            <Field label="Teléfono / WhatsApp" icon={<Phone className="h-4 w-4 text-slate-400" />}>
              <input
                type="tel" inputMode="tel"
                value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="3001234567"
                className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none"
              />
            </Field>

            <Field label="Número Nequi / Daviplata (para tus pagos)" icon={<Wallet className="h-4 w-4 text-slate-400" />}>
              <input
                type="tel" inputMode="tel"
                value={paymentNumber} onChange={(e) => setPaymentNumber(e.target.value)}
                placeholder="3001234567"
                className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none"
              />
            </Field>
          </div>

          <button
            onClick={guardar} disabled={saving}
            className="w-full rounded-2xl bg-blue-600 text-white font-semibold py-3.5 flex items-center justify-center gap-2 active:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar cambios"}
          </button>

          <div className="pt-2">
            <button
              onClick={cerrarSesion}
              className="w-full rounded-2xl border border-red-200 bg-white text-red-600 font-semibold py-3.5 flex items-center justify-center gap-2 active:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-slate-200 px-6 py-3 grid grid-cols-3 gap-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {[
          { icon: ClipboardList, label: "Encuestas", href: "/campo/panelista", active: false },
          { icon: Wallet, label: "Pagos", href: "/campo/panelista/pagos", active: false },
          { icon: User, label: "Perfil", href: "/campo/panelista/perfil", active: true },
        ].map(({ icon: Icon, label, href, active }) => (
          <a key={label} href={href}
            className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-colors ${active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"}`}>
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{label}</span>
          </a>
        ))}
      </div>
      <div className="h-20" />
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 focus-within:border-blue-400 transition-colors">
        {icon}
        {children}
      </div>
    </div>
  );
}
