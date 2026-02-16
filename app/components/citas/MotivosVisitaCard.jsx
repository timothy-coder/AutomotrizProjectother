"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash, Plus } from "lucide-react";

export default function MotivosVisitaCard({ value = [], onChange }) {
  const [motivos, setMotivos] = useState([]);

  // cargar motivos
  useEffect(() => {
    fetch("/api/motivos_citas?active=1")
      .then((r) => r.json())
      .then(setMotivos);
  }, []);

  // actualizar fila
  function updateRow(i, data) {
    const copy = [...value];
    copy[i] = { ...copy[i], ...data };
    onChange(copy);
  }

  // cargar submotivos
  async function cargarSubmotivos(motivoId, i) {
    if (!motivoId) return;

    const subs = await fetch(
      `/api/submotivos-citas?motivo_id=${motivoId}&active=1`
    ).then((r) => r.json());

    updateRow(i, {
      submotivos: subs,
      submotivo_id: null,
    });
  }

  // agregar fila
  function addRow() {
    onChange([
      ...value,
      { motivo_id: null, submotivo_id: null, submotivos: [] },
    ]);
  }

  // eliminar fila
  function removeRow(i) {
    const copy = [...value];
    copy.splice(i, 1);
    onChange(copy);
  }

  return (
    <Card>
      <CardHeader className="font-semibold">
        PASO 2 — Motivo de visita
      </CardHeader>

      <CardContent className="space-y-4">
        {value.map((row, i) => (
          <div
            key={`motivo-${i}-${row.motivo_id ?? "new"}`}
            className="grid md:grid-cols-[1fr_1fr_auto] gap-3"
          >
            {/* MOTIVO */}
            <Select
              value={row.motivo_id ? String(row.motivo_id) : ""}
              onValueChange={(v) => {
                updateRow(i, { motivo_id: Number(v) });
                cargarSubmotivos(v, i);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Motivo de visita" />
              </SelectTrigger>
              <SelectContent>
                {motivos.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* SUBMOTIVO */}
            {row.submotivos?.length > 0 && (
              <Select
                value={row.submotivo_id ? String(row.submotivo_id) : ""}
                onValueChange={(v) =>
                  updateRow(i, { submotivo_id: Number(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Detalle del motivo" />
                </SelectTrigger>
                <SelectContent>
                  {row.submotivos.map((sm) => (
                    <SelectItem key={sm.id} value={String(sm.id)}>
                      {sm.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* ELIMINAR */}
            {value.length > 1 && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => removeRow(i)}
              >
                <Trash size={16} />
              </Button>
            )}
          </div>
        ))}

        {/* AGREGAR */}
        <Button type="button" variant="link" onClick={addRow}>
          <Plus className="mr-2 h-4 w-4" /> Agregar motivo
        </Button>
      </CardContent>
    </Card>
  );
}
