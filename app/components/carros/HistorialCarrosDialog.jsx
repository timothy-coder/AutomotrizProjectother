"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

export default function HistorialCarrosDialog({
  marcaId,
  modeloId,
  marcaNombre,
  modeloNombre,
  onSuccess,
  trigger,
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [versiones, setVersiones] = useState([]);
  const [versionesLoading, setVersionesLoading] = useState(false);
  const [formData, setFormData] = useState({
    vin: "",
    version_id: "",
    preciocompra: "",
  });

  useEffect(() => {
    if (open) {
      loadVersiones();
    }
  }, [open]);

  async function loadVersiones() {
    try {
      setVersionesLoading(true);
      const res = await fetch("/api/versiones?limit=1000", {
        cache: "no-store",
      });
      const data = await res.json();

      let versionesData = [];
      if (data.data && Array.isArray(data.data)) {
        versionesData = data.data;
      } else if (Array.isArray(data)) {
        versionesData = data;
      }

      setVersiones(versionesData.sort((a, b) => a.id - b.id));
    } catch (error) {
      console.error(error);
      toast.error("Error cargando versiones");
    } finally {
      setVersionesLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      vin: "",
      version_id: "",
      preciocompra: "",
    });
  }

  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function handleVersionChange(value) {
    setFormData((prev) => ({
      ...prev,
      version_id: value,
    }));
  }

  async function handleSubmit() {
    // Validar VIN
    if (!formData.vin) {
      toast.error("VIN es requerido");
      return;
    }

    // Validar versión
    if (!formData.version_id) {
      toast.error("Selecciona una versión");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/historial-carros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: formData.vin.toUpperCase(),
          marca_id: marcaId,
          modelo_id: modeloId,
          version_id: parseInt(formData.version_id),
          preciocompra: formData.preciocompra
            ? parseFloat(formData.preciocompra)
            : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message);
        return;
      }

      toast.success("✓ Carro agregado exitosamente");
      resetForm();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error("Error al agregar carro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div onClick={() => setOpen(true)}>{trigger}</div>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Carro</DialogTitle>
          <div className="text-sm text-gray-600 space-y-1 mt-2">
            <p>
              <strong>Marca:</strong> {marcaNombre}
            </p>
            <p>
              <strong>Modelo:</strong> {modeloNombre}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* VIN */}
          <div className="space-y-2">
            <Label htmlFor="vin" className="text-sm font-semibold">
              VIN <span className="text-red-500">*</span>
            </Label>
            <Input
              id="vin"
              name="vin"
              value={formData.vin}
              onChange={handleInputChange}
              placeholder="Ej: WBADT43452G917604"
              maxLength={17}
              className="uppercase"
            />
          </div>

          {/* Versión */}
          <div className="space-y-2">
            <Label htmlFor="version_id" className="text-sm font-semibold">
              Versión <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.version_id}
              onValueChange={handleVersionChange}
              disabled={versionesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una versión" />
              </SelectTrigger>
              <SelectContent>
                {versiones.map((version) => (
                  <SelectItem key={version.id} value={version.id.toString()}>
                    {version.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {versionesLoading && (
              <p className="text-xs text-gray-500">Cargando versiones...</p>
            )}
          </div>

          {/* Precio de Compra */}
          <div className="space-y-2">
            <Label htmlFor="preciocompra" className="text-sm font-semibold">
              Precio de Compra
            </Label>
            <Input
              id="preciocompra"
              name="preciocompra"
              type="number"
              step="0.01"
              value={formData.preciocompra}
              onChange={handleInputChange}
              placeholder="Ej: 25000.00"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || versionesLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? <Loader2 className="animate-spin mr-2" /> : null}
            Agregar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}