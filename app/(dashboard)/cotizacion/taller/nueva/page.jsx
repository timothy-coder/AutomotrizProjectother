"use client";

import CotizacionForm from "@/app/components/cotizaciones/CotizacionForm";
import { useRequirePerm } from "@/hooks/useRequirePerm";

export default function NuevaCotizacionTallerPage() {
  useRequirePerm("cotizacion", "create");

  return (
    <div className="p-6">
      <CotizacionForm tipo="taller" backUrl="/cotizacion/taller" />
    </div>
  );
}
