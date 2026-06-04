"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect, createContext, useContext } from "react";
import { getUser, initAuth, logout as doLogout, type AuthUser } from "@/lib/auth";
import { useRouter } from "next/navigation";

// ── Auth Context ──────────────────────────────────────────────────────

type AuthCtx = {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  logout: () => void;
};

export const AuthContext = createContext<AuthCtx>({
  user: null,
  setUser: () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// ── Providers ─────────────────────────────────────────────────────────

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    initAuth();
    const stored = getUser();
    if (stored) setUser(stored);
  }, []);

  function logout() {
    doLogout();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, setUser, logout }}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </AuthContext.Provider>
  );
}
