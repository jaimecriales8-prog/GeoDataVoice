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

  // Redirigir panelista/encuestador no verificados a verificación de identidad
  if (user && pathname.startsWith("/campo") && !authOnlyPaths.some(p => pathname.startsWith(p))) {
    const role = user.user_metadata?.role ?? "";
    if (role === "panelista" || role === "encuestador") {
      // Solo verificar si viene de una página de campo (no el propio verificar-identidad)
      // La verificación real la hace la propia página de verificar-identidad
    }
  }

  // /login always renders — no redirect even if logged in
  // The page itself handles the "already logged in" state

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png).*)"],
};
