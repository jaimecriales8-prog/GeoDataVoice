import Link from "next/link";
import { MapPin, UserPlus, ClipboardList, Wifi } from "lucide-react";

export default function FieldHome() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-blue-900 px-5 py-4 flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center">
          <MapPin className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs text-blue-300 font-medium uppercase tracking-wide">GeoDataVoice</p>
          <p className="text-white font-semibold text-sm leading-tight">App de Campo</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-blue-300">
          <Wifi className="h-3.5 w-3.5" />
          <span>Online</span>
        </div>
      </header>

      <main className="flex-1 px-5 py-8 space-y-4">
        <p className="text-blue-200 text-sm mb-6">¿Qué quieres hacer hoy?</p>

        <Link href="/registro">
          <div className="flex items-center gap-4 rounded-2xl bg-blue-600 p-5 active:opacity-80 transition-opacity">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <UserPlus className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-semibold text-white">Registrar persona</p>
              <p className="text-sm text-blue-200 mt-0.5">Captura datos, GPS y consentimientos</p>
            </div>
          </div>
        </Link>

        <Link href="/visitas">
          <div className="flex items-center gap-4 rounded-2xl bg-slate-800 border border-slate-700 p-5 mt-3 active:opacity-80 transition-opacity">
            <div className="h-12 w-12 rounded-xl bg-slate-700 flex items-center justify-center shrink-0">
              <ClipboardList className="h-6 w-6 text-blue-300" />
            </div>
            <div>
              <p className="font-semibold text-white">Mis visitas del día</p>
              <p className="text-sm text-slate-400 mt-0.5">Ver registros y pendientes de sync</p>
            </div>
          </div>
        </Link>
      </main>

      <footer className="px-5 py-4 border-t border-slate-800 text-center text-xs text-slate-500">
        GeoDataVoice Campo v0.1 · Los datos se sincronizan automáticamente
      </footer>
    </div>
  );
}
