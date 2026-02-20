"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Plus, Pencil, Trash2 } from "lucide-react";

import TipoInventarioDialog from "@/app/components/tipoInventario/TipoInventarioDialog";

export default function TipoInventarioPage() {

  const [tipos, setTipos] = useState([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  async function loadTipos() {
    const res = await fetch("/api/tipo-inventario");
    const data = await res.json();
    setTipos(data);
  }

  useEffect(() => {
    loadTipos();
  }, []);

  function nuevo() {
    setEditItem(null);
    setOpen(true);
  }

  function editar(item) {
    setEditItem(item);
    setOpen(true);
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este tipo?")) return;

    const res = await fetch(`/api/tipo-inventario/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Eliminado");
      loadTipos();
    } else {
      toast.error("Error al eliminar");
    }
  }

  return (
    <div className="p-4 space-y-4">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tipo de Inventario</h1>

        <Button onClick={nuevo}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">

          {tipos.map(t => (
            <div
              key={t.id}
              className="flex justify-between items-center border-b px-4 py-3 hover:bg-muted/40"
            >
              <span className="font-medium">{t.nombre}</span>

              <div className="flex gap-2">
                <Button size="icon" variant="ghost" onClick={() => editar(t)}>
                  <Pencil size={18} />
                </Button>

                <Button size="icon" variant="ghost" onClick={() => eliminar(t.id)}>
                  <Trash2 size={18} className="text-red-500" />
                </Button>
              </div>
            </div>
          ))}

          {!tipos.length && (
            <p className="p-4 text-sm text-muted-foreground">
              No hay tipos registrados.
            </p>
          )}

        </CardContent>
      </Card>

      <TipoInventarioDialog
        open={open}
        onOpenChange={setOpen}
        item={editItem}
        onSaved={loadTipos}
      />

    </div>
  );
}
