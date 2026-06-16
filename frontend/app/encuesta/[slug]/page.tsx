"use client";

import { use, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  ArrowRight, ArrowLeft, CheckCircle, Loader2, Mic, Square,
  User, MapPin, Users, EyeOff, ChevronDown,
} from "lucide-react";
import { DEPARTAMENTOS, getMunicipios } from "@/lib/colombia";
import { useDeviceMeta } from "@/hooks/useDeviceMeta";

// ── tipos ─────────────────────────────────────────────────────────────────────
type Survey = {
  id: string; name: string; description: string | null;
  es_abierta: boolean; abierta_identidad: boolean;
  abierta_pago: boolean; abierta_anonima: boolean;
  demo_opcionales?: Record<string, boolean> | null;
};
type Question = {
  id: string; text: string; type: string; required: boolean;
  options: { choices?: string[] } | null; audio_prompt: string | null; order: number;
};

const inputCls = "w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500";
const selectCls = inputCls + " appearance-none";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

function Sel({ label, value, onChange, children, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  children: React.ReactNode; hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <div className="relative">
        <select value={value} onChange={e => onChange(e.target.value)} className={selectCls}>
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
      </div>
    </Field>
  );
}

// ── pasos ─────────────────────────────────────────────────────────────────────
// 0: bienvenida  1: anonimato (si !abierta_anonima)  2: demografía
// 3: identidad (si abierta_identidad)  4: preguntas  5: billetera (si abierta_pago)  6: gracias

