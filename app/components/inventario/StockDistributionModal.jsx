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
import { Plus, Pencil, Trash2, GripVertical, MapPin, Package, Wrench, Store, ArrowRight } from "lucide-react";
import { DndContext, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import TransferDialog from "./TransferDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";
import StockLocationDialog from "./StockLocationDialog";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

function labelUbicacion(x) {
  const parts = [];
  if (x.centro_nombre) parts.push(x.centro_nombre);
  if (x.taller_nombre) parts.push(x.taller_nombre);
  if (x.mostrador_nombre) parts.push(x.mostrador_nombre);
  return parts.join(" • ") || "Ubicación";
}

function getUbicacionIcon(x) {
  if (x.taller_nombre) return <Wrench size={14} />;
  if (x.mostrador_nombre) return <Store size={14} />;
  return <MapPin size={14} />;
}

function SortItem({ item, onEdit, onDelete, canEdit }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: String(item.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg border-2 p-2.5 sm:p-3.5 transition-all hover:shadow-md"
    >
      <div className="flex justify-between items-center gap-2 sm:gap-3">
        
        {/* Contenido izquierdo */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          
          {/* Grip handle */}
          {!isDragging && (
            <div
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded text-gray-400 flex-shrink-0"
              {...attributes}
              {...listeners}
            >
              <GripVertical size={16} />
            </div>
          )}

          {/* Icono ubicación */}
          <div className="p-1.5 rounded flex-shrink-0" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
            <div style={{ color: BRAND_PRIMARY }}>
              {getUbicacionIcon(item)}
            </div>
          </div>

          {/* Información */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-xs sm:text-sm truncate" style={{ color: BRAND_PRIMARY }}>
              {labelUbicacion(item)}
            </p>
            <p className="text-xs truncate" style={{ color: BRAND_SECONDARY }}>
              {item.centro_nombre && `Centro: ${item.centro_nombre}`}
            </p>
          </div>
        </div>

        {/* Stock + Botones */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          
          {/* Stock */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg cursor-help min-w-[50px] sm:min-w-[60px] text-center" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                <p className="text-xs font-medium" style={{ color: BRAND_SECONDARY }}>Stock</p>
                <p className="text-base sm:text-lg font-bold" style={{ color: BRAND_PRIMARY }}>
                  {item.stock}
                </p>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Cantidad asignada a esta ubicación
            </TooltipContent>
          </Tooltip>

          {/* Botones de acción - Solo si permEdit */}
          {canEdit && (
            <div className="flex gap-1 sm:gap-2 flex-shrink-0">

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onEdit}
                  >
                    <Pencil size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Editar ubicación
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                    onClick={onDelete}
                  >
                    <Trash2 size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Eliminar ubicación
                </TooltipContent>
              </Tooltip>

            </div>
          )}
        </div>
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

  // Calcular totales
  const totalAsignado = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row.stock || 0), 0);
  }, [rows]);

  const sortableIds = useMemo(() => rows.map(x => String(x.id)), [rows]);

  if (!product) return null;

  return (
    <TooltipProvider>
      <>
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-2xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col">

            {/* HEADER */}
            <DialogHeader className="pb-3 sm:pb-4 border-b flex-shrink-0" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                  <Package size={20} style={{ color: BRAND_PRIMARY }} />
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base sm:text-xl" style={{ color: BRAND_PRIMARY }}>
                    Distribución de Stock
                  </DialogTitle>
                  <DialogDescription style={{ color: BRAND_SECONDARY }} className="text-xs sm:text-sm">
                    Número de parte: <strong>{product.numero_parte}</strong>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* INFO ESTADÍSTICAS */}
            <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 px-3 sm:px-6 pt-3 sm:pt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2 sm:p-3 rounded-lg text-center cursor-help" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                    <p className="text-xs" style={{ color: BRAND_SECONDARY }}>Total Producto</p>
                    <p className="text-base sm:text-lg font-bold" style={{ color: BRAND_PRIMARY }}>
                      {product.stock_total || 0}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Stock total del producto
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2 sm:p-3 rounded-lg text-center cursor-help" style={{ backgroundColor: '#10b98110' }}>
                    <p className="text-xs" style={{ color: '#059669' }}>Asignado</p>
                    <p className="text-base sm:text-lg font-bold" style={{ color: '#059669' }}>
                      {totalAsignado}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Total asignado a ubicaciones
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-2 sm:p-3 rounded-lg text-center cursor-help col-span-2 sm:col-span-1" style={{ backgroundColor: '#fef3c710' }}>
                    <p className="text-xs" style={{ color: '#92400e' }}>Disponible</p>
                    <p className="text-base sm:text-lg font-bold" style={{ color: '#b45309' }}>
                      {(product.stock_total || 0) - totalAsignado}
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Stock sin asignar
                </TooltipContent>
              </Tooltip>
            </div>

            {/* BOTÓN NUEVO */}
            {permEdit && (
              <div className="flex-shrink-0 px-3 sm:px-6 pt-3 sm:pt-4">
                <Button
                  className="w-full text-white gap-2 text-xs sm:text-sm h-8 sm:h-9"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                  onClick={() => {
                    setEditingRow(null);
                    setLocationOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Nueva ubicación</span>
                </Button>
              </div>
            )}

            {/* LISTA DND */}
            <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-2 sm:space-y-3 min-h-0">

              {loading ? (
                <div className="flex items-center justify-center py-8 text-sm" style={{ color: BRAND_SECONDARY }}>
                  <p>Cargando ubicaciones...</p>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Package size={32} className="mb-2 opacity-30" style={{ color: BRAND_SECONDARY }} />
                  <p className="text-sm" style={{ color: BRAND_SECONDARY }}>
                    Sin ubicaciones asignadas
                  </p>
                  <p className="text-xs mt-1" style={{ color: BRAND_SECONDARY }}>
                    Agrega una nueva ubicación para distribuir stock
                  </p>
                </div>
              ) : (
                <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>

                    {rows.map((item) => (
                      <SortItem
                        key={item.id}
                        item={item}
                        canEdit={permEdit}
                        onEdit={() => {
                          setEditingRow(item);
                          setLocationOpen(true);
                        }}
                        onDelete={() => {
                          setDeleteTarget(item);
                          setDeleteOpen(true);
                        }}
                      />
                    ))}

                  </SortableContext>
                </DndContext>
              )}

            </div>

            {/* FOOTER */}
            <DialogFooter className="border-t flex-shrink-0 pt-3 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-4 flex flex-col-reverse sm:flex-row gap-2 justify-end" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
              >
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
          fromLabel={labelUbicacion(transferFrom || {})}
          to={transferTo}
          toLabel={labelUbicacion(transferTo || {})}
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
            <div className="space-y-2">
              <p>¿Eliminar esta ubicación de stock?</p>
              <p className="text-xs font-medium" style={{ color: BRAND_PRIMARY }}>
                {labelUbicacion(deleteTarget || {})}
              </p>
              <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                Stock actual: <strong>{deleteTarget?.stock || 0}</strong> unidades
              </p>
            </div>
          }
          onConfirm={async () => {

            try {

              await fetch(`/api/stock_parcial/${deleteTarget.id}`, {
                method: "DELETE"
              });

              toast.success("Ubicación eliminada");
              setDeleteOpen(false);

              await load();
              await onChanged?.();

            } catch {
              toast.error("Error eliminando ubicación");
            }
          }}
        />
      </>
    </TooltipProvider>
  );
}