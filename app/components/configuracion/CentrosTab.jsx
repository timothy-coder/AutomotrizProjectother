"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Pencil, Trash2, Plus } from "lucide-react";

export default function CentrosTab() {

  const [items, setItems] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editing, setEditing] = useState(null);
  const [nombre, setNombre] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ================= LOAD =================

  async function load() {
    try {

      const r = await fetch("/api/centros", { cache: "no-store" });
      const data = await r.json();

      setItems(Array.isArray(data) ? data : []);

    } catch {
      toast.error("Error cargando centros");
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ================= CREATE =================

  function openCreate() {
    setEditing(null);
    setNombre("");
    setDialogOpen(true);
  }

  // ================= EDIT =================

  function openEdit(item) {
    setEditing(item);
    setNombre(item.nombre);
    setDialogOpen(true);
  }

  // ================= SAVE =================

  async function save() {

    if (!nombre.trim())
      return toast.warning("Ingrese nombre");

    try {

      if (editing) {

        await fetch(`/api/centros/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre })
        });

        toast.success("Centro actualizado");

      } else {

        await fetch("/api/centros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre })
        });

        toast.success("Centro creado");
      }

      setDialogOpen(false);
      load();

    } catch {
      toast.error("Error guardando");
    }
  }

  // ================= DELETE =================

  function openDelete(item) {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }

  async function deleteConfirm() {

    try {

      await fetch(`/api/centros/${deleteTarget.id}`, {
        method: "DELETE"
      });

      toast.success("Centro eliminado");

      setDeleteOpen(false);
      load();

    } catch {
      toast.error("Error eliminando");
    }
  }

  // ================= UI =================

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex justify-between items-center">

        <h2 className="text-xl font-semibold">Centros</h2>

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo centro
        </Button>

      </div>

      {/* LISTA */}
      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">

          {items.map(c => (
            <Row
              key={c.id}
              item={c}
              onEdit={() => openEdit(c)}
              onDelete={() => openDelete(c)}
            />
          ))}

          {!items.length && (
            <p className="text-sm text-muted-foreground">
              No hay centros registrados
            </p>
          )}

        </CardContent>
      </Card>

      {/* DIALOG CREATE / EDIT */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>

          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar centro" : "Nuevo centro"}
            </DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Nombre del centro"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>

            <Button onClick={save}>
              Guardar
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>

          ¿Eliminar <b>{deleteTarget?.nombre}</b> ?

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancelar
            </Button>

            <Button variant="destructive" onClick={deleteConfirm}>
              Eliminar
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

    </div>
  );
}


// ================= ROW =================

function Row({ item, onEdit, onDelete }) {

  return (
    <div className="border rounded-md p-2 flex justify-between items-center">

      <span>{item.nombre}</span>

      <div className="flex gap-2">

        <Button size="icon" variant="outline" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>

        <Button size="icon" variant="destructive" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>

      </div>

    </div>
  );
}
