import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Confirmación de email vía token_hash (verifyOtp).
 * A diferencia de exchangeCodeForSession (PKCE), NO requiere el code_verifier
 * del navegador original → funciona aunque el enlace se abra en otro dispositivo.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next");

  if (token_hash && type) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(toSet) {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          },
        },
      }
    );

    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error && data.user) {
      // Destino explícito (recuperar contraseña, etc.)
      if (next) return NextResponse.redirect(`${origin}${next}`);

      const role = data.user.user_metadata?.role ?? "panelista";
      if (role === "panelista" || role === "encuestador") {
        return NextResponse.redirect(`${origin}/campo/verificar-identidad`);
      }
      if (role === "cliente" || role === "client") {
        return NextResponse.redirect(`${origin}/cliente`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/verificar-email?tipo=error`);
}
