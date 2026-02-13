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
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";

export default function StockLocationDialog({
  open,
  onOpenChange,
  product,
  row,
  onSaved
}) {

  const isEdit = !!row;

  const [centros, setCentros] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [mostradores, setMostradores] = useState([]);

  const [centroId, setCentroId] = useState("");
  const [tallerId, setTallerId] = useState("");
  const [mostradorId, setMostradorId] = useState("");
  const [stock, setStock] = useState("");

  // cargar centros
  useEffect(() => {
    if (!open) return;

    fetch("/api/centros")
      .then(r => r.json())
      .then(setCentros);
  }, [open]);

  // cargar dependientes
  useEffect(() => {
    if (!centroId) return;

    fetch(`/api/talleres?centro_id=${centroId}`)
      .then(r => r.json())
      .then(setTalleres);

    fetch(`/api/mostradores?centro_id=${centroId}`)
      .then(r => r.json())
      .then(setMostradores);

  }, [centroId]);

  // cargar data edición
  useEffect(() => {
    if (!open) return;

    if (row) {
      setCentroId(String(row.centro_id || ""));
      setTallerId(String(row.taller_id || ""));
      setMostradorId(String(row.mostrador_id || ""));
      setStock(String(row.stock || ""));
    } else {
      setCentroId("");
      setTallerId("");
      setMostradorId("");
      setStock("");
    }

  }, [row, open]);

  async function save() {

    try {

      if (!stock) return toast.warning("Stock requerido");

      if (isEdit) {

        await fetch(`/api/stock_parcial/${row.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            centro_id: centroId || null,
            taller_id: tallerId || null,
            mostrador_id: mostradorId || null,
            stock: Number(stock)
          })
        });

      } else {

        await fetch("/api/stock_parcial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producto_id: product.id,
            centro_id: centroId || null,
            taller_id: tallerId || null,
            mostrador_id: mostradorId || null,
            stock: Number(stock)
          })
        });

      }

      toast.success("Guardado");
      onSaved?.();
      onOpenChange(false);

    } catch {
      toast.error("Error guardando");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>

        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar ubicación" : "Nueva ubicación"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">

          {/* CENTRO */}
          <div>
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

          {/* TALLER */}
          <div>
            <Label>Taller</Label>
            <Select value={tallerId} onValueChange={setTallerId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione taller" />
              </SelectTrigger>
              <SelectContent>
                {talleres.map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* MOSTRADOR */}
          <div>
            <Label>Mostrador</Label>
            <Select value={mostradorId} onValueChange={setMostradorId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione mostrador" />
              </SelectTrigger>
              <SelectContent>
                {mostradores.map(m => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* STOCK */}
          <div>
            <Label>Stock</Label>
            <Input
              type="number"
              value={stock}
              onChange={e => setStock(e.target.value)}
            />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button onClick={save}>
            Guardar
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
