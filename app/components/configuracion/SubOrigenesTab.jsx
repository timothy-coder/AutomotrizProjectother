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

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, Plus } from "lucide-react";

const EMPTY_FORM = {
  id: null,
  origen_id: "",
  name: "",
  is_active: true,
};

export default function SubOrigenesTab() {
  const [rows, setRows] = useState([]);
  const [origenes, setOrigenes] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filterOrigen, setFilterOrigen] = useState("all");

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(EMPTY_FORM);
  const isEdit = mode === "edit";

  async function loadData(origenId = filterOrigen) {
    try {
      setLoading(true);

      const [subRes, origenesRes] = await Promise.all([
        fetch(
          origenId && origenId !== "all"
            ? `/api/suborigenes_citas?origen_id=${origenId}`
            : `/api/suborigenes_citas`,
          { cache: "no-store" }
        ),
        fetch(`/api/origenes_citas`, { cache: "no-store" }),
      ]);

      const subData = await subRes.json();
      const origenesData = await origenesRes.json();

      setRows(Array.isArray(subData) ? subData : []);
      setOrigenes(Array.isArray(origenesData) ? origenesData : []);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando suborígenes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData(filterOrigen);
  }, [filterOrigen]);

  function handleNew() {
    setMode("create");
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function handleEdit(row) {
    setMode("edit");
    setForm({
      id: row.id,
      origen_id: String(row.origen_id || ""),
      name: row.name || "",
      is_active: !!row.is_active,
    });
    setOpen(true);
  }

  async function handleDelete(row) {
    const ok = window.confirm(`¿Eliminar el suborigen "${row.name}"?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/suborigenes_citas/${row.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Error al eliminar");
      }

      toast.success("Suborigen eliminado");
      loadData(filterOrigen);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "No se pudo eliminar");
    }
  }

  async function handleSave() {
    if (!form.origen_id || !form.name.trim()) {
      toast.error("Origen y nombre son obligatorios");
      return;
    }

    try {
      const url = isEdit
        ? `/api/suborigenes_citas/${form.id}`
        : `/api/suborigenes_citas`;

      const method = isEdit ? "PUT" : "POST";

      const payload = {
        origen_id: Number(form.origen_id),
        name: form.name.trim(),
        is_active: form.is_active ? 1 : 0,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Error al guardar");
      }

      toast.success(isEdit ? "Suborigen actualizado" : "Suborigen creado");
      setOpen(false);
      setForm(EMPTY_FORM);
      loadData(filterOrigen);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "No se pudo guardar");
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Suborígenes de citas</CardTitle>

          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={filterOrigen} onValueChange={setFilterOrigen}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Filtrar por origen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los orígenes</SelectItem>
                {origenes.map((origen) => (
                  <SelectItem key={origen.id} value={String(origen.id)}>
                    {origen.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => loadData(filterOrigen)} disabled={loading}>
              Recargar
            </Button>

            <Button onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Cargando...</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No hay suborígenes registrados.
            </div>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="border rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="font-medium">{row.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Origen: {row.origen_name || `ID ${row.origen_id}`}
                    </div>
                    <div className="text-xs">
                      Estado:{" "}
                      <span className={row.is_active ? "text-green-600" : "text-red-600"}>
                        {row.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(row)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(row)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar suborigen" : "Nuevo suborigen"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Origen</Label>
              <Select
                value={form.origen_id}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, origen_id: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar origen" />
                </SelectTrigger>
                <SelectContent>
                  {origenes.map((origen) => (
                    <SelectItem key={origen.id} value={String(origen.id)}>
                      {origen.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej. WhatsApp Empresa"
              />
            </div>

            <div className="flex items-center justify-between border rounded-md p-3">
              <Label>Activo</Label>
              <Switch
                checked={!!form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: !!checked }))
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {isEdit ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}