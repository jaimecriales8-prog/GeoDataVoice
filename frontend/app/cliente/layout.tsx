"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { LayoutDashboard, MapPinned, BarChart3, LogOut, ChevronRight } from "lucide-react";

const NAV = [
  { href: "/cliente", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/cliente/proyectos", label: "Proyectos", icon: MapPinned },
  { href: "/cliente/resultados", label: "Resultados", icon: BarChart3 },
];

export default function ClienteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar — solo escritorio */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-white/5 bg-slate-900">
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
              <MapPinned className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">GeoDataVoice</p>
              <p className="text-xs text-slate-500 mt-0.5">Panel de cliente</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active ? "bg-violet-600 text-white" : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
                {active && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/5">
          <button onClick={logout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar — solo móvil */}
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-white/5 bg-slate-900/95 backdrop-blur px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
              <MapPinned className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-none truncate">GeoDataVoice</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Panel de cliente</p>
            </div>
          </div>
          <button onClick={logout} aria-label="Cerrar sesión"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors shrink-0">
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <main className="flex-1 min-w-0 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      </div>

      {/* Bottom nav — solo móvil */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 grid grid-cols-4 gap-1 border-t border-white/10 bg-slate-900/95 backdrop-blur px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link key={href} href={href}
              className={`flex flex-col items-center gap-1 py-1 rounded-xl transition-colors ${active ? "text-violet-400" : "text-slate-500 hover:text-slate-300"}`}>
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
