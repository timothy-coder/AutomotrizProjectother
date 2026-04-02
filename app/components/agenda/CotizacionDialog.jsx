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

  const [formData, setFormData] = useState({
    sku: "",
    color_externo: "",
    color_interno: "",
    version_id: "",
    anio: "",
  });

  useEffect(() => {
    if (editingCotizacion) {
      setSelectedMarca(editingCotizacion.marca_id.toString());
      setSelectedModelo(editingCotizacion.modelo_id.toString());
      setFormData({
        sku: editingCotizacion.sku || "",
        color_externo: editingCotizacion.color_externo || "",
        color_interno: editingCotizacion.color_interno || "",
        version_id: editingCotizacion.version_id || "",
        anio: editingCotizacion.anio || "",
      });
    } else if (precargadaMarcaId || precargadaModeloId) {
      // Si hay datos precargados (desde vehículo de interés)
      if (precargadaMarcaId) {
        setSelectedMarca(precargadaMarcaId.toString());
      }
      if (precargadaModeloId) {
        setSelectedModelo(precargadaModeloId.toString());
      }
      setFormData({
        sku: "",
        color_externo: "",
        color_interno: "",
        version_id: "",
        anio: new Date().getFullYear().toString(),
      });
    } else {
      setSelectedMarca("");
      setSelectedModelo("");
      setFormData({
        sku: "",
        color_externo: "",
        color_interno: "",
        version_id: "",
        anio: "",
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

      const body = editingCotizacion
        ? {
            sku: formData.sku || null,
            color_externo: formData.color_externo || null,
            color_interno: formData.color_interno || null,
            version_id: formData.version_id || null,
            anio: formData.anio ? parseInt(formData.anio) : null,
            marca_id: parseInt(selectedMarca),
            modelo_id: parseInt(selectedModelo),
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