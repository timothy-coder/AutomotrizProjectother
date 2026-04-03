"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { AlertCircle, ArrowRight, Package, Loader2 } from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function TransferDialog({
  open,
  onOpenChange,
  from,
  fromLabel,
  to,
  toLabel,
  permEdit,
  onDone
}) {
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

  const maxTransferable = Number(from?.stock || 0);
  const canTransfer = Number(qty || 0) > 0 && Number(qty || 0) <= maxTransferable;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col">

          {/* HEADER */}
          <DialogHeader className="pb-3 sm:pb-4 border-b flex-shrink-0" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                <ArrowRight size={20} style={{ color: BRAND_PRIMARY }} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-xl" style={{ color: BRAND_PRIMARY }}>
                  Transferir Stock
                </DialogTitle>
                <DialogDescription style={{ color: BRAND_SECONDARY }} className="text-xs sm:text-sm">
                  Mueve stock de una ubicación a otra
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* CONTENT - SCROLLABLE */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4 pr-2">

            {/* Cantidad */}
            <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all flex-shrink-0" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>
                  1
                </span>
                <span>Cantidad</span>
              </h3>

              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  <Package size={14} />
                  Unidades a transferir
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle size={14} className="cursor-help opacity-60 flex-shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Máximo: {maxTransferable} unidades
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  type="number"
                  min="1"
                  max={maxTransferable}
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="1"
                  disabled={loading}
                  className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300 focus:ring-2"
                />
                <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                  Máximo disponible: <strong>{maxTransferable}</strong> unidades
                </p>
              </div>

              {/* Validación visual */}
              {Number(qty || 0) > maxTransferable && (
                <div className="p-2 sm:p-3 rounded-lg border-2 flex gap-2 text-xs flex-shrink-0" style={{ backgroundColor: '#fee2e210', borderColor: '#fee2e240', color: '#991b1b' }}>
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <p>La cantidad excede el stock disponible</p>
                </div>
              )}

              {canTransfer && (
                <div className="p-2 sm:p-3 rounded-lg border-2 flex gap-2 text-xs flex-shrink-0" style={{ backgroundColor: '#dcfce710', borderColor: '#dcfce740', color: '#166534' }}>
                  <span className="flex-shrink-0">✓</span>
                  <p>Transferencia válida: <strong>{qty}</strong> de {maxTransferable}</p>
                </div>
              )}
            </div>

            {/* Resumen */}
            <div className="p-3 sm:p-4 rounded-lg border-2 flex-shrink-0" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <p className="text-xs font-medium mb-2" style={{ color: BRAND_SECONDARY }}>Resumen de la operación:</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between items-center gap-2">
                  <span style={{ color: BRAND_SECONDARY }}>Desde:</span>
                  <span className="font-semibold truncate text-right" style={{ color: '#dc2626' }}>
                    {fromLabel || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span style={{ color: BRAND_SECONDARY }}>Stock:</span>
                  <span className="font-bold" style={{ color: BRAND_PRIMARY }}>{from?.stock || 0}</span>
                </div>

                <div className="border-t border-gray-300 my-2"></div>

                <div className="flex justify-between items-center gap-2">
                  <span style={{ color: BRAND_SECONDARY }}>Transferir:</span>
                  <span className="font-bold text-sm" style={{ color: BRAND_PRIMARY }}>{qty} unidades</span>
                </div>

                <div className="border-t border-gray-300 my-2"></div>

                <div className="flex justify-between items-center gap-2">
                  <span style={{ color: BRAND_SECONDARY }}>Hacia:</span>
                  <span className="font-semibold truncate text-right" style={{ color: '#059669' }}>
                    {toLabel || "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span style={{ color: BRAND_SECONDARY }}>Stock:</span>
                  <span className="font-bold" style={{ color: BRAND_PRIMARY }}>{to?.stock || 0}</span>
                </div>

                <div className="border-t border-gray-300 mt-2 pt-2 flex justify-between items-center gap-2 font-bold">
                  <span style={{ color: BRAND_SECONDARY }}>Resultado:</span>
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                    <span style={{ color: '#dc2626' }}>
                      {(Number(from?.stock || 0) - Number(qty || 0))}
                    </span>
                    <ArrowRight size={14} style={{ color: BRAND_PRIMARY }} />
                    <span style={{ color: '#059669' }}>
                      {(Number(to?.stock || 0) + Number(qty || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* FOOTER */}
          <DialogFooter className="border-t flex-shrink-0 pt-3 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-4 flex flex-col-reverse sm:flex-row gap-2 justify-end" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
            >
              Cancelar
            </Button>

            <Button
              onClick={transfer}
              disabled={loading || !permEdit || !canTransfer}
              className="h-8 sm:h-9 text-xs sm:text-sm text-white w-full sm:w-auto gap-1 sm:gap-2"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              {loading && <Loader2 size={14} className="animate-spin flex-shrink-0" />}
              <span>{loading ? "Transfiriendo..." : "Transferir"}</span>
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}