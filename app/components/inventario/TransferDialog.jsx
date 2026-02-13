"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TransferDialog({ open, onOpenChange, from, to, permEdit, onDone }) {
  const [qty, setQty] = useState("1");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQty("1");
  }, [open]);

  async function transfer() {
    if (!permEdit) return toast.warning("Sin permiso");
    const n = Number(qty || 0);
    if (!Number.isFinite(n) || n <= 0) return toast.warning("Cantidad inválida");
    if (!from || !to) return;

    if (n > Number(from.stock || 0)) return toast.warning("Stock insuficiente");

    try {
      setLoading(true);
      const r = await fetch("/api/stock_parcial/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origen_id: from.id,
          destino_id: to.id,
          cantidad: n,
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) return toast.error(data.message || "No se pudo transferir");

      toast.success("Transferencia realizada");
      onOpenChange(false);
      await onDone?.();

    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transferir stock</DialogTitle>
          <DialogDescription>
            Arrastraste una ubicación sobre otra. Indica cuánto deseas transferir.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-sm">
            <div><b>Origen:</b> #{from?.id} · Stock: {from?.stock}</div>
            <div><b>Destino:</b> #{to?.id}</div>
          </div>

          <div className="space-y-1">
            <Label>Cantidad</Label>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={transfer} disabled={loading || !permEdit}>
            {loading ? "Transfiriendo..." : "Transferir"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
