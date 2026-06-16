"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Plus, ClipboardList, Users, Mic, MapPin, ChevronRight, ChevronDown, Clock, BarChart3, Target, Send, StopCircle, Link2, Check, Pencil } from "lucide-react";
import { resumenAudiencia, audienciaVacia, type Audiencia } from "@/lib/segmentacion";

type Proyecto = {
  id: string; name: string; type: string; purpose: string; status: string;
  start_date: string | null; end_date: string | null;
  field_identity_required: boolean | null;
};

type Encuesta = {
  id: string; name: string; wave: number; status: string;
  perfil_objetivo: string; closes_at: string | null; sent_at: string | null;
  audiencia: Audiencia | null;
  created_at: string;
  es_abierta: boolean | null;
  slug: string | null;
  _count?: { responses: number };
};

const PERFIL_CONF: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  panelista:    { label: "Panelistas",    icon: Mic,    color: "text-amber-400" },
  encuestador:  { label: "Encuestadores", icon: MapPin,  color: "text-emerald-400" },
  ambos:        { label: "Ambos perfiles", icon: Users,  color: "text-blue-400" },
};

const STATUS_CONF: Record<string, { label: string; color: string }> = {
  draft:  { label: "Borrador",  color: "bg-slate-700 text-slate-300" },
  ready:  { label: "Lista",     color: "bg-blue-500/20 text-blue-400" },
  sent:   { label: "Enviada",   color: "bg-emerald-500/20 text-emerald-400" },
  closed: { label: "Cerrada",   color: "bg-slate-700 text-slate-400" },
};

