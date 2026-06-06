"use client";

import { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { ArrowLeft, Plus, ClipboardList, Users, Mic, MapPin, ChevronRight, Clock, BarChart3 } from "lucide-react";

type Proyecto = {
  id: string; name: string; type: string; purpose: string; status: string;
  start_date: string | null; end_date: string | null;
  field_identity_required: boolean | null;
};

type Encuesta = {
  id: string; name: string; wave: number; status: string;
  perfil_objetivo: string; closes_at: string | null; sent_at: string | null;
  created_at: string;
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
          <p className="text-2xl font-bold text-white">{encuestas.filter(e => e.status === "sent" || e.status === "closed").length}</p>
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
        ) : (
          <div className="divide-y divide-white/5">
            {encuestas.map(e => {
              const perfil = PERFIL_CONF[e.perfil_objetivo] ?? PERFIL_CONF.ambos;
              const status = STATUS_CONF[e.status] ?? STATUS_CONF.draft;
              const PerfilIcon = perfil.icon;
              return (
                <Link key={e.id} href={`/cliente/proyectos/${id}/encuestas/${e.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-white/[0.02] transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                    <ClipboardList className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-white">{e.name}</p>
                      <span className="text-xs text-slate-600">Ola {e.wave}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`flex items-center gap-1 text-xs ${perfil.color}`}>
                        <PerfilIcon className="h-3 w-3" />
                        {perfil.label}
                      </span>
                      {e.closes_at && (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3 w-3" />
                          Cierra {new Date(e.closes_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${status.color}`}>
                    {status.label}
                  </span>
                  <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
