import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const api = axios.create({ baseURL: API_BASE });

// ── Types ────────────────────────────────────────────────────────────

export type Project = {
  id: string;
  client_id: string;
  name: string;
  type: string;
  purpose: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

export type Client = {
  id: string;
  name: string;
  type: string;
  status: string;
};

export type Analytics = {
  project_id: string;
  panel: { active: number; reserve: number; total: number };
  waves: number;
  latest_wave: number | null;
  favorability_pct: number | null;
  sentiment: Record<string, { count: number; pct: number }>;
  emotions: Record<string, number>;
  top_topics: Array<{ topic: string; count: number }>;
  audio: { total: number; processed: number; processing_rate_pct: number };
};

// ── API calls ─────────────────────────────────────────────────────────

export const fetchProjects = () => api.get<Project[]>("/projects").then(r => r.data);
export const fetchProject = (id: string) => api.get<Project>(`/projects/${id}`).then(r => r.data);
export const fetchClients = () => api.get<Client[]>("/clients").then(r => r.data);
export const fetchAnalytics = (projectId: string) =>
  api.get<Analytics>(`/analytics/projects/${projectId}`).then(r => r.data);
