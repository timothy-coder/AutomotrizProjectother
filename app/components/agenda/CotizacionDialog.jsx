"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Switch,
} from "@/components/ui/switch";
import {
  Label,
} from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import CotizacionFormContent from "./CotizacionFormContent";

export default function CotizacionDialog({
  open,
  onOpenChange,
  editingCotizacion,
  oportunidadId,
  marcas,
  modelos,
  versiones,
  userId,
  onSave,
  onCotizacionCreated,
  precargadaMarcaId,
  precargadaModeloId,
}) {
  const [saving, setSaving] = useState(false);
  const [selectedMarca, setSelectedMarca] = useState("");
  const [selectedModelo, setSelectedModelo] = useState("");
  const [descuentoEnMonto, setDescuentoEnMonto] = useState(false); // ✅ Switch: false = porcentaje, true = monto

  const [formData, setFormData] = useState({
    sku: "",
    color_externo: "",
    color_interno: "",
    version_id: "",
    anio: "",
    descuento_vehículo_porcentaje: "",
    descuento_vehículo: "",
  });

  useEffect(() => {
    if (editingCotizacion) {
      setSelectedMarca(editingCotizacion.marca_id.toString());
      setSelectedModelo(editingCotizacion.modelo_id.toString());
      
      // ✅ Determinar si había monto o porcentaje
      const tieneDescuentoEnMonto = editingCotizacion.descuento_vehículo > 0;
      setDescuentoEnMonto(tieneDescuentoEnMonto);

      setFormData({
        sku: editingCotizacion.sku || "",
        color_externo: editingCotizacion.color_externo || "",
        color_interno: editingCotizacion.color_interno || "",
        version_id: editingCotizacion.version_id || "",
        anio: editingCotizacion.anio || "",
        descuento_vehículo_porcentaje: editingCotizacion.descuento_vehículo_porcentaje || "",
        descuento_vehículo: editingCotizacion.descuento_vehículo || "",
      });
    } else if (precargadaMarcaId || precargadaModeloId) {
      // Si hay datos precargados (desde vehículo de interés)
      if (precargadaMarcaId) {
        setSelectedMarca(precargadaMarcaId.toString());
      }
      if (precargadaModeloId) {
        setSelectedModelo(precargadaModeloId.toString());
      }
      setDescuentoEnMonto(false);
      setFormData({
        sku: "",
        color_externo: "",
        color_interno: "",
        version_id: "",
        anio: new Date().getFullYear().toString(),
        descuento_vehículo_porcentaje: "",
        descuento_vehículo: "",
      });
    } else {
      setSelectedMarca("");
      setSelectedModelo("");
      setDescuentoEnMonto(false);
      setFormData({
        sku: "",
        color_externo: "",
        color_interno: "",
        version_id: "",
        anio: "",
        descuento_vehículo_porcentaje: "",
        descuento_vehículo: "",
      });
    }
  }, [editingCotizacion, open, precargadaMarcaId, precargadaModeloId]);

  async function saveCotizacion() {
    if (!selectedMarca || !selectedModelo) {
      return toast.warning("Selecciona marca y modelo");
    }

    if (!userId) {
      return toast.error("No se pudo obtener el ID del usuario");
    }

    setSaving(true);

    try {
      const url = editingCotizacion
        ? `/api/cotizacionesagenda/${editingCotizacion.id}`
        : "/api/cotizacionesagenda";

      const method = editingCotizacion ? "PUT" : "POST";

      // ✅ CAMBIO: Preparar descuentos según el switch
      const body = editingCotizacion
        ? {
            sku: formData.sku || null,
            color_externo: formData.color_externo || null,
            color_interno: formData.color_interno || null,
            version_id: formData.version_id || null,
            anio: formData.anio ? parseInt(formData.anio) : null,
            marca_id: parseInt(selectedMarca),
            modelo_id: parseInt(selectedModelo),
            // ✅ Si es monto, guardar en descuento_vehículo. Si es porcentaje, guardar en descuento_vehículo_porcentaje
            descuento_vehículo: descuentoEnMonto ? parseFloat(formData.descuento_vehículo) || 0 : 0,
            descuento_vehículo_porcentaje: !descuentoEnMonto ? parseFloat(formData.descuento_vehículo_porcentaje) || 0 : 0,
            estado: "borrador",
          }
        : {
            oportunidad_id: parseInt(oportunidadId),
            marca_id: parseInt(selectedMarca),
            modelo_id: parseInt(selectedModelo),
            version_id: formData.version_id || null,
            anio: formData.anio ? parseInt(formData.anio) : null,
            sku: formData.sku || null,
            color_externo: formData.color_externo || null,
            color_interno: formData.color_interno || null,
            // ✅ Si es monto, guardar en descuento_vehículo. Si es porcentaje, guardar en descuento_vehículo_porcentaje
            descuento_vehículo: descuentoEnMonto ? parseFloat(formData.descuento_vehículo) || 0 : 0,
            descuento_vehículo_porcentaje: !descuentoEnMonto ? parseFloat(formData.descuento_vehículo_porcentaje) || 0 : 0,
            estado: "borrador",
            created_by: userId,
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingCotizacion ? "Actualizada" : "Creada");
        onOpenChange(false);

        if (!editingCotizacion && onCotizacionCreated) {
          await onCotizacionCreated();
        }

        onSave();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Error guardando cotización");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error guardando cotización: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editingCotizacion ? "Editar cotización" : "Nueva cotización"}
          </DialogTitle>
        </DialogHeader>

        <CotizacionFormContent
          selectedMarca={selectedMarca}
          setSelectedMarca={setSelectedMarca}
          selectedModelo={selectedModelo}
          setSelectedModelo={setSelectedModelo}
          formData={formData}
          setFormData={setFormData}
          marcas={marcas}
          modelos={modelos}
          versiones={versiones}
          editingCotizacion={editingCotizacion}
        />

        {/* ✅ NUEVA SECCIÓN: Descuento del vehículo */}
        <div className="border-t pt-6 mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Descuento del vehículo</Label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-600">
                  {!descuentoEnMonto ? "%" : "$"}
                </span>
                <Switch
                  checked={descuentoEnMonto}
                  onCheckedChange={setDescuentoEnMonto}
                />
                <span className="text-xs text-slate-600 w-16">
                  {descuentoEnMonto ? "Monto ($)" : "Porcentaje (%)"}
                </span>
              </div>
            </div>

            {/* ✅ Campo de Porcentaje (Desactivado = Por defecto) */}
            {!descuentoEnMonto && (
              <div>
                <Label htmlFor="descuento-porcentaje" className="text-xs text-slate-600">
                  Descuento en porcentaje (%)
                </Label>
                <Input
                  id="descuento-porcentaje"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.descuento_vehículo_porcentaje}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descuento_vehículo_porcentaje: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
            )}

            {/* ✅ Campo de Monto (Activado) */}
            {descuentoEnMonto && (
              <div>
                <Label htmlFor="descuento-monto" className="text-xs text-slate-600">
                  Descuento en monto ($)
                </Label>
                <Input
                  id="descuento-monto"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.descuento_vehículo}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      descuento_vehículo: e.target.value,
                    }))
                  }
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-6 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            onClick={saveCotizacion}
            disabled={saving || !selectedMarca || !selectedModelo || !userId}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : editingCotizacion ? (
              "Actualizar"
            ) : (
              "Crear"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}