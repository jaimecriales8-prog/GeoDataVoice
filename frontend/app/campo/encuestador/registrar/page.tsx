"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ArrowLeft, ArrowRight, MapPin, User, Phone, CheckCircle,
  AlertCircle, Loader2, Navigation, Camera, RefreshCw, CheckCircle2,
  Shield, ClipboardList, Mic, Square, Volume2, Send, ChevronRight
} from "lucide-react";

type Step = "seleccion" | "datos" | "identidad" | "consentimientos" | "gps" | "encuesta" | "exito";
type FotoTipo = "frente" | "reverso" | "rostro";

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text.toUpperCase().trim());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// ── Cámara ────────────────────────────────────────────────────────────────────
function CamaraCaptura({ instruccion, onCaptura, modo = "environment" }: {
  instruccion: string;
  onCaptura: (url: string) => void;
  modo?: "environment" | "user";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [activa, setActiva] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturada, setCapturada] = useState<string | null>(null);

  const iniciar = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: modo, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setActiva(true); }
    } catch { setError("No se pudo acceder a la cámara. Verifica los permisos."); }
  }, [modo]);

  useEffect(() => { iniciar(); return () => { streamRef.current?.getTracks().forEach(t => t.stop()); }; }, [iniciar]);

  const capturar = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const url = canvas.toDataURL("image/jpeg", 0.85);
    setCapturada(url);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setActiva(false);
  };

  const reintentar = () => { setCapturada(null); iniciar(); };

  if (error) return (
    <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-4 text-center space-y-2">
      <AlertCircle className="h-7 w-7 text-red-400 mx-auto" />
      <p className="text-red-300 text-sm">{error}</p>
      <button onClick={iniciar} className="mx-auto flex items-center gap-2 bg-red-600 text-white text-xs px-3 py-2 rounded-lg">
        <RefreshCw className="h-3 w-3" /> Reintentar
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-slate-300 text-sm text-center">{instruccion}</p>
      <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
        <video ref={videoRef} playsInline muted className={`w-full h-full object-cover ${capturada ? "hidden" : ""}`} />
        {capturada && <img src={capturada} alt="Captura" className="w-full h-full object-cover" />}
        {!capturada && activa && modo === "environment" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-emerald-400/70 rounded-xl" style={{ width: "85%", height: "55%" }}>
              {["tl","tr","bl","br"].map(c => (
                <div key={c} className={`absolute h-4 w-4 border-emerald-400 ${
                  c==="tl"?"top-0 left-0 border-t-2 border-l-2 rounded-tl-sm -translate-x-px -translate-y-px":
                  c==="tr"?"top-0 right-0 border-t-2 border-r-2 rounded-tr-sm translate-x-px -translate-y-px":
                  c==="bl"?"bottom-0 left-0 border-b-2 border-l-2 rounded-bl-sm -translate-x-px translate-y-px":
                  "bottom-0 right-0 border-b-2 border-r-2 rounded-br-sm translate-x-px translate-y-px"
                }`} />
              ))}
            </div>
          </div>
        )}
        {!capturada && activa && modo === "user" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-emerald-400/70 rounded-full" style={{ width: "60%", aspectRatio: "1" }} />
          </div>
        )}
        {!activa && !capturada && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
            <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
          </div>
        )}
        {capturada && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-emerald-500 rounded-full p-3"><CheckCircle2 className="h-7 w-7 text-white" /></div>
          </div>
        )}
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {!capturada ? (
        <button onClick={capturar} disabled={!activa}
          className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl">
          <Camera className="h-4 w-4" /> Capturar foto
        </button>
      ) : (
        <div className="flex gap-3">
          <button onClick={reintentar}
            className="flex-1 flex items-center justify-center gap-2 border border-white/20 text-slate-300 hover:bg-white/5 py-3 rounded-xl text-sm">
            <RefreshCw className="h-4 w-4" /> Repetir
          </button>
          <button onClick={() => onCaptura(capturada)}
            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-xl text-sm">
            <CheckCircle2 className="h-4 w-4" /> Usar esta
          </button>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
function RegistrarPanelistaContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [surveyId, setSurveyId] = useState<string | null>(params.get("survey_id"));

  const [step, setStep] = useState<Step>(params.get("survey_id") ? "datos" : "seleccion");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [operadorId, setOperadorId] = useState<string | null>(null);
  const [codigoReclutador, setCodigoReclutador] = useState<string | null>(null);
  const [identityRequired, setIdentityRequired] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);

  // Encuestas disponibles para aplicar (cuando se entra sin una seleccionada)
  const [disponibles, setDisponibles] = useState<{ id: string; name: string; wave: number }[]>([]);
  const [loadingDisp, setLoadingDisp] = useState(true);

  // Datos básicos
  const [form, setForm] = useState({
    nombre: "", documento: "", telefono: "", municipio: "", barrio: "", genero: "", edad: "",
    estrato: "", nivel_estudios: "", estado_civil: "", num_hijos: "",
    regimen_salud: "", sisben_grupo: "", tenencia_vivienda: "", grupo_etnico: "", antiguedad_barrio: "",
  });
  const [actividades, setActividades] = useState<string[]>([]);
  const [tieneHijos, setTieneHijos] = useState(false);
  const [recibeSubsidios, setRecibeSubsidios] = useState(false);
  const [accesoInternet, setAccesoInternet] = useState(false);
  const [registradoVotar, setRegistradoVotar] = useState(false);

  // Identidad
  const [fotoActual, setFotoActual] = useState<FotoTipo>("frente");
  const [fotos, setFotos] = useState<Partial<Record<FotoTipo, string>>>({});
  const [procesandoId, setProcesandoId] = useState(false);

  // Consentimientos
  const [consents, setConsents] = useState({ panel: false, datos: false });

  // GPS
  const [gps, setGps] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  // Encuesta
  const [survey, setSurvey] = useState<{ name: string; questions: any[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [qIdx, setQIdx] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: op } = await supabase.from("field_operators").select("id, recruiter_code").eq("user_id", data.user.id).maybeSingle();
      if (op) { setOperadorId(op.id); setCodigoReclutador(op.recruiter_code); }
    });
    // Encuestas disponibles para aplicar en campo
    createClient().from("surveys")
      .select("id, name, wave")
      .in("perfil_objetivo", ["encuestador", "ambos"])
      .eq("status", "sent")
      .order("created_at", { ascending: false })
      .then(({ data }) => { setDisponibles(data ?? []); setLoadingDisp(false); });
    if (surveyId) {
      const supabase = createClient();
      supabase.from("surveys").select("name, project_id, questions(id, type, text, options, order)")
        .eq("id", surveyId).single().then(async ({ data }) => {
          if (data) {
            setSurvey({ name: data.name, questions: (data.questions as any[]).sort((a, b) => a.order - b.order) });
            // Setting efectivo: override del proyecto > default global
            const { data: proy } = await supabase
              .from("projects").select("field_identity_required").eq("id", data.project_id).maybeSingle();
            const { data: cfg } = await supabase
              .from("platform_config").select("value").eq("key", "field_identity_verification").maybeSingle();
            const global = (cfg?.value as { enabled?: boolean } | null)?.enabled ?? true;
            const proyVal = proy?.field_identity_required;
            setIdentityRequired(proyVal === null || proyVal === undefined ? global : proyVal);
          }
        });
    }
  }, [surveyId]);

  function update(f: string, v: string) { setForm(p => ({ ...p, [f]: v })); }

  // ── STEP 1: Datos ─────────────────────────────────────────────────────────
  async function handleDatos() {
    if (!form.nombre || !form.documento || !form.telefono || !form.municipio) {
      setError("Nombre, documento, celular y municipio son obligatorios."); return;
    }
    if (!/^\d{7,12}$/.test(form.documento)) { setError("Documento inválido."); return; }
    if (!/^3\d{9}$/.test(form.telefono)) { setError("Celular colombiano inválido."); return; }
    setError("");
    if (identityRequired) {
      setStep("identidad");
      setFotoActual("frente");
    } else {
      // Sin validación de identidad → crear directamente y pasar a consentimientos
      crearParticipante(false);
    }
  }

  // ── STEP 2: Identidad ─────────────────────────────────────────────────────
  function handleFoto(url: string) {
    const nuevasFotos = { ...fotos, [fotoActual]: url };
    setFotos(nuevasFotos);
    if (fotoActual === "frente") { setFotoActual("reverso"); return; }
    if (fotoActual === "reverso") { setFotoActual("rostro"); return; }
    crearParticipante(true);
  }

  async function crearParticipante(conIdentidad: boolean) {
    setProcesandoId(true);
    if (conIdentidad) await new Promise(r => setTimeout(r, 2500));
    try {
      const supabase = createClient();
      const [docHash, phoneHash] = await Promise.all([sha256(form.documento), sha256(form.telefono)]);
      const newId = crypto.randomUUID();
      const { error: e } = await supabase.from("participants").insert({
        id: newId,
        document_hash: docHash,
        phone_hash: phoneHash,
        name_encrypted: form.nombre,
        gender: form.genero || null,
        birth_year: form.edad ? new Date().getFullYear() - parseInt(form.edad) : null,
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
        status: conIdentidad ? "verified" : "preregistered",
        kyc_status: conIdentidad ? "approved" : "pending",
        phone_verified: false,
      });
      if (e?.code === "23505") {
        // La persona ya existe → reutilizar su registro para aplicarle la encuesta
        const { data: existente } = await supabase
          .from("participants").select("id").eq("document_hash", docHash).maybeSingle();
        if (existente) {
          setParticipantId(existente.id);
          setProcesandoId(false);
          setStep("consentimientos");
          return;
        }
        setError("Esta persona ya está registrada, pero no se pudo recuperar su registro."); setProcesandoId(false); setStep("datos"); return;
      }
      if (e) { setError("Error al registrar a la persona. Intenta de nuevo."); setProcesandoId(false); setStep("datos"); return; }
      setParticipantId(newId);
      setProcesandoId(false);
      setStep("consentimientos");
    } catch { setProcesandoId(false); setError("Error al registrar. Intenta de nuevo."); setStep("datos"); }
  }

  // ── STEP 3: Consentimientos ───────────────────────────────────────────────
  async function handleConsentimientos() {
    if (!consents.panel || !consents.datos) { setError("Debes obtener ambos consentimientos."); return; }
    setError("");
    if (participantId) {
      const supabase = createClient();
      await supabase.from("consents").insert([
        { id: crypto.randomUUID(), participant_id: participantId, type: "panel", version: "1.0", accepted: true, channel: "field_app" },
        { id: crypto.randomUUID(), participant_id: participantId, type: "payments", version: "1.0", accepted: true, channel: "field_app" },
      ]);
    }
    setStep("gps");
  }

  // ── STEP 4: GPS ───────────────────────────────────────────────────────────
  function captureGPS() {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => { setGps({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }); setGpsLoading(false); },
      () => { setError("No se pudo obtener ubicación."); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleGPS() {
    if (gps && operadorId && participantId) {
      const supabase = createClient();
      await supabase.from("field_visits").insert({
        id: crypto.randomUUID(),
        operator_id: operadorId,
        participant_id: participantId,
        latitude: gps.lat,
        longitude: gps.lon,
        gps_accuracy: gps.accuracy,
        result: "registered",
        visited_at: new Date().toISOString(),
      });
    }
    setStep(surveyId && survey ? "encuesta" : "exito");
  }

  // ── STEP 5: Encuesta ──────────────────────────────────────────────────────
  const pregunta = survey?.questions[qIdx];

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start(); mediaRef.current = mr;
      setRecording(true); setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => { if (t >= 119) { stopRecording(); return t; } return t + 1; }), 1000);
    } catch { alert("No se pudo acceder al micrófono."); }
  }

  function stopRecording() { mediaRef.current?.stop(); setRecording(false); if (timerRef.current) clearInterval(timerRef.current); }

  async function handleEncuesta() {
    if (!pregunta) return;
    const isLast = qIdx === (survey?.questions.length ?? 0) - 1;
    if (isLast) {
      setSubmitting(true);
      // Guardar respuestas en Supabase
      if (participantId && operadorId && surveyId) {
        const supabase = createClient();
        const rows = Object.entries(answers).map(([qId, val]) => ({
          id: crypto.randomUUID(),
          participant_id: participantId,
          survey_id: surveyId,
          question_id: qId,
          encuestador_id: operadorId,
          value: val,
          quality: "complete",
          responded_at: new Date().toISOString(),
        }));
        const { error: rErr } = await supabase.from("responses").insert(rows);
        if (rErr) { setError("Error al guardar la encuesta: " + rErr.message); setSubmitting(false); return; }
      }
      setSubmitting(false);
      setStep("exito");
    } else {
      setQIdx(i => i + 1);
      setAudioUrl(null);
    }
  }

  // ── PASOS ─────────────────────────────────────────────────────────────────
  const PASOS: { id: Step; label: string; icon: React.ElementType }[] = [
    { id: "datos", label: "Datos", icon: User },
    ...(identityRequired ? [{ id: "identidad" as Step, label: "Identidad", icon: Shield }] : []),
    { id: "consentimientos", label: "Consentimiento", icon: CheckCircle },
    { id: "gps", label: "GPS", icon: Navigation },
    ...(surveyId ? [{ id: "encuesta" as Step, label: "Encuesta", icon: ClipboardList }] : []),
  ];
  const stepIdx = PASOS.findIndex(p => p.id === step);

  const fotoConfig: Record<FotoTipo, { label: string; instruccion: string; modo: "environment" | "user" }> = {
    frente: { label: "Frente cédula", instruccion: "Fotografía el FRENTE de la cédula del panelista", modo: "environment" },
    reverso: { label: "Reverso cédula", instruccion: "Fotografía el REVERSO de la cédula", modo: "environment" },
    rostro: { label: "Foto del panelista", instruccion: "Apunta la cámara al ROSTRO del panelista — que mire directo", modo: "environment" },
  };

  // ── Selección de encuesta (sin la cual no se puede encuestar) ───────────────
  if (step === "seleccion") {
    return (
      <div className="flex flex-col min-h-screen bg-slate-900">
        <header className="bg-emerald-900 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center gap-3">
          <button onClick={() => router.push("/campo/encuestador")} className="text-emerald-300 active:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-white">Encuestar en campo</p>
        </header>
        <main className="flex-1 px-5 py-6">
          <p className="text-sm text-slate-400 mb-4">Elige la encuesta que vas a aplicar:</p>
          {loadingDisp ? (
            <div className="space-y-2">{[1, 2].map(n => <div key={n} className="h-16 animate-pulse rounded-2xl bg-slate-800" />)}</div>
          ) : disponibles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-14 text-center">
              <ClipboardList className="h-10 w-10 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-300 text-sm font-medium">No hay encuestas disponibles</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                No puedes encuestar en campo sin una encuesta activa. Pídele a tu coordinador que publique una para encuestadores.
              </p>
              <button onClick={() => router.push("/campo/encuestador")}
                className="mt-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white">
                Volver al inicio
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {disponibles.map(s => (
                <button key={s.id} onClick={() => { setSurveyId(s.id); setStep("datos"); }}
                  className="w-full text-left rounded-2xl bg-slate-800 border border-white/5 p-4 flex items-center gap-4 hover:bg-slate-700 transition-colors active:scale-[0.98]">
                  <div className="h-11 w-11 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white text-sm leading-tight">{s.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Ola {s.wave}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-emerald-900 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center gap-3">
        <button onClick={() => step === "datos" ? (params.get("survey_id") ? router.back() : setStep("seleccion")) : setStep(PASOS[Math.max(0, stepIdx - 1)].id)}
          className="text-emerald-300 active:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-emerald-300 uppercase tracking-wide font-semibold">Encuesta en campo</p>
          <p className="text-xs text-emerald-200">Paso {stepIdx + 1} de {PASOS.length}</p>
        </div>
        {/* Indicadores de paso */}
        <div className="flex items-center gap-1.5">
          {PASOS.map((p, i) => (
            <div key={p.id} className={`h-2 w-2 rounded-full transition-colors ${
              i < stepIdx ? "bg-emerald-400" : i === stepIdx ? "bg-white" : "bg-white/20"
            }`} />
          ))}
        </div>
      </header>

      <main className="flex-1 px-5 py-6">

        {/* DATOS */}
        {step === "datos" && (
          <div className="space-y-4">
            <SectionTitle icon={User} title="Datos de la persona" />
            <Field label="Nombre completo *"><input value={form.nombre} onChange={e => update("nombre", e.target.value)} placeholder="Como aparece en la cédula" className={inputCls} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Cédula *"><input value={form.documento} onChange={e => update("documento", e.target.value)} placeholder="Número" inputMode="numeric" className={inputCls} /></Field>
              <Field label="Celular *"><input value={form.telefono} onChange={e => update("telefono", e.target.value)} placeholder="3001234567" inputMode="tel" className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Municipio *"><input value={form.municipio} onChange={e => update("municipio", e.target.value)} placeholder="Ej: Barranquilla" className={inputCls} /></Field>
              <Field label="Barrio"><input value={form.barrio} onChange={e => update("barrio", e.target.value)} placeholder="Tu barrio" className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Género"><select value={form.genero} onChange={e => update("genero", e.target.value)} className={inputCls}><option value="">Sin respuesta</option><option value="female">Mujer</option><option value="male">Hombre</option><option value="other">Otro</option></select></Field>
              <Field label="Edad"><input value={form.edad} onChange={e => update("edad", e.target.value)} placeholder="Ej: 38" inputMode="numeric" className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Estrato">
                <select value={form.estrato} onChange={e => update("estrato", e.target.value)} className={inputCls}>
                  <option value="">Sin respuesta</option>
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Estado civil">
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
            <Field label="Nivel de estudios">
              <select value={form.nivel_estudios} onChange={e => update("nivel_estudios", e.target.value)} className={inputCls}>
                <option value="">Sin respuesta</option>
                <option value="bachiller">Bachiller</option>
                <option value="tecnico_tecnologo">Técnico / Tecnólogo</option>
                <option value="profesional">Profesional</option>
                <option value="posgrado">Posgrado</option>
              </select>
            </Field>
            <Field label="Actividad (puede elegir varias)">
              <div className="flex flex-wrap gap-2">
                {[["estudiante","Estudiante"],["empleado","Empleado"],["independiente","Independiente"],["desempleado","Desempleado"]].map(([v, l]) => {
                  const sel = actividades.includes(v);
                  return (
                    <button key={v} type="button"
                      onClick={() => setActividades(prev => sel ? prev.filter(a => a !== v) : [...prev, v])}
                      className={`rounded-lg px-3 py-1.5 text-xs border transition-colors ${sel ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-white/10 text-slate-400"}`}>
                      {l}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-slate-300">¿Tiene hijos?</span>
                <button type="button" onClick={() => { setTieneHijos(v => !v); if (tieneHijos) update("num_hijos", ""); }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${tieneHijos ? "bg-emerald-600" : "bg-slate-600"}`}>
                  <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${tieneHijos ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </label>
              {tieneHijos && (
                <div className="mt-3">
                  <Field label="¿Cuántos hijos?">
                    <input value={form.num_hijos} onChange={e => update("num_hijos", e.target.value)} placeholder="Ej: 2" inputMode="numeric" className={inputCls} />
                  </Field>
                </div>
              )}
            </div>
            {/* Perfil socioeconómico */}
            <div className="border-t border-white/5 pt-4 space-y-3">
              <p className="text-xs text-emerald-300 font-semibold uppercase tracking-wide">Perfil socioeconómico</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Régimen de salud">
                  <select value={form.regimen_salud} onChange={e => update("regimen_salud", e.target.value)} className={inputCls}>
                    <option value="">Sin respuesta</option>
                    <option value="subsidiado">Subsidiado</option>
                    <option value="contributivo">Contributivo</option>
                    <option value="especial">Especial</option>
                    <option value="ninguno">Ninguno</option>
                  </select>
                </Field>
                <Field label="SISBEN">
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
                <Field label="Vivienda">
                  <select value={form.tenencia_vivienda} onChange={e => update("tenencia_vivienda", e.target.value)} className={inputCls}>
                    <option value="">Sin respuesta</option>
                    <option value="propia">Propia</option>
                    <option value="arriendo">Arriendo</option>
                    <option value="familiar">Familiar</option>
                  </select>
                </Field>
                <Field label="Grupo étnico">
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
              <Field label="Antigüedad en el barrio">
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
                  <label key={label} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 cursor-pointer">
                    <span className="text-sm text-slate-300">{label}</span>
                    <button type="button" onClick={() => set(v => !v)}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${val ? "bg-emerald-600" : "bg-slate-600"}`}>
                      <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${val ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </label>
                ))}
              </div>
            </div>

            {error && <ErrorBox msg={error} />}
            <PrimaryBtn onClick={handleDatos} label="Continuar" loading={false} />
          </div>
        )}

        {/* IDENTIDAD */}
        {step === "identidad" && (
          <div className="space-y-4">
            <SectionTitle icon={Shield} title="Verificación de identidad" />
            <p className="text-xs text-slate-400">
              Fotografía el documento y el rostro del panelista para verificar su identidad.
            </p>

            {/* Indicador de sub-pasos */}
            <div className="flex items-center gap-2">
              {(["frente", "reverso", "rostro"] as FotoTipo[]).map((tipo, i) => {
                const completado = !!fotos[tipo] || (tipo === "frente" && fotoActual !== "frente") || (tipo === "reverso" && fotoActual === "rostro");
                const activo = fotoActual === tipo && !procesandoId;
                return (
                  <div key={tipo} className="flex items-center flex-1">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      completado ? "bg-emerald-500 text-white" : activo ? "bg-white text-slate-900" : "bg-white/10 text-slate-500"
                    }`}>{completado ? "✓" : i + 1}</div>
                    <p className={`text-xs ml-1.5 flex-1 ${activo ? "text-white font-medium" : "text-slate-500"}`}>
                      {fotoConfig[tipo].label}
                    </p>
                    {i < 2 && <div className={`h-px w-4 mx-1 ${completado ? "bg-emerald-500" : "bg-white/10"}`} />}
                  </div>
                );
              })}
            </div>

            {procesandoId ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
                <div className="relative inline-flex">
                  <div className="h-16 w-16 rounded-full border-4 border-emerald-600/30 border-t-emerald-600 animate-spin" />
                  <Shield className="h-7 w-7 text-emerald-400 absolute inset-0 m-auto" />
                </div>
                <p className="text-white font-semibold">Verificando identidad...</p>
                <div className="space-y-1.5 text-left max-w-xs mx-auto">
                  {["Leyendo documento", "Comparando rostro", "Validando autenticidad"].map((t, i) => (
                    <div key={t} className="flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin text-emerald-400 shrink-0" style={{ animationDelay: `${i * 0.3}s` }} />
                      <p className="text-slate-300 text-xs">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <CamaraCaptura
                key={fotoActual}
                instruccion={fotoConfig[fotoActual].instruccion}
                onCaptura={handleFoto}
                modo={fotoConfig[fotoActual].modo}
              />
            )}

            {error && <ErrorBox msg={error} />}
          </div>
        )}

        {/* CONSENTIMIENTOS */}
        {step === "consentimientos" && (
          <div className="space-y-4">
            <SectionTitle icon={CheckCircle} title="Consentimientos" />
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3">
              <p className="text-xs text-emerald-300">
                El panelista debe estar presente y aceptar en pantalla. Lee cada autorización en voz alta.
              </p>
            </div>
            {[
              { key: "panel", label: "Autorizo a GeoDataVoice incluirme en su panel territorial validado y contactarme para mediciones de opinión periódicas." },
              { key: "datos", label: "Autorizo el registro y uso de mis datos para análisis territorial y el pago de incentivos a mi número de celular." },
            ].map(({ key, label }) => (
              <label key={key} className={`flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-colors ${
                consents[key as keyof typeof consents] ? "border-emerald-500/50 bg-emerald-500/10" : "border-white/10 bg-white/[0.02]"
              }`}>
                <input type="checkbox" checked={consents[key as keyof typeof consents]}
                  onChange={() => setConsents(p => ({ ...p, [key]: !p[key as keyof typeof consents] }))}
                  className="mt-0.5 h-4 w-4 rounded accent-emerald-500 shrink-0" />
                <span className="text-sm text-slate-200 leading-relaxed">{label} *</span>
              </label>
            ))}
            {error && <ErrorBox msg={error} />}
            <PrimaryBtn onClick={handleConsentimientos} label="Continuar" loading={false} />
          </div>
        )}

        {/* GPS */}
        {step === "gps" && (
          <div className="space-y-4">
            <SectionTitle icon={Navigation} title="Ubicación GPS" />
            <p className="text-sm text-slate-400">Captura la ubicación donde se realizó el registro.</p>
            {gps ? (
              <div className="rounded-xl bg-emerald-900/30 border border-emerald-700 p-4 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm"><CheckCircle className="h-4 w-4" /> Ubicación capturada</div>
                <p className="text-xs text-slate-300">Lat: {gps.lat.toFixed(6)} · Lon: {gps.lon.toFixed(6)}</p>
                <p className="text-xs text-slate-400">Precisión: ±{Math.round(gps.accuracy)}m</p>
              </div>
            ) : (
              <button onClick={captureGPS} disabled={gpsLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-white font-medium disabled:opacity-50">
                {gpsLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5" />}
                {gpsLoading ? "Obteniendo..." : "Capturar GPS"}
              </button>
            )}
            {error && <ErrorBox msg={error} />}
            <PrimaryBtn onClick={handleGPS} label={surveyId && survey ? "Continuar a encuesta" : "Finalizar registro"} loading={loading} />
            {!gps && <button onClick={handleGPS} className="w-full py-2 text-xs text-slate-500 hover:text-slate-300">Omitir GPS</button>}
          </div>
        )}

        {/* ENCUESTA */}
        {step === "encuesta" && pregunta && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <SectionTitle icon={ClipboardList} title={`Pregunta ${qIdx + 1}/${survey!.questions.length}`} />
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${((qIdx + 1) / survey!.questions.length) * 100}%` }} />
            </div>

            <p className="text-white font-semibold text-base leading-snug">{pregunta.text}</p>

            {pregunta.type !== "audio" && (pregunta.options?.choices ?? []).map((opt: string) => (
              <button key={opt} onClick={() => setAnswers(p => ({ ...p, [pregunta.id]: opt }))}
                className={`w-full text-left rounded-xl border-2 px-4 py-3 text-sm transition-all ${
                  answers[pregunta.id] === opt ? "border-emerald-500 bg-emerald-500/10 text-white" : "border-white/10 bg-white/5 text-slate-300"
                }`}>
                {opt}
              </button>
            ))}

            {pregunta.audio_prompt && (
              <div className="rounded-xl bg-white/5 p-4 space-y-3">
                <p className="text-xs text-slate-400 flex items-center gap-1.5"><Volume2 className="h-3.5 w-3.5" /> {pregunta.audio_prompt}</p>
                {!audioUrl ? (
                  <button onClick={recording ? stopRecording : startRecording}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm transition-all ${recording ? "bg-red-500 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}>
                    {recording ? <><Square className="h-4 w-4" fill="white" /> Detener ({Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")})</> : <><Mic className="h-4 w-4" /> Grabar nota de voz</>}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <audio src={audioUrl} controls className="w-full" />
                    <button onClick={() => setAudioUrl(null)} className="text-xs text-slate-500 hover:text-slate-300">Grabar de nuevo</button>
                  </div>
                )}
              </div>
            )}

            <button onClick={handleEncuesta} disabled={pregunta.type !== "audio" && !answers[pregunta.id] || submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 py-4 text-white font-semibold">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</> : qIdx < survey!.questions.length - 1 ? <>Siguiente <ArrowRight className="h-4 w-4" /></> : <><Send className="h-4 w-4" /> Finalizar encuesta</>}
            </button>
          </div>
        )}

        {/* ÉXITO */}
        {step === "exito" && (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">¡Encuesta completada!</h2>
            <p className="text-slate-400 text-sm max-w-xs">
              La encuesta a {form.nombre} fue registrada correctamente.
            </p>

            {/* Invitación a volverse panelista (reclutamiento con código) */}
            {codigoReclutador && (
              <div className="w-full max-w-xs rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4 text-left">
                <p className="text-sm font-semibold text-amber-200 mb-1">¿Quiere ser panelista y ganar por más encuestas?</p>
                <p className="text-xs text-amber-200/80 leading-relaxed mb-3">
                  Que se registre <strong>desde su propio celular</strong> con tu código. Así cuenta para tu bono de reclutamiento.
                </p>
                <div className="rounded-xl bg-amber-500/15 px-3 py-2 text-center">
                  <p className="text-[10px] text-amber-300 uppercase tracking-wide">Tu código</p>
                  <p className="text-2xl font-bold text-white font-mono tracking-wider">{codigoReclutador}</p>
                </div>
                <p className="text-[11px] text-amber-200/60 mt-2 break-all">
                  geodatavoice.grialtech.co/registro/panelista?ref={codigoReclutador}
                </p>
              </div>
            )}

            <div className="flex gap-3 w-full max-w-xs pt-2">
              <button onClick={() => { setStep("datos"); setForm({ nombre:"",documento:"",telefono:"",municipio:"",barrio:"",genero:"",edad:"",estrato:"",nivel_estudios:"",estado_civil:"",num_hijos:"",regimen_salud:"",sisben_grupo:"",tenencia_vivienda:"",grupo_etnico:"",antiguedad_barrio:"" }); setActividades([]); setTieneHijos(false); setRecibeSubsidios(false); setAccesoInternet(false); setRegistradoVotar(false); setFotos({}); setConsents({panel:false,datos:false}); setGps(null); setParticipantId(null); setAnswers({}); setQIdx(0); setAudioUrl(null); }}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-white font-semibold text-sm">
                Encuestar a otra persona
              </button>
              <button onClick={() => router.push("/campo/encuestador")}
                className="flex-1 rounded-xl border border-white/20 hover:bg-white/5 py-3 text-white text-sm">
                Volver al inicio
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function RegistrarPage() {
  return <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-emerald-400" /></div>}><RegistrarPanelistaContent /></Suspense>;
}

// ── UI helpers ────────────────────────────────────────────────────────────────
const inputCls = "w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 text-base focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>{children}</div>;
}
function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return <div className="flex items-center gap-2 mb-1"><Icon className="h-5 w-5 text-emerald-400" /><h2 className="text-lg font-semibold text-white">{title}</h2></div>;
}
function ErrorBox({ msg }: { msg: string }) {
  return <div className="flex items-start gap-2 rounded-xl bg-red-900/30 border border-red-700/50 p-3"><AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" /><p className="text-sm text-red-300">{msg}</p></div>;
}
function PrimaryBtn({ onClick, loading, label }: { onClick: () => void; loading: boolean; label: string }) {
  return <button onClick={onClick} disabled={loading} className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-4 text-white font-semibold disabled:opacity-50 mt-2">{loading && <Loader2 className="h-5 w-5 animate-spin" />}{loading ? "Procesando..." : label}{!loading && <ArrowRight className="h-4 w-4" />}</button>;
}
