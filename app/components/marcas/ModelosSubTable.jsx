"use client";

import { Button } from "@/components/ui/button";
import { Plus,Eye, Pencil, Trash2 } from "lucide-react";
export default function ModelosSubTable({
  marca,
  modelos = [],
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) {
  return (
    <div className="space-y-3">
      <div className="font-semibold">
        Modelos de {marca?.name}
      </div>

      {modelos.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No hay modelos para esta marca
        </div>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Nombre</th>
                <th className="p-2 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {modelos.map((modelo) => (
                <tr key={modelo.id} className="border-t">
                  <td className="p-2">{modelo.name}</td>

                  <td className="p-2 text-right space-x-2">
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit?.(modelo)}
                      >
                        <Pencil size={16} />
                      </Button>
                    )}

                    {canDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete?.(modelo)}
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
