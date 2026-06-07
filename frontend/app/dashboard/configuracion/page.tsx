"use client";

import { AdminConfigToggles } from "@/components/admin-config-toggles";

export default function ConfiguracionPage() {
  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Parámetros globales de la plataforma (también disponibles en el panel principal)</p>
      </div>
      <AdminConfigToggles />
    </div>
  );
}
