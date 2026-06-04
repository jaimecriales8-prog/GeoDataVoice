"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export default function FieldProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 60_000, retry: 1, networkMode: "offlineFirst" } },
  }));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
