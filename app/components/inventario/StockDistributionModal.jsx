"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Plus,Eye, Pencil, Trash2 } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import TransferDialog from "./TransferDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import StockLocationDialog from "./StockLocationDialog";

function labelUbicacion(x) {
  const parts = [];
  if (x.centro_nombre) parts.push(`Centro: ${x.centro_nombre}`);
  if (x.taller_nombre) parts.push(`Taller: ${x.taller_nombre}`);
  if (x.mostrador_nombre) parts.push(`Mostrador: ${x.mostrador_nombre}`);
  return parts.join(" · ") || "Ubicación";
}

function SortItem({ item }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(item.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md border p-3 bg-background flex justify-between items-center"
    >
      <div>
        <p className="font-medium text-sm">{labelUbicacion(item)}</p>
        <p className="text-xs text-muted-foreground">ID: {item.id}</p>
      </div>

      <div className="flex items-center gap-2">
        <b>{item.stock}</b>

        <button
          className="text-xs border px-2 py-1 rounded hover:bg-muted"
          {...attributes}
          {...listeners}
        >
          Drag
        </button>
      </div>
    </div>
  );
}

export default function StockDistributionModal({
  open,
  onOpenChange,
  product,
  onChanged,
  permEdit
}) {

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [locationOpen, setLocationOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState(null);
  const [transferTo, setTransferTo] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function load() {

    if (!product?.id) return;

    try {
      setLoading(true);

      const r = await fetch(`/api/stock_parcial/producto/${product.id}`);
      const data = await r.json();

      setRows(Array.isArray(data) ? data : []);

    } catch {
      toast.error("Error cargando stock");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    load();
  }, [open, product?.id]);

  // DRAG TRANSFER
  function onDragEnd(e) {

    const fromId = e.active?.id;
    const toId = e.over?.id;

    if (!fromId || !toId || fromId === toId) return;

    const from = rows.find(x => String(x.id) === String(fromId));
    const to = rows.find(x => String(x.id) === String(toId));

    setTransferFrom(from);
    setTransferTo(to);
    setTransferOpen(true);
  }

  const sortableIds = useMemo(() => rows.map(x => String(x.id)), [rows]);

  if (!product) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">

          <DialogHeader>
            <DialogTitle>Distribución Stock</DialogTitle>

            <DialogDescription>
              Producto: <b>{product.numero_parte}</b>
            </DialogDescription>
          </DialogHeader>

          {/* BOTÓN NUEVO */}
          {permEdit && (
            <Button
              className="mb-4"
              onClick={() => {
                setEditingRow(null);
                setLocationOpen(true);
              }}
            >
             <Plus size={16} /> Nueva ubicación
            </Button>
          )}

          {/* LISTA DND */}
          <div className="max-h-[55vh] overflow-y-auto space-y-2">

            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin ubicaciones</p>
            ) : (
              <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>

                  {rows.map(item => (
                    <div key={item.id} className="relative">

                      <SortItem item={item} />

                      {permEdit && (
                        <div className="absolute right-3 bottom-3 flex gap-2">

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingRow(item);
                              setLocationOpen(true);
                            }}
                          >
                            <Pencil size={16} />
                          </Button>

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setDeleteTarget(item);
                              setDeleteOpen(true);
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>

                        </div>
                      )}

                    </div>
                  ))}

                </SortableContext>
              </DndContext>
            )}

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

      {/* CREATE / EDIT */}
      <StockLocationDialog
        open={locationOpen}
        onOpenChange={setLocationOpen}
        product={product}
        row={editingRow}
        onSaved={async () => {
          await load();
          await onChanged?.();
        }}
      />

      {/* TRANSFER */}
      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        from={transferFrom}
        to={transferTo}
        permEdit={permEdit}
        onDone={async () => {
          await load();
          await onChanged?.();
        }}
      />

      {/* DELETE */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar ubicación"
        description={
          <>
            ¿Eliminar esta ubicación?
            <br />
            <span className="text-xs text-muted-foreground">
              {labelUbicacion(deleteTarget || {})}
            </span>
          </>
        }
        onConfirm={async () => {

          try {

            await fetch(`/api/stock_parcial/${deleteTarget.id}`, {
              method: "DELETE"
            });

            toast.success("Eliminado");
            setDeleteOpen(false);

            await load();
            await onChanged?.();

          } catch {
            toast.error("Error eliminando");
          }
        }}
      />
    </>
  );
}