export default function EncuestaAbiertaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const deviceMeta = useDeviceMeta();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Estado del formulario
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Paso 1: anonimato elegido por el respondente
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Identificación (solo si !abierta_anonima y !isAnonymous)
  const [ident, setIdent] = useState({
    nombre: "", documento: "", phone: "", paymentWallet: "", paymentNumber: "",
  });

  // Demografía
  const [demo, setDemo] = useState({
    gender: "", birth_year: "", departamento: "", municipio: "", barrio: "",
    estrato: "", nivel_estudios: "", estado_civil: "", num_hijos: "",
    regimen_salud: "", sisben_grupo: "", tenencia_vivienda: "",
    grupo_etnico: "", antiguedad_barrio: "",
  });
  const [actividades, setActividades] = useState<string[]>([]);
  const [recibeSubsidios, setRecibeSubsidios] = useState(false);
  const [accesoInternet, setAccesoInternet] = useState(false);
  const [registradoVotar, setRegistradoVotar] = useState(false);
  const [tieneHijos, setTieneHijos] = useState(false);

  // Respuestas
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});

  // Audio
  const audioBlobs = useRef<Record<string, Blob>>({});
  const audioMimes = useRef<Record<string, string>>({});
  const [audioUrls, setAudioUrls] = useState<Record<string, string | null>>({});
  const [recording, setRecording] = useState<string | null>(null); // question id siendo grabado
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function pickAudioMime() {
    for (const t of ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(t)) return t;
    }
    return "";
  }

  async function startRecording(qId: string) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mime = pickAudioMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const type = mr.mimeType || mime || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        audioBlobs.current[qId] = blob;
        audioMimes.current[qId] = type;
        setAudioUrls(p => ({ ...p, [qId]: URL.createObjectURL(blob) }));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); mediaRef.current = mr;
      setRecording(qId); setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => { if (t >= 119) { stopRecording(); return t; } return t + 1; }), 1000);
    } catch { alert("No se pudo acceder al micrófono."); }
  }

  function stopRecording() { mediaRef.current?.stop(); setRecording(null); if (timerRef.current) clearInterval(timerRef.current); }

  // Pago (si abierta_pago)
  const [pago, setPago] = useState({ wallet: "", number: "" });

  // ── carga ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/encuesta-abierta?slug=${encodeURIComponent(slug)}`);
      if (!res.ok) { setNotFound(true); setLoading(false); return; }
      const { survey: s, questions: qs } = await res.json();
      if (!s) { setNotFound(true); setLoading(false); return; }
      setSurvey(s as Survey);
      setQuestions((qs ?? []) as Question[]);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
    </div>
  );

  if (notFound || !survey) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 text-center">
      <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
        <Users className="h-8 w-8 text-slate-600" />
      </div>
      <h1 className="text-xl font-bold text-white mb-2">Encuesta no encontrada</h1>
      <p className="text-slate-500 text-sm">El enlace puede haber expirado o no estar activo.</p>
    </div>
  );

  // ── cálculo de pasos activos ───────────────────────────────────────────────
  // Paso 0: bienvenida (siempre)
  // Paso "anon": si !abierta_anonima (el creador permite identificación)
  // Paso "demo": demografía (siempre)
  // Paso "preg": preguntas (siempre)
  // Paso "pago": si abierta_pago
  // Paso "done": gracias

  const pasos: string[] = ["bienvenida"];
  if (!survey.abierta_anonima) pasos.push("anonimato");
  pasos.push("demografia");
  pasos.push("preguntas");
  if (survey.abierta_pago && isAnonymous) pasos.push("pago"); // si anónimo, pago al final
  pasos.push("done");

  const pasoActual = pasos[step];

  function next() { setError(""); setStep(s => s + 1); }
  function prev() { setError(""); setStep(s => s - 1); }

  // ── validaciones por paso ─────────────────────────────────────────────────
  function esOpcional(key: string): boolean { return !!survey?.demo_opcionales?.[key]; }
  function lbl(texto: string, key: string): string { return esOpcional(key) ? `${texto} (opcional)` : `${texto} *`; }

  function validarDemo(): string | null {
    const req: [string, string, string][] = [
      [demo.gender, "sexo", "gender"], [demo.birth_year, "año de nacimiento", "birth_year"],
      [demo.departamento, "departamento", "departamento"], [demo.municipio, "municipio", "municipio"], [demo.barrio, "barrio", "barrio"],
      [demo.estrato, "estrato", "estrato"], [demo.nivel_estudios, "nivel de estudios", "nivel_estudios"],
      [demo.estado_civil, "estado civil", "estado_civil"], [demo.regimen_salud, "régimen de salud", "regimen_salud"],
      [demo.sisben_grupo, "grupo SISBEN", "sisben_grupo"], [demo.tenencia_vivienda, "tipo de vivienda", "tenencia_vivienda"],
      [demo.grupo_etnico, "grupo étnico", "grupo_etnico"], [demo.antiguedad_barrio, "antigüedad en el barrio", "antiguedad_barrio"],
    ];
    const falta = req.find(([v, , key]) => !esOpcional(key) && !v.trim());
    if (falta) return `Falta ${falta[1]}`;
    if (!esOpcional("actividades") && actividades.length === 0) return "Selecciona al menos una actividad";
    if (tieneHijos && !demo.num_hijos) return "Indica cuántos hijos tienes";
    return null;
  }

  function validarIdent(): string | null {
    if (!isAnonymous) {
      if (!ident.nombre.trim()) return "Falta tu nombre completo";
      if (!/^\d{7,12}$/.test(ident.documento)) return "Número de documento inválido (7-12 dígitos)";
      if (ident.phone && !/^3\d{9}$/.test(ident.phone)) return "Celular colombiano inválido (ej: 3001234567)";
    }
    return null;
  }

  function validarPreguntas(): string | null {
    for (const q of questions) {
      if (q.required && !respuestas[q.id]?.trim()) return `Falta responder: "${q.text.slice(0, 50)}"`;
    }
    return null;
  }

  // ── submit final ──────────────────────────────────────────────────────────
  async function enviar() {
    if (!survey) return;
    const errPreg = validarPreguntas();
    if (errPreg) { setError(errPreg); return; }

    setSubmitting(true); setError("");
    const payload = {
      surveyId: survey.id,
      is_anonymous: isAnonymous,
      nombre: isAnonymous ? null : ident.nombre,
      documento: isAnonymous ? null : ident.documento,
      phone: isAnonymous ? null : ident.phone,
      paymentWallet: isAnonymous ? null : ident.paymentWallet,
      paymentNumber: isAnonymous ? null : ident.paymentNumber,
      ...(survey.abierta_pago && isAnonymous ? { paymentWallet: pago.wallet, paymentNumber: pago.number } : {}),
      ...demo,
      actividades,
      recibe_subsidios: recibeSubsidios,
      acceso_internet: accesoInternet,
      registrado_votar: registradoVotar,
      num_hijos: tieneHijos ? demo.num_hijos : "0",
      respuestas: questions.map(q => ({ question_id: q.id, value: respuestas[q.id] ?? "" })),
      device_meta: deviceMeta.current ? {
        ...deviceMeta.current,
        finished_at: new Date().toISOString(),
      } : undefined,
    };

    const res = await fetch("/api/encuesta-abierta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Error al enviar"); setSubmitting(false); return; }

    // Subir audios grabados
    const { participantId } = data;
    for (const [qId, blob] of Object.entries(audioBlobs.current)) {
      const mime = audioMimes.current[qId] || "audio/webm";
      const ext = mime.includes("mp4") ? "mp4" : mime.includes("ogg") ? "ogg" : "webm";
      const fd = new FormData();
      fd.append("file", blob, `audio.${ext}`);
      fd.append("surveyId", survey.id);
      fd.append("questionId", qId);
      fd.append("participantId", participantId);
      try {
        const up = await fetch("/api/audio/upload-abierta", { method: "POST", body: fd });
        if (up.ok) {
          const { path } = await up.json();
          // Buscar el response_id para este participante y pregunta
          const rRes = await fetch("/api/encuesta-abierta/audio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ participantId, surveyId: survey.id, questionId: qId, audioPath: path }),
          });
          if (!rRes.ok) console.warn("audio_responses insert failed");
        }
      } catch { /* audio no crítico */ }
    }

    next();
    setSubmitting(false);
  }

  // ── render por paso ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-start py-10 px-4">
      <div className="w-full max-w-lg">

        {/* Progress bar (excl. done) */}
        {pasoActual !== "done" && (
          <div className="flex gap-1 mb-8">
            {pasos.filter(p => p !== "done").map((p, i) => (
              <div key={p} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? "bg-violet-500" : "bg-white/10"}`} />
            ))}
          </div>
        )}

        {/* ── 0: BIENVENIDA ── */}
        {pasoActual === "bienvenida" && (
          <div className="text-center">
            <div className="h-16 w-16 rounded-2xl bg-violet-500/20 flex items-center justify-center mx-auto mb-5">
              <Users className="h-8 w-8 text-violet-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">{survey.name}</h1>
            {survey.description && <p className="text-slate-400 text-sm mb-6 leading-relaxed">{survey.description}</p>}
            <div className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 mb-8 text-left space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Qué esperar</p>
              {[
                "Llenarás unos datos demográficos (perfil socioeconómico)",
                questions.length + " pregunta" + (questions.length === 1 ? "" : "s") + " sobre el tema",
                survey.abierta_identidad ? "Verificación de identidad requerida" : null,
                survey.abierta_pago ? "Recibes un pago al completarla" : null,
                survey.abierta_anonima ? "Tus respuestas son completamente anónimas" : "Puedes elegir si identificarte o no",
              ].filter(Boolean).map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-slate-300">
                  <span className="text-violet-400 mt-0.5">•</span> {item}
                </div>
              ))}
            </div>
            <button onClick={next} className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 px-6 py-3.5 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
              Comenzar <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── 1: ANONIMATO ── */}
        {pasoActual === "anonimato" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">¿Cómo quieres participar?</h2>
            <p className="text-slate-400 text-sm mb-6">El creador de esta encuesta permite que te identifiques, pero no es obligatorio.</p>
            <div className="grid gap-3 mb-8">
              <button onClick={() => setIsAnonymous(true)}
                className={`rounded-2xl border-2 p-5 text-left transition-all ${isAnonymous ? "border-violet-500 bg-violet-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"}`}>
                <EyeOff className={`h-6 w-6 mb-3 ${isAnonymous ? "text-violet-400" : "text-slate-500"}`} />
                <p className={`text-sm font-semibold mb-1 ${isAnonymous ? "text-white" : "text-slate-300"}`}>Participar de forma anónima</p>
                <p className={`text-xs leading-relaxed ${isAnonymous ? "text-violet-200/80" : "text-slate-500"}`}>Solo se guardan tus datos demográficos. Tu nombre e identidad no se registran.</p>
              </button>
              <button onClick={() => setIsAnonymous(false)}
                className={`rounded-2xl border-2 p-5 text-left transition-all ${!isAnonymous ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/5"}`}>
                <User className={`h-6 w-6 mb-3 ${!isAnonymous ? "text-emerald-400" : "text-slate-500"}`} />
                <p className={`text-sm font-semibold mb-1 ${!isAnonymous ? "text-white" : "text-slate-300"}`}>Identificarme</p>
                <p className={`text-xs leading-relaxed ${!isAnonymous ? "text-emerald-200/80" : "text-slate-500"}`}>
                  Proporciono mi nombre y documento. Mis datos se almacenan de forma segura.
                  {survey.abierta_pago ? " Necesario para recibir el pago." : ""}
                </p>
              </button>
            </div>

            {/* Datos de identificación (si eligió identificarse) */}
            {!isAnonymous && (
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 mb-6 space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Datos de identidad</p>
                <Field label="Nombre completo *">
                  <input value={ident.nombre} onChange={e => setIdent(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Tu nombre completo" className={inputCls} />
                </Field>
                <Field label="Número de cédula *">
                  <input value={ident.documento} onChange={e => setIdent(p => ({ ...p, documento: e.target.value }))}
                    placeholder="Ej: 1234567890" inputMode="numeric" className={inputCls} />
                </Field>
                <Field label="Celular (opcional)">
                  <input value={ident.phone} onChange={e => setIdent(p => ({ ...p, phone: e.target.value }))}
                    placeholder="Ej: 3001234567" inputMode="tel" className={inputCls} />
                </Field>
                {survey.abierta_pago && (
                  <>
                    <Sel label="Billetera *" value={ident.paymentWallet} onChange={v => setIdent(p => ({ ...p, paymentWallet: v }))}>
                      <option value="">Selecciona</option>
                      <option value="nequi">Nequi</option>
                      <option value="daviplata">Daviplata</option>
                    </Sel>
                    {ident.paymentWallet && (
                      <Field label={`Número ${ident.paymentWallet} *`}>
                        <input value={ident.paymentNumber} onChange={e => setIdent(p => ({ ...p, paymentNumber: e.target.value }))}
                          placeholder="Ej: 3001234567" inputMode="tel" className={inputCls} />
                      </Field>
                    )}
                  </>
                )}
              </div>
            )}

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={prev} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </button>
              <button onClick={() => { const e = validarIdent(); if (e) { setError(e); return; } next(); }}
                className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── 2: DEMOGRAFÍA ── */}
        {pasoActual === "demografia" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Perfil socioeconómico</h2>
            <p className="text-slate-400 text-sm mb-6">Estos datos nos permiten entender mejor quién responde y garantizar representatividad. Los marcados con * son obligatorios.</p>

            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <Sel label={lbl("Sexo", "gender")} value={demo.gender} onChange={v => setDemo(p => ({ ...p, gender: v }))}>
                  <option value="">Selecciona</option>
                  <option value="female">Mujer</option>
                  <option value="male">Hombre</option>
                  <option value="other">Otro</option>
                </Sel>
                <Field label={lbl("Año de nacimiento", "birth_year")}>
                  <input value={demo.birth_year} onChange={e => setDemo(p => ({ ...p, birth_year: e.target.value }))}
                    placeholder="Ej: 1990" inputMode="numeric" maxLength={4} className={inputCls} />
                </Field>
              </div>

              <Sel label={lbl("Departamento", "departamento")} value={demo.departamento} onChange={v => setDemo(p => ({ ...p, departamento: v, municipio: "" }))}>
                <option value="">Selecciona departamento</option>
                {DEPARTAMENTOS.map(d => <option key={d} value={d}>{d}</option>)}
              </Sel>

              <div className="grid grid-cols-2 gap-4">
                <Field label={lbl("Municipio", "municipio")}>
                  <div className="relative">
                    <select value={demo.municipio} onChange={e => setDemo(p => ({ ...p, municipio: e.target.value }))} className={selectCls} disabled={!demo.departamento}>
                      <option value="">{demo.departamento ? "Selecciona municipio" : "Primero elige departamento"}</option>
                      {getMunicipios(demo.departamento).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  </div>
                </Field>
                <Field label={lbl("Barrio", "barrio")}>
                  <input value={demo.barrio} onChange={e => setDemo(p => ({ ...p, barrio: e.target.value }))}
                    placeholder="Ej: El Prado" className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Sel label={lbl("Estrato", "estrato")} value={demo.estrato} onChange={v => setDemo(p => ({ ...p, estrato: v }))}>
                  <option value="">Selecciona</option>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </Sel>
                <Sel label={lbl("Nivel de estudios", "nivel_estudios")} value={demo.nivel_estudios} onChange={v => setDemo(p => ({ ...p, nivel_estudios: v }))}>
                  <option value="">Selecciona</option>
                  <option value="bachiller">Bachiller</option>
                  <option value="tecnico_tecnologo">Técnico / Tecnólogo</option>
                  <option value="profesional">Profesional</option>
                  <option value="posgrado">Posgrado</option>
                </Sel>
              </div>

              <Sel label={lbl("Estado civil", "estado_civil")} value={demo.estado_civil} onChange={v => setDemo(p => ({ ...p, estado_civil: v }))}>
                <option value="">Selecciona</option>
                <option value="soltero">Soltero/a</option>
                <option value="casado">Casado/a</option>
                <option value="union_libre">Unión libre</option>
                <option value="separado">Separado/a</option>
                <option value="divorciado">Divorciado/a</option>
                <option value="viudo">Viudo/a</option>
              </Sel>

              {/* Actividades */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-2">{lbl("Actividad principal", "actividades")} (puede ser varias)</label>
                <div className="flex flex-wrap gap-2">
                  {["empleado", "independiente", "desempleado", "estudiante", "ama_de_casa", "pensionado", "empresario", "otro"].map(a => {
                    const sel = actividades.includes(a);
                    return (
                      <button key={a} type="button" onClick={() => setActividades(prev => sel ? prev.filter(x => x !== a) : [...prev, a])}
                        className={`rounded-lg px-3 py-1.5 text-xs border transition-colors capitalize ${sel ? "border-violet-400 bg-violet-500/15 text-violet-200" : "border-white/10 text-slate-400 hover:bg-white/5"}`}>
                        {a.replace(/_/g, " ")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Hijos */}
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setTieneHijos(v => !v)}
                  className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${tieneHijos ? "bg-violet-600" : "bg-slate-600"}`}>
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${tieneHijos ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <span className="text-sm text-slate-300">Tengo hijos</span>
                {tieneHijos && (
                  <input value={demo.num_hijos} onChange={e => setDemo(p => ({ ...p, num_hijos: e.target.value }))}
                    placeholder="¿Cuántos?" inputMode="numeric" className={inputCls + " w-24"} />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Sel label={lbl("Régimen de salud", "regimen_salud")} value={demo.regimen_salud} onChange={v => setDemo(p => ({ ...p, regimen_salud: v }))}>
                  <option value="">Selecciona</option>
                  <option value="subsidiado">Subsidiado</option>
                  <option value="contributivo">Contributivo</option>
                  <option value="especial">Especial</option>
                  <option value="ninguno">Ninguno</option>
                </Sel>
                <Sel label={lbl("Grupo SISBEN", "sisben_grupo")} value={demo.sisben_grupo} onChange={v => setDemo(p => ({ ...p, sisben_grupo: v }))}>
                  <option value="">Selecciona</option>
                  <option value="no">No está en SISBEN</option>
                  <option value="A">Grupo A</option>
                  <option value="B">Grupo B</option>
                  <option value="C">Grupo C</option>
                  <option value="D">Grupo D</option>
                </Sel>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Sel label={lbl("Tenencia vivienda", "tenencia_vivienda")} value={demo.tenencia_vivienda} onChange={v => setDemo(p => ({ ...p, tenencia_vivienda: v }))}>
                  <option value="">Selecciona</option>
                  <option value="propia">Propia</option>
                  <option value="arriendo">Arriendo</option>
                  <option value="familiar">Familiar</option>
                </Sel>
                <Sel label={lbl("Grupo étnico", "grupo_etnico")} value={demo.grupo_etnico} onChange={v => setDemo(p => ({ ...p, grupo_etnico: v }))}>
                  <option value="">Selecciona</option>
                  <option value="ninguno">Ninguno</option>
                  <option value="afro">Afrodescendiente</option>
                  <option value="indigena">Indígena</option>
                  <option value="raizal">Raizal</option>
                  <option value="otro">Otro</option>
                </Sel>
              </div>

              <Sel label={lbl("Antigüedad en el barrio", "antiguedad_barrio")} value={demo.antiguedad_barrio} onChange={v => setDemo(p => ({ ...p, antiguedad_barrio: v }))}>
                <option value="">Selecciona</option>
                <option value="menos_1">Menos de 1 año</option>
                <option value="1_5">1 a 5 años</option>
                <option value="5_10">5 a 10 años</option>
                <option value="mas_10">Más de 10 años</option>
              </Sel>

              {/* Booleanos */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
                {([
                  [recibeSubsidios, setRecibeSubsidios, "Recibo subsidios del Estado (Familias en Acción, Colombia Mayor, etc.)"],
                  [accesoInternet, setAccesoInternet, "Tengo acceso a internet en casa"],
                  [registradoVotar, setRegistradoVotar, "Estoy registrado/a para votar"],
                ] as [boolean, (v: boolean) => void, string][]).map(([val, setter, label]) => (
                  <label key={label} className="flex items-center gap-3 cursor-pointer">
                    <button type="button" onClick={() => setter(!val)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${val ? "bg-violet-600" : "bg-slate-600"}`}>
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${val ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                    <span className="text-sm text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={prev} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </button>
              <button onClick={() => { const e = validarDemo(); if (e) { setError(e); return; } next(); }}
                className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
                Continuar <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── 3: PREGUNTAS ── */}
        {pasoActual === "preguntas" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Preguntas de la encuesta</h2>
            <p className="text-slate-400 text-sm mb-6">{questions.length} pregunta{questions.length === 1 ? "" : "s"}</p>

            <div className="space-y-5 mb-6">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-2xl border border-white/5 bg-slate-900 p-5">
                  <p className="text-sm font-medium text-white mb-3">
                    <span className="text-violet-400">{i + 1}.</span> {q.text}
                    {q.required && <span className="text-red-400 ml-1">*</span>}
                  </p>

                  {(q.type === "single_choice") && (
                    <div className="space-y-2">
                      {(q.options?.choices ?? []).map(opt => (
                        <label key={opt} className="flex items-center gap-3 cursor-pointer">
                          <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${respuestas[q.id] === opt ? "border-violet-500 bg-violet-500" : "border-white/20"}`}
                            onClick={() => setRespuestas(p => ({ ...p, [q.id]: opt }))}>
                            {respuestas[q.id] === opt && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-sm text-slate-300">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {(q.type === "multiple_choice") && (
                    <div className="space-y-2">
                      {(q.options?.choices ?? []).map(opt => {
                        const vals = (respuestas[q.id] ?? "").split("|").filter(Boolean);
                        const sel = vals.includes(opt);
                        return (
                          <label key={opt} className="flex items-center gap-3 cursor-pointer"
                            onClick={() => {
                              const next = sel ? vals.filter(v => v !== opt) : [...vals, opt];
                              setRespuestas(p => ({ ...p, [q.id]: next.join("|") }));
                            }}>
                            <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${sel ? "border-violet-500 bg-violet-500" : "border-white/20"}`}>
                              {sel && <div className="h-2 w-2 bg-white rounded-sm" />}
                            </div>
                            <span className="text-sm text-slate-300">{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}

                  {q.type === "scale" && (
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(n => (
                        <button key={n} type="button"
                          onClick={() => setRespuestas(p => ({ ...p, [q.id]: String(n) }))}
                          className={`flex-1 rounded-xl py-3 text-sm font-bold transition-colors ${respuestas[q.id] === String(n) ? "bg-violet-600 text-white" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
                          {n}
                        </button>
                      ))}
                    </div>
                  )}

                  {q.type === "open_text" && (
                    <textarea
                      value={respuestas[q.id] ?? ""}
                      onChange={e => setRespuestas(p => ({ ...p, [q.id]: e.target.value }))}
                      placeholder="Escribe tu respuesta aquí..."
                      rows={3}
                      className={inputCls + " resize-none"}
                    />
                  )}

                  {q.audio_prompt && (
                    <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Mic className="h-3.5 w-3.5" /> {q.audio_prompt}
                      </p>
                      {!audioUrls[q.id] ? (
                        <button
                          type="button"
                          onClick={() => recording === q.id ? stopRecording() : startRecording(q.id)}
                          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${recording === q.id ? "bg-red-500 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}
                        >
                          {recording === q.id
                            ? <><Square className="h-4 w-4" fill="white" /> Detener ({Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")})</>
                            : <><Mic className="h-4 w-4" /> Grabar nota de voz</>}
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-emerald-400">
                            <CheckCircle className="h-3.5 w-3.5" /> Nota de voz grabada
                          </div>
                          <audio src={audioUrls[q.id]!} controls className="w-full" />
                          <button type="button" onClick={() => { delete audioBlobs.current[q.id]; setAudioUrls(p => ({ ...p, [q.id]: null })); }}
                            className="text-xs text-slate-500 hover:text-slate-300">Grabar de nuevo</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={prev} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </button>
              {pasos[step + 1] === "pago" ? (
                <button onClick={() => { const e = validarPreguntas(); if (e) { setError(e); return; } next(); }}
                  className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 px-5 py-3 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
                  Continuar <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={enviar} disabled={submitting}
                  className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-5 py-3 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
                  {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : <>Enviar respuestas <ArrowRight className="h-4 w-4" /></>}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── 4: PAGO (anónimo) ── */}
        {pasoActual === "pago" && (
          <div>
            <h2 className="text-xl font-bold text-white mb-2">¿Cómo quieres recibir el pago?</h2>
            <p className="text-slate-400 text-sm mb-6">Solo necesitamos tu billetera para hacerte el pago. No se asocia con tu identidad.</p>
            <div className="space-y-4 mb-6">
              <Sel label="Billetera *" value={pago.wallet} onChange={v => setPago(p => ({ ...p, wallet: v }))}>
                <option value="">Selecciona</option>
                <option value="nequi">Nequi</option>
                <option value="daviplata">Daviplata</option>
              </Sel>
              {pago.wallet && (
                <Field label={`Número ${pago.wallet} *`}>
                  <input value={pago.number} onChange={e => setPago(p => ({ ...p, number: e.target.value }))}
                    placeholder="Ej: 3001234567" inputMode="tel" className={inputCls} />
                </Field>
              )}
            </div>
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
            <div className="flex gap-3">
              <button onClick={prev} className="rounded-xl border border-white/10 px-5 py-3 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5">
                <ArrowLeft className="h-4 w-4" /> Atrás
              </button>
              <button onClick={() => {
                if (!pago.wallet) { setError("Selecciona tu billetera"); return; }
                if (!/^3\d{9}$/.test(pago.number)) { setError("Número inválido (ej: 3001234567)"); return; }
                enviar();
              }} disabled={submitting}
                className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 px-5 py-3 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Enviando…</> : <>Enviar y recibir pago <ArrowRight className="h-4 w-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {pasoActual === "done" && (
          <div className="text-center py-8">
            <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-3">¡Gracias por participar!</h1>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">
              Tus respuestas han sido registradas.
              {survey.abierta_pago ? " El pago se procesará en las próximas horas." : ""}
              {" "}Tu opinión contribuye a mejorar las políticas públicas del territorio.
            </p>
            {survey.abierta_anonima && (
              <div className="mt-6 rounded-2xl bg-white/[0.03] border border-white/5 p-4 inline-flex items-center gap-2 text-sm text-slate-400">
                <EyeOff className="h-4 w-4 text-violet-400 shrink-0" />
                Tus respuestas son completamente anónimas.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
