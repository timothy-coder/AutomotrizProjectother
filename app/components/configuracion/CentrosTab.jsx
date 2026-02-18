"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2
} from "lucide-react";

export default function CentrosTab() {

  const [items, setItems] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editing, setEditing] = useState(null);
  const [nombre, setNombre] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

      const res = await fetch(
        editing ? `/api/centros/${editing.id}` : `/api/centros`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre })
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error guardando");
        return;
      }

      toast.success(
        editing ? "Centro actualizado" : "Centro creado correctamente"
      );

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
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/centros/${deleteTarget.id}`, {
        method: "DELETE"
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "No se pudo eliminar");
        return;
      }

      toast.success("Centro eliminado correctamente");

      setDeleteOpen(false);
      setDeleteTarget(null);
      load();

    } catch {
      toast.error("Error eliminando el centro");
    } finally {
      setDeleting(false);
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
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>

            <Button onClick={save}>
              Guardar
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG PRO */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">

          <div className="flex flex-col items-center text-center space-y-4">

            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>

            <div>
              <h3 className="text-lg font-semibold">
                ¿Eliminar centro?
              </h3>

              <p className="text-sm text-muted-foreground mt-1">
                Esta acción no se puede deshacer.
              </p>

              <p className="mt-2 font-medium text-red-600">
                {deleteTarget?.nombre}
              </p>
            </div>

            <div className="flex gap-3 w-full pt-2">

              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteOpen(false)}
                disabled={deleting}
              >
                Cancelar
              </Button>

              <Button
                variant="destructive"
                className="flex-1"
                onClick={deleteConfirm}
                disabled={deleting}
              >
                {deleting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Eliminar
              </Button>

            </div>

          </div>

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
