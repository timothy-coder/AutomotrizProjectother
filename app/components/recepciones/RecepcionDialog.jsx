"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Camera,
  Video,
  Mic,
  Trash2,
  ClipboardPlus,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useUserScope } from "@/hooks/useUserScope";

function normalizeId(value) {
  if (value == null || value === "") return "";
  return String(value);
}

export default function RecepcionDialog({
  open,
  onOpenChange,
  mode = "create",
  cita = null,
  recepcion = null,
  onSaved,
}) {
  const { user } = useAuth();
  const {
    centros: allowedCentros,
    talleres: allowedTalleres,
    loading: scopeLoading,
  } = useUserScope();

  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [centros, setCentros] = useState([]);
  const [talleres, setTalleres] = useState([]);

  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    cliente_id: "",
    carro_id: "",
    centro_id: "",
    taller_id: "",
    notas_cliente: "",
    notas_generales: "",
  });

  const [media, setMedia] = useState({
    fotos: [],
    videos: [],
    audios: [],
  });

  const fotoInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const audioInputRef = useRef(null);

  function setField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addFiles(type, fileList) {
    if (!fileList?.length) return;

    const nuevos = Array.from(fileList);

    setMedia((prev) => ({
      ...prev,
      [type]: [...prev[type], ...nuevos],
    }));
  }

  function removeFile(type, index) {
    setMedia((prev) => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index),
    }));
  }

  const vehiculosVisibles = useMemo(() => {
    if (!form.cliente_id) return vehiculos;
    return vehiculos.filter(
      (v) => Number(v.cliente_id) === Number(form.cliente_id)
    );
  }, [vehiculos, form.cliente_id]);

  useEffect(() => {
    if (!open || scopeLoading) return;

    let active = true;

    async function loadCatalogos() {
      try {
        setLoadingCatalogos(true);

        const [clientesRes, vehiculosRes, centrosRes] = await Promise.all([
          fetch("/api/clientes", { cache: "no-store" }),
          fetch("/api/vehiculos", { cache: "no-store" }),
          fetch("/api/centros", { cache: "no-store" }),
        ]);

        const [clientesData, vehiculosData, centrosData] = await Promise.all([
          clientesRes.json(),
          vehiculosRes.json(),
          centrosRes.json(),
        ]);

        if (!active) return;

        const listaClientes = Array.isArray(clientesData) ? clientesData : [];
        const listaVehiculos = Array.isArray(vehiculosData) ? vehiculosData : [];
        const listaCentros = Array.isArray(centrosData) ? centrosData : [];

        const centrosPermitidos = listaCentros.filter((c) =>
          allowedCentros.includes(Number(c.id))
        );

        setClientes(listaClientes);
        setVehiculos(listaVehiculos);
        setCentros(centrosPermitidos);
      } catch (error) {
        console.error(error);
        if (!active) return;
        toast.error("Error cargando catálogos");
        setClientes([]);
        setVehiculos([]);
        setCentros([]);
      } finally {
        if (active) setLoadingCatalogos(false);
      }
    }

    loadCatalogos();

    return () => {
      active = false;
    };
  }, [open, scopeLoading, allowedCentros]);

  useEffect(() => {
    if (!open || !form.centro_id) {
      setTalleres([]);
      return;
    }

    let active = true;

    async function loadTalleres() {
      try {
        const res = await fetch(
          `/api/talleres/bycentro?centro_id=${form.centro_id}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        if (!active) return;

        const lista = Array.isArray(data) ? data : [];
        const filtrados = lista.filter((t) =>
          allowedTalleres.includes(Number(t.id))
        );

        setTalleres(filtrados);

        if (
          form.taller_id &&
          !filtrados.some((t) => Number(t.id) === Number(form.taller_id))
        ) {
          setForm((prev) => ({ ...prev, taller_id: "" }));
        }
      } catch (error) {
        console.error(error);
        if (!active) return;
        setTalleres([]);
      }
    }

    loadTalleres();

    return () => {
      active = false;
    };
  }, [open, form.centro_id, allowedTalleres]);

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && recepcion) {
      setForm({
        cliente_id: normalizeId(recepcion.cliente_id),
        carro_id: normalizeId(recepcion.carro_id),
        centro_id: normalizeId(recepcion.centro_id),
        taller_id: normalizeId(recepcion.taller_id),
        notas_cliente: recepcion.notas_cliente || "",
        notas_generales: recepcion.notas_generales || "",
      });
    } else if (cita) {
      setForm({
        cliente_id: normalizeId(cita.cliente_id),
        carro_id: normalizeId(cita.carro_id || cita.vehiculo_id),
        centro_id: normalizeId(cita.centro_id),
        taller_id: normalizeId(cita.taller_id),
        notas_cliente: cita.nota_cliente || "",
        notas_generales: "",
      });
    } else {
      setForm({
        cliente_id: "",
        carro_id: "",
        centro_id: "",
        taller_id: "",
        notas_cliente: "",
        notas_generales: "",
      });
    }

    setMedia({
      fotos: [],
      videos: [],
      audios: [],
    });

    if (fotoInputRef.current) fotoInputRef.current.value = "";
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (audioInputRef.current) audioInputRef.current.value = "";
  }, [open, mode, cita, recepcion]);

  useEffect(() => {
    if (!form.cliente_id || !form.carro_id) return;

    const existe = vehiculos.some(
      (v) =>
        Number(v.id) === Number(form.carro_id) &&
        Number(v.cliente_id) === Number(form.cliente_id)
    );

    if (!existe) {
      setForm((prev) => ({ ...prev, carro_id: "" }));
    }
  }, [form.cliente_id, form.carro_id, vehiculos]);

  async function save() {
    if (!user?.id) {
      toast.error("No se encontró el usuario logueado");
      return;
    }

    if (!form.cliente_id || !form.carro_id) {
      toast.error("Cliente y vehículo son obligatorios");
      return;
    }

    if (form.centro_id && !allowedCentros.includes(Number(form.centro_id))) {
      toast.error("No tienes permiso para usar ese centro");
      return;
    }

    if (form.taller_id && !allowedTalleres.includes(Number(form.taller_id))) {
      toast.error("No tienes permiso para usar ese taller");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        cliente_id: Number(form.cliente_id),
        carro_id: Number(form.carro_id),
        centro_id: form.centro_id ? Number(form.centro_id) : null,
        taller_id: form.taller_id ? Number(form.taller_id) : null,
        cita_id: cita?.id || recepcion?.cita_id || null,
        notas_cliente: form.notas_cliente || null,
        notas_generales: form.notas_generales || null,
        created_by: user.id,
      };

      const isEdit = mode === "edit" && recepcion?.id;
      const url = isEdit ? `/api/recepciones/${recepcion.id}` : `/api/recepciones`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(json?.message || "Error guardando recepción");
      }

      if (media.fotos.length || media.videos.length || media.audios.length) {
        toast("Recepción guardada. Falta conectar la API de fotos, videos y audios.");
      }

      toast.success(isEdit ? "Recepción actualizada" : "Recepción creada");

      onSaved?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error guardando");
    } finally {
      setSaving(false);
    }
  }

  const bloquearDatosCita = !!cita && mode !== "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "edit"
              ? "Editar recepción"
              : cita
              ? "Recepcionar cita"
              : "Nueva recepción"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <Select
              value={form.cliente_id}
              onValueChange={(v) => setField("cliente_id", v)}
              disabled={loadingCatalogos || saving || bloquearDatosCita}
            >
              <SelectTrigger>
                <SelectValue placeholder="Cliente" />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre} {c.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={form.carro_id}
              onValueChange={(v) => setField("carro_id", v)}
              disabled={loadingCatalogos || saving || bloquearDatosCita}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vehículo" />
              </SelectTrigger>
              <SelectContent>
                {vehiculosVisibles.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.placas || v.placa || `Vehículo ${v.id}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={form.centro_id}
              onValueChange={(v) => setField("centro_id", v)}
              disabled={loadingCatalogos || saving || bloquearDatosCita}
            >
              <SelectTrigger>
                <SelectValue placeholder="Centro" />
              </SelectTrigger>
              <SelectContent>
                {centros.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre || c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={form.taller_id}
              onValueChange={(v) => setField("taller_id", v)}
              disabled={!form.centro_id || saving || bloquearDatosCita}
            >
              <SelectTrigger>
                <SelectValue placeholder="Taller" />
              </SelectTrigger>
              <SelectContent>
                {talleres.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre || t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Notas del cliente"
            value={form.notas_cliente}
            onChange={(e) => setField("notas_cliente", e.target.value)}
            disabled={saving}
          />

          <Input
            placeholder="Notas generales"
            value={form.notas_generales}
            onChange={(e) => setField("notas_generales", e.target.value)}
            disabled={saving}
          />

          <input
            ref={fotoInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => addFiles("fotos", e.target.files)}
          />

          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => addFiles("videos", e.target.files)}
          />

          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            capture
            multiple
            className="hidden"
            onChange={(e) => addFiles("audios", e.target.files)}
          />

          <CaptureUploader
            label="Tomar fotos"
            icon={<Camera size={16} />}
            files={media.fotos}
            onOpenCapture={() => fotoInputRef.current?.click()}
            onRemove={(i) => removeFile("fotos", i)}
          />

          <CaptureUploader
            label="Grabar video"
            icon={<Video size={16} />}
            files={media.videos}
            onOpenCapture={() => videoInputRef.current?.click()}
            onRemove={(i) => removeFile("videos", i)}
          />

          <CaptureUploader
            label="Grabar audio"
            icon={<Mic size={16} />}
            files={media.audios}
            onOpenCapture={() => audioInputRef.current?.click()}
            onRemove={(i) => removeFile("audios", i)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving
                ? "Guardando..."
                : mode === "edit"
                ? "Guardar cambios"
                : "Guardar recepción"}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => toast("Crear orden pendiente")}
              disabled={saving}
            >
              <ClipboardPlus className="w-4 h-4 mr-2" />
              Crear orden
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CaptureUploader({ label, icon, files, onOpenCapture, onRemove }) {
  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between"
        onClick={onOpenCapture}
      >
        <span className="flex gap-2 items-center text-sm">
          {icon} {label}
        </span>
        <span className="text-xs text-muted-foreground">
          {files.length} archivo(s)
        </span>
      </Button>

      {files.map((file, i) => (
        <div
          key={`${file.name}-${i}`}
          className="flex justify-between items-center bg-muted px-3 py-2 rounded"
        >
          <span className="text-xs truncate">{file.name}</span>
          <Trash2
            size={16}
            className="text-red-500 cursor-pointer shrink-0"
            onClick={() => onRemove(i)}
          />
        </div>
      ))}
    </div>
  );
}