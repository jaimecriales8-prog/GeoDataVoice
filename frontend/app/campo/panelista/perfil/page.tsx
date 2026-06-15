"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ArrowLeft, User, Mail, Phone, Wallet, Loader2,
  CheckCircle, LogOut, AlertCircle, ClipboardList, History, ChevronDown, ChevronUp,
} from "lucide-react";

export default function PerfilPanelista() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState("");
  const [emailOriginal, setEmailOriginal] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentWallet, setPaymentWallet] = useState<"nequi" | "daviplata" | "">("");
  const [paymentNumber, setPaymentNumber] = useState("");
  // Perfil socioeconómico
  const [estrato, setEstrato] = useState("");
  const [estadoCivil, setEstadoCivil] = useState("");
  const [nivelEstudios, setNivelEstudios] = useState("");
  const [actividades, setActividades] = useState<string[]>([]);
  const [tieneHijos, setTieneHijos] = useState(false);
  const [numHijos, setNumHijos] = useState("");
  const [regimenSalud, setRegimenSalud] = useState("");
  const [sisbenGrupo, setSisbenGrupo] = useState("");
  const [tenenciaVivienda, setTenenciaVivienda] = useState("");
  const [grupoEtnico, setGrupoEtnico] = useState("");
  const [antiguedadBarrio, setAntiguedadBarrio] = useState("");
  const [recibeSubsidios, setRecibeSubsidios] = useState(false);
  const [accesoInternet, setAccesoInternet] = useState(false);
  const [registradoVotar, setRegistradoVotar] = useState(false);
  const [ok, setOk] = useState("");
  const [error, setError] = useState("");
  const [historial, setHistorial] = useState<{ id: string; captured_at: string; data: Record<string, unknown> }[]>([]);
  const [histOpen, setHistOpen] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);


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
        .select("id, phone, payment_wallet, payment_number, estrato, estado_civil, nivel_estudios, actividades, num_hijos, regimen_salud, sisben_grupo, tenencia_vivienda, grupo_etnico, antiguedad_barrio, recibe_subsidios, acceso_internet, registrado_votar")
        .eq("user_id", user.id)
        .maybeSingle();
      if (p) {
        setParticipantId(p.id as string);
        setPhone(p.phone || "");
        setPaymentWallet((p.payment_wallet as "nequi" | "daviplata") || "");
        setPaymentNumber(p.payment_number || "");
        setEstrato(p.estrato ? String(p.estrato) : "");
        setEstadoCivil(p.estado_civil || "");
        setNivelEstudios(p.nivel_estudios || "");
        if (Array.isArray(p.actividades)) setActividades(p.actividades);
        setNumHijos(p.num_hijos ? String(p.num_hijos) : "");
        setTieneHijos(!!p.num_hijos && p.num_hijos > 0);
        setRegimenSalud(p.regimen_salud || "");
        setSisbenGrupo(p.sisben_grupo || "");
        setTenenciaVivienda(p.tenencia_vivienda || "");
        setGrupoEtnico(p.grupo_etnico || "");
        setAntiguedadBarrio(p.antiguedad_barrio || "");
        setRecibeSubsidios(!!p.recibe_subsidios);
        setAccesoInternet(!!p.acceso_internet);
        setRegistradoVotar(!!p.registrado_votar);
      }

      // Cargar historial de cambios
      const { data: hist } = await supabase
        .from("participant_profile_history")
        .select("id, captured_at, data")
        .eq("participant_id", participantId)
        .order("captured_at", { ascending: false })
        .limit(10);
      setHistorial((hist ?? []) as { id: string; captured_at: string; data: Record<string, unknown> }[]);

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
      // 1. Snapshot del perfil socioeconómico antes de sobrescribir
      const snapshot = {
        estrato: estrato ? parseInt(estrato) : null,
        estado_civil: estadoCivil || null,
        nivel_estudios: nivelEstudios || null,
        actividades: actividades.length > 0 ? actividades : null,
        num_hijos: tieneHijos ? (parseInt(numHijos) || 0) : 0,
        regimen_salud: regimenSalud || null,
        sisben_grupo: sisbenGrupo || null,
        tenencia_vivienda: tenenciaVivienda || null,
        grupo_etnico: grupoEtnico || null,
        antiguedad_barrio: antiguedadBarrio || null,
        recibe_subsidios: recibeSubsidios,
        acceso_internet: accesoInternet,
        registrado_votar: registradoVotar,
      };
      const { data: snap } = await supabase
        .from("participant_profile_history")
        .insert({ participant_id: participantId, data: snapshot })
        .select("id, captured_at, data")
        .single();
      if (snap) setHistorial(prev => [snap as { id: string; captured_at: string; data: Record<string, unknown> }, ...prev].slice(0, 10));

      // 2. Datos en participants (teléfono + número de pago)
      const { error: upErr } = await supabase
        .from("participants")
        .update({
          phone: phone.trim() || null,
          payment_wallet: paymentWallet || null,
          payment_number: paymentNumber.trim() || null,
          estrato: estrato ? parseInt(estrato) : null,
          estado_civil: estadoCivil || null,
          nivel_estudios: nivelEstudios || null,
          actividades: actividades.length > 0 ? actividades : null,
          num_hijos: tieneHijos ? (parseInt(numHijos) || 0) : 0,
          regimen_salud: regimenSalud || null,
          sisben_grupo: sisbenGrupo || null,
          tenencia_vivienda: tenenciaVivienda || null,
          grupo_etnico: grupoEtnico || null,
          antiguedad_barrio: antiguedadBarrio || null,
          recibe_subsidios: recibeSubsidios,
          acceso_internet: accesoInternet,
          registrado_votar: registradoVotar,
        })
        .eq("user_id", user.id);
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

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Billetera para tus pagos</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { val: "nequi", label: "Nequi" },
                  { val: "daviplata", label: "Daviplata" },
                ] as const).map(({ val, label }) => (
                  <button
                    key={val} type="button"
                    onClick={() => setPaymentWallet(val)}
                    className={`rounded-2xl border py-3 text-sm font-semibold transition-colors ${
                      paymentWallet === val
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-600 active:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Número de la billetera (para tus pagos)" icon={<Wallet className="h-4 w-4 text-slate-400" />}>
              <input
                type="tel" inputMode="tel"
                value={paymentNumber} onChange={(e) => setPaymentNumber(e.target.value)}
                placeholder="3001234567"
                className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none"
              />
            </Field>

            {/* Perfil socioeconómico */}
            <div className="pt-2">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Perfil socioeconómico</p>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Estrato" value={estrato} onChange={setEstrato}>
                    <option value="">Sin respuesta</option>
                    {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                  </Select>
                  <Select label="Estado civil" value={estadoCivil} onChange={setEstadoCivil}>
                    <option value="">Sin respuesta</option>
                    <option value="soltero">Soltero/a</option>
                    <option value="casado">Casado/a</option>
                    <option value="union_libre">Unión libre</option>
                    <option value="separado">Separado/a</option>
                    <option value="divorciado">Divorciado/a</option>
                    <option value="viudo">Viudo/a</option>
                  </Select>
                </div>
                <Select label="Nivel de estudios" value={nivelEstudios} onChange={setNivelEstudios}>
                  <option value="">Sin respuesta</option>
                  <option value="bachiller">Bachiller</option>
                  <option value="tecnico_tecnologo">Técnico / Tecnólogo</option>
                  <option value="profesional">Profesional</option>
                  <option value="posgrado">Posgrado</option>
                </Select>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Actividad (puede elegir varias)</label>
                  <div className="flex flex-wrap gap-2">
                    {[["estudiante","Estudiante"],["empleado","Empleado"],["independiente","Independiente"],["desempleado","Desempleado"]].map(([v, l]) => {
                      const sel = actividades.includes(v);
                      return (
                        <button key={v} type="button"
                          onClick={() => setActividades(prev => sel ? prev.filter(a => a !== v) : [...prev, v])}
                          className={`rounded-xl px-3 py-2 text-sm border font-medium transition-colors ${sel ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600"}`}>
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3">
                  <Toggle label="¿Tiene hijos?" val={tieneHijos} set={() => { setTieneHijos(v => !v); if (tieneHijos) setNumHijos(""); }} />
                  {tieneHijos && (
                    <div className="mt-3">
                      <Field label="¿Cuántos hijos?" icon={<User className="h-4 w-4 text-slate-400" />}>
                        <input value={numHijos} onChange={(e) => setNumHijos(e.target.value)} placeholder="Ej: 2" inputMode="numeric"
                          className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 outline-none" />
                      </Field>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Régimen de salud" value={regimenSalud} onChange={setRegimenSalud}>
                    <option value="">Sin respuesta</option>
                    <option value="subsidiado">Subsidiado</option>
                    <option value="contributivo">Contributivo</option>
                    <option value="especial">Especial</option>
                    <option value="ninguno">Ninguno</option>
                  </Select>
                  <Select label="SISBEN" value={sisbenGrupo} onChange={setSisbenGrupo}>
                    <option value="">Sin respuesta</option>
                    <option value="no">No está en SISBEN</option>
                    <option value="A">Grupo A</option>
                    <option value="B">Grupo B</option>
                    <option value="C">Grupo C</option>
                    <option value="D">Grupo D</option>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Select label="Vivienda" value={tenenciaVivienda} onChange={setTenenciaVivienda}>
                    <option value="">Sin respuesta</option>
                    <option value="propia">Propia</option>
                    <option value="arriendo">Arriendo</option>
                    <option value="familiar">Familiar</option>
                  </Select>
                  <Select label="Grupo étnico" value={grupoEtnico} onChange={setGrupoEtnico}>
                    <option value="">Sin respuesta</option>
                    <option value="ninguno">Ninguno</option>
                    <option value="afro">Afrodescendiente</option>
                    <option value="indigena">Indígena</option>
                    <option value="raizal">Raizal</option>
                    <option value="otro">Otro</option>
                  </Select>
                </div>
                <Select label="Antigüedad en el barrio" value={antiguedadBarrio} onChange={setAntiguedadBarrio}>
                  <option value="">Sin respuesta</option>
                  <option value="menos_1">Menos de 1 año</option>
                  <option value="1_5">1 a 5 años</option>
                  <option value="5_10">5 a 10 años</option>
                  <option value="mas_10">Más de 10 años</option>
                </Select>
                <div className="space-y-2">
                  {[
                    { label: "¿Recibe subsidios del Estado?", val: recibeSubsidios, set: setRecibeSubsidios },
                    { label: "¿Tiene smartphone con internet?", val: accesoInternet, set: setAccesoInternet },
                    { label: "¿Está registrado para votar?", val: registradoVotar, set: setRegistradoVotar },
                  ].map(({ label, val, set }) => (
                    <div key={label} className="rounded-2xl border border-slate-200 bg-white px-3 py-2.5">
                      <Toggle label={label} val={val} set={() => set(v => !v)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={guardar} disabled={saving}
            className="w-full rounded-2xl bg-blue-600 text-white font-semibold py-3.5 flex items-center justify-center gap-2 active:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : "Guardar cambios"}
          </button>

          {/* Historial de cambios */}
          {historial.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <button
                onClick={() => setHistOpen(v => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <History className="h-4 w-4 text-slate-400" />
                  Historial de cambios
                  <span className="rounded-full bg-slate-100 text-slate-500 text-xs px-2 py-0.5">{historial.length}</span>
                </span>
                {histOpen ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
              </button>
              {histOpen && (
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                  {historial.map((h, i) => {
                    const d = h.data;
                    const fecha = new Date(h.captured_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
                    return (
                      <div key={h.id} className="px-4 py-3">
                        <p className="text-xs font-semibold text-slate-500 mb-1.5">{i === 0 ? "Más reciente · " : ""}{fecha}</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            d.estrato ? `Estrato ${d.estrato}` : null,
                            d.nivel_estudios ? String(d.nivel_estudios) : null,
                            d.estado_civil ? String(d.estado_civil) : null,
                            d.regimen_salud ? String(d.regimen_salud) : null,
                            d.grupo_etnico ? String(d.grupo_etnico) : null,
                          ].filter(Boolean).map((label, j) => (
                            <span key={j} className="rounded-lg bg-slate-100 text-slate-600 text-xs px-2.5 py-1 capitalize">
                              {(label as string).replace(/_/g, " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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

function Select({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      <select
        value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-blue-400 transition-colors"
      >
        {children}
      </select>
    </div>
  );
}

function Toggle({ label, val, set }: { label: string; val: boolean; set: () => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm text-slate-700">{label}</span>
      <button type="button" onClick={set}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${val ? "bg-blue-600" : "bg-slate-300"}`}>
        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${val ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </label>
  );
}
