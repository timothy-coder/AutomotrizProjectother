"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function AgregarAccesoriosDialog({
  open,
  onOpenChange,
  cotizacion,
  marcaId,
  modeloId,
}) {
  const [accesorios, setAccesorios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAccesorios, setSelectedAccesorios] = useState([]);

  // ✅ Cargar accesorios según marca y modelo
  useEffect(() => {
    if (!open || !marcaId || !modeloId) {
      setAccesorios([]);
      return;
    }

    loadAccesorios();
  }, [open, marcaId, modeloId]);

  async function loadAccesorios() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/accesorios-disponibles?marca_id=${marcaId}&modelo_id=${modeloId}`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error("Error cargando accesorios");

      const data = await res.json();
      setAccesorios(Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando accesorios");
      setAccesorios([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAgregarAccesorios() {
    if (selectedAccesorios.length === 0) {
      toast.warning("Selecciona al menos un accesorio");
      return;
    }

    setSaving(true);
    try {
      // ✅ Agregar cada accesorio a la cotización
      const promises = selectedAccesorios.map((accesorio) =>
        fetch(`/api/cotizaciones-accesorios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cotizacion_id: cotizacion.id,
            accesorio_id: accesorio.id,
            cantidad: accesorio.cantidad || 1,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const allOk = responses.every((r) => r.ok);

      if (!allOk) {
        throw new Error("Error agregando algunos accesorios");
      }

      toast.success(
        `${selectedAccesorios.length} accesorio(s) agregado(s) a la cotización`
      );
      setSelectedAccesorios([]);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error agregando accesorios");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Accesorios a Cotización</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <p className="text-gray-500">Cargando accesorios...</p>
          </div>
        ) : accesorios.length === 0 ? (
          <div className="flex justify-center items-center py-8">
            <p className="text-gray-500">
              No hay accesorios disponibles para esta marca y modelo
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <p>
                  <strong>Marca:</strong> {accesorios[0]?.marca_nombre || "N/A"}
                </p>
                <p>
                  <strong>Modelo:</strong> {accesorios[0]?.modelo_nombre || "N/A"}
                </p>
              </div>

              <div className="border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left p-3">
                        <input
                          type="checkbox"
                          checked={
                            selectedAccesorios.length === accesorios.length &&
                            accesorios.length > 0
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAccesorios(
                                accesorios.map((acc) => ({
                                  ...acc,
                                  cantidad: 1,
                                }))
                              );
                            } else {
                              setSelectedAccesorios([]);
                            }
                          }}
                        />
                      </th>
                      <th className="text-left p-3">Detalle</th>
                      <th className="text-left p-3">N° Parte</th>
                      <th className="text-right p-3">Precio</th>
                      <th className="text-right p-3">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accesorios.map((accesorio) => {
                      const isSelected = selectedAccesorios.some(
                        (a) => a.id === accesorio.id
                      );
                      const selectedItem = selectedAccesorios.find(
                        (a) => a.id === accesorio.id
                      );

                      return (
                        <tr
                          key={accesorio.id}
                          className="border-b hover:bg-gray-50 transition-colors"
                        >
                          <td className="p-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedAccesorios([
                                    ...selectedAccesorios,
                                    { ...accesorio, cantidad: 1 },
                                  ]);
                                } else {
                                  setSelectedAccesorios(
                                    selectedAccesorios.filter(
                                      (a) => a.id !== accesorio.id
                                    )
                                  );
                                }
                              }}
                            />
                          </td>
                          <td className="p-3">{accesorio.detalle}</td>
                          <td className="p-3 text-gray-600">
                            {accesorio.numero_parte}
                          </td>
                          <td className="p-3 text-right font-medium">
                            {accesorio.precio}
                          </td>
                          <td className="p-3">
                            {isSelected && (
                              <Input
                                type="number"
                                min="1"
                                value={selectedItem.cantidad}
                                onChange={(e) => {
                                  const newQuantity = parseInt(e.target.value) || 1;
                                  setSelectedAccesorios(
                                    selectedAccesorios.map((a) =>
                                      a.id === accesorio.id
                                        ? { ...a, cantidad: newQuantity }
                                        : a
                                    )
                                  );
                                }}
                                className="w-16 text-right"
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedAccesorios.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <p className="font-semibold text-blue-900">
                    {selectedAccesorios.length} accesorio(s) seleccionado(s)
                  </p>
                  <div className="mt-2 space-y-1">
                    {selectedAccesorios.map((acc) => (
                      <p key={acc.id} className="text-blue-700">
                        • {acc.detalle} x{acc.cantidad}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAgregarAccesorios}
                disabled={saving || selectedAccesorios.length === 0}
                className="gap-2"
              >
                <Plus size={14} />
                {saving ? "Agregando..." : "Agregar Accesorios"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}