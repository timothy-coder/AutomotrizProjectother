"use client";

import { use } from "react";
import CotizacionForm from "@/app/components/cotizaciones/CotizacionForm";
import { useRequirePerm } from "@/hooks/useRequirePerm";

export default function EditarCotizacionPypPage({ params }) {
  const { id } = use(params);
  useRequirePerm("cotizacion", "edit");

  return (
    <div className="p-6">
      <CotizacionForm tipo="pyp" editId={id} backUrl="/cotizacion/pyp" />
    </div>
  );
}
