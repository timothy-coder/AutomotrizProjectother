"use client";

import { FileText, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import CotizacionRow from "./CotizacionRow";

export default function CotizacionesTable({
  cotizaciones,
  sortConfig,
  onSort,
  onEdit,
  onDelete,
  onChangeStatus,
  onDuplicate,
  onLoadHistorial,
  saving,
  userId,
  onOpenHistorialDialog,
}) {
  const sortedCotizaciones = [...cotizaciones].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  if (cotizaciones.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="p-4 bg-gray-100 rounded-full mb-3">
          <FileText className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-sm text-gray-600 font-medium">
          No hay cotizaciones
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Haz clic en "Agregar" para crear una
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="text-left py-3 px-4">
              <button
                onClick={() => onSort("id")}
                className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
              >
                Número
                <ChevronDown size={16} />
              </button>
            </th>
            <th className="text-left py-3 px-4">
              <button
                onClick={() => onSort("estado")}
                className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
              >
                Estado
                <ChevronDown size={16} />
              </button>
            </th>
            <th className="text-left py-3 px-4">
              <button
                onClick={() => onSort("created_at")}
                className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
              >
                Fecha
                <ChevronDown size={16} />
              </button>
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700">
              Vistas
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700">
              Enlace Público
            </th>
            <th className="text-center py-3 px-4 font-semibold text-gray-700">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedCotizaciones.map((cot, idx) => (
            <CotizacionRow
              key={cot.id}
              cot={cot}
              idx={idx}
              onEdit={onEdit}
              onDelete={onDelete}
              onChangeStatus={onChangeStatus}
              onDuplicate={onDuplicate}
              onLoadHistorial={onLoadHistorial}
              saving={saving}
              onOpenHistorialDialog={onOpenHistorialDialog}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}