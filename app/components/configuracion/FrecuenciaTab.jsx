"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Pencil, Trash2, Plus, AlertTriangle, Loader2 } from "lucide-react";

export default function FrecuenciaTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialog, setDialog] = useState({
    open: false,
    mode: "create", // create | edit
    data: null,
  });

  const [form, setForm] = useState({ dias: "" });
  const [saving, setSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    item: null,
  });
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/frecuencia", { cache: "no-store" });
      const data = await r.json();

      if (!r.ok) {
        toast.error(data?.message || "Error cargando frecuencia");
        setRows([]);
        return;
      }

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log(e);
      toast.error("Error cargando frecuencia");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({ dias: "" });
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(item) {
    setForm({ dias: String(item?.dias ?? "") });
    setDialog({ open: true, mode: "edit", data: item });
  }

  function closeDialog(v) {
    setDialog((prev) => ({ ...prev, open: v }));
    if (!v) {
      setSaving(false);
      setForm({ dias: "" });
    }
  }

  function closeDeleteDialog(v) {
    setDeleteDialog((prev) => ({ ...prev, open: v }));
    if (!v) {
      setDeleting(false);
    }
  }

  async function save() {
    const diasNum = Number(form.dias);

    if (form.dias === "" || Number.isNaN(diasNum)) {
      toast.error("dias debe ser un número");
      return;
    }
    if (diasNum < 0) {
      toast.error("dias no puede ser negativo");
      return;
    }

    const isEdit = dialog.mode === "edit" && dialog.data?.id != null;
    const url = isEdit ? `/api/frecuencia/${dialog.data.id}` : "/api/frecuencia";
    const method = isEdit ? "PUT" : "POST";

    try {
      setSaving(true);

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dias: diasNum }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        toast.error(data?.message || "No se pudo guardar");
        return;
      }

      toast.success(isEdit ? "Frecuencia actualizada" : "Frecuencia creada");
      setDialog({ open: false, mode: "create", data: null });
      setForm({ dias: "" });
      await load();
    } catch (e) {
      console.log(e);
      toast.error("Error guardando frecuencia");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const id = deleteDialog.item?.id;
    if (!id) return;

    try {
      setDeleting(true);

      const r = await fetch(`/api/frecuencia/${id}`, { method: "DELETE" });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        toast.error(data?.message || "No se pudo eliminar");
        return;
      }

      toast.success("Frecuencia eliminada");
      setDeleteDialog({ open: false, item: null });
      await load();
    } catch (e) {
      console.log(e);
      toast.error("Error eliminando frecuencia");
    } finally {
      setDeleting(false);
    }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => Number(a.id) - Number(b.id));
  }, [rows]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Frecuencia</CardTitle>

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8">
            No hay registros.
          </div>
        ) : (
          <div className="w-full overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">ID</th>
                  <th className="text-left p-2">Días</th>
                  <th className="text-right p-2">Acciones</th>
                </tr>
              </thead>

              <tbody>
                {sorted.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="p-2">{item.id}</td>
                    <td className="p-2">{item.dias}</td>
                    <td className="p-2">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(item)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Editar
                        </Button>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() =>
                            setDeleteDialog({ open: true, item })
                          }
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={dialog.open} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "edit" ? "Editar frecuencia" : "Nueva frecuencia"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm font-medium">Días</div>
            <Input
              type="number"
              value={form.dias}
              onChange={(e) => setForm({ dias: e.target.value })}
              placeholder="Ej: 30"
              min={0}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => closeDialog(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog.open} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground">
            ¿Seguro que deseas eliminar este registro?
            <div className="mt-2">
              <b>ID:</b> {deleteDialog.item?.id ?? "-"} &nbsp;·&nbsp;
              <b>Días:</b> {deleteDialog.item?.dias ?? "-"}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => closeDeleteDialog(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}