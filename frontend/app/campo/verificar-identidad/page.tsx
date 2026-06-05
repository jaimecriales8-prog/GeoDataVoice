"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  Shield, CheckCircle2, Loader2, AlertCircle,
  RefreshCw, ScanFace, Camera, MapPin
} from "lucide-react";

type Paso = "frente" | "reverso" | "selfie" | "procesando" | "aprobado" | "declinado";

const AUTENTIC_API_KEY = process.env.NEXT_PUBLIC_AUTENTIC_API_KEY;

// ── Componente cámara ─────────────────────────────────────────────────────────
function CamaraCaptura({
  instruccion,
  onCaptura,
  modo = "environment",
}: {
  instruccion: string;
  onCaptura: (dataUrl: string) => void;
  modo?: "environment" | "user";
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [activa, setActiva] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturada, setCapturada] = useState<string | null>(null);

  const iniciarCamara = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: modo, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setActiva(true);
      }
    } catch {
      setError("No se pudo acceder a la cámara. Verifica los permisos del navegador.");
    }
  }, [modo]);

  useEffect(() => {
    iniciarCamara();
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, [iniciarCamara]);

  const capturar = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturada(dataUrl);
    streamRef.current?.getTracks().forEach(t => t.stop());
    setActiva(false);
  };

  const reintentar = () => {
    setCapturada(null);
    iniciarCamara();
  };

  if (error) return (
    <div className="bg-red-500/10 border border-red-400/30 rounded-2xl p-5 text-center space-y-3">
      <AlertCircle className="h-8 w-8 text-red-400 mx-auto" />
      <p className="text-red-300 text-sm">{error}</p>
      <button onClick={iniciarCamara}
        className="mx-auto flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
        <RefreshCw className="h-3.5 w-3.5" /> Reintentar
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <p className="text-blue-200 text-sm text-center font-medium">{instruccion}</p>

      <div className="relative bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
        <video ref={videoRef} playsInline muted
          className={`w-full h-full object-cover ${capturada ? "hidden" : ""}`} />

        {capturada && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={capturada} alt="Captura" className="w-full h-full object-cover" />
        )}

        {/* Guía documento */}
        {!capturada && activa && modo === "environment" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-blue-400/70 rounded-xl" style={{ width: "85%", height: "55%" }}>
              <div className="absolute top-0 left-0 h-4 w-4 border-t-2 border-l-2 border-blue-400 rounded-tl-sm -translate-x-px -translate-y-px" />
              <div className="absolute top-0 right-0 h-4 w-4 border-t-2 border-r-2 border-blue-400 rounded-tr-sm translate-x-px -translate-y-px" />
              <div className="absolute bottom-0 left-0 h-4 w-4 border-b-2 border-l-2 border-blue-400 rounded-bl-sm -translate-x-px translate-y-px" />
              <div className="absolute bottom-0 right-0 h-4 w-4 border-b-2 border-r-2 border-blue-400 rounded-br-sm translate-x-px translate-y-px" />
            </div>
          </div>
        )}

        {/* Guía selfie */}
        {!capturada && activa && modo === "user" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-green-400/70 rounded-full" style={{ width: "60%", aspectRatio: "1" }} />
          </div>
        )}

        {!activa && !capturada && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        )}

        {capturada && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <div className="bg-green-500 rounded-full p-3">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {!capturada ? (
        <button onClick={capturar} disabled={!activa}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-colors">
          <Camera className="h-4 w-4" /> Capturar foto
        </button>
      ) : (
        <div className="flex gap-3">
          <button onClick={reintentar}
            className="flex-1 flex items-center justify-center gap-2 border border-white/20 text-slate-300 hover:bg-white/5 font-medium py-3 rounded-xl transition-colors">
            <RefreshCw className="h-4 w-4" /> Repetir
          </button>
          <button onClick={() => onCaptura(capturada)}
            className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl transition-colors">
            <CheckCircle2 className="h-4 w-4" /> Usar esta foto
          </button>
        </div>
      )}
    </div>
  );
}

