"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { LayoutDashboard, MapPinned, ClipboardList, BarChart3, LogOut, ChevronRight } from "lucide-react";

const NAV = [
  { href: "/cliente", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/cliente/proyectos", label: "Mis proyectos", icon: MapPinned },
  { href: "/cliente/encuestas", label: "Encuestas", icon: ClipboardList },
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
      <aside className="w-60 shrink-0 flex flex-col border-r border-white/5 bg-slate-900">
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

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
