"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Mail, CheckCircle, AlertCircle } from "lucide-react";

function VerificarEmailContent() {
  const params = useSearchParams();
  const email = params.get("email");
  const tipo = params.get("tipo");

  const esError = tipo === "error";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            <MapPin className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">GeoDataVoice</h1>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-8 text-center space-y-5">
          <div className={`mx-auto h-16 w-16 rounded-full flex items-center justify-center ${esError ? "bg-red-500/20" : "bg-blue-500/20"}`}>
            {esError
              ? <AlertCircle className="h-8 w-8 text-red-400" />
              : <Mail className="h-8 w-8 text-blue-400" />
            }
          </div>

          {esError ? (
            <>
              <h2 className="text-xl font-bold text-white">Enlace inválido o expirado</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                El enlace de confirmación no es válido o ha expirado. Los enlaces tienen validez de 24 horas.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold text-white">Revisa tu correo</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Te enviamos un enlace de confirmación a{" "}
                {email ? <strong className="text-white">{email}</strong> : "tu correo electrónico"}.
                Haz clic en el enlace para activar tu cuenta.
              </p>
              <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-xs text-blue-300 text-left space-y-1.5">
                <p className="font-semibold text-blue-200 mb-2">¿No llegó el correo?</p>
                <p>• Revisa tu carpeta de spam o correo no deseado</p>
                <p>• Puede tardar hasta 2 minutos</p>
                <p>• El enlace expira en 24 horas</p>
              </div>
            </>
          )}

          <Link href="/login"
            className="block w-full rounded-xl bg-blue-600 hover:bg-blue-500 py-3 text-sm font-semibold text-white transition-colors text-center">
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense>
      <VerificarEmailContent />
    </Suspense>
  );
}
