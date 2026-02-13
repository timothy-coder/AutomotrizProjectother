"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Pencil, Trash2, Plus } from "lucide-react";

export default function TalleresMostradoresTab() {

  const [centros, setCentros] = useState([]);
  const [centroId, setCentroId] = useState("");

  const [talleres, setTalleres] = useState([]);
  const [mostradores, setMostradores] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editing, setEditing] = useState(null);
  const [tipo, setTipo] = useState(null);
  const [nombre, setNombre] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ================= LOAD CENTROS =================

  useEffect(() => {
    async function loadCentros() {
      try {

        const r = await fetch("/api/centros", { cache: "no-store" });
        const data = await r.json();

        const list = Array.isArray(data) ? data : [];
        setCentros(list);

        if (list.length) setCentroId(String(list[0].id));

      } catch {
        toast.error("Error cargando centros");
      }
    }

    loadCentros();
  }, []);

  // ================= LOAD DATA =================

  useEffect(() => {
    if (!centroId) return;
    reload();
  }, [centroId]);

  async function reload() {
    try {

      const [t, m] = await Promise.all([
        fetch(`/api/talleres/bycentro?centro_id=${centroId}`),
        fetch(`/api/mostradores/bycentro?centro_id=${centroId}`)
      ]);

      setTalleres(await t.json());
      setMostradores(await m.json());

    } catch {
      toast.error("Error cargando datos");
    }
  }

  // ================= CREATE / EDIT =================

  function openCreate(t) {
    setTipo(t);
    setEditing(null);
    setNombre("");
    setDialogOpen(true);
  }

  function openEdit(item, t) {
    setTipo(t);
    setEditing(item);
    setNombre(item.nombre);
    setDialogOpen(true);
  }

  async function save() {

    if (!nombre.trim())
      return toast.warning("Ingrese nombre");

    const base = `/api/${tipo === "taller" ? "talleres" : "mostradores"}`;

    try {

      if (editing) {

        await fetch(`${base}/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre })
        });

        toast.success("Actualizado");

      } else {

        await fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            centro_id: Number(centroId),
            nombre
          })
        });

        toast.success("Creado");
      }

      setDialogOpen(false);
      reload();

    } catch {
      toast.error("Error guardando");
    }
  }

  // ================= DELETE =================

  function openDelete(item, t) {
    setDeleteTarget(item);
    setTipo(t);
    setDeleteOpen(true);
  }

  async function deleteConfirm() {

    try {

      await fetch(`/api/${tipo === "taller" ? "talleres" : "mostradores"}/${deleteTarget.id}`, {
        method: "DELETE"
      });

      toast.success("Eliminado");

      setDeleteOpen(false);
      reload();

    } catch {
      toast.error("Error eliminando");
    }
  }

  // ================= UI =================

  return (
    <div className="space-y-5">

      {/* SELECT CENTRO */}
      <div className="space-y-1">
        <Label>Centro</Label>

        <Select value={centroId} onValueChange={setCentroId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione centro" />
          </SelectTrigger>

          <SelectContent>
            {centros.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TABLAS */}
      {centroId && (
        <div className="grid md:grid-cols-2 gap-4">

          {/* TALLERES */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Talleres</CardTitle>

              <Button size="sm" onClick={() => openCreate("taller")}>
                <Plus className="h-4 w-4 mr-1" /> Nuevo
              </Button>
            </CardHeader>

            <CardContent className="space-y-2">
              {talleres.map(t => (
                <Row
                  key={t.id}
                  item={t}
                  onEdit={() => openEdit(t, "taller")}
                  onDelete={() => openDelete(t, "taller")}
                />
              ))}
            </CardContent>
          </Card>

          {/* MOSTRADORES */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Mostradores</CardTitle>

              <Button size="sm" onClick={() => openCreate("mostrador")}>
                <Plus className="h-4 w-4 mr-1" /> Nuevo
              </Button>
            </CardHeader>

            <CardContent className="space-y-2">
              {mostradores.map(m => (
                <Row
                  key={m.id}
                  item={m}
                  onEdit={() => openEdit(m, "mostrador")}
                  onDelete={() => openDelete(m, "mostrador")}
                />
              ))}
            </CardContent>
          </Card>

        </div>
      )}

      {/* DIALOG CREATE / EDIT */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar" : "Nuevo"} {tipo}
            </DialogTitle>
          </DialogHeader>

          <Input
            placeholder="Nombre"
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


// ================= COMPONENTE FILA =================

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
