import { api } from "./api";

const TOKEN_KEY = "gdv_token";
const USER_KEY = "gdv_user";

export type AuthUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
};

export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await api.post("/auth/login", { email, password });

  const { access_token } = res.data;
  setToken(access_token);

  // Fetch full user profile
  const me = await api.get("/auth/me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  setUser(me.data);
  return me.data;
}

export function logout() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = "gdv_token=; path=/; max-age=0";
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  // Also set cookie so middleware can read it
  document.cookie = `gdv_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export function setUser(user: AuthUser) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Inject token into axios on boot
export function initAuth() {
  const token = getToken();
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }
}
