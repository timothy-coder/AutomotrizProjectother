"use client";

import CotizacionForm from "@/app/components/cotizaciones/CotizacionForm";
import { useRequirePerm } from "@/hooks/useRequirePerm";

export default function NuevaCotizacionPypPage() {
  useRequirePerm("cotizacion", "create");

  return (
    <div className="p-6">
      <CotizacionForm tipo="pyp" backUrl="/cotizacion/pyp" />
    </div>
  );
}
