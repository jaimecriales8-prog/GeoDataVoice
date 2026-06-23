"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { type Resultados, type Ponderacion, type FiltroDemo, type ResultadosProyecto, fetchResultadosProyecto } from "@/lib/resultados";

async function fetchResultados(surveyIds: string[], filtro?: FiltroDemo | null): Promise<Resultados> {
  const res = await fetch("/api/resultados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ surveyIds, filtro }) });
  return res.json();
}
import ResultadosView from "@/components/resultados-view";
import ResultadosProyectoView from "@/components/resultados-proyecto-view";
import { PonderacionEditor } from "@/components/ponderacion-editor";
import { FiltroDemografico } from "@/components/filtro-demografico";
import { ArrowLeft, Loader2, Download, Printer, Send, StopCircle, Pencil, Link2, Check, Users, ShieldCheck, ShieldOff, TrendingUp, MessageCircle } from "lucide-react";
import Paginacion from "@/components/paginacion";
import CaracterizacionPanel from "@/components/caracterizacion-panel";
import DeviceStatsPanel from "@/components/device-stats-panel";

const GENDER_EXPORT: Record<string, string> = {
  male: "Hombre", female: "Mujer", non_binary: "No binario", other: "Otro", prefer_not: "Prefiere no decir",
};

function escapeCsv(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportarCSV(nombre: string, res: Resultados) {
  const preguntas = res.preguntas;

  const preguntasConAudio = preguntas.filter(q =>
    res.individuales.some(ind => ind.nlp.some(n => n.question_id === q.id))
  );

  const demografiaCols = [
    "#", "Nombre", "Sexo", "Año nacimiento", "Estrato", "Municipio",
    "Nivel estudios", "Estado civil", "Núm. hijos", "Régimen salud", "SISBEN",
    "Tenencia vivienda", "Grupo étnico", "Actividades", "Antigüedad barrio",
    "Recibe subsidios", "Acceso internet", "Registrado votar", "Fecha",
  ];
  const preguntaCols = preguntas.map((q, i) => `P${i + 1}: ${q.text.slice(0, 60)}`);
  const nlpCols = preguntasConAudio.flatMap(q => {
    const label = `P${preguntas.indexOf(q) + 1} Audio`;
    return [`${label} - Transcripción`, `${label} - Sentimiento`, `${label} - Emoción`, `${label} - Tema`, `${label} - Intensidad`];
  });
  const headers = [...demografiaCols, ...preguntaCols, ...nlpCols];

  const filas = res.individuales.map((ind, idx) => {
    const demo = [
      String(idx + 1),
      ind.nombre,
      ind.gender ? (GENDER_EXPORT[ind.gender] ?? ind.gender) : "",
      ind.birth_year ?? "",
      ind.estrato ?? "",
      ind.municipio ?? "",
      ind.nivel_estudios ?? "",
      ind.estado_civil ?? "",
      ind.num_hijos ?? "",
      ind.regimen_salud ?? "",
      ind.sisben_grupo ?? "",
      ind.tenencia_vivienda ?? "",
      ind.grupo_etnico ?? "",
      ind.actividades ?? "",
      ind.antiguedad_barrio ?? "",
      ind.recibe_subsidios != null ? (ind.recibe_subsidios ? "Sí" : "No") : "",
      ind.acceso_internet != null ? (ind.acceso_internet ? "Sí" : "No") : "",
      ind.registrado_votar != null ? (ind.registrado_votar ? "Sí" : "No") : "",
      ind.fecha ? new Date(ind.fecha).toLocaleString("es-CO") : "",
    ];
    const respCols = preguntas.map(q => ind.respuestas[q.id] ?? "");
    const nlpData = preguntasConAudio.flatMap(q => {
      const n = ind.nlp.find(x => x.question_id === q.id);
      return [n?.transcript ?? "", n?.sentiment ?? "", n?.emotion ?? "", n?.topic ?? "", n?.intensity ?? ""];
    });
    return [...demo, ...respCols, ...nlpData].map(escapeCsv).join(",");
  });

  const csv = [headers.map(escapeCsv).join(","), ...filas].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre.replace(/\s+/g, "_")}_respuestas.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  draft: { label: "Borrador", cls: "bg-slate-700 text-slate-300" },
  ready: { label: "Publicada", cls: "bg-emerald-500/20 text-emerald-400" },
  sent: { label: "Activa", cls: "bg-emerald-500/20 text-emerald-400" },
  closed: { label: "Cerrada", cls: "bg-slate-700 text-slate-400" },
};

export default function ResultadosEncuesta({ params }: { params: Promise<{ id: string; eid: string }> }) {
  const { id, eid } = use(params);
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [status, setStatus] = useState("");
  const [olas, setOlas] = useState<{ id: string; wave: number }[]>([]);
  const [wave, setWave] = useState<number | null>(null);
  const [res, setRes] = useState<Resultados | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [denegado, setDenegado] = useState(false);
  const [ponderacion, setPonderacion] = useState<Ponderacion | null>(null);
  const [puedeEditar, setPuedeEditar] = useState(false);
  const [recalculando, setRecalculando] = useState(false);
  const [filtro, setFiltro] = useState<FiltroDemo | null>(null);
  const [filtrando, setFiltrando] = useState(false);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);
  const [enviandoWA, setEnviandoWA] = useState(false);
  const [waMsg, setWaMsg] = useState("");
  const [slug, setSlug] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [tab, setTab] = useState<"resultados" | "respondentes">("resultados");
  const [mostrarEvolucion, setMostrarEvolucion] = useState(false);
  const [resProyecto, setResProyecto] = useState<ResultadosProyecto | null>(null);
  const [cargandoEvol, setCargandoEvol] = useState(false);

  // Respondentes (server-side pagination)
  type Respondente = { id: string; nombre: string; tipo: string; gender: string | null; edad: number | null; estrato: number | null; municipio: string | null; departamento: string | null; kyc_status: string; fecha: string };
  const [respondentes, setRespondentes] = useState<Respondente[]>([]);
  const [respTotal, setRespTotal] = useState(0);
  const [respPagina, setRespPagina] = useState(0);
  const [respLoading, setRespLoading] = useState(false);
  const POR_PAGINA = 50;
  const [caract, setCaract] = useState<Record<string, unknown> | null>(null);
  const [deviceStats, setDeviceStats] = useState<Record<string, unknown> | null>(null);

  async function cargarRespondentes(pagina: number) {
    setRespLoading(true);
    setRespPagina(pagina);
    const r = await fetch(`/api/cliente/encuestas/respondentes?surveyId=${eid}&page=${pagina}`);
    const data = await r.json();
    setRespondentes(data.respondentes ?? []);
    setRespTotal(data.total ?? 0);
    setRespLoading(false);
  }

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { data: survey } = await supabase
        .from("surveys").select("name, status, wave, project_id, ponderacion, slug, es_abierta").eq("id", eid).maybeSingle();
      if (!survey) { setNotFound(true); setLoading(false); return; }

      // Ownership: la encuesta pertenece a un proyecto del cliente logueado
      const { data: proyecto } = await supabase
        .from("projects").select("client_id").eq("id", survey.project_id).maybeSingle();
      const role = user?.user_metadata?.role;
      if (role !== "admin" && proyecto?.client_id !== user?.id) {
        setDenegado(true); setLoading(false); return;
      }
      setNombre(survey.name);
      setStatus(survey.status);
      setWave(survey.wave);
      setPonderacion((survey.ponderacion as Ponderacion) ?? null);
      setPuedeEditar(role === "admin" || proyecto?.client_id === user?.id);
      if (survey.es_abierta && survey.slug) setSlug(survey.slug);

      // Cargar hermanos (misma encuesta, distintas olas)
      const { data: hermanos } = await supabase
        .from("surveys").select("id, wave").eq("project_id", survey.project_id).eq("name", survey.name).order("wave");
      setOlas(hermanos ?? []);

      setRes(await fetchResultados([eid]));
      setLoading(false);
    })();
  }, [eid]);

  function handleTab(t: "resultados" | "respondentes") {
    setTab(t);
    if (t === "respondentes" && respondentes.length === 0) {
      cargarRespondentes(0);
      fetch(`/api/cliente/encuestas/caracterizacion?surveyId=${eid}`)
        .then(r => r.json()).then(setCaract).catch(() => null);
      fetch(`/api/cliente/encuestas/device-stats?surveyId=${eid}`)
        .then(r => r.json()).then(setDeviceStats).catch(() => null);
    }
  }

  async function toggleEvolucion() {
    if (mostrarEvolucion) { setMostrarEvolucion(false); return; }
    setMostrarEvolucion(true);
    if (!resProyecto && olas.length > 1) {
      setCargandoEvol(true);
      const data = await fetchResultadosProyecto(olas);
      setResProyecto(data);
      setCargandoEvol(false);
    }
  }

  async function recalcular(p: Ponderacion | null) {
    setPonderacion(p);
    setRecalculando(true);
    setRes(await fetchResultados([eid], filtro));
    setRecalculando(false);
  }

  async function enviarRecordatorioWA() {
    setEnviandoWA(true); setWaMsg("");
    const r = await fetch("/api/whatsapp/recordatorio", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ surveyId: eid }),
    });
    const d = await r.json();
    setEnviandoWA(false);
    if (!r.ok) { setWaMsg(d.error ?? "Error al enviar"); return; }
    setWaMsg(`✓ Recordatorio enviado a ${d.enviados} de ${d.pendientes} panelistas pendientes`);
    setTimeout(() => setWaMsg(""), 5000);
  }

  async function cambiarEstado(nuevoEstado: "ready" | "closed") {
    setCambiandoEstado(true);
    const supabase = createClient();
    const { error } = await supabase.from("surveys").update({ status: nuevoEstado }).eq("id", eid);
    if (error) { alert("Error al cambiar el estado: " + error.message); } else { setStatus(nuevoEstado); }
    setCambiandoEstado(false);
  }

  async function aplicarFiltro(f: FiltroDemo | null) {
    setFiltro(f);
    setFiltrando(true);
    setRes(await fetchResultados([eid], f));
    setFiltrando(false);
  }

  if (loading) return (
    <div className="p-8 flex justify-center"><Loader2 className="h-7 w-7 text-violet-400 animate-spin mt-12" /></div>
  );

  if (notFound) return (
    <div className="p-8">
      <p className="text-slate-400">Encuesta no encontrada.</p>
      <Link href={`/cliente/proyectos/${id}`} className="text-violet-400 text-sm mt-2 inline-block">← Volver al proyecto</Link>
    </div>
  );

  if (denegado) return (
    <div className="p-8">
      <p className="text-slate-400">No tienes acceso a los resultados de esta encuesta.</p>
      <Link href="/cliente/proyectos" className="text-violet-400 text-sm mt-2 inline-block">← Mis proyectos</Link>
    </div>
  );

  const st = STATUS_LABELS[status] ?? { label: status, cls: "bg-slate-700 text-slate-300" };

  return (
    <div className="p-8">
      <Link href={`/cliente/proyectos/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-white transition-colors mb-4">
        <ArrowLeft className="h-4 w-4" /> Volver al proyecto
      </Link>

      {/* Pills de olas + botón evolución */}
      {olas.length > 1 && (
        <div className="flex gap-1 mb-4 flex-wrap items-center">
          {olas.map(o => (
            <button key={o.id} onClick={() => { setMostrarEvolucion(false); router.push(`/cliente/proyectos/${id}/encuestas/${o.id}`); }}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                o.id === eid && !mostrarEvolucion
                  ? "bg-violet-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
              }`}>
              Ola {o.wave}
            </button>
          ))}
          <button onClick={toggleEvolucion}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors border ${
              mostrarEvolucion
                ? "bg-violet-600/30 border-violet-500/50 text-violet-300"
                : "bg-slate-800 border-white/10 text-slate-400 hover:text-white hover:bg-slate-700"
            }`}>
            <TrendingUp className="h-3.5 w-3.5" /> Evolución
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-1">
        <h1 className="text-2xl font-bold text-white flex-1">{nombre}</h1>
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
        {puedeEditar && (
          <div className="flex items-center gap-2 print:hidden">
            <Link href={`/cliente/proyectos/${id}/encuestas/nueva?edit=${eid}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Link>
            {status === "draft" && (
              <button
                onClick={() => cambiarEstado("ready")}
                disabled={cambiandoEstado}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-xs text-white font-semibold transition-colors"
              >
                {cambiandoEstado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Publicar
              </button>
            )}
            {slug && (status === "ready" || status === "sent") && (
              <div className="flex items-center gap-2 rounded-lg bg-blue-600/10 border border-blue-500/20 px-3 py-1.5">
                <a
                  href={`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/encuesta/${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-300 hover:text-blue-200 transition-colors truncate max-w-[260px]"
                >
                  {(process.env.NEXT_PUBLIC_APP_URL ?? "https://geodatavoice.grialtech.co")}/encuesta/{slug}
                </a>
                <button
                  onClick={() => { navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/encuesta/${slug}`); setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000); }}
                  className="shrink-0 text-blue-400 hover:text-blue-200 transition-colors"
                  title="Copiar link"
                >
                  {linkCopiado ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Link2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            )}
            {(status === "ready" || status === "sent") && (<>
              <button
                onClick={enviarRecordatorioWA}
                disabled={enviandoWA}
                title="Enviar recordatorio por WhatsApp a panelistas que no han respondido"
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-700/30 border border-green-600/30 hover:bg-green-600/40 disabled:opacity-50 px-3 py-1.5 text-xs text-green-300 transition-colors"
              >
                {enviandoWA ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                Recordatorio WA
              </button>
              <button
                onClick={() => cambiarEstado("closed")}
                disabled={cambiandoEstado}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
              >
                {cambiandoEstado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StopCircle className="h-3.5 w-3.5" />}
                Cerrar
              </button>
            </>)}
            {status === "closed" && (
              <button
                onClick={() => cambiarEstado("ready")}
                disabled={cambiandoEstado}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-3 py-1.5 text-xs text-white font-semibold transition-colors"
              >
                {cambiandoEstado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Reabrir
              </button>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 print:hidden">
          {res && res.individuales.length > 0 && (<>
            <button
              onClick={() => exportarCSV(nombre, res)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 border border-white/10 px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" /> PDF
            </button>
          </>)}
        </div>
      </div>
      <p className="text-slate-400 text-sm mb-1">Resultados de la encuesta · Ola {wave}</p>
      {waMsg && <p className="text-xs text-green-400 mb-3">{waMsg}</p>}

      {/* Panel evolución — reemplaza los tabs cuando está activo */}
      {mostrarEvolucion ? (
        <div className="mt-2">
          {cargandoEvol ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-10 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando evolución…
            </div>
          ) : resProyecto ? (
            <ResultadosProyectoView data={resProyecto} hideAgregado />
          ) : null}
        </div>
      ) : null}

      {/* Tabs — solo visibles cuando evolución está cerrada */}
      {!mostrarEvolucion && (<>
        <div className="flex gap-1 mb-6 border-b border-white/5">
          {[
            { key: "resultados", label: "Resultados" },
            { key: "respondentes", label: `Respondentes${respTotal > 0 ? ` (${respTotal.toLocaleString()})` : ""}` },
          ].map(t => (
            <button key={t.key} onClick={() => handleTab(t.key as "resultados" | "respondentes")}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.key ? "border-violet-500 text-white" : "border-transparent text-slate-500 hover:text-slate-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "respondentes" ? (
          <>
            {caract && <CaracterizacionPanel data={caract as Parameters<typeof CaracterizacionPanel>[0]["data"]} titulo="Caracterización de respondentes" />}
            {deviceStats && (
              <div className="mt-6">
                <DeviceStatsPanel data={deviceStats as Parameters<typeof DeviceStatsPanel>[0]["data"]} />
              </div>
            )}
            <div className="mt-6">
              <RespondentesTab
                respondentes={respondentes} total={respTotal} pagina={respPagina}
                porPagina={POR_PAGINA} loading={respLoading} onPage={cargarRespondentes}
              />
            </div>
          </>
        ) : (<>
          {puedeEditar && (
            <PonderacionEditor surveyId={eid} inicial={ponderacion} onSaved={recalcular} />
          )}
          {res && (
            <FiltroDemografico
              filtro={filtro}
              onChange={aplicarFiltro}
              totalSinFiltro={res.totalSinFiltro}
              totalFiltrado={res.respuestas}
            />
          )}
          {(recalculando || filtrando) ? (
            <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
              <Loader2 className="h-4 w-4 animate-spin" />
              {recalculando ? "Recalculando con la nueva ponderación…" : "Filtrando resultados…"}
            </div>
          ) : res && <ResultadosView r={res} />}
        </>)}
      </>)}
    </div>
  );
}

const TIPO_CONF = {
  panelista: { label: "Panelista", cls: "bg-violet-500/20 text-violet-400" },
  campo:     { label: "Campo",     cls: "bg-blue-500/20 text-blue-400" },
  abierta:   { label: "Abierta",   cls: "bg-amber-500/20 text-amber-400" },
};

function RespondentesTab({ respondentes, total, pagina, porPagina, loading, onPage }: {
  respondentes: { id: string; nombre: string; tipo: string; gender: string | null; edad: number | null; estrato: number | null; municipio: string | null; departamento: string | null; kyc_status: string; fecha: string }[];
  total: number; pagina: number; porPagina: number; loading: boolean;
  onPage: (p: number) => void;
}) {
  if (loading) return (
    <div className="space-y-3">{[1,2,3,4,5].map(n => <div key={n} className="h-12 animate-pulse rounded-xl bg-slate-900" />)}</div>
  );
  if (total === 0) return (
    <div className="rounded-2xl border border-dashed border-white/10 py-16 text-center">
      <Users className="h-10 w-10 text-slate-700 mx-auto mb-3" />
      <p className="text-slate-400 text-sm">Aún no hay respondentes</p>
    </div>
  );
  return (
    <div>
      <div className="rounded-2xl border border-white/5 bg-slate-900 overflow-hidden mb-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Tipo</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Perfil</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Identidad</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {respondentes.map(r => {
              const tc = TIPO_CONF[r.tipo as keyof typeof TIPO_CONF] ?? TIPO_CONF.abierta;
              return (
                <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-3">
                    <p className="text-sm text-white">{r.nombre}</p>
                    <p className="text-xs text-slate-500">{r.municipio ?? r.departamento ?? "—"}</p>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tc.cls}`}>{tc.label}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-400">
                    {[r.gender, r.edad ? `${r.edad} años` : null, r.estrato ? `Estrato ${r.estrato}` : null].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-5 py-3">
                    {r.kyc_status === "approved"
                      ? <span className="flex items-center gap-1 text-xs text-emerald-400"><ShieldCheck className="h-3.5 w-3.5" /> Verificado</span>
                      : <span className="flex items-center gap-1 text-xs text-slate-500"><ShieldOff className="h-3.5 w-3.5" /> Sin verificar</span>}
                  </td>
                  <td className="px-5 py-3 text-xs text-slate-500">
                    {new Date(r.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Paginacion total={total} pagina={pagina} porPagina={porPagina} onChange={onPage} />
    </div>
  );
}
