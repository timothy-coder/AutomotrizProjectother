"use client";

import { use } from "react";
import CotizacionForm from "@/app/components/cotizaciones/CotizacionForm";
import { useRequirePerm } from "@/hooks/useRequirePerm";

export default function EditarCotizacionTallerPage({ params }) {
  const { id } = use(params);
  useRequirePerm("cotizacion", "edit");

  return (
    <div className="p-6">
      <CotizacionForm tipo="taller" editId={id} backUrl="/cotizacion/taller" />
    </div>
  );
}
