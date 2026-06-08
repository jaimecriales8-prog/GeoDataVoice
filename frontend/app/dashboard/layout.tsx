"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import {
  LayoutDashboard, Users, Mic, MapPin, Settings,
  LogOut, MapPinned, Wallet, ChevronRight
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Inicio", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users },
  { href: "/dashboard/panelistas", label: "Panelistas", icon: Mic },
  { href: "/dashboard/encuestadores", label: "Encuestadores", icon: MapPin },
  { href: "/dashboard/proyectos", label: "Proyectos", icon: MapPinned },
  { href: "/dashboard/pagos", label: "Pagos y tarifas", icon: Wallet },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pendientesEncuestadores, setPendientesEncuestadores] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("field_operators").select("id", { count: "exact", head: true }).eq("status", "pending")
      .then(({ count }) => setPendientesEncuestadores(count ?? 0));
  }, [pathname]);

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
      {/* Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-white/5 bg-slate-900">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
              <MapPinned className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-none">GeoDataVoice</p>
              <p className="text-xs text-slate-500 mt-0.5">Panel de administración</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ href, label, icon: Icon, exact }) => {
            const active = isActive(href, exact);
            const badge = href === "/dashboard/encuestadores" && pendientesEncuestadores > 0
              ? pendientesEncuestadores : null;
            return (
              <Link key={href} href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }`}>
                <Icon className="h-4 w-4 shrink-0" />
                {label}
                {badge && (
                  <span className="ml-auto bg-amber-500 text-white text-xs font-bold rounded-full h-5 min-w-5 flex items-center justify-center px-1.5">
                    {badge}
                  </span>
                )}
                {active && !badge && <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/5">
          <Link href="/dashboard/configuracion"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white transition-colors mb-1">
            <Settings className="h-4 w-4 shrink-0" />
            Configuración
          </Link>
          <button onClick={logout}
            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4 shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
