import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If Supabase env vars not set, let everything through (fail-safe)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(toSet) {
        toSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  const protectedPaths = ["/dashboard", "/cliente", "/campo"];
  const authOnlyPaths = ["/campo/verificar-identidad", "/auth/verificar-email", "/auth/callback"];

  if (!user && protectedPaths.some(p => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // ── Gate de verificación de identidad (KYC) ──────────────────────────────
  // Bloquea el acceso a /campo/* si el panelista no completó su verificación.
  // Respeta platform_config.identity_verification para no crear loops con la
  // propia página de verificación (que aplica la misma lógica).
  if (
    user &&
    pathname.startsWith("/campo") &&
    !authOnlyPaths.some(p => pathname.startsWith(p))
  ) {
    const role = user.user_metadata?.role ?? "";
    if (role === "panelista") {
      const { data: participant } = await supabase
        .from("participants")
        .select("kyc_status")
        .eq("id", user.id)
        .maybeSingle();

      if (participant?.kyc_status !== "approved") {
        // Confirmar que el KYC está realmente requerido antes de redirigir
        const { data: cfg } = await supabase
          .from("platform_config")
          .select("value")
          .eq("key", "identity_verification")
          .maybeSingle();
        const c = cfg?.value as { enabled?: boolean; required_for?: string[] } | null;
        const requerido =
          c?.enabled !== false &&
          (c?.required_for ?? ["panelista"]).includes("panelista");

        if (requerido) {
          return NextResponse.redirect(new URL("/campo/verificar-identidad", request.url));
        }
      }
    }
  }

  // /login always renders — no redirect even if logged in
  // The page itself handles the "already logged in" state

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)"],
};
