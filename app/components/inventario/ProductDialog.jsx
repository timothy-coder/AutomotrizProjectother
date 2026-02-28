"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ProductDialog({
  open,
  onOpenChange,
  mode,
  product,
  onSave,
  onRefresh
}) {

  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    numero_parte: "",
    descripcion: "",
    fecha_ingreso: "",
    precio_compra: "",
    precio_venta: "",
  });

  const [stockTotal, setStockTotal] = useState("");

  useEffect(() => {

    if (!open) return;

    if (product) {
      setForm({
        numero_parte: product.numero_parte ?? "",
        descripcion: product.descripcion ?? "",
        fecha_ingreso: product.fecha_ingreso?.slice?.(0, 10) ?? "",
        precio_compra: product.precio_compra ?? "",
        precio_venta: product.precio_venta ?? "",
      });
      setStockTotal(String(product.stock_total ?? ""));
    } else {
      setForm({
        numero_parte: "",
        descripcion: "",
        fecha_ingreso: "",
        precio_compra: "",
        precio_venta: "",
      });
      setStockTotal("");
    }

  }, [open, product]);

  function updateField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleUpdateStock() {

    if (!product?.id) return;

    const qty = Number(stockTotal);

    if (!Number.isFinite(qty) || qty < 0) {
      return toast.warning("Cantidad inválida");
    }

    try {

      const r = await fetch(`/api/productos/${product.id}/add-stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_total: qty })
      });

      const data = await r.json();

      if (!r.ok) {
        return toast.error(data.message || "Error");
      }

      toast.success("Stock actualizado");

      onRefresh?.();

    } catch {
      toast.error("Error conexión");
    }
  }

  function handleSave() {

    if (isView) return;

    onSave?.({
      numero_parte: form.numero_parte?.trim(),
      descripcion: form.descripcion?.trim(),
      fecha_ingreso: form.fecha_ingreso || null,
      precio_compra: form.precio_compra === "" ? null : Number(form.precio_compra),
      precio_venta: form.precio_venta === "" ? null : Number(form.precio_venta),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">

        <DialogHeader>
          <DialogTitle>
            {isView ? "Ver producto" : isEdit ? "Editar producto" : "Nuevo producto"}
          </DialogTitle>

          <DialogDescription>
            {isView ? "Solo lectura." : "Completa la información y guarda."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto pr-2">

          <div className="space-y-1">
            <Label>Número de parte</Label>
            <Input
              disabled={isView}
              value={form.numero_parte}
              onChange={(e) => updateField("numero_parte", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Fecha ingreso</Label>
            <Input
              disabled={isView}
              type="date"
              value={form.fecha_ingreso}
              onChange={(e) => updateField("fecha_ingreso", e.target.value)}
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <Label>Descripción</Label>
            <Input
              disabled={isView}
              value={form.descripcion}
              onChange={(e) => updateField("descripcion", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Precio compra</Label>
            <Input
              disabled={isView}
              type="number"
              step="0.01"
              value={form.precio_compra ?? ""}
              onChange={(e) => updateField("precio_compra", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label>Precio venta</Label>
            <Input
              disabled={isView}
              type="number"
              step="0.01"
              value={form.precio_venta ?? ""}
              onChange={(e) => updateField("precio_venta", e.target.value)}
            />
          </div>

          {/* STOCK INFO */}
          {product && (
            <div className="md:col-span-2 rounded-md border p-3 bg-muted/40">

              <p className="text-sm">
                Total: <b>{product.stock_total ?? 0}</b> ·
                Usado: <b>{product.stock_usado ?? 0}</b> ·
                Disponible: <b>{product.stock_disponible ?? 0}</b>
              </p>

              {isEdit && (
                <div className="mt-3 flex gap-2 items-end">

                  <div className="flex-1">
                    <Label>Stock total</Label>
                    <Input
                      type="number"
                      value={stockTotal}
                      onChange={(e) => setStockTotal(e.target.value)}
                      placeholder="Cantidad total"
                    />
                  </div>

                  <Button onClick={handleUpdateStock}>
                    Actualizar
                  </Button>

                </div>
              )}

            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isView ? "Cerrar" : "Cancelar"}
          </Button>

          {!isView && (
            <Button onClick={handleSave}>
              Guardar
            </Button>
          )}

        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
