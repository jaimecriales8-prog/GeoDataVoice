"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProject, fetchAnalytics } from "@/lib/api";
import type { Analytics } from "@/lib/api";
import Link from "next/link";
import { use } from "react";
import {
  ArrowLeft, Users, Mic, TrendingUp, AlertCircle,
  ThumbsUp, MessageSquare, BarChart3
} from "lucide-react";

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-emerald-500",
  negative: "bg-red-500",
  neutral: "bg-gray-400",
  mixed: "bg-amber-400",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positivo",
  negative: "Negativo",
  neutral: "Neutral",
  mixed: "Mixto",
};

const EMOTION_EMOJI: Record<string, string> = {
  esperanza: "🌟",
  confianza: "💪",
  orgullo: "😊",
  frustración: "😤",
  rabia: "😠",
  miedo: "😨",
  cansancio: "😔",
  otro: "💬",
};

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: project, isLoading: loadingProject } = useQuery({
    queryKey: ["project", id],
    queryFn: () => fetchProject(id),
  });

  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: ["analytics", id],
    queryFn: () => fetchAnalytics(id),
    enabled: !!id,
    retry: false,
  });

  if (loadingProject) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-4">
          <Link href="/" className="text-blue-300 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <MapIcon />
              <h1 className="text-lg font-bold text-white">{project?.name ?? "—"}</h1>
              <StatusBadge status={project?.status ?? ""} />
            </div>
            <p className="text-sm text-blue-300 mt-0.5">
              {project?.purpose === "political" ? "Electoral" : project?.purpose === "public_management" ? "Gestión pública" : "Privado"}
              {" · "}
              {project?.type}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-8">
        {loadingAnalytics ? (
          <div className="text-blue-200 text-sm">Cargando datos...</div>
        ) : analytics ? (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard
                label="Favorabilidad"
                value={analytics.favorability_pct !== null ? `${analytics.favorability_pct}%` : "—"}
                icon={ThumbsUp}
                highlight={analytics.favorability_pct !== null && analytics.favorability_pct >= 50}
              />
              <KpiCard
                label="Panelistas activos"
                value={analytics.panel.active.toString()}
                icon={Users}
              />
              <KpiCard
                label="Audios procesados"
                value={`${analytics.audio.processed} / ${analytics.audio.total}`}
                icon={Mic}
              />
              <KpiCard
                label="Olas de medición"
                value={analytics.waves.toString()}
                icon={TrendingUp}
              />
            </div>

            {/* Sentiment + Topics */}
            <div className="grid gap-6 lg:grid-cols-2">
              <SentimentCard analytics={analytics} />
              <TopicsCard analytics={analytics} />
            </div>

            {/* Emotions + Panel */}
            <div className="grid gap-6 lg:grid-cols-2">
              <EmotionsCard analytics={analytics} />
              <PanelCard analytics={analytics} />
            </div>
          </>
        ) : (
          <NoDataCard projectId={id} />
        )}
      </main>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────

