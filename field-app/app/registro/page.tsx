"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { preRegisterParticipant, recordVisit, recordConsents, fetchConsentTexts } from "@/lib/api";
import {
  ArrowLeft, ArrowRight, MapPin, User, Phone, CheckCircle,
  AlertCircle, Loader2, Navigation
} from "lucide-react";

type Step = "datos" | "gps" | "consentimientos" | "exito";
type Gender = "male" | "female" | "other" | "prefer_not_to_say";

const OPERATOR_ID = process.env.NEXT_PUBLIC_OPERATOR_ID ?? "00000000-0000-0000-0000-000000000001";

const CONSENT_TYPES = ["panel", "whatsapp", "payments"] as const;
const CONSENT_LABELS: Record<string, string> = {
  panel: "Participar en el panel de opinión",
  audio: "Grabación y análisis de mis notas de voz",
  whatsapp: "Recibir encuestas por WhatsApp",
  payments: "Recibir pagos por mis respuestas (Nequi/Daviplata)",
};

export default function RegistroPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("datos");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [participantId, setParticipantId] = useState("");
  const [consentTexts, setConsentTexts] = useState<Record<string, string>>({});

  // Form fields
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [genero, setGenero] = useState<Gender | "">("");
  const [anioNacimiento, setAnioNacimiento] = useState("");

  // GPS
  const [gps, setGps] = useState<{ lat: number; lon: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");

  // Consents
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchConsentTexts()
      .then((d: { texts: Record<string, string> }) => setConsentTexts(d.texts))
      .catch(() => {});
  }, []);

  // ── Step 1: Datos ────────────────────────────────────────────────────

  async function handleDatos() {
    if (!nombre.trim() || !documento.trim() || !telefono.trim()) {
      setError("Nombre, documento y teléfono son obligatorios.");
      return;
    }
    if (!/^\d{7,12}$/.test(documento)) {
      setError("El número de documento debe tener entre 7 y 12 dígitos.");
      return;
    }
    if (!/^3\d{9}$/.test(telefono)) {
      setError("Ingresa un celular colombiano válido (ej: 3001234567).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await preRegisterParticipant({
        document_number: documento,
        phone: telefono,
        name: nombre,
        gender: genero || undefined,
        birth_year: anioNacimiento ? parseInt(anioNacimiento) : undefined,
      });
      if (result) {
        setParticipantId(result.id);
      }
      // Move to GPS even if offline (result may be null — will sync later)
      setStep("gps");
    } catch (e) {
      setError("Error al registrar. Los datos se guardarán para sincronizar después.");
      setStep("gps");
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: GPS ──────────────────────────────────────────────────────

  function captureGPS() {
    setGpsLoading(true);
    setGpsError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsLoading(false);
      },
      (err) => {
        setGpsError("No se pudo obtener ubicación. Verifica permisos.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleGPS() {
    if (gps && participantId) {
      await recordVisit({
        operator_id: OPERATOR_ID,
        participant_id: participantId || undefined,
        latitude: gps.lat,
        longitude: gps.lon,
        gps_accuracy: gps.accuracy,
        result: "registered",
        visited_at: new Date().toISOString(),
      });
    }
    setStep("consentimientos");
  }

  // ── Step 3: Consentimientos ──────────────────────────────────────────

  function toggleConsent(type: string) {
    setAccepted(prev => ({ ...prev, [type]: !prev[type] }));
  }

  async function handleConsentimientos() {
    const requiredTypes = ["panel", "whatsapp"];
    const allAccepted = requiredTypes.every(t => accepted[t]);
    if (!allAccepted) {
      setError("Debes aceptar los consentimientos obligatorios (Panel y WhatsApp).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const acceptedTypes = Object.entries(accepted)
        .filter(([, v]) => v)
        .map(([k]) => k);
      if (participantId) {
        await recordConsents(participantId, acceptedTypes);
      }
      setStep("exito");
    } catch {
      setStep("exito"); // Don't block the user — sync later
    } finally {
      setLoading(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-blue-900 px-5 py-4 flex items-center gap-3">
        <button onClick={() => step === "datos" ? router.back() : setStep(step === "gps" ? "datos" : step === "consentimientos" ? "gps" : "datos")}
          className="text-blue-300 active:text-white">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <p className="text-xs text-blue-300 uppercase tracking-wide">Registro de persona</p>
          <StepIndicator step={step} />
        </div>
      </header>

      <main className="flex-1 px-5 py-6">
        {step === "datos" && (
          <div className="space-y-5">
            <SectionTitle icon={User} title="Datos personales" />

            <Field label="Nombre completo *">
              <input
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="Ej: María García López"
                className={inputClass}
              />
            </Field>

            <Field label="Número de documento *">
              <input
                type="number"
                value={documento}
                onChange={e => setDocumento(e.target.value)}
                placeholder="Ej: 12345678"
                inputMode="numeric"
                className={inputClass}
              />
            </Field>

            <Field label="Celular *">
              <input
                type="tel"
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder="Ej: 3001234567"
                inputMode="tel"
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Género">
                <select value={genero} onChange={e => setGenero(e.target.value as Gender)}
                  className={inputClass}>
                  <option value="">Sin respuesta</option>
                  <option value="female">Mujer</option>
                  <option value="male">Hombre</option>
                  <option value="other">Otro</option>
                </select>
              </Field>
              <Field label="Año de nacimiento">
                <input
                  type="number"
                  value={anioNacimiento}
                  onChange={e => setAnioNacimiento(e.target.value)}
                  placeholder="Ej: 1985"
                  inputMode="numeric"
                  min={1920} max={2010}
                  className={inputClass}
                />
              </Field>
            </div>

            {error && <ErrorBox message={error} />}

            <PrimaryButton onClick={handleDatos} loading={loading} label="Continuar" />
          </div>
        )}

        {step === "gps" && (
          <div className="space-y-5">
            <SectionTitle icon={Navigation} title="Ubicación GPS" />
            <p className="text-sm text-slate-400">
              Captura la ubicación actual para verificar la residencia del panelista.
            </p>

            {gps ? (
              <div className="rounded-xl bg-emerald-900/30 border border-emerald-700 p-4 space-y-1">
                <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Ubicación capturada
                </div>
                <p className="text-xs text-slate-300">
                  Lat: {gps.lat.toFixed(6)} · Lon: {gps.lon.toFixed(6)}
                </p>
                <p className="text-xs text-slate-400">Precisión: ±{Math.round(gps.accuracy)}m</p>
              </div>
            ) : (
              <button
                onClick={captureGPS}
                disabled={gpsLoading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-white font-medium active:opacity-80 disabled:opacity-50"
              >
                {gpsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <MapPin className="h-5 w-5" />
                )}
                {gpsLoading ? "Obteniendo ubicación..." : "Capturar GPS"}
              </button>
            )}

            {gpsError && <ErrorBox message={gpsError} />}

            <PrimaryButton
              onClick={handleGPS}
              label={gps ? "Continuar" : "Omitir GPS"}
              loading={false}
            />
          </div>
        )}

        {step === "consentimientos" && (
          <div className="space-y-5">
            <SectionTitle icon={CheckCircle} title="Consentimientos" />
            <p className="text-sm text-slate-400">
              Lee y acepta las autorizaciones antes de continuar. Los marcados con * son obligatorios.
            </p>

            <div className="space-y-3">
              {CONSENT_TYPES.map(type => {
                const isRequired = type === "panel" || type === "whatsapp";
                const text = consentTexts[type] ?? CONSENT_LABELS[type] ?? type;
                return (
                  <label key={type}
                    className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-colors ${accepted[type] ? "bg-blue-900/30 border-blue-600" : "bg-slate-800 border-slate-700"}`}>
                    <input
                      type="checkbox"
                      checked={!!accepted[type]}
                      onChange={() => toggleConsent(type)}
                      className="mt-0.5 h-4 w-4 rounded accent-blue-500 shrink-0"
                    />
                    <span className="text-sm text-slate-200">
                      {text}
                      {isRequired && <span className="text-blue-400 ml-1">*</span>}
                    </span>
                  </label>
                );
              })}
            </div>

            {error && <ErrorBox message={error} />}

            <PrimaryButton onClick={handleConsentimientos} loading={loading} label="Finalizar registro" />
          </div>
        )}

        {step === "exito" && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
              <CheckCircle className="h-10 w-10 text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-white">¡Registro exitoso!</h2>
            <p className="text-sm text-slate-400 max-w-xs">
              La persona ha sido registrada. Los datos se sincronizarán con el servidor automáticamente.
            </p>
            {participantId && (
              <p className="text-xs text-slate-500 font-mono bg-slate-800 px-3 py-1.5 rounded-lg">
                ID: {participantId.slice(0, 8)}…
              </p>
            )}
            <button
              onClick={() => router.push("/")}
              className="mt-6 w-full rounded-xl bg-blue-600 py-4 text-white font-semibold active:opacity-80"
            >
              Registrar otra persona
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

// ── UI helpers ────────────────────────────────────────────────────────

const inputClass =
  "w-full rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon className="h-5 w-5 text-blue-400" />
      <h2 className="text-lg font-semibold text-white">{title}</h2>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl bg-red-900/30 border border-red-700/50 p-3">
      <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm text-red-300">{message}</p>
    </div>
  );
}

function PrimaryButton({ onClick, loading, label }: {
  onClick: () => void; loading: boolean; label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-4 text-white font-semibold active:opacity-80 disabled:opacity-50 mt-4"
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
      {loading ? "Procesando..." : label}
      {!loading && <ArrowRight className="h-4 w-4" />}
    </button>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const steps: Step[] = ["datos", "gps", "consentimientos", "exito"];
  const current = steps.indexOf(step) + 1;
  return (
    <p className="text-xs text-blue-200">
      Paso {current} de {steps.length - 1}
    </p>
  );
}
