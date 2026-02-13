"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import ConfirmDeleteDialog from "@/app/components/clientes/ConfirmDeleteDialog";

export default function VehiculosTable({
  cliente,
  data,
  onCreate,
  onEdit,
  onDelete, // 👈 nuevo
}) {
  const [delOpen, setDelOpen] = useState(false);
  const [target, setTarget] = useState(null);

  function askDelete(v) {
    setTarget(v);
    setDelOpen(true);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">
          Vehículos de {cliente?.nombre} {cliente?.apellido || ""}
        </h2>

        {onCreate && (
          <Button onClick={onCreate}>
            Agregar vehículo
          </Button>
        )}
      </div>

      {(!data || data.length === 0) ? (
        <p className="text-sm text-muted-foreground">
          Este cliente no tiene vehículos registrados.
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((v) => (
            <div
              key={v.id}
              className="border p-3 rounded-md flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {(v.placas || "SIN PLACAS")} · {(v.marca_nombre || "")} {(v.modelo_nombre || "")}
                </div>
                {v.vin ? (
                  <div className="text-xs text-muted-foreground truncate">
                    VIN: {v.vin}
                  </div>
                ) : null}
              </div>

              <div className="flex gap-2 justify-end">
                {onEdit && (
                  <Button size="sm" variant="outline" onClick={() => onEdit(v)}>
                    Editar
                  </Button>
                )}

                {onDelete && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => askDelete(v)}
                  >
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CONFIRM DELETE */}
      <ConfirmDeleteDialog
        open={delOpen}
        onOpenChange={setDelOpen}
        title="Eliminar vehículo"
        description={
          target ? (
            <>
              ¿Eliminar el vehículo{" "}
              <b>{target.placas || target.vin || `#${target.id}`}</b>?
            </>
          ) : null
        }
        onConfirm={() => {
          if (!target) return;
          onDelete?.(target);
          setDelOpen(false);
          setTarget(null);
        }}
      />
    </div>
  );
}
