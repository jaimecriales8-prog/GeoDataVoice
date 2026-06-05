import Link from "next/link";
import {
  MapPin, Mic, BarChart3, Users, Shield, TrendingUp,
  CheckCircle, ArrowRight, ChevronRight, Star, Phone
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Nav ──────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur border-b border-slate-100">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <MapPin className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-900 tracking-tight">GeoDataVoice</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#como-funciona" className="hover:text-blue-600 transition-colors">Cómo funciona</a>
            <a href="#perfiles" className="hover:text-blue-600 transition-colors">Perfiles</a>
            <a href="#metodologia" className="hover:text-blue-600 transition-colors">Metodología</a>
            <a href="#contacto" className="hover:text-blue-600 transition-colors">Contacto</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              Ingresar
            </Link>
            <Link href="/registro"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
              Registrarse
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="pt-32 pb-24 px-6 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white relative overflow-hidden">
        {/* decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.05)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 border border-blue-500/30 px-4 py-1.5 text-sm text-blue-300 mb-8">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            Panel territorial validado · Colombia
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Escucha personas reales.<br />
            <span className="text-blue-400">Mide lo que importa.</span>
          </h1>

          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            GeoDataVoice construye paneles de ciudadanos verificados y georreferenciados
            para producir inteligencia territorial recurrente — con voz, datos y mapas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contacto"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-7 py-4 text-base font-semibold transition-colors">
              Solicitar demo gratuita <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#como-funciona"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 hover:bg-white/10 px-7 py-4 text-base font-semibold transition-colors">
              Ver cómo funciona
            </a>
          </div>

          {/* Social proof strip */}
          <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm text-slate-400">
            {["Candidatos a entes territoriales", "Entes territoriales", "Gremios empresariales", "Entidades públicas"].map(s => (
              <div key={s} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-400" />
                {s}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problema ─────────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">El problema con las encuestas tradicionales</h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              Tomar decisiones sin datos confiables es costoso. Las encuestas episódicas no explican <em>por qué</em> cambia la opinión.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "💸", title: "Costosas y episódicas", desc: "Una encuesta cada seis meses no detecta cambios a tiempo. El problema ya escaló cuando te enteraste." },
              { icon: "❓", title: "No explican el porqué", desc: "Un número de favorabilidad no te dice qué lo mueve. Sin narrativa, no hay estrategia posible." },
              { icon: "🎲", title: "Sin verificación real", desc: "Las encuestas digitales abiertas no comprueban quién responde ni dónde vive realmente." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-white border border-slate-200 p-6">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3 Actores ────────────────────────────────────────────────── */}
      <section id="perfiles" className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Cómo funciona el ecosistema</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2 mb-4">Tres actores, una sola inteligencia</h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              GeoDataVoice conecta a quienes necesitan información, quienes la recolectan y quienes la producen con su voz.
            </p>
          </div>

          {/* Actors row */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: BarChart3,
                color: "violet",
                bg: "bg-violet-600",
                border: "border-violet-100",
                num: "01",
                title: "Cliente",
                who: "Candidatos a entes territoriales, gremios, empresas",
                desc: "Contrata el servicio para medir su territorio. Recibe un dashboard con favorabilidad, sentimiento ciudadano y narrativas actualizadas después de cada ola.",
              },
              {
                icon: Mic,
                color: "amber",
                bg: "bg-amber-500",
                border: "border-amber-100",
                num: "03",
                title: "Panelista",
                who: "Ciudadano verificado del municipio",
                desc: "Responde encuestas cortas desde su celular cada 2 semanas y graba una nota de voz explicando su opinión. Recibe pagos por cada respuesta válida.",
              },
            ].map(({ icon: Icon, bg, border, num, title, who, desc }) => (
              <div key={title} className={`rounded-2xl border-2 ${border} bg-white p-6 flex flex-col gap-3`}>
                <div className="flex items-center justify-between">
                  <div className={`h-11 w-11 rounded-xl ${bg} flex items-center justify-center`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-2xl font-black text-slate-100">{num}</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{title}</h3>
                  <p className="text-xs text-slate-400 font-medium">{who}</p>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Arrow connector */}
          <div className="hidden md:flex items-center justify-center gap-4 mb-12 text-sm text-slate-400">
            <span className="font-medium">El cliente define qué medir</span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span className="font-medium">El panelista se verifica y responde</span>
            <ArrowRight className="h-4 w-4 text-slate-300" />
            <span className="font-semibold text-blue-600">El cliente recibe inteligencia</span>
          </div>


          {/* Solo panelista — centrado y destacado */}
          <div className="max-w-xl mx-auto">
            <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 p-8 flex flex-col gap-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-amber-500 flex items-center justify-center shrink-0 shadow-sm">
                  <Mic className="h-7 w-7 text-white" />
                </div>
                <div>
                  <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">¿Quieres ganar dinero?</span>
                  <h3 className="font-extrabold text-slate-900 text-xl leading-tight">Únete al panel ciudadano</h3>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Responde encuestas cortas desde tu celular cada 2 semanas y graba una nota de voz explicando tu opinión.
                Recibe <strong className="text-amber-700">$2.000–$3.000 COP</strong> en Nequi o Daviplata por cada respuesta válida.
              </p>

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { v: "15 min", l: "por encuesta" },
                  { v: "$3.000", l: "por respuesta" },
                  { v: "100%", l: "desde tu celular" },
                ].map(({ v, l }) => (
                  <div key={l} className="rounded-xl bg-white border border-amber-100 py-3 px-2">
                    <p className="text-amber-600 font-extrabold text-lg leading-none">{v}</p>
                    <p className="text-xs text-slate-500 mt-1">{l}</p>
                  </div>
                ))}
              </div>

              <ul className="space-y-2">
                {["Encuestas desde la web — sin instalar nada", "Notas de voz cortas después de cada pregunta", "Pagos directos a tu Nequi o Daviplata", "Verificación de identidad digital — sin salir de casa"].map(i => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle className="h-4 w-4 text-amber-500 shrink-0" />{i}
                  </li>
                ))}
              </ul>

              <Link href="/registro/panelista"
                className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 px-6 py-4 text-base font-bold text-white transition-colors shadow-md shadow-amber-200">
                Quiero ser panelista 🎤 <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Encuestador — destacado */}
          <div className="max-w-xl mx-auto mt-8">
            <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-8 flex flex-col gap-5 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                  <MapPin className="h-7 w-7 text-white" />
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">¿Quieres trabajar en campo?</span>
                  <h3 className="font-extrabold text-slate-900 text-xl leading-tight">Sé encuestador territorial</h3>
                </div>
              </div>

              <p className="text-slate-600 leading-relaxed">
                Trabaja verificando y registrando personas en tu municipio desde tu celular.
                Recibe <strong className="text-emerald-700">pago por cada panelista validado</strong> en Nequi o Daviplata.
              </p>

              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { v: "Flexible", l: "tus propios horarios" },
                  { v: "Por logro", l: "pago por persona" },
                  { v: "Local", l: "en tu municipio" },
                ].map(({ v, l }) => (
                  <div key={l} className="rounded-xl bg-white border border-emerald-100 py-3 px-2">
                    <p className="text-emerald-600 font-extrabold text-lg leading-none">{v}</p>
                    <p className="text-xs text-slate-500 mt-1">{l}</p>
                  </div>
                ))}
              </div>

              <ul className="space-y-2">
                {[
                  "Registras personas puerta a puerta con tu celular",
                  "Capturas GPS y consentimientos en el momento",
                  "Verificas identidad con el documento físico",
                  "Cobras por cada panelista validado exitosamente",
                ].map(i => (
                  <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />{i}
                  </li>
                ))}
              </ul>

              <Link href="/registro/encuestador"
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-6 py-4 text-base font-bold text-white transition-colors shadow-md shadow-emerald-200">
                Aplicar como encuestador <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── Cómo funciona ────────────────────────────────────────────── */}
      <section id="como-funciona" className="py-24 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Metodología</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2 mb-4">Panel validado, medición recurrente</h2>
            <p className="text-slate-600 max-w-xl mx-auto">
              No encuestamos a cualquiera. Reclutamos, verificamos y mantenemos un panel de personas reales
              con residencia comprobada en tu territorio.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              { step: "01", icon: Users, title: "Registro y verificación", desc: "El panelista se registra desde su celular y verifica su identidad digitalmente. Residencia comprobada con geolocalización." },
              { step: "02", icon: Shield, title: "Panel verificado", desc: "Solo personas reales con celular validado, geolocalización y consentimiento explícito." },
              { step: "03", icon: Mic, title: "Medición web y voz", desc: "Encuestas cada 2 semanas desde el celular. Notas de voz que capturan el porqué de la opinión." },
              { step: "04", icon: BarChart3, title: "Dashboard de inteligencia", desc: "Favorabilidad, sentimiento, temas y narrativas por zona — actualizado después de cada ola." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="text-xs font-bold text-blue-600 mb-4 tracking-widest">{step}</div>
                <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2 text-sm">{title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Para quién ───────────────────────────────────────────────── */}
      <section id="clientes" className="py-24 px-6 bg-slate-50">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Clientes</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2 mb-4">¿Para quién es GeoDataVoice?</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                icon: "🗳️", title: "Candidatos a entes territoriales",
                items: ["Favorabilidad por polígono y segmento", "Razones de cambio de percepción", "Mensajes creíbles por zona", "Tracking quincenal durante campaña"],
              },
              {
                icon: "🏛️", title: "Entes territoriales",
                items: ["Satisfacción con la gestión por sector", "Alertas tempranas por zona", "Percepción de programas y obras", "Tablero de gobernabilidad mensual"],
              },
              {
                icon: "🏢", title: "Gremios y empresas",
                items: ["Panel de afiliados y agenda sectorial", "Percepción frente a reformas", "Comunicación directa con miembros"],
              },
            ].map(({ icon, title, items }) => (
              <div key={title} className="rounded-2xl bg-white border border-slate-200 p-6 hover:border-blue-200 hover:shadow-sm transition-all">
                <div className="text-3xl mb-3">{icon}</div>
                <h3 className="font-bold text-slate-900 mb-4">{title}</h3>
                <ul className="space-y-2">
                  {items.map(item => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                      <ChevronRight className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Metodología ──────────────────────────────────────────────── */}
      <section id="metodologia" className="py-24 px-6">
        <div className="mx-auto max-w-5xl grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Rigor metodológico</span>
            <h2 className="text-3xl font-bold text-slate-900 mt-2 mb-6">
              Un panel que resiste el escrutinio técnico
            </h2>
            <div className="space-y-5">
              {[
                { title: "Panel longitudinal rotativo", desc: "Medimos a las mismas personas en el tiempo para detectar cambios reales, no ruido." },
                { title: "Reclutamiento presencial validado", desc: "Identidad tipo KYC, celular verificado con OTP, residencia comprobada con GPS." },
                { title: "Post-estratificación estadística", desc: "Ponderamos para alinear la muestra con la distribución poblacional real del territorio." },
                { title: "Voz como dato cualitativo", desc: "Las notas de voz transcritas y analizadas con IA revelan narrativas que los números no capturan." },
              ].map(({ title, desc }) => (
                <div key={title} className="flex gap-4">
                  <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{title}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900 p-8 text-white">
            <div className="text-sm font-semibold text-blue-400 mb-6 uppercase tracking-wider">¿Qué recibes?</div>
            <div className="space-y-4">
              {[
                { label: "Panel validado activo", value: "500–1.000 personas" },
                { label: "Mediciones recurrentes", value: "Cada 2 semanas" },
                { label: "Dashboard actualizado", value: "Después de cada ola" },
                { label: "Análisis de voz con IA", value: "Por cada respuesta" },
                { label: "Informes ejecutivos", value: "Mensuales" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center text-sm border-b border-white/10 pb-3 last:border-0 last:pb-0">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-semibold text-white">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Precios / CTA ────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Inversión adaptada a tu territorio</h2>
            <p className="text-slate-600">Cada proyecto se cotiza según tamaño del panel, frecuencia y nivel de análisis.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "Pulso Básico",
                price: "Desde $5M",
                period: "/ mes",
                desc: "Municipio pequeño o mediano",
                items: ["Panel de 200–400 personas", "Medición mensual", "Dashboard básico", "Reporte ejecutivo mensual"],
                cta: "Consultar",
                highlight: false,
              },
              {
                name: "Inteligencia Territorial",
                price: "Desde $10M",
                period: "/ mes",
                desc: "Ciudad intermedia o campaña",
                items: ["Panel de 500–800 personas", "Medición quincenal", "Análisis de voz con IA", "Dashboard completo", "Informe de narrativas"],
                cta: "Solicitar demo",
                highlight: true,
              },
              {
                name: "Gobernación / Gremio",
                price: "A medida",
                period: "",
                desc: "Cobertura departamental",
                items: ["Panel multi-municipio", "Tracking de campaña", "Acompañamiento estratégico", "Reportes departamentales"],
                cta: "Hablar con el equipo",
                highlight: false,
              },
            ].map(({ name, price, period, desc, items, cta, highlight }) => (
              <div key={name} className={`rounded-2xl p-6 border ${highlight ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-200" : "bg-white border-slate-200"}`}>
                <div className={`text-xs font-semibold uppercase tracking-wider mb-3 ${highlight ? "text-blue-200" : "text-blue-600"}`}>{name}</div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className={`text-3xl font-extrabold ${highlight ? "text-white" : "text-slate-900"}`}>{price}</span>
                  <span className={`text-sm ${highlight ? "text-blue-200" : "text-slate-500"}`}>{period}</span>
                </div>
                <p className={`text-sm mb-5 ${highlight ? "text-blue-100" : "text-slate-500"}`}>{desc}</p>
                <ul className="space-y-2 mb-6">
                  {items.map(item => (
                    <li key={item} className={`flex items-center gap-2 text-sm ${highlight ? "text-blue-100" : "text-slate-600"}`}>
                      <CheckCircle className={`h-3.5 w-3.5 shrink-0 ${highlight ? "text-blue-300" : "text-blue-500"}`} />
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#contacto"
                  className={`block text-center rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                    highlight ? "bg-white text-blue-600 hover:bg-blue-50" : "bg-slate-900 text-white hover:bg-slate-700"
                  }`}>
                  {cta}
                </a>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-slate-500 mt-6">
            * Precios en COP + IVA. Sujetos a validación con piloto.
          </p>
        </div>
      </section>

      {/* ── Contacto ─────────────────────────────────────────────────── */}
      <section id="contacto" className="py-24 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold text-blue-600 uppercase tracking-wider">Contacto</span>
          <h2 className="text-3xl font-bold text-slate-900 mt-2 mb-4">¿Listo para medir tu territorio?</h2>
          <p className="text-slate-600 mb-10">
            Agenda una demo de 30 minutos. Te mostramos el dashboard en vivo y diseñamos un piloto para tu municipio o campaña.
          </p>
          <form
            action="https://formsubmit.co/jaimecriales8@icloud.com"
            method="POST"
            className="bg-white rounded-2xl border border-slate-200 p-8 text-left shadow-sm space-y-4"
          >
            <input type="hidden" name="_subject" value="Demo GeoDataVoice" />
            <input type="hidden" name="_captcha" value="false" />
            <input type="hidden" name="_template" value="table" />

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Nombre *</label>
                <input name="nombre" required placeholder="Tu nombre"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Organización *</label>
                <input name="organizacion" required placeholder="Campaña, alcaldía, gremio..."
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Email *</label>
                <input name="email" type="email" required placeholder="tu@email.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Teléfono</label>
                <input name="telefono" placeholder="300 000 0000"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">Municipio / territorio de interés</label>
              <input name="municipio" placeholder="Ej: Barranquilla, Galapa, Departamento Atlántico..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">¿Qué necesitas medir?</label>
              <textarea name="mensaje" rows={3} placeholder="Cuéntanos tu caso..."
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
            </div>

            <button type="submit"
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 py-4 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2">
              Solicitar demo gratuita <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="flex items-center justify-center gap-2 mt-6 text-sm text-slate-500">
            <Phone className="h-4 w-4" />
            <span>O escríbenos a <a href="mailto:jaimecriales8@icloud.com" className="text-blue-600 hover:underline">jaimecriales8@icloud.com</a></span>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="py-10 px-6 bg-slate-900 text-slate-400 text-sm">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-blue-600 flex items-center justify-center">
              <MapPin className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-semibold text-white">GeoDataVoice</span>
            <span className="text-slate-600">— Panel territorial validado</span>
          </div>
          <div className="flex items-center gap-6">
            <span>Colombia · 2026</span>
            <Link href="/login" className="hover:text-white transition-colors">Acceso clientes</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