export default function ProyectoDetalle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [proyecto, setProyecto] = useState<Proyecto | null>(null);
  const [encuestas, setEncuestas] = useState<Encuesta[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelSize, setPanelSize] = useState(0);
  const [identityGlobal, setIdentityGlobal] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [olaLocal, setOlaLocal] = useState<Record<string, number>>({});
  const [expandido, setExpandido] = useState<Set<string>>(new Set());
  const [copiado, setCopiado] = useState<string | null>(null);

  function copiarLink(slug: string) {
    const url = `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/encuesta/${slug}`;
    navigator.clipboard.writeText(url);
    setCopiado(slug);
    setTimeout(() => setCopiado(null), 2000);
  }

  useEffect(() => { load(); }, [id]);

  async function load() {
    const supabase = createClient();
    const [{ data: p }, { data: e }, { count }, { data: cfg }] = await Promise.all([
      supabase.from("projects").select("*").eq("id", id).single(),
      supabase.from("surveys").select("*").eq("project_id", id).order("created_at", { ascending: false }),
      supabase.from("panel_memberships").select("id", { count: "exact", head: true }).eq("project_id", id).eq("status", "active"),
      supabase.from("platform_config").select("value").eq("key", "field_identity_verification").maybeSingle(),
    ]);
    setProyecto(p);
    setEncuestas(e ?? []);
    setPanelSize(count ?? 0);
    setIdentityGlobal(((cfg?.value as { enabled?: boolean } | null)?.enabled) ?? true);
    setLoading(false);
  }

  async function updateEncuesta(eid: string, patch: Partial<Encuesta>) {
    setSavingId(eid);
    setEncuestas(prev => prev.map(e => e.id === eid ? { ...e, ...patch } : e));
    await fetch("/api/cliente/encuestas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: eid, ...patch }),
    });
    setSavingId(null);
  }

  async function lanzarOla(eid: string, wave: number) {
    setSavingId(eid);
    const res = await fetch("/api/cliente/encuestas/duplicar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ survey_id: eid, wave }),
    });
    setSavingId(null);
    if (res.ok) {
      const { id: newId } = await res.json().catch(() => ({}));
      if (newId) {
        fetch("/api/whatsapp/nueva-encuesta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surveyId: newId }),
        }).catch(() => {});
        fetch("/api/email/nueva-encuesta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ surveyId: newId }),
        }).catch(() => {});
      }
      await load();
    }
    else { const j = await res.json().catch(() => ({})); alert("Error al lanzar ola: " + (j.error ?? "intenta de nuevo")); }
  }

  async function toggleFieldIdentity() {
    if (!proyecto) return;
    const efectivo = proyecto.field_identity_required ?? identityGlobal;
    const nuevo = !efectivo;
    setProyecto({ ...proyecto, field_identity_required: nuevo });
    const supabase = createClient();
    await supabase.from("projects").update({ field_identity_required: nuevo }).eq("id", id);
  }

  if (loading) return (
    <div className="p-8 space-y-4">
      {[1,2,3].map(n => <div key={n} className="h-20 animate-pulse rounded-2xl bg-slate-900" />)}
    </div>
  );

  if (!proyecto) return (
    <div className="p-8 text-slate-400">Proyecto no encontrado.</div>
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        <Link href="/cliente/proyectos" className="mt-1 text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{proyecto.name}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-slate-400">{proyecto.type}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-400">{proyecto.purpose}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              proyecto.status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700 text-slate-400"
            }`}>
              {proyecto.status === "active" ? "Activo" : proyecto.status}
            </span>
          </div>
        </div>
        <Link href={`/cliente/proyectos/${id}/editar`}
          className="flex items-center gap-2 rounded-xl border border-white/10 hover:bg-white/5 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-white transition-colors shrink-0">
          <Pencil className="h-4 w-4" /> Editar
        </Link>
        <Link href={`/cliente/proyectos/${id}/resultados`}
          className="flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors shrink-0">
          <BarChart3 className="h-4 w-4" /> Ver resultados
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-white/5 bg-slate-900 p-4">
          <p className="text-xs text-slate-500 mb-1">Panel activo</p>
          <p className="text-2xl font-bold text-white">{panelSize}</p>
          <p className="text-xs text-slate-500 mt-0.5">panelistas</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-900 p-4">
          <p className="text-xs text-slate-500 mb-1">Encuestas</p>
          <p className="text-2xl font-bold text-white">{encuestas.length}</p>
          <p className="text-xs text-slate-500 mt-0.5">creadas</p>
        </div>
        <div className="rounded-2xl border border-white/5 bg-slate-900 p-4">
          <p className="text-xs text-slate-500 mb-1">Olas enviadas</p>
          <p className="text-2xl font-bold text-white">{encuestas.filter(e => ["ready","sent","closed"].includes(e.status)).length}</p>
          <p className="text-xs text-slate-500 mt-0.5">de medición</p>
        </div>
      </div>

      {/* Validación de identidad en encuestas de calle */}
      {proyecto && (
        <div className="rounded-2xl border border-white/5 bg-slate-900 p-5 mb-8 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Validar identidad en encuestas de calle</p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-md">
                Si está activo, el encuestador fotografía cédula + rostro al encuestar en campo para este proyecto.
                {proyecto.field_identity_required === null && <span className="text-slate-600"> (usando el default global)</span>}
              </p>
            </div>
          </div>
          <button
            onClick={toggleFieldIdentity}
            className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${(proyecto.field_identity_required ?? identityGlobal) ? "bg-emerald-600" : "bg-slate-600"}`}>
            <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${(proyecto.field_identity_required ?? identityGlobal) ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      )}

      {/* Encuestas */}
      <div className="rounded-2xl border border-white/5 bg-slate-900 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Encuestas del proyecto</h2>
          <Link href={`/cliente/proyectos/${id}/encuestas/nueva`}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 px-3 py-2 text-xs font-semibold text-white transition-colors">
            <Plus className="h-3.5 w-3.5" /> Nueva encuesta
          </Link>
        </div>

        {encuestas.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="h-10 w-10 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-400 text-sm mb-4">Aún no hay encuestas en este proyecto</p>
            <Link href={`/cliente/proyectos/${id}/encuestas/nueva`}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 hover:bg-violet-500 px-4 py-2 text-sm font-semibold text-white transition-colors">
              <Plus className="h-4 w-4" /> Crear primera encuesta
            </Link>
          </div>
        ) : (() => {
          // Agrupar por nombre
          const grupos = new Map<string, Encuesta[]>();
          [...encuestas].sort((a, b) => a.wave - b.wave).forEach(e => {
            const key = e.name;
            if (!grupos.has(key)) grupos.set(key, []);
            grupos.get(key)!.push(e);
          });
          const hayActiva = encuestas.some(x => x.status === "sent");

          return (
            <div className="divide-y divide-white/5">
              {[...grupos.entries()].map(([nombre, olas]) => {
                const estaExpandido = expandido.has(nombre);
                const ultimaOla = olas[olas.length - 1];
                const olaActiva = olas.find(o => o.status === "sent");
                const maxWave = Math.max(...olas.map(o => o.wave));

                const refOla = olaActiva ?? ultimaOla;
                const perfil = PERFIL_CONF[refOla.perfil_objetivo] ?? PERFIL_CONF.ambos;
                const PerfilIcon = perfil.icon;
                const esAbierta = olas.some(o => o.es_abierta);

                return (
                  <div key={nombre}>
                    {/* Fila agrupada */}
                    <div className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                      <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                        <ClipboardList className="h-5 w-5 text-slate-400" />
                      </div>
                      {/* Nombre clickeable → resultados */}
                      <Link href={`/cliente/proyectos/${id}/encuestas/${refOla.id}`} className="flex-1 min-w-0 group">
                        <p className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors">{nombre}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`flex items-center gap-1 text-xs ${perfil.color}`}>
                            <PerfilIcon className="h-3 w-3" />{perfil.label}
                          </span>
                          {esAbierta && (
                            <span className="text-xs text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded-full">Abierta</span>
                          )}
                          <span className="text-xs text-slate-500">
                            {olas.length} ola{olas.length > 1 ? "s" : ""}
                            {olaActiva ? ` · Ola ${olaActiva.wave} activa` : ` · Ola ${maxWave}`}
                          </span>
                          {refOla.closes_at && (
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                              <Clock className="h-3 w-3" />
                              Cierra {new Date(refOla.closes_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                            </span>
                          )}
                        </div>
                      </Link>
                      {olaActiva ? (
                        <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 text-emerald-400 shrink-0">Activa</span>
                      ) : ultimaOla.status === "closed" ? (
                        <span className="rounded-full px-2.5 py-1 text-xs font-semibold bg-slate-700 text-slate-400 shrink-0">Cerrada</span>
                      ) : (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${(STATUS_CONF[ultimaOla.status] ?? STATUS_CONF.draft).color}`}>
                          {(STATUS_CONF[ultimaOla.status] ?? STATUS_CONF.draft).label}
                        </span>
                      )}
                      {/* Flecha → expandir olas */}
                      <button
                        onClick={() => setExpandido(prev => {
                          const next = new Set(prev);
                          next.has(nombre) ? next.delete(nombre) : next.add(nombre);
                          return next;
                        })}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                        title={estaExpandido ? "Colapsar olas" : "Ver olas"}>
                        {estaExpandido
                          ? <ChevronDown className="h-4 w-4 text-slate-400" />
                          : <ChevronRight className="h-4 w-4 text-slate-400" />}
                      </button>
                    </div>

                    {/* Olas expandidas */}
                    {estaExpandido && (
                      <div className="bg-white/[0.02] border-t border-white/5">
                        {olas.map((e, idx) => {
                          const perfil = PERFIL_CONF[e.perfil_objetivo] ?? PERFIL_CONF.ambos;
                          const status = STATUS_CONF[e.status] ?? STATUS_CONF.draft;
                          const PerfilIcon = perfil.icon;
                          const isSaving = savingId === e.id;
                          const esUltima = idx === olas.length - 1;

                          return (
                            <div key={e.id} className="flex items-center gap-3 px-6 py-3 border-b border-white/5 last:border-0">
                              <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full shrink-0 w-14 text-center">
                                Ola {e.wave}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`flex items-center gap-1 text-xs ${perfil.color}`}>
                                    <PerfilIcon className="h-3 w-3" />{perfil.label}
                                  </span>
                                  {e.closes_at && (
                                    <span className="flex items-center gap-1 text-xs text-slate-500">
                                      <Clock className="h-3 w-3" />
                                      Cierra {new Date(e.closes_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${status.color}`}>
                                {status.label}
                              </span>

                              {/* Acciones — solo la última ola puede tener acciones */}
                              {esUltima && e.status === "sent" && (
                                <button onClick={() => updateEncuesta(e.id, { status: "closed" })} disabled={isSaving}
                                  className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-40">
                                  <StopCircle className="h-3.5 w-3.5" /> Cerrar
                                </button>
                              )}
                              {esUltima && e.status === "closed" && !hayActiva && (
                                <button onClick={() => lanzarOla(e.id, e.wave + 1)} disabled={isSaving}
                                  className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-colors disabled:opacity-40">
                                  <Send className="h-3.5 w-3.5" /> Nueva Ola {e.wave + 1}
                                </button>
                              )}
                              {esUltima && (e.status === "draft" || e.status === "ready") && !hayActiva && (
                                <button onClick={() => updateEncuesta(e.id, { status: "sent" })} disabled={isSaving}
                                  className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-40">
                                  <Send className="h-3.5 w-3.5" /> Activar
                                </button>
                              )}
                              {e.es_abierta && e.slug && (e.status === "sent" || e.status === "ready") && (
                                <button onClick={() => copiarLink(e.slug!)}
                                  className="shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 transition-colors">
                                  {copiado === e.slug
                                    ? <><Check className="h-3.5 w-3.5 text-emerald-400" /> Copiado</>
                                    : <><Link2 className="h-3.5 w-3.5" /> Copiar link</>}
                                </button>
                              )}
                              <Link href={`/cliente/proyectos/${id}/encuestas/${e.id}`}
                                className="text-slate-600 hover:text-white transition-colors shrink-0">
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
