import { createClient } from "@supabase/supabase-js";

/**
 * Cliente Supabase con SERVICE ROLE — solo para uso en el servidor (route handlers,
 * Edge Functions). Salta RLS. NUNCA importar desde componentes cliente.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
