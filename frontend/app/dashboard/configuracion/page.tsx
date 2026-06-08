"use client";

import { AdminConfigToggles } from "@/components/admin-config-toggles";
import { PanelQuotasEditor } from "@/components/panel-quotas-editor";

export default function ConfiguracionPage() {
  return (
    <div className="p-8 max-w-2xl space-y-8">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm mt-1">Parámetros globales de la plataforma</p>
      </div>
      <AdminConfigToggles />
      <PanelQuotasEditor />
    </div>
  );
}
