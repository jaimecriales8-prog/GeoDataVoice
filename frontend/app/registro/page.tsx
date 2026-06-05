import Link from "next/link";
import { BarChart3, MapPin, Mic, ArrowRight, ArrowLeft } from "lucide-react";

const PERFILES = [
  {
    href: "/registro/cliente",
    icon: BarChart3,
    color: "violet",
    title: "Soy cliente",
    subtitle: "Candidato, alcaldía, gobernación, gremio o empresa",
    description: "Contrata el servicio de inteligencia territorial. Accede a dashboards, mediciones recurrentes y análisis de voz para tu territorio.",
    cta: "Registrarme como cliente",
    badge: "Solicitud sujeta a aprobación",
  },
  {
    href: "/registro/encuestador",
    icon: MapPin,
    color: "emerald",
    title: "Soy encuestador",
    subtitle: "Operador de campo en barrido territorial",
    description: "Trabaja registrando personas en campo, capturando GPS y obteniendo consentimientos desde tu celular. Pago por persona validada.",
    cta: "Aplicar como encuestador",
    badge: "Trabajo remunerado",
  },
  {
    href: "/registro/panelista",
    icon: Mic,
    color: "amber",
    title: "Quiero ser panelista",
    subtitle: "Ciudadano que participa en el panel",
    description: "Responde encuestas cortas por WhatsApp cada 2 semanas y graba notas de voz. Gana $2.000–$3.000 por cada respuesta válida.",
    cta: "Unirme al panel",
    badge: "Gana dinero desde casa",
  },
];

const colorMap: Record<string, string> = {
  violet: "border-violet-200 hover:border-violet-400 hover:shadow-violet-100",
  emerald: "border-emerald-200 hover:border-emerald-400 hover:shadow-emerald-100",
  amber: "border-amber-200 hover:border-amber-400 hover:shadow-amber-100",
};

const iconBg: Record<string, string> = {
  violet: "bg-violet-600",
  emerald: "bg-emerald-600",
  amber: "bg-amber-500",
};

const badgeColor: Record<string, string> = {
  violet: "bg-violet-100 text-violet-700",
  emerald: "bg-emerald-100 text-emerald-700",
  amber: "bg-amber-100 text-amber-700",
};

const btnColor: Record<string, string> = {
  violet: "bg-violet-600 hover:bg-violet-700",
  emerald: "bg-emerald-600 hover:bg-emerald-700",
  amber: "bg-amber-500 hover:bg-amber-600",
};

export default function RegistroPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 px-4 py-12">
      <div className="mx-auto max-w-2xl">

        {/* Back */}
        <Link href="/" className="inline-flex items-center gap-2 text-blue-300 hover:text-white transition-colors mb-10 text-sm">
          <ArrowLeft className="h-4 w-4" /> Volver al inicio
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-500/30 px-4 py-1.5 text-sm text-blue-300 mb-5">
            <MapPin className="h-3.5 w-3.5" />
            GeoDataVoice
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
            ¿Cómo quieres participar?
          </h1>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Selecciona tu perfil para crear tu cuenta. Cada rol tiene un acceso y flujo diferente.
          </p>
        </div>

        {/* Cards */}
        <div className="space-y-4">
          {PERFILES.map(({ href, icon: Icon, color, title, subtitle, description, cta, badge }) => (
            <Link key={href} href={href}>
              <div className={`group rounded-2xl bg-white border-2 p-6 shadow-sm hover:shadow-lg transition-all cursor-pointer ${colorMap[color]}`}>
                <div className="flex items-start gap-5">
                  {/* Icon */}
                  <div className={`h-14 w-14 rounded-2xl ${iconBg[color]} flex items-center justify-center shrink-0 shadow-sm`}>
                    <Icon className="h-7 w-7 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 leading-tight">{title}</h2>
                        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${badgeColor[color]}`}>
                        {badge}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mt-2 mb-4">{description}</p>
                    <div className={`inline-flex items-center gap-2 rounded-xl ${btnColor[color]} px-5 py-2.5 text-sm font-semibold text-white transition-colors`}>
                      {cta} <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Already have account */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
          <p className="text-slate-400 text-sm mb-3">¿Ya tienes una cuenta?</p>
          <Link href="/login"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 hover:bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition-colors">
            Iniciar sesión <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}
