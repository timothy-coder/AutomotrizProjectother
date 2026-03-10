"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

function getLabel(item) {
  return (
    item?.fullname ||
    item?.full_name ||
    item?.name ||
    item?.nombre ||
    item?.razon_social ||
    item?.description ||
    `ID ${item?.id}`
  );
}

const EMPTY_FORM = {
  cliente_id: "",
  marca_id: "",
  modelo_id: "",
  origen_id: "",
  suborigen_id: "",
  detalle: "",
  etapasconversion_id: "",
  creado_por: "",
  asignado_a: "",
};

export default function OportunidadDialog({ open, onOpenChange, onSuccess }) {
  const [form, setForm] = useState(EMPTY_FORM);

  const [clientes, setClientes] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [origenes, setOrigenes] = useState([]);
  const [suborigenes, setSuborigenes] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingSuborigenes, setLoadingSuborigenes] = useState(false);

  useEffect(() => {
    if (!open) return;

    setForm(EMPTY_FORM);

    async function loadInitialData() {
      try {
        const [
          clientesRes,
          marcasRes,
          origenesRes,
          etapasRes,
          usuariosRes,
        ] = await Promise.all([
          fetch("/api/clientes", { cache: "no-store" }),
          fetch("/api/marcas", { cache: "no-store" }),
          fetch("/api/origenes_citas", { cache: "no-store" }),
          fetch("/api/etapasconversion", { cache: "no-store" }),
          fetch("/api/usuarios", { cache: "no-store" }),
        ]);

        const [
          clientesData,
          marcasData,
          origenesData,
          etapasData,
          usuariosData,
        ] = await Promise.all([
          clientesRes.json(),
          marcasRes.json(),
          origenesRes.json(),
          etapasRes.json(),
          usuariosRes.json(),
        ]);

        setClientes(Array.isArray(clientesData) ? clientesData : []);
        setMarcas(Array.isArray(marcasData) ? marcasData : []);
        setOrigenes(Array.isArray(origenesData) ? origenesData : []);
        setEtapas(Array.isArray(etapasData) ? etapasData : []);
        setUsuarios(Array.isArray(usuariosData) ? usuariosData : []);
      } catch (error) {
        console.error(error);
        toast.error("No se pudieron cargar los datos del formulario");
      }
    }

    loadInitialData();
  }, [open]);

  useEffect(() => {
    if (!form.marca_id) {
      setModelos([]);
      setForm((prev) => ({ ...prev, modelo_id: "" }));
      return;
    }

    async function loadModelos() {
      try {
        setLoadingModelos(true);
        const res = await fetch(`/api/modelos?marca_id=${form.marca_id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        setModelos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        toast.error("No se pudieron cargar los modelos");
      } finally {
        setLoadingModelos(false);
      }
    }

    loadModelos();
  }, [form.marca_id]);

  useEffect(() => {
    if (!form.origen_id) {
      setSuborigenes([]);
      setForm((prev) => ({ ...prev, suborigen_id: "" }));
      return;
    }

    async function loadSuborigenes() {
      try {
        setLoadingSuborigenes(true);
        const res = await fetch(
          `/api/suborigenes_citas/byorigen?origen_id=${form.origen_id}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        setSuborigenes(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        toast.error("No se pudieron cargar los suborígenes");
      } finally {
        setLoadingSuborigenes(false);
      }
    }

    loadSuborigenes();
  }, [form.origen_id]);

  const usuariosActivos = useMemo(
    () => usuarios.filter((u) => Number(u.is_active) === 1 || u.is_active === true),
    [usuarios]
  );

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (
      !form.cliente_id ||
      !form.marca_id ||
      !form.modelo_id ||
      !form.origen_id ||
      !form.etapasconversion_id ||
      !form.creado_por
    ) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        cliente_id: Number(form.cliente_id),
        marca_id: Number(form.marca_id),
        modelo_id: Number(form.modelo_id),
        origen_id: Number(form.origen_id),
        suborigen_id: form.suborigen_id ? Number(form.suborigen_id) : null,
        detalle: form.detalle || "",
        etapasconversion_id: Number(form.etapasconversion_id),
        creado_por: Number(form.creado_por),
        asignado_a: form.asignado_a ? Number(form.asignado_a) : null,
      };

      const res = await fetch("/api/oportunidades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo guardar");
      }

      toast.success("Oportunidad creada");
      onSuccess?.();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "No se pudo guardar la oportunidad");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nueva oportunidad</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Cliente *</label>
            <Select
              value={form.cliente_id}
              onValueChange={(value) => updateField("cliente_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {getLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Creado por *</label>
            <Select
              value={form.creado_por}
              onValueChange={(value) => updateField("creado_por", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {usuariosActivos.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {getLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Marca *</label>
            <Select
              value={form.marca_id}
              onValueChange={(value) => {
                updateField("marca_id", value);
                updateField("modelo_id", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar marca" />
              </SelectTrigger>
              <SelectContent>
                {marcas.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {getLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Modelo *</label>
            <Select
              value={form.modelo_id}
              onValueChange={(value) => updateField("modelo_id", value)}
              disabled={!form.marca_id || loadingModelos}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingModelos ? "Cargando..." : "Seleccionar modelo"}
                />
              </SelectTrigger>
              <SelectContent>
                {modelos.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {getLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Origen *</label>
            <Select
              value={form.origen_id}
              onValueChange={(value) => {
                updateField("origen_id", value);
                updateField("suborigen_id", "");
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar origen" />
              </SelectTrigger>
              <SelectContent>
                {origenes.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {getLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Suborigen</label>
            <Select
              value={form.suborigen_id}
              onValueChange={(value) => updateField("suborigen_id", value)}
              disabled={!form.origen_id || loadingSuborigenes}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingSuborigenes ? "Cargando..." : "Seleccionar suborigen"}
                />
              </SelectTrigger>
              <SelectContent>
                {suborigenes.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {getLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Etapa *</label>
            <Select
              value={form.etapasconversion_id}
              onValueChange={(value) => updateField("etapasconversion_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar etapa" />
              </SelectTrigger>
              <SelectContent>
                {etapas.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {getLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Asignado a</label>
            <Select
              value={form.asignado_a}
              onValueChange={(value) => updateField("asignado_a", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                {usuariosActivos.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {getLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Detalle</label>
            <textarea
              className="w-full min-h-[110px] rounded-md border px-3 py-2 text-sm"
              value={form.detalle}
              onChange={(e) => updateField("detalle", e.target.value)}
              placeholder="Detalle de la oportunidad"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}