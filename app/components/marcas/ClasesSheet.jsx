"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";

import { Pencil, Trash2, Plus } from "lucide-react";

import ClaseDialog from "@/app/components/clases/ClaseDialog";
import ConfirmDeleteDialog from "@/app/components/clases/ConfirmDeleteDialog";

export default function ClasesSheet({
  open,
  onOpenChange,
  canEdit = true,
  canDelete = true,
  canCreate = true,
  onChanged, // <-- opcional: para que MarcasPage haga loadAll() y actualice el Select
}) {
  const [loading, setLoading] = useState(false);
  const [clases, setClases] = useState([]);

  // dialogs clase (create/edit/view si tu ClaseDialog lo soporta)
  const [claseOpen, setClaseOpen] = useState(false);
  const [claseMode, setClaseMode] = useState("create"); // create | edit | view
  const [claseSelected, setClaseSelected] = useState(null);

  // delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  async function loadClases() {
    try {
      setLoading(true);
      const res = await fetch("/api/clases", { cache: "no-store" });

      let data;
      try {
        data = await res.json();
      } catch {
        data = [];
      }

      setClases(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Error cargando clases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadClases();
  }, [open]);

  const clasesSorted = useMemo(() => {
    return [...(clases || [])].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [clases]);

  // ---------- acciones ----------
  function onNewClase() {
    setClaseSelected(null);
    setClaseMode("create");
    setClaseOpen(true);
  }

  function onEditClase(row) {
    setClaseSelected(row);
    setClaseMode("edit");
    setClaseOpen(true);
  }

  function askDeleteClase(row) {
    setDeleteItem(row);
    setDeleteOpen(true);
  }

  async function saveClase(payload) {
    try {
      const isEdit = !!payload.id;
      const url = isEdit ? `/api/clases/${payload.id}` : `/api/clases`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.name }),
      });

      // tu API puede devolver texto, así que no fuerzo json
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Error");
      }

      toast.success(isEdit ? "Clase actualizada" : "Clase creada");
      setClaseOpen(false);

      await loadClases();
      onChanged?.(); // ✅ refresca también MarcasPage si lo pasas
    } catch {
      toast.error("No se pudo guardar la clase");
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return;

    try {
      const res = await fetch(`/api/clases/${deleteItem.id}`, { method: "DELETE" });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Error");
      }

      toast.success("Clase eliminada");
      setDeleteOpen(false);

      await loadClases();
      onChanged?.(); // ✅ refresca también MarcasPage si lo pasas
    } catch {
      toast.error("No se pudo eliminar");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Clases</SheetTitle>
          <SheetDescription>
            Crea, edita o elimina clases desde aquí.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <Button variant="outline" onClick={loadClases} disabled={loading}>
              Recargar
            </Button>

            {canCreate && (
              <Button onClick={onNewClase} disabled={loading}>
                <Plus size={16} /> Nueva clase
              </Button>
            )}
          </div>

          <div className="border rounded-md overflow-hidden">
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="p-3 text-left">Clase</th>
                    <th className="p-3 text-right">Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {clasesSorted.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-3">{c.name}</td>

                      <td className="p-3 text-right space-x-2">
                        {canEdit && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onEditClase(c)}
                            disabled={loading}
                            title="Editar"
                          >
                            <Pencil size={16} />
                          </Button>
                        )}

                        {canDelete && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => askDeleteClase(c)}
                            disabled={loading}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {!loading && clasesSorted.length === 0 && (
                    <tr>
                      <td className="p-4 text-sm text-muted-foreground" colSpan={2}>
                        No hay clases aún.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </SheetFooter>

        {/* Dialog crear/editar clase */}
        <ClaseDialog
          open={claseOpen}
          onOpenChange={setClaseOpen}
          mode={claseMode}
          clase={claseSelected}
          onSave={saveClase}
        />

        {/* Confirm delete */}
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Eliminar clase"
          description={`¿Seguro que deseas eliminar la clase "${deleteItem?.name}"?`}
          onConfirm={confirmDelete}
        />
      </SheetContent>
    </Sheet>
  );
}