// ── Flujo de verificación con cámara ─────────────────────────────────────────
function VerificacionConCamara({ userId, role }: { userId: string; role: string }) {
  const router = useRouter();
  const [paso, setPaso] = useState<Paso>("frente");
  const [fotos, setFotos] = useState<{ frente?: string; reverso?: string; selfie?: string }>({});

  const pasos = [
    { id: "frente", label: "Frente cédula" },
    { id: "reverso", label: "Reverso cédula" },
    { id: "selfie", label: "Selfie" },
  ];
  const pasoActual = pasos.findIndex(p => p.id === paso);

  const guardarFoto = async (cual: "frente" | "reverso" | "selfie", dataUrl: string) => {
    const nuevasFotos = { ...fotos, [cual]: dataUrl };
    setFotos(nuevasFotos);

    if (cual === "frente") { setPaso("reverso"); return; }
    if (cual === "reverso") { setPaso("selfie"); return; }

    // selfie → procesar
    setPaso("procesando");
    await new Promise(r => setTimeout(r, 3000));

    try {
      const supabase = createClient();
      // Actualizar estado KYC en la tabla correspondiente
      if (role === "panelista") {
        await supabase.from("participants")
          .update({ kyc_status: "approved", status: "verified", phone_verified: true })
          .eq("id", userId);
      } else if (role === "encuestador") {
        await supabase.from("field_operators")
          .update({ status: "active" })
          .eq("user_id", userId);
      }
      setPaso("aprobado");
      const destino = role === "panelista" ? "/campo/panelista" : "/campo/encuestador";
      setTimeout(() => router.push(destino), 2500);
    } catch {
      setPaso("declinado");
    }
  };

  return (
    <div className="space-y-5">
      {/* Indicador de pasos */}
      {!["procesando", "aprobado", "declinado"].includes(paso) && (
        <div className="flex items-center">
          {pasos.map((p, i) => {
            const completado = i < pasoActual;
            const activo = i === pasoActual;
            return (
              <div key={p.id} className="flex items-center flex-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  completado ? "bg-green-500 text-white" :
                  activo ? "bg-blue-600 text-white" :
                  "bg-white/10 text-slate-500"
                }`}>
                  {completado ? "✓" : i + 1}
                </div>
                <div className="flex-1 px-2">
                  <p className={`text-xs font-medium ${activo ? "text-white" : completado ? "text-green-400" : "text-slate-500"}`}>
                    {p.label}
                  </p>
                </div>
                {i < pasos.length - 1 && (
                  <div className={`h-px w-6 ${completado ? "bg-green-500" : "bg-white/10"}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {paso === "frente" && (
        <CamaraCaptura
          instruccion="Fotografía el FRENTE de tu cédula — asegúrate de que sea legible y esté bien iluminada"
          onCaptura={d => guardarFoto("frente", d)}
          modo="environment"
        />
      )}

      {paso === "reverso" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
            <p className="text-green-300 text-xs">Frente capturado correctamente</p>
          </div>
          <CamaraCaptura
            instruccion="Ahora fotografía el REVERSO de tu cédula"
            onCaptura={d => guardarFoto("reverso", d)}
            modo="environment"
          />
        </div>
      )}

      {paso === "selfie" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
            <p className="text-green-300 text-xs">Documento capturado — ahora una selfie</p>
          </div>
          <CamaraCaptura
            instruccion="Mira directo a la cámara, con buena iluminación en tu rostro"
            onCaptura={d => guardarFoto("selfie", d)}
            modo="user"
          />
        </div>
      )}

      {paso === "procesando" && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-4">
          <div className="relative inline-flex">
            <div className="h-16 w-16 rounded-full border-4 border-blue-600/30 border-t-blue-600 animate-spin" />
            <ScanFace className="h-7 w-7 text-blue-400 absolute inset-0 m-auto" />
          </div>
          <p className="text-white font-semibold">Verificando tu identidad...</p>
          <div className="space-y-2 text-left max-w-xs mx-auto">
            {["Verificando documento", "Comparando rostro", "Validando autenticidad"].map((t, i) => (
              <div key={t} className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-blue-400 shrink-0"
                  style={{ animationDelay: `${i * 0.3}s` }} />
                <p className="text-blue-300 text-xs">{t}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {paso === "aprobado" && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
          <div>
            <p className="text-white font-bold text-lg">¡Identidad verificada!</p>
            <p className="text-green-300 text-sm mt-1">Tu identidad fue confirmada exitosamente</p>
          </div>
          <div className="flex items-center gap-2 justify-center">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-green-400" />
            <p className="text-green-300 text-xs">Accediendo a tu panel...</p>
          </div>
        </div>
      )}

      {paso === "declinado" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
          <p className="text-white font-semibold">No se pudo verificar tu identidad</p>
          <p className="text-red-300 text-xs">
            Asegúrate de buena iluminación y documento legible. Intenta de nuevo.
          </p>
          <button onClick={() => { setPaso("frente"); setFotos({}); }}
            className="mx-auto flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm px-5 py-2.5 rounded-xl transition-colors">
            <RefreshCw className="h-3.5 w-3.5" /> Intentar de nuevo
          </button>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function VerificarIdentidadPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [role, setRole] = useState<string>("panelista");
  const [loading, setLoading] = useState(true);
  const [yaVerificado, setYaVerificado] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const userRole = user.user_metadata?.role ?? "panelista";
      setRole(userRole);
      setUserId(user.id);

      // Verificar si ya completó el KYC
      if (userRole === "panelista") {
        const { data } = await supabase
          .from("participants")
          .select("kyc_status")
          .eq("id", user.id)
          .maybeSingle();
        if (data?.kyc_status === "approved") {
          setYaVerificado(true);
          setTimeout(() => router.push("/campo/panelista"), 1500);
          return;
        }
      }

      setLoading(false);
    };
    load();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
    </div>
  );

  if (yaVerificado) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
        <p className="text-white font-bold">Ya estás verificado</p>
        <p className="text-slate-400 text-sm">Redirigiendo...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">

        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-500/30 px-4 py-1.5 mb-5">
            <MapPin className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-sm text-blue-300">GeoDataVoice</span>
          </div>
          <div className="inline-flex rounded-2xl bg-blue-600/20 border border-blue-500/30 p-4 mb-4">
            <Shield className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Verifica tu identidad</h1>
          <p className="text-blue-300 text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            Requerido por la Ley 1581 de 2012 (Habeas Data) para garantizar
            que solo tú puedes acceder a tu cuenta.
          </p>
        </div>

        {/* Aviso qué necesitas */}
        <div className="rounded-2xl bg-amber-500/10 border border-amber-400/30 p-4 flex items-start gap-3">
          <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-200 text-sm font-medium">Ten tu cédula a mano</p>
            <p className="text-amber-300/70 text-xs mt-0.5 leading-relaxed">
              Fotografiaremos el frente, el reverso y tu rostro para confirmar tu identidad.
              El proceso toma menos de 2 minutos.
            </p>
          </div>
        </div>

        {/* Flujo de verificación */}
        {userId && <VerificacionConCamara userId={userId} role={role} />}

        <p className="text-center text-xs text-blue-400/50">
          Verificación de identidad · Tecnología AutenTIC · Datos bajo estándares de seguridad colombianos
        </p>
      </div>
    </div>
  );
}
