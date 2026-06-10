"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import { Building2, User, Mail, Phone, Save, Loader2, CheckCircle, Lock } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  candidate: "Candidato político",
  municipality: "Alcaldía / Gobernación",
  guild: "Gremio empresarial",
  private: "Empresa privada",
  ngo: "ONG / Fundación",
  other: "Otro",
};

type Client = {
  name: string;
  type: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  status: string;
};

export default function ClientePerfilPage() {
  const [data, setData] = useState<Client | null>(null);
  const [form, setForm] = useState({ name: "", contact_name: "", contact_phone: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState("");

  // Cambio de contraseña
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [savingPw, setSavingPw] = useState(false);
  const [pwOk, setPwOk] = useState(false);
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: auth }) => {
      if (!auth.user) return;
      const { data: c } = await supabase
        .from("clients")
        .select("name, type, contact_name, contact_email, contact_phone, status")
        .eq("id", auth.user.id)
        .single();
      if (c) {
        setData(c);
        setForm({ name: c.name, contact_name: c.contact_name, contact_phone: c.contact_phone ?? "" });
      }
      setLoading(false);
    });
  }, []);

  async function guardar() {
    setSaving(true); setError(""); setOk(false);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error: e } = await supabase
      .from("clients")
      .update({ name: form.name, contact_name: form.contact_name, contact_phone: form.contact_phone || null })
      .eq("id", auth.user.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setOk(true);
    setData(prev => prev ? { ...prev, ...form } : prev);
    setTimeout(() => setOk(false), 3000);
  }

  async function cambiarPassword() {
    setPwError(""); setPwOk(false);
    if (pwForm.next.length < 8) { setPwError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (pwForm.next !== pwForm.confirm) { setPwError("Las contraseñas no coinciden."); return; }
    setSavingPw(true);
    const supabase = createClient();
    const { error: e } = await supabase.auth.updateUser({ password: pwForm.next });
    setSavingPw(false);
    if (e) { setPwError(e.message); return; }
    setPwOk(true);
    setPwForm({ current: "", next: "", confirm: "" });
    setTimeout(() => setPwOk(false), 3000);
  }

  const inputCls = "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-colors";

  if (loading) return (
    <div className="p-8 flex items-center justify-center min-h-64">
      <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Mi perfil</h1>
        <p className="text-slate-400 text-sm mt-1">Datos de tu organización y cuenta</p>
      </div>

      {/* Organización */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Datos de la organización</h2>
            <p className="text-xs text-slate-500">{TYPE_LABELS[data?.type ?? ""] ?? data?.type}</p>
          </div>
          {data?.status && (
            <span className={`ml-auto text-xs px-2.5 py-1 rounded-full font-medium ${
              data.status === "active" ? "bg-emerald-500/15 text-emerald-400" :
              data.status === "pending" ? "bg-amber-500/15 text-amber-400" :
              "bg-slate-500/15 text-slate-400"
            }`}>
              {data.status === "active" ? "Activa" : data.status === "pending" ? "Pendiente" : data.status}
            </span>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre de la organización</label>
          <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="Ej: Alcaldía de Medellín" className={inputCls} />
        </div>

        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-slate-500 shrink-0" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Nombre del contacto</label>
            <input value={form.contact_name} onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
              placeholder="Tu nombre completo" className={inputCls} />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-slate-500 shrink-0" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Correo electrónico</label>
            <div className={`${inputCls} text-slate-500 cursor-not-allowed opacity-60`}>{data?.contact_email}</div>
            <p className="text-xs text-slate-600 mt-1">El correo no se puede cambiar desde aquí.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-slate-500 shrink-0" />
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Teléfono de contacto</label>
            <input value={form.contact_phone} onChange={e => setForm(p => ({ ...p, contact_phone: e.target.value }))}
              placeholder="+57 300 000 0000" type="tel" className={inputCls} />
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {ok && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4" /> Cambios guardados
          </div>
        )}

        <button onClick={guardar} disabled={saving}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors">
          {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : <><Save className="h-4 w-4" /> Guardar cambios</>}
        </button>
      </div>

      {/* Contraseña */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-xl bg-slate-500/10 flex items-center justify-center">
            <Lock className="h-4 w-4 text-slate-400" />
          </div>
          <h2 className="text-sm font-semibold text-white">Cambiar contraseña</h2>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Nueva contraseña</label>
          <input type="password" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
            placeholder="Mínimo 8 caracteres" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirmar nueva contraseña</label>
          <input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
            placeholder="Repite la contraseña" className={inputCls} />
        </div>

        {pwError && <p className="text-sm text-red-400">{pwError}</p>}
        {pwOk && (
          <div className="flex items-center gap-2 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4" /> Contraseña actualizada
          </div>
        )}

        <button onClick={cambiarPassword} disabled={savingPw}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-4 py-2.5 text-sm font-semibold text-white transition-colors">
          {savingPw ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando…</> : "Actualizar contraseña"}
        </button>
      </div>
    </div>
  );
}
