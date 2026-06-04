"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProjects, fetchClients } from "@/lib/api";
import type { Project } from "@/lib/api";
import Link from "next/link";
import { BarChart3, Users, MapPin, Mic, ArrowRight, TrendingUp, LogOut } from "lucide-react";
import { useAuth } from "@/app/providers";

export default function HomePage() {
  const { user, logout } = useAuth();

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: fetchClients,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500 flex items-center justify-center">
              <MapPin className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">GeoDataVoice</span>
          </div>
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-6 text-sm text-blue-200">
              <span className="text-white font-medium">Dashboard</span>
              <span className="hover:text-white cursor-pointer">Panel</span>
              <span className="hover:text-white cursor-pointer">AGORA</span>
            </nav>
            {user && (
              <div className="flex items-center gap-3 border-l border-white/10 pl-4">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-medium text-white">{user.full_name}</p>
                  <p className="text-xs text-blue-400 capitalize">{user.role}</p>
                </div>
                <button
                  onClick={logout}
                  title="Cerrar sesión"
                  className="h-8 w-8 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center text-blue-300 hover:text-red-400 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        {/* Hero stats */}
        <div className="mb-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Proyectos activos", value: projects.length || "—", icon: BarChart3 },
            { label: "Clientes", value: clients.length || "—", icon: Users },
            { label: "Panelistas", value: "—", icon: MapPin },
            { label: "Audios procesados", value: "—", icon: Mic },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl bg-white/5 border border-white/10 p-5 backdrop-blur">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/20">
                <Icon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-sm text-blue-200 mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Projects list */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Proyectos</h2>
            <Link
              href="/projects/new"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
            >
              + Nuevo proyecto
            </Link>
          </div>

          {loadingProjects ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(n => (
                <div key={n} className="h-40 animate-pulse rounded-2xl bg-white/5" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map(project => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ProjectCard({ project }: { project: Project }) {
  const purposeLabel: Record<string, string> = {
    political: "Electoral",
    public_management: "Gestión pública",
    private: "Privado",
  };
  const typeLabel: Record<string, string> = {
    favorability: "Favorabilidad",
    satisfaction: "Satisfacción",
    pulse: "Pulso ciudadano",
    agora: "AGORA",
    custom: "Personalizado",
  };

  return (
    <Link href={`/projects/${project.id}`}>
      <div className="group rounded-2xl bg-white/5 border border-white/10 p-6 hover:bg-white/10 hover:border-blue-500/50 transition-all cursor-pointer h-full">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
              {purposeLabel[project.purpose] ?? project.purpose}
            </span>
            <h3 className="mt-1 text-base font-semibold text-white leading-tight">{project.name}</h3>
          </div>
          <ArrowRight className="h-4 w-4 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-1 shrink-0" />
        </div>
        <div className="flex items-center justify-between mt-auto">
          <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
            {typeLabel[project.type] ?? project.type}
          </span>
          <span className={`text-xs font-medium ${project.status === "active" ? "text-emerald-400" : "text-gray-400"}`}>
            {project.status === "active" ? "● Activo" : project.status}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 py-20 text-center">
      <TrendingUp className="h-12 w-12 text-blue-400 mb-4 opacity-50" />
      <p className="text-white font-medium mb-1">Sin proyectos aún</p>
      <p className="text-sm text-blue-200 mb-6">Crea tu primer proyecto para empezar a medir</p>
      <Link
        href="/projects/new"
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
      >
        Crear proyecto
      </Link>
    </div>
  );
}
