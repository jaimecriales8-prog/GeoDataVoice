"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { use } from "react";
import {
  ArrowLeft, Users, Mic, TrendingUp, AlertCircle,
  ThumbsUp, MessageSquare, BarChart3
} from "lucide-react";

type Project = {
  id: string;
  name: string;
  type: string;
  purpose: string;
  status: string;
};

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        setProject(data);
        setLoading(false);
      });
  }, [id]);

  const purposeLabel: Record<string, string> = {
    political: "Electoral",
    public_management: "Gestión pública",
    private: "Privado",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-10 space-y-6">
        {[1, 2, 3].map(n => <div key={n} className="h-32 animate-pulse rounded-2xl bg-white/5" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="text-blue-300 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-white">{project?.name ?? "Proyecto"}</h1>
              {project && (
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  project.status === "active"
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-gray-500/20 text-gray-400"
                }`}>
                  {project.status === "active" ? "Activo" : project.status}
                </span>
              )}
            </div>
            <p className="text-sm text-blue-300 mt-0.5">
              {purposeLabel[project?.purpose ?? ""] ?? project?.purpose} · {project?.type}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        {/* KPI placeholders — conectar cuando las tablas existan */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Favorabilidad", value: "—", icon: ThumbsUp },
            { label: "Panelistas activos", value: "—", icon: Users },
            { label: "Audios procesados", value: "—", icon: Mic },
            { label: "Olas de medición", value: "—", icon: TrendingUp },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20">
                <Icon className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs text-blue-200 mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-blue-400 mb-4 opacity-50" />
          <p className="text-white font-medium mb-1">Analytics pendientes</p>
          <p className="text-sm text-blue-200 max-w-sm">
            Las tablas de medición aún no están configuradas en Supabase.
            Crea las tablas <code className="text-blue-400">panel_memberships</code>,{" "}
            <code className="text-blue-400">audio_responses</code> y{" "}
            <code className="text-blue-400">nlp_outputs</code> para ver datos aquí.
          </p>
        </div>
      </main>
    </div>
  );
}
