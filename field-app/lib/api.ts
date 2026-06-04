import { enqueue } from "./offline-queue";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function post<T>(path: string, body: unknown): Promise<T | null> {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json() as Promise<T>;
  } catch {
    // Offline: enqueue for later sync
    await enqueue({ url, method: "POST", body });
    return null;
  }
}

export type PreRegisterPayload = {
  document_number: string;
  phone: string;
  name: string;
  gender?: "male" | "female" | "other" | "prefer_not_to_say";
  birth_year?: number;
  territory_id?: string;
};

export type ParticipantOut = {
  id: string;
  status: string;
  kyc_status: string;
  phone_verified: boolean;
  gender?: string;
  birth_year?: number;
};

export type VisitPayload = {
  operator_id: string;
  participant_id?: string;
  latitude: number;
  longitude: number;
  gps_accuracy?: number;
  address?: string;
  evidence_url?: string;
  result?: string;
  notes?: string;
  visited_at: string;
};

export const preRegisterParticipant = (data: PreRegisterPayload) =>
  post<ParticipantOut>("/participants/pre-register", data);

export const recordVisit = (data: VisitPayload) =>
  post("/field/visits", data);

export const recordConsents = (participant_id: string, types: string[]) =>
  post("/consents/bulk", { participant_id, types, accepted: true, channel: "field_app" });

export const fetchConsentTexts = () =>
  fetch(`${API_BASE}/consents/texts`).then(r => r.json());
