"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Pencil, Trash2, Plus } from "lucide-react";

export default function OrigenesTab() {

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ---------------- LOAD ----------------

  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/origenes_citas", { cache: "no-store" });
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando orígenes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ---------------- CREATE / EDIT ----------------

  function openCreate() {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setName(item.name);
    setDialogOpen(true);
  }

  async function save() {

    if (!name.trim())
      return toast.warning("Ingrese nombre");

    try {

      if (editing) {

        const r = await fetch(`/api/origenes_citas/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        });

        if (!r.ok) throw new Error();

        toast.success("Origen actualizado");

      } else {

        const r = await fetch("/api/origenes_citas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        });

        if (!r.ok) throw new Error();

        toast.success("Origen creado");
      }

      setDialogOpen(false);
      setName("");
      setEditing(null);
      load();

    } catch {
      toast.error("Error guardando origen");
    }
  }

  // ---------------- DELETE ----------------

  function openDelete(item) {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }

  async function deleteConfirm() {
    try {

      const r = await fetch(`/api/origenes_citas/${deleteTarget.id}`, {
        method: "DELETE"
      });

      if (!r.ok) throw new Error();

      toast.success("Origen eliminado");

      setDeleteOpen(false);
      setDeleteTarget(null);
      load();

    } catch {
      toast.error("Error eliminando");
    }
  }

  // ---------------- UI ----------------

  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">
          Orígenes de citas
        </h2>

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo
        </Button>
      </div>

      {/* LIST */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Lista de orígenes
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">

          {loading && (
            <p className="text-sm text-muted-foreground">
              Cargando...
            </p>
          )}

          {!loading && items.map(o => (

            <div
              key={o.id}
              className="border rounded-md p-3 flex justify-between items-center"
            >
              <span>{o.name}</span>

              <div className="flex gap-2">

                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => openEdit(o)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => openDelete(o)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

              </div>

            </div>

          ))}

        </CardContent>
      </Card>

      {/* ---------- DIALOG CREATE / EDIT ---------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>

          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar origen" : "Nuevo origen"}
            </DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Nombre del origen"
            value={name}
            onChange={(e) => setName(e.target.value)}
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

      {/* ---------- DELETE CONFIRM ---------- */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>

          <DialogHeader>
            <DialogTitle>
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>

          <p>
            ¿Eliminar el origen <b>{deleteTarget?.name}</b>?
          </p>

          <DialogFooter>

            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              Cancelar
            </Button>

            <Button
              variant="destructive"
              onClick={deleteConfirm}
            >
              Eliminar
            </Button>

          </DialogFooter>

        </DialogContent>
      </Dialog>

    </div>
  );
}