function KpiCard({
  label, value, icon: Icon, highlight = false,
}: {
  label: string; value: string; icon: React.ElementType; highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-5 backdrop-blur ${highlight ? "border-emerald-500/40 bg-emerald-500/10" : "border-white/10 bg-white/5"}`}>
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20">
        <Icon className="h-4 w-4 text-blue-400" />
      </div>
      <div className={`text-2xl font-bold ${highlight ? "text-emerald-400" : "text-white"}`}>{value}</div>
      <div className="text-xs text-blue-200 mt-1">{label}</div>
    </div>
  );
}

function SentimentCard({ analytics }: { analytics: Analytics }) {
  const entries = Object.entries(analytics.sentiment).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 mb-5">
        <MessageSquare className="h-4 w-4 text-blue-400" />
        <h3 className="font-semibold text-white text-sm">Sentimiento ciudadano</h3>
        <span className="ml-auto text-xs text-blue-300">{entries.reduce((s, [, v]) => s + v.count, 0)} audios</span>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-blue-300">Sin datos de sentimiento aún.</p>
      ) : (
        <div className="space-y-3">
          {/* Stacked bar */}
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {entries.map(([key, val]) => (
              <div
                key={key}
                className={`${SENTIMENT_COLORS[key] ?? "bg-blue-400"} transition-all`}
                style={{ width: `${val.pct}%` }}
                title={`${SENTIMENT_LABELS[key] ?? key}: ${val.pct}%`}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="grid grid-cols-2 gap-2 mt-4">
            {entries.map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${SENTIMENT_COLORS[key] ?? "bg-blue-400"}`} />
                <span className="text-xs text-blue-200">{SENTIMENT_LABELS[key] ?? key}</span>
                <span className="ml-auto text-xs font-semibold text-white">{val.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TopicsCard({ analytics }: { analytics: Analytics }) {
  const max = analytics.top_topics[0]?.count ?? 1;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 mb-5">
        <BarChart3 className="h-4 w-4 text-blue-400" />
        <h3 className="font-semibold text-white text-sm">Temas dominantes</h3>
      </div>

      {analytics.top_topics.length === 0 ? (
        <p className="text-sm text-blue-300">Sin temas identificados aún.</p>
      ) : (
        <div className="space-y-2.5">
          {analytics.top_topics.slice(0, 6).map(({ topic, count }) => (
            <div key={topic} className="flex items-center gap-3">
              <span className="w-24 text-xs text-blue-200 capitalize shrink-0">{topic}</span>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <span className="text-xs font-semibold text-white w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmotionsCard({ analytics }: { analytics: Analytics }) {
  const entries = Object.entries(analytics.emotions).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <h3 className="font-semibold text-white text-sm mb-5">Emociones detectadas</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-blue-300">Sin datos de emociones aún.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {entries.map(([emotion, count]) => (
            <div key={emotion} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5">
              <span className="text-lg">{EMOTION_EMOJI[emotion] ?? "💬"}</span>
              <div>
                <div className="text-xs text-blue-200 capitalize">{emotion}</div>
                <div className="text-sm font-semibold text-white">{count}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PanelCard({ analytics }: { analytics: Analytics }) {
  const total = analytics.panel.total;
  const activePct = total > 0 ? Math.round((analytics.panel.active / total) * 100) : 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-center gap-2 mb-5">
        <Users className="h-4 w-4 text-blue-400" />
        <h3 className="font-semibold text-white text-sm">Estado del panel</h3>
      </div>
      <div className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="text-4xl font-bold text-white">{total}</div>
          <div className="text-sm text-blue-200 mb-1">panelistas totales</div>
        </div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/10">
          <div className="bg-emerald-500 transition-all" style={{ width: `${activePct}%` }} />
          <div className="bg-blue-400 transition-all" style={{ width: `${total > 0 ? Math.round((analytics.panel.reserve / total) * 100) : 0}%` }} />
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-blue-200">Activos</span>
            <span className="font-semibold text-white">{analytics.panel.active}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="text-blue-200">Reserva</span>
            <span className="font-semibold text-white">{analytics.panel.reserve}</span>
          </div>
        </div>
        <div className="rounded-xl bg-white/5 p-3 text-xs">
          <div className="flex justify-between text-blue-200 mb-1">
            <span>Audios procesados</span>
            <span className="text-white font-semibold">{analytics.audio.processing_rate_pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-violet-500 rounded-full"
              style={{ width: `${analytics.audio.processing_rate_pct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function NoDataCard({ projectId }: { projectId: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 py-20 text-center">
      <AlertCircle className="h-10 w-10 text-blue-400 mb-4 opacity-50" />
      <p className="text-white font-medium mb-1">Sin datos de análisis</p>
      <p className="text-sm text-blue-200">
        Este proyecto aún no tiene mediciones o panelistas activos.
      </p>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-10 space-y-6">
      {[1, 2, 3].map(n => (
        <div key={n} className="h-32 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
      status === "active" ? "bg-emerald-500/20 text-emerald-400" : "bg-gray-500/20 text-gray-400"
    }`}>
      {status === "active" ? "Activo" : status}
    </span>
  );
}

function MapIcon() {
  return (
    <div className="h-8 w-8 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
      <BarChart3 className="h-4 w-4 text-white" />
    </div>
  );
}
