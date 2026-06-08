"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Mic, Loader2, ArrowLeft, CheckCircle, Phone, MapPin, User, Lock, Eye, EyeOff, Mail } from "lucide-react";
import { PasswordStrength, passwordCumple } from "@/components/password-strength";
import { DEPARTAMENTOS, getMunicipios } from "@/lib/colombia";

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
    departamento: "",
    municipio: "",
    barrio: "",
    birth_year: "",
    gender: "",
    estrato: "",
    nivel_estudios: "",
    estado_civil: "",
    num_hijos: "",
    regimen_salud: "",
    sisben_grupo: "",
    tenencia_vivienda: "",
    grupo_etnico: "",
    antiguedad_barrio: "",
    payment_wallet: "",
    nequi_or_daviplata: "",
    email: "",
    password: "",
    password2: "",
    recruiter_code: "",
  });

  const [actividades, setActividades] = useState<string[]>([]);
  const [tieneHijos, setTieneHijos] = useState(false);
  const [recibeSubsidios, setRecibeSubsidios] = useState(false);
  const [accesoInternet, setAccesoInternet] = useState(false);
  const [registradoVotar, setRegistradoVotar] = useState(false);

  const [prefillMsg, setPrefillMsg] = useState("");

  function update(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // Si la persona ya fue encuestada en campo (mismo documento), reusar sus datos
  async function checkExistente() {
    if (!/^\d{7,12}$/.test(form.documento)) { setPrefillMsg(""); return; }
    const supabase = createClient();
    const docHash = await sha256(form.documento);
    const { data: rows } = await supabase.rpc("prefill_by_document_hash", { p_hash: docHash });
    const data = rows?.[0] ?? null;
    if (data) {
      setForm(prev => ({
        ...prev,
        full_name: prev.full_name || data.name_encrypted || "",
        gender: prev.gender || data.gender || "",
        birth_year: prev.birth_year || (data.birth_year ? String(data.birth_year) : ""),
        estrato: prev.estrato || (data.estrato ? String(data.estrato) : ""),
        nivel_estudios: prev.nivel_estudios || data.nivel_estudios || "",
        estado_civil: prev.estado_civil || data.estado_civil || "",
        num_hijos: prev.num_hijos || (data.num_hijos ? String(data.num_hijos) : ""),
        regimen_salud: prev.regimen_salud || data.regimen_salud || "",
        sisben_grupo: prev.sisben_grupo || data.sisben_grupo || "",
        tenencia_vivienda: prev.tenencia_vivienda || data.tenencia_vivienda || "",
        grupo_etnico: prev.grupo_etnico || data.grupo_etnico || "",
        antiguedad_barrio: prev.antiguedad_barrio || data.antiguedad_barrio || "",
      }));
      if (Array.isArray(data.actividades) && data.actividades.length) setActividades(data.actividades);
      if (data.num_hijos && data.num_hijos > 0) setTieneHijos(true);
      if (data.recibe_subsidios) setRecibeSubsidios(true);
      if (data.acceso_internet) setAccesoInternet(true);
      if (data.registrado_votar) setRegistradoVotar(true);
      setPrefillMsg("Ya te habíamos encuestado — reusamos tus datos. Solo crea tu cuenta para ser panelista.");
    } else {
      setPrefillMsg("");
    }
  }

  // Prefill del código de reclutador desde ?ref=CODIGO (link de referido)
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) setForm(prev => ({ ...prev, recruiter_code: ref.toUpperCase() }));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validaciones — todos los campos son obligatorios
    const requeridos: [string, string][] = [
      [form.full_name, "tu nombre completo"],
      [form.documento, "tu número de cédula"],
      [form.birth_year, "tu año de nacimiento"],
      [form.gender, "tu sexo"],
      [form.departamento, "tu departamento"],
      [form.municipio, "tu municipio"],
      [form.barrio, "tu barrio"],
      [form.estrato, "tu estrato"],
      [form.estado_civil, "tu estado civil"],
      [form.nivel_estudios, "tu nivel de estudios"],
      [form.regimen_salud, "tu régimen de salud"],
      [form.sisben_grupo, "tu grupo SISBEN"],
      [form.tenencia_vivienda, "tu tipo de vivienda"],
      [form.grupo_etnico, "tu grupo étnico"],
      [form.antiguedad_barrio, "tu antigüedad en el barrio"],
      [form.phone, "tu celular"],
      [form.payment_wallet, "tu billetera (Nequi o Daviplata)"],
      [form.nequi_or_daviplata, "el número de tu billetera"],
      [form.email, "tu correo electrónico"],
      [form.password, "tu contraseña"],
    ];
    const faltante = requeridos.find(([v]) => !String(v).trim());
    if (faltante) { setError(`Falta ${faltante[1]}. Todos los campos son obligatorios.`); return; }

    if (actividades.length === 0) {
      setError("Selecciona al menos una actividad."); return;
    }
    if (tieneHijos && !form.num_hijos.trim()) {
      setError("Indica cuántos hijos tienes."); return;
    }
    if (!/^3\d{9}$/.test(form.phone)) {
      setError("Ingresa un celular colombiano válido (ej: 3001234567)."); return;
    }
    if (!/^\d{7,12}$/.test(form.documento)) {
      setError("El número de documento debe tener entre 7 y 12 dígitos."); return;
    }
    if (!passwordCumple(form.password)) {
      setError("La contraseña no cumple los requisitos (8+ caracteres, mayúscula, minúscula y número)."); return;
    }
    if (form.password !== form.password2) {
      setError("Las contraseñas no coinciden."); return;
    }

    setLoading(true);
    setError("");

    // Verificar cuotas antes de crear cuenta
    const cuotaRes = await fetch("/api/cuotas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gender: form.gender,
        estrato: form.estrato,
        sisben_grupo: form.sisben_grupo,
        actividad_principal: actividades[0] ?? null,
      }),
    });
    if (cuotaRes.ok) {
      const cuota = await cuotaRes.json();
      if (cuota.blocked) {
        setError(cuota.reason ?? "El cupo para tu perfil está completo. Gracias por tu interés.");
        setLoading(false); return;
      }
    }

    const supabase = createClient();

    // 1. Crear cuenta en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: form.full_name,
          role: "panelista",
          municipio: form.municipio,
        },
      },
    });

    if (authError) {
      const m = (authError.message || "").toLowerCase();
      if (authError.status === 422 || m.includes("already") || m.includes("registrad") || m.includes("exist")) {
        setError("Este correo ya está registrado. Inicia sesión o revisa tu correo para confirmar la cuenta.");
      } else if (m.includes("rate") || authError.status === 429) {
        setError("Demasiados intentos. Espera unos minutos e intenta de nuevo.");
      } else {
        setError("No se pudo crear la cuenta: " + (authError.message || "intenta de nuevo"));
      }
      console.error("[registro/panelista] signUp:", authError);
      setLoading(false); return;
    }

    // 2. Insertar en tabla participants
    if (authData.user) {
      const [docHash, phoneHash] = await Promise.all([
        sha256(form.documento),
        sha256(form.phone),
      ]);

      // Resolver el código de reclutador → field_operators.id (para el bono)
      let recruitedBy: string | null = null;
      if (form.recruiter_code.trim()) {
        const { data: opRows } = await supabase.rpc("resolve_recruiter_code", { p_code: form.recruiter_code.trim().toUpperCase() });
        recruitedBy = opRows?.[0]?.id ?? null;
      }

      // Crea el participante o RECLAMA el registro existente (si ya fue encuestado en
      // campo con el mismo documento): reutiliza sus datos + verificación + historial.
      const { error: rpcError } = await supabase.rpc("claim_field_participant", {
        p_user_id: authData.user.id,
        p_document_hash: docHash,
        p_phone_hash: phoneHash,
        p_name: form.full_name,
        p_gender: form.gender || null,
        p_birth_year: form.birth_year ? parseInt(form.birth_year) : null,
        p_recruited_by: recruitedBy,
      });

      if (rpcError) {
        setError("Error al guardar tus datos. Contacta soporte.");
        console.error("[registro/panelista] claim_field_participant:", rpcError);
        setLoading(false);
        return;
      }

      // Guarda teléfono y número de pago en claro (para contacto y dispersión Nequi/Daviplata)
      await supabase
        .from("participants")
        .update({
          departamento: form.departamento || null,
          municipio: form.municipio || null,
          phone: form.phone.trim() || null,
          payment_wallet: form.payment_wallet || null,
          payment_number: form.nequi_or_daviplata.trim() || null,
          estrato: form.estrato ? parseInt(form.estrato) : null,
          nivel_estudios: form.nivel_estudios || null,
          actividades: actividades.length > 0 ? actividades : null,
          estado_civil: form.estado_civil || null,
          num_hijos: tieneHijos ? (parseInt(form.num_hijos) || 0) : 0,
          regimen_salud: form.regimen_salud || null,
          sisben_grupo: form.sisben_grupo || null,
          tenencia_vivienda: form.tenencia_vivienda || null,
          grupo_etnico: form.grupo_etnico || null,
          antiguedad_barrio: form.antiguedad_barrio || null,
          recibe_subsidios: recibeSubsidios,
          acceso_internet: accesoInternet,
          registrado_votar: registradoVotar,
        })
        .eq("id", authData.user.id);
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-amber-950/50 to-slate-950 px-4 pb-10 pt-[max(2rem,env(safe-area-inset-top))]">
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
        <div className="rounded-2xl bg-slate-900/80 border border-amber-500/20 p-4 mb-6">
          <p className="text-xs text-amber-400 font-semibold uppercase tracking-wide mb-2">¿Qué ganas?</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { v: "Pago", l: "por encuesta" },
              { v: "15 min", l: "de tu tiempo" },
              { v: "Nequi", l: "o Daviplata" },
            ].map(({ v, l }) => (
              <div key={l} className="rounded-xl bg-white/5 border border-white/5 p-2">
                <p className="text-amber-400 font-bold text-sm">{v}</p>
                <p className="text-xs text-slate-300 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-md p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-4">

            {prefillMsg && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-3 text-sm text-emerald-300">
                ✓ {prefillMsg}
              </div>
            )}

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
                  onBlur={checkExistente}
                  placeholder="N° documento" inputMode="numeric" className={inputCls} />
              </Field>
              <Field label="Año nacimiento *">
                <select value={form.birth_year} onChange={e => update("birth_year", e.target.value)} className={inputCls}>
                  <option value="">Selecciona año</option>
                  {Array.from({ length: 2008 - 1920 + 1 }, (_, i) => 2008 - i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Género *">
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
              <Field label="Departamento *">
                <select value={form.departamento} onChange={e => { update("departamento", e.target.value); update("municipio", ""); }} className={inputCls}>
                  <option value="">Selecciona departamento</option>
                  {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Municipio *">
                  <select value={form.municipio} onChange={e => update("municipio", e.target.value)} className={inputCls} disabled={!form.departamento}>
                    <option value="">{form.departamento ? "Selecciona municipio" : "Primero elige departamento"}</option>
                    {getMunicipios(form.departamento).map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Barrio *">
                  <input value={form.barrio} onChange={e => update("barrio", e.target.value)}
                    placeholder="Tu barrio" className={inputCls} />
                </Field>
              </div>
            </div>

            {/* Perfil socioeconómico */}
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-amber-400" />
                <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">Perfil socioeconómico</p>
              </div>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Estrato *">
                    <select value={form.estrato} onChange={e => update("estrato", e.target.value)} className={inputCls}>
                      <option value="">Sin respuesta</option>
                      {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </Field>
                  <Field label="Estado civil *">
                    <select value={form.estado_civil} onChange={e => update("estado_civil", e.target.value)} className={inputCls}>
                      <option value="">Sin respuesta</option>
                      <option value="soltero">Soltero/a</option>
                      <option value="casado">Casado/a</option>
                      <option value="union_libre">Unión libre</option>
                      <option value="separado">Separado/a</option>
                      <option value="divorciado">Divorciado/a</option>
                      <option value="viudo">Viudo/a</option>
                    </select>
                  </Field>
                </div>
                <Field label="Nivel de estudios *">
                  <select value={form.nivel_estudios} onChange={e => update("nivel_estudios", e.target.value)} className={inputCls}>
                    <option value="">Sin respuesta</option>
                    <option value="bachiller">Bachiller</option>
                    <option value="tecnico_tecnologo">Técnico / Tecnólogo</option>
                    <option value="profesional">Profesional</option>
                    <option value="posgrado">Posgrado</option>
                  </select>
                </Field>
                <Field label="Actividad (elige al menos una) *">
                  <div className="flex flex-wrap gap-2">
                    {[["empleado","Empleado"],["independiente","Independiente"],["desempleado","Desempleado"],["estudiante","Estudiante"],["ama_de_casa","Ama de casa"],["pensionado","Pensionado"],["empresario","Empresario"],["otro","Otro"]].map(([v, l]) => {
                      const sel = actividades.includes(v);
                      return (
                        <button key={v} type="button"
                          onClick={() => setActividades(prev => sel ? prev.filter(a => a !== v) : [...prev, v])}
                          className={`rounded-lg px-3 py-2 text-sm border transition-colors ${sel ? "border-amber-400 bg-amber-400/20 text-amber-200" : "border-white/15 bg-white/5 text-slate-300"}`}>
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-slate-300">¿Tiene hijos?</span>
                    <button type="button" onClick={() => { setTieneHijos(v => !v); if (tieneHijos) update("num_hijos", ""); }}
                      className={`relative w-11 h-6 rounded-full transition-colors ${tieneHijos ? "bg-amber-500" : "bg-slate-600"}`}>
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${tieneHijos ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </label>
                  {tieneHijos && (
                    <div className="mt-3">
                      <Field label="¿Cuántos hijos? *">
                        <input value={form.num_hijos} onChange={e => update("num_hijos", e.target.value)} placeholder="Ej: 2" inputMode="numeric" className={inputCls} />
                      </Field>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Régimen de salud *">
                    <select value={form.regimen_salud} onChange={e => update("regimen_salud", e.target.value)} className={inputCls}>
                      <option value="">Sin respuesta</option>
                      <option value="subsidiado">Subsidiado</option>
                      <option value="contributivo">Contributivo</option>
                      <option value="especial">Especial</option>
                      <option value="ninguno">Ninguno</option>
                    </select>
                  </Field>
                  <Field label="SISBEN *">
                    <select value={form.sisben_grupo} onChange={e => update("sisben_grupo", e.target.value)} className={inputCls}>
                      <option value="">Sin respuesta</option>
                      <option value="no">No está en SISBEN</option>
                      <option value="A">Grupo A</option>
                      <option value="B">Grupo B</option>
                      <option value="C">Grupo C</option>
                      <option value="D">Grupo D</option>
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Vivienda *">
                    <select value={form.tenencia_vivienda} onChange={e => update("tenencia_vivienda", e.target.value)} className={inputCls}>
                      <option value="">Sin respuesta</option>
                      <option value="propia">Propia</option>
                      <option value="arriendo">Arriendo</option>
                      <option value="familiar">Familiar</option>
                    </select>
                  </Field>
                  <Field label="Grupo étnico *">
                    <select value={form.grupo_etnico} onChange={e => update("grupo_etnico", e.target.value)} className={inputCls}>
                      <option value="">Sin respuesta</option>
                      <option value="ninguno">Ninguno</option>
                      <option value="afro">Afrodescendiente</option>
                      <option value="indigena">Indígena</option>
                      <option value="raizal">Raizal</option>
                      <option value="otro">Otro</option>
                    </select>
                  </Field>
                </div>
                <Field label="Antigüedad en el barrio *">
                  <select value={form.antiguedad_barrio} onChange={e => update("antiguedad_barrio", e.target.value)} className={inputCls}>
                    <option value="">Sin respuesta</option>
                    <option value="menos_1">Menos de 1 año</option>
                    <option value="1_5">1 a 5 años</option>
                    <option value="5_10">5 a 10 años</option>
                    <option value="mas_10">Más de 10 años</option>
                  </select>
                </Field>
                <div className="space-y-2">
                  {[
                    { label: "¿Recibe subsidios del Estado?", val: recibeSubsidios, set: setRecibeSubsidios },
                    { label: "¿Tiene smartphone con internet?", val: accesoInternet, set: setAccesoInternet },
                    { label: "¿Está registrado para votar?", val: registradoVotar, set: setRegistradoVotar },
                  ].map(({ label, val, set }) => (
                    <label key={label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 cursor-pointer">
                      <span className="text-sm text-slate-300">{label}</span>
                      <button type="button" onClick={() => set(v => !v)}
                        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${val ? "bg-amber-500" : "bg-slate-600"}`}>
                        <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${val ? "translate-x-5" : "translate-x-0.5"}`} />
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Reclutador */}
            <div className="border-t border-white/10 pt-3">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-amber-400" />
                <p className="text-xs text-amber-300 font-semibold uppercase tracking-wide">¿Quién te registró?</p>
              </div>
              <Field label="Código de reclutador (opcional)">
                <input value={form.recruiter_code}
                  onChange={e => update("recruiter_code", e.target.value.toUpperCase())}
                  placeholder="Ej: JC-4821 — te lo da tu encuestador"
                  className={`${inputCls} font-mono tracking-wider`} />
              </Field>
              <p className="text-[11px] text-slate-500 mt-1.5">Si un encuestador te ayudó, escribe su código para que reciba su bono.</p>
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
                <Field label="Billetera para tus pagos *">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: "nequi", label: "Nequi" },
                      { val: "daviplata", label: "Daviplata" },
                    ].map(({ val, label }) => (
                      <button
                        key={val} type="button"
                        onClick={() => update("payment_wallet", val)}
                        className={`rounded-xl border py-2.5 text-sm font-semibold transition-colors ${
                          form.payment_wallet === val
                            ? "border-amber-400 bg-amber-400/20 text-amber-200"
                            : "border-white/20 bg-white/5 text-slate-300"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Número de la billetera *">
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

                <PasswordStrength password={form.password} confirm={form.password2} accent="amber" />
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

const inputCls = "w-full rounded-xl bg-slate-800 border border-white/15 px-4 py-3 text-white placeholder-slate-400 text-base focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-amber-300 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
