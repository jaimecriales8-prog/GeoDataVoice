"use client";

import { useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Mic, Square, CheckCircle, Loader2, Send } from "lucide-react";

const DEMO_QUESTIONS = [
  {
    id: "q1",
    type: "single_choice",
    text: "¿Qué tan satisfecho estás con los servicios públicos en tu barrio?",
    options: ["Muy satisfecho", "Satisfecho", "Insatisfecho", "Muy insatisfecho"],
  },
  {
    id: "q2",
    type: "scale",
    text: "Del 1 al 5, ¿cómo calificarías la gestión del alcalde en los últimos 3 meses?",
    options: ["1 — Muy mala", "2 — Mala", "3 — Regular", "4 — Buena", "5 — Excelente"],
  },
  {
    id: "q3",
    type: "single_choice",
    text: "¿Cuál es el problema más urgente en tu comunidad?",
    options: ["Seguridad", "Empleo", "Salud", "Educación", "Servicios públicos", "Movilidad"],
  },
  {
    id: "q4",
    type: "audio",
    text: "Cuéntanos con tus propias palabras: ¿qué necesita mejorar urgentemente en tu barrio?",
    options: [],
  },
];

export default function EncuestaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const questions = DEMO_QUESTIONS;
  const current = questions[step];
  const isLast = step === questions.length - 1;
  const progress = ((step) / questions.length) * 100;

  function selectAnswer(value: string) {
    setAnswers(prev => ({ ...prev, [current.id]: value }));
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } catch {
      alert("No se pudo acceder al micrófono. Verifica los permisos.");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    setAnswers(prev => ({ ...prev, [current.id]: "audio_recorded" }));
  }

  async function handleNext() {
    if (isLast) {
      setSubmitting(true);
      await new Promise(r => setTimeout(r, 1500)); // simula envío
      setSubmitting(false);
      setDone(true);
    } else {
      setStep(s => s + 1);
    }
  }

  const canContinue = current.type === "audio"
    ? !!answers[current.id]
    : !!answers[current.id];

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
          <CheckCircle className="h-10 w-10 text-emerald-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Gracias!</h1>
        <p className="text-slate-600 mb-2">Tu respuesta fue registrada correctamente.</p>
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-3 mb-8">
          <p className="text-emerald-700 font-semibold text-sm">+$3.000 COP se acreditarán en 48h</p>
          <p className="text-emerald-600 text-xs mt-0.5">Vía Nequi o Daviplata</p>
        </div>
        <button onClick={() => router.push("/panelista")}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 px-7 py-3.5 text-white font-semibold transition-colors">
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-5 py-4 flex items-center gap-4">
        <button onClick={() => step === 0 ? router.back() : setStep(s => s - 1)}
          className="text-slate-500 active:text-slate-900">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-1">Pregunta {step + 1} de {questions.length}</p>
          <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-300"
              style={{ width: `${progress + (100 / questions.length)}%` }} />
          </div>
        </div>
        <span className="text-xs font-semibold text-blue-600">+$3.000</span>
      </div>

      {/* Content */}
      <div className="flex-1 px-5 py-8 flex flex-col">
        <h2 className="text-xl font-bold text-slate-900 leading-snug mb-8">{current.text}</h2>

        {/* Choice questions */}
        {(current.type === "single_choice" || current.type === "scale") && (
          <div className="space-y-3 flex-1">
            {current.options.map(opt => (
              <button key={opt} onClick={() => selectAnswer(opt)}
                className={`w-full text-left rounded-2xl border-2 px-5 py-4 text-sm font-medium transition-all ${
                  answers[current.id] === opt
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 active:bg-slate-50"
                }`}>
                <div className="flex items-center gap-3">
                  <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    answers[current.id] === opt ? "border-blue-600 bg-blue-600" : "border-slate-300"
                  }`}>
                    {answers[current.id] === opt && <div className="h-2 w-2 rounded-full bg-white" />}
                  </div>
                  {opt}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Audio question */}
        {current.type === "audio" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <p className="text-sm text-slate-500 text-center max-w-xs">
              Habla con tranquilidad. Máximo 2 minutos. Tu voz nos ayuda a entender mejor tu opinión.
            </p>

            {!audioUrl ? (
              <button
                onClick={recording ? stopRecording : startRecording}
                className={`h-28 w-28 rounded-full flex flex-col items-center justify-center gap-2 transition-all shadow-lg ${
                  recording
                    ? "bg-red-500 active:bg-red-600 shadow-red-200 scale-105"
                    : "bg-blue-600 active:bg-blue-700 shadow-blue-200"
                }`}>
                {recording ? (
                  <>
                    <Square className="h-8 w-8 text-white" />
                    <span className="text-white text-xs font-bold">
                      {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="h-10 w-10 text-white" />
                    <span className="text-white text-xs">Grabar</span>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full space-y-4">
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Tu grabación:</p>
                  <audio src={audioUrl} controls className="w-full h-10" />
                </div>
                <button onClick={() => { setAudioBlob(null); setAudioUrl(null); setAnswers(p => ({ ...p, [current.id]: "" })); }}
                  className="w-full rounded-xl border border-slate-200 py-3 text-sm text-slate-600 active:bg-slate-50">
                  Grabar de nuevo
                </button>
              </div>
            )}

            {recording && (
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1 bg-red-400 rounded-full animate-pulse"
                    style={{ height: `${Math.random() * 20 + 8}px`, animationDelay: `${i * 0.1}s` }} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next button */}
      <div className="px-5 py-5 bg-white border-t border-slate-100">
        <button onClick={handleNext} disabled={!canContinue || submitting}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 py-4 text-white font-semibold text-base transition-colors">
          {submitting ? (
            <><Loader2 className="h-5 w-5 animate-spin" /> Enviando...</>
          ) : isLast ? (
            <><Send className="h-5 w-5" /> Enviar respuestas</>
          ) : (
            <>Siguiente <ArrowRight className="h-5 w-5" /></>
          )}
        </button>
      </div>
    </div>
  );
}
