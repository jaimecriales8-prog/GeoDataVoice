"use client";

import { useState, useRef, use, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  ArrowLeft, ArrowRight, Mic, Square, CheckCircle,
  Loader2, Send, Volume2, AlertCircle
} from "lucide-react";

type Question = {
  id: string;
  type: string;
  text: string;
  options: { choices?: string[] } | null;
  required: boolean;
  order: number;
};

type StepState = "answering" | "recording";

export default function EncuestaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: surveyId } = use(params);
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [surveyName, setSurveyName] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState(0);
  const [substep, setSubstep] = useState<StepState>("answering");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [audioUrls, setAudioUrls] = useState<Record<string, string | null>>({});

  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [resumen, setResumen] = useState({ respuestas: 0, audios: 0 });

  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const audioBlobs = useRef<Record<string, Blob>>({});
  const audioDurations = useRef<Record<string, number>>({});

  // ── Cargar encuesta + preguntas reales ───────────────────────────────────
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push("/login"); return; }
      setUserId(data.user.id);

      const { data: survey } = await supabase
        .from("surveys").select("id, name").eq("id", surveyId).maybeSingle();
      if (!survey) { setLoadError("Esta encuesta no existe o ya no está disponible."); setLoading(false); return; }
      setSurveyName(survey.name);

      const { data: qs } = await supabase
        .from("questions")
        .select("id, type, text, options, required, order")
        .eq("survey_id", surveyId)
        .order("order", { ascending: true });

      if (!qs || qs.length === 0) { setLoadError("Esta encuesta aún no tiene preguntas."); setLoading(false); return; }
      setQuestions(qs as Question[]);
      setLoading(false);
    });
  }, [surveyId, router]);

  const current = questions[step];
  const isLastQuestion = step === questions.length - 1;
  const totalSteps = Math.max(questions.length * 2, 1);
  const currentStepNum = step * 2 + (substep === "recording" ? 1 : 0) + 1;
  const progress = (currentStepNum / totalSteps) * 100;

  function selectAnswer(value: string) {
    setAnswers(prev => ({ ...prev, [current.id]: value }));
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const qid = current.id;
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        audioBlobs.current[qid] = blob;
        setAudioUrl(url);
        setAudioUrls(prev => ({ ...prev, [qid]: url }));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => {
        const next = t + 1;
        audioDurations.current[current.id] = next;
        if (next >= 120) { stopRecording(); return 120; }
        return next;
      }), 1000);
    } catch {
      alert("No se pudo acceder al micrófono. Verifica los permisos del navegador.");
    }
  }

  function stopRecording() {
    if (mediaRef.current && mediaRef.current.state !== "inactive") mediaRef.current.stop();
    mediaRef.current = null;
    setRecording(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  const cancelRecording = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.onstop = null;
      mediaRef.current.stream?.getTracks().forEach(t => t.stop());
      mediaRef.current.stop();
    }
    mediaRef.current = null;
    setRecording(false);
    setRecordingTime(0);
  }, []);

  useEffect(() => () => cancelRecording(), [cancelRecording]);

  function resetAudio() {
    delete audioBlobs.current[current.id];
    delete audioDurations.current[current.id];
    setAudioUrl(null);
    setAudioUrls(prev => ({ ...prev, [current.id]: null }));
  }

  // ── Guardar todo en Supabase ─────────────────────────────────────────────
  async function submitEncuesta() {
    if (!userId) return;
    setSubmitting(true);
    setSubmitError(null);
    const supabase = createClient();

    let respuestasOk = 0, audiosOk = 0;
    try {
      for (const q of questions) {
        const value = answers[q.id] ?? "";
        const responseId = crypto.randomUUID();

        const { error: rErr } = await supabase.from("responses").insert({
          id: responseId,
          participant_id: userId,
          survey_id: surveyId,
          question_id: q.id,
          value,
          quality: "complete",
          responded_at: new Date().toISOString(),
        });
        if (rErr) throw new Error(`Respuesta: ${rErr.message}`);
        respuestasOk++;

        // Subir audio si existe (vía route handler con service role)
        const blob = audioBlobs.current[q.id];
        if (blob) {
          const fd = new FormData();
          fd.append("file", blob, `${q.id}.webm`);
          fd.append("surveyId", surveyId);
          fd.append("questionId", q.id);
          const up = await fetch("/api/audio/upload", { method: "POST", body: fd });
          if (up.ok) {
            const { path } = await up.json();
            await supabase.from("audio_responses").insert({
              id: crypto.randomUUID(),
              response_id: responseId,
              audio_url: path,
              duration_seconds: audioDurations.current[q.id] ?? null,
              quality: "pending",
            });
            audiosOk++;
          }
        }
      }
      setResumen({ respuestas: respuestasOk, audios: audiosOk });
      setDone(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Error al guardar tus respuestas.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNext() {
    if (recording) return;
    if (substep === "answering") {
      setSubstep("recording");
      setAudioUrl(audioUrls[current.id] || null);
    } else {
      cancelRecording();
      if (isLastQuestion) {
        await submitEncuesta();
      } else {
        setStep(s => s + 1);
        setSubstep("answering");
        setAudioUrl(audioUrls[questions[step + 1]?.id] || null);
      }
    }
  }

  function handleBack() {
    cancelRecording();
    if (substep === "recording") {
      setSubstep("answering");
    } else if (step > 0) {
      setStep(s => s - 1);
      setSubstep("recording");
      setAudioUrl(audioUrls[questions[step - 1]?.id] || null);
    } else {
      router.back();
    }
  }

  const canContinue = substep === "answering" ? !!answers[current?.id] : !recording;

  // ── Estados de carga / error ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-bold text-slate-900 mb-2">No se pudo abrir la encuesta</h1>
        <p className="text-slate-600 mb-6 text-sm">{loadError}</p>
        <button onClick={() => router.push("/campo/panelista")}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 px-7 py-3 text-white font-semibold transition-colors">
          Volver al inicio
        </button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Gracias!</h1>
        <p className="text-slate-600 mb-6">Tus respuestas fueron guardadas correctamente.</p>

        <div className="w-full max-w-xs rounded-2xl bg-white border border-slate-200 p-5 mb-6 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Preguntas respondidas</span>
            <span className="font-bold text-slate-800">{resumen.respuestas}/{questions.length}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Notas de voz enviadas</span>
            <span className="font-bold text-slate-800">{resumen.audios}</span>
          </div>
        </div>

        <button onClick={() => router.push("/campo/panelista")}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 px-7 py-3.5 text-white font-semibold transition-colors">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-4">
        <button onClick={handleBack} className="text-slate-500 active:text-slate-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-500 mb-1.5">
            <span>
              {substep === "answering" ? `Pregunta ${step + 1} de ${questions.length}` : "Nota de voz (opcional)"}
            </span>
            <span className="font-semibold text-blue-600 truncate ml-2">{surveyName}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {substep === "answering" && current && (
        <div className="flex-1 flex flex-col px-5 py-8">
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
            Pregunta {step + 1}
          </span>
          <h2 className="text-xl font-bold text-slate-900 leading-snug mb-8">{current.text}</h2>

          <div className="space-y-3 flex-1">
            {(current.options?.choices ?? []).map(opt => (
              <button key={opt} onClick={() => selectAnswer(opt)}
                className={`w-full text-left rounded-2xl border-2 px-5 py-4 text-sm font-medium transition-all active:scale-[0.98] ${
                  answers[current.id] === opt
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700"
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    answers[current.id] === opt ? "border-blue-600 bg-blue-600" : "border-slate-300"
                  }`}>
                    {answers[current.id] === opt && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  {opt}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {substep === "recording" && current && (
        <div className="flex-1 flex flex-col px-5 py-6">
          <div className="rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 mb-6">
            <p className="text-xs text-blue-500 font-medium mb-0.5">Tu respuesta</p>
            <p className="text-sm font-semibold text-blue-800">{answers[current.id]}</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Volume2 className="h-4 w-4 text-slate-500" />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cuéntanos más (opcional)</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 leading-snug">
              ¿Quieres ampliar tu respuesta con una nota de voz?
            </h2>
            <p className="text-sm text-slate-500 mt-2">
              Habla con naturalidad. Máximo 2 minutos. Puedes omitir si no quieres grabar.
            </p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            {!audioUrl ? (
              <>
                <button
                  onClick={recording ? stopRecording : startRecording}
                  className={`h-32 w-32 rounded-full flex flex-col items-center justify-center gap-2 transition-all shadow-xl active:scale-95 ${
                    recording ? "bg-red-500 shadow-red-200 scale-110" : "bg-blue-600 shadow-blue-200"
                  }`}>
                  {recording ? (
                    <>
                      <Square className="h-9 w-9 text-white" fill="white" />
                      <span className="text-white text-sm font-bold tabular-nums">
                        {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
                      </span>
                    </>
                  ) : (
                    <>
                      <Mic className="h-11 w-11 text-white" />
                      <span className="text-white text-xs font-medium">Grabar</span>
                    </>
                  )}
                </button>
                {recording && (
                  <div className="flex items-center gap-1 h-8">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="w-1.5 bg-red-400 rounded-full animate-pulse"
                        style={{ height: `${Math.sin(i * 0.8) * 12 + 16}px`, animationDuration: `${0.4 + i * 0.07}s` }} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="w-full space-y-4">
                <div className="rounded-2xl bg-white border border-slate-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                    <p className="text-sm font-semibold text-slate-700">Nota de voz grabada</p>
                  </div>
                  <audio src={audioUrl} controls className="w-full" />
                </div>
                <button onClick={resetAudio}
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm text-slate-600 active:bg-slate-50">
                  Grabar de nuevo
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="px-5 py-5 bg-white border-t border-slate-100 space-y-2">
        {submitError && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {submitError}
          </div>
        )}
        <button onClick={handleNext} disabled={!canContinue || submitting}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 py-4 text-white font-semibold text-base transition-colors">
          {submitting ? (
            <><Loader2 className="h-5 w-5 animate-spin" />Guardando...</>
          ) : substep === "answering" ? (
            <>Continuar <ArrowRight className="h-5 w-5" /></>
          ) : isLastQuestion ? (
            <><Send className="h-5 w-5" />Enviar respuestas</>
          ) : (
            <>Siguiente pregunta <ArrowRight className="h-5 w-5" /></>
          )}
        </button>

        {substep === "recording" && !audioUrl && !recording && (
          <button onClick={handleNext} disabled={submitting}
            className="w-full py-3 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            Omitir nota de voz
          </button>
        )}
      </div>
    </div>
  );
}
