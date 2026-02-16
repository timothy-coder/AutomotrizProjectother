"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Trash, Plus } from "lucide-react";

export default function MotivosVisitaCard({ value, onChange }) {

  const [motivos, setMotivos] = useState([]);

  useEffect(() => {
    fetch("/api/motivos_citas?active=1")
      .then(r => r.json())
      .then(setMotivos);
  }, []);

  function updateRow(i, data) {
    const copy = [...value];
    copy[i] = { ...copy[i], ...data };
    onChange(copy);
  }

  async function cargarSubmotivos(motivoId, i) {
    const subs = await fetch(`/api/submotivos-citas?motivo_id=${motivoId}&active=1`)
      .then(r => r.json());
    updateRow(i, { submotivos: subs });
  }

  function addRow() {
    onChange([...value, { motivo_id: null, submotivo_id: null, submotivos: [] }]);
  }

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
          <div key={i} className="grid md:grid-cols-[1fr_1fr_auto] gap-3">

            <Select
              value={row.motivo_id?.toString() || ""}
              onValueChange={(v) => {
                updateRow(i, { motivo_id: Number(v), submotivo_id: null });
                cargarSubmotivos(v, i);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Motivo" />
              </SelectTrigger>
              <SelectContent>
                {motivos.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {row.submotivos.length > 0 && (
              <Select
                value={row.submotivo_id?.toString() || ""}
                onValueChange={(v) => updateRow(i, { submotivo_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Submotivo" />
                </SelectTrigger>
                <SelectContent>
                  {row.submotivos.map(sm => (
                    <SelectItem key={sm.id} value={String(sm.id)}>
                      {sm.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {value.length > 1 && (
              <Button variant="destructive" onClick={() => removeRow(i)}>
                <Trash />
              </Button>
            )}

          </div>
        ))}

        <Button variant="link" onClick={addRow}>
          <Plus className="mr-2 h-4 w-4"/> Agregar motivo
        </Button>
      </CardContent>
    </Card>
  );
}
