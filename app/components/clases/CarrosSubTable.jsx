"use client";

import { Button } from "@/components/ui/button";
import { Eye, Pencil, Trash2 } from "lucide-react";

export default function CarrosSubTable({
  clase,
  carros = [],
  canCreate,
  canEdit,
  canDelete,
  onNew,
  onView,
  onEdit,
  onDelete,
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold">
          Carros de la clase: {clase?.nombre}
        </div>

        {canCreate && (
          <Button size="sm" onClick={() => onNew?.(clase)}>
            + Agregar carro
          </Button>
        )}
      </div>

      {carros.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No hay carros para esta clase.
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Marca</th>
                <th className="p-2 text-left">Modelo</th>
                <th className="p-2 text-left">Año</th>
                <th className="p-2 text-left">Versión</th>
                <th className="p-2 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {carros.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-2">{c.marca_nombre || "-"}</td>
                  <td className="p-2">{c.modelo_nombre || "-"}</td>
                  <td className="p-2">{c.year ?? "-"}</td>
                  <td className="p-2">{c.version || "-"}</td>

                  <td className="p-2 text-right space-x-2">
                    <Button size="sm" variant="ghost" onClick={() => onView?.(c)}>
                      <Eye size={16} />
                    </Button>

                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit?.(c)}
                      >
                        <Pencil size={16} />
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => onDelete?.(c)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}