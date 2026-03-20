"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

import { MessageSquare, History, Edit2, RotateCw, Info, ExternalLink } from "lucide-react";

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

function normalizeDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function normalizeTimeInput(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function detectRecordTypeFromCodigo(codigo) {
  const value = String(codigo || "").trim().toUpperCase();
  if (/^LD-\d+$/.test(value)) return "ld";
  return "op";
}

const EMPTY_FORM = {
  cliente_id: "",
  marca_id: "",
  modelo_id: "",
  origen_id: "",
  suborigen_id: "",
  detalle: "",
  etapasconversion_id: "",
  created_by: "",
  asignado_a: "",
  fecha_agenda: "",
  hora_agenda: "",
  oportunidad_padre_id: "",
};

export default function OportunidadDialog({
  open,
  onOpenChange,
  onSuccess,
  defaultFecha = "",
  defaultHora = "",
  oportunidadPadreId = "",
  oportunidad = null,
  recordType = "op",
}) {
  const router = useRouter();
  const { user, permissions } = useAuth();

  const permViewAll = hasPermission(permissions, "agenda", "viewall");

  const currentUserId =
    user?.id || user?.user_id || user?.usuario_id || user?.profile?.id || "";

  const [form, setForm] = useState(EMPTY_FORM);
  const [etapaProxima, setEtapaProxima] = useState("sin-cambio");
  const [detalleAccion, setDetalleAccion] = useState("");

  const [clientes, setClientes] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [origenes, setOrigenes] = useState([]);
  const [suborigenes, setSuborigenes] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [actividades, setActividades] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [loadingSuborigenes, setLoadingSuborigenes] = useState(false);
  const [guardandoActividad, setGuardandoActividad] = useState(false);
  const [loadingActividades, setLoadingActividades] = useState(false);

  const [mode, setMode] = useState("new");

  const effectiveType = oportunidad?.oportunidad_id
    ? detectRecordTypeFromCodigo(oportunidad.oportunidad_id)
    : recordType;

  const baseApi = effectiveType === "ld" ? "/api/leads" : "/api/oportunidades";
  const recordLabel = effectiveType === "ld" ? "lead" : "oportunidad";
  const recordLabelCap = effectiveType === "ld" ? "Lead" : "Oportunidad";

  // ==================== CARGAR ACTIVIDADES ====================
  async function loadActividades(oportunidadId) {
    try {
      setLoadingActividades(true);
      const res = await fetch(
        `/api/actividades-oportunidades?oportunidad_id=${oportunidadId}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setActividades(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar las actividades");
    } finally {
      setLoadingActividades(false);
    }
  }

  useEffect(() => {
    if (!open) return;

    async function loadInitialData() {
      try {
        const requests = [
          fetch("/api/clientes", { cache: "no-store" }),
          fetch("/api/marcas", { cache: "no-store" }),
          fetch("/api/origenes_citas", { cache: "no-store" }),
          fetch("/api/etapasconversion", { cache: "no-store" }),
        ];

        if (permViewAll) {
          requests.push(fetch("/api/usuarios", { cache: "no-store" }));
        }

        const responses = await Promise.all(requests);
        const jsons = await Promise.all(responses.map((r) => r.json()));

        const clientesData = jsons[0];
        const marcasData = jsons[1];
        const origenesData = jsons[2];
        const etapasData = jsons[3];
        const usuariosData = permViewAll ? jsons[4] : [];

        const clientesList = Array.isArray(clientesData) ? clientesData : [];
        const marcasList = Array.isArray(marcasData) ? marcasData : [];
        const origenesList = Array.isArray(origenesData) ? origenesData : [];
        const etapasList = Array.isArray(etapasData) ? etapasData : [];
        const usuariosList = Array.isArray(usuariosData) ? usuariosData : [];

        setClientes(clientesList);
        setMarcas(marcasList);
        setOrigenes(origenesList);
        setEtapas(etapasList);
        setUsuarios(usuariosList);

        const etapaNuevo =
          etapasList.find(
            (e) => String(getLabel(e)).trim().toLowerCase() === "nuevo"
          ) || null;

        if (oportunidad) {
          setMode("view");
          setForm({
            ...EMPTY_FORM,
            cliente_id: oportunidad.cliente_id
              ? String(oportunidad.cliente_id)
              : "",
            marca_id: oportunidad.marca_id ? String(oportunidad.marca_id) : "",
            modelo_id: oportunidad.modelo_id
              ? String(oportunidad.modelo_id)
              : "",
            origen_id: oportunidad.origen_id
              ? String(oportunidad.origen_id)
              : "",
            suborigen_id: oportunidad.suborigen_id
              ? String(oportunidad.suborigen_id)
              : "",
            detalle: oportunidad.detalle || "",
            etapasconversion_id: oportunidad.etapasconversion_id
              ? String(oportunidad.etapasconversion_id)
              : etapaNuevo?.id
                ? String(etapaNuevo.id)
                : "",
            created_by: oportunidad.created_by
              ? String(oportunidad.created_by)
              : currentUserId
                ? String(currentUserId)
                : "",
            asignado_a: permViewAll
              ? oportunidad.asignado_a
                ? String(oportunidad.asignado_a)
                : ""
              : currentUserId
                ? String(currentUserId)
                : "",
            fecha_agenda: normalizeDateInput(oportunidad.fecha_agenda),
            hora_agenda: normalizeTimeInput(oportunidad.hora_agenda),
            oportunidad_padre_id: oportunidad.oportunidad_padre_id
              ? String(oportunidad.oportunidad_padre_id)
              : "",
          });
          setEtapaProxima("sin-cambio");
          setDetalleAccion("");
          loadActividades(oportunidad.id);
        } else {
          setMode("new");
          setForm({
            ...EMPTY_FORM,
            created_by: currentUserId ? String(currentUserId) : "",
            etapasconversion_id: etapaNuevo?.id ? String(etapaNuevo.id) : "",
            asignado_a: permViewAll
              ? ""
              : currentUserId
                ? String(currentUserId)
                : "",
            fecha_agenda: normalizeDateInput(defaultFecha),
            hora_agenda: normalizeTimeInput(defaultHora),
            oportunidad_padre_id: oportunidadPadreId
              ? String(oportunidadPadreId)
              : "",
          });
        }
      } catch (error) {
        console.error(error);
        toast.error("No se pudieron cargar los datos del formulario");
      }
    }

    loadInitialData();
  }, [
    open,
    currentUserId,
    defaultFecha,
    defaultHora,
    oportunidadPadreId,
    oportunidad,
    permViewAll,
  ]);

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
    () =>
      usuarios.filter(
        (u) => Number(u.is_active) === 1 || u.is_active === true
      ),
    [usuarios]
  );

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isReprogram = mode === "reprogram";
  const isNew = mode === "new";

  function isFieldDisabled(field) {
    if ((isEdit || isReprogram) && field === "cliente_id") return true;
    if (isView && !["etapasconversion_id"].includes(field)) return true;
    if (isReprogram) {
      return !["fecha_agenda", "hora_agenda"].includes(field);
    }
    return false;
  }

  async function parseSafeResponse(res) {
    const text = await res.text();
    if (!text) return {};
    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }

  function getAsignadoAValue() {
    if (permViewAll) {
      return form.asignado_a ? Number(form.asignado_a) : null;
    }
    return currentUserId ? Number(currentUserId) : null;
  }

  // ==================== GUARDAR ACTIVIDAD ====================
  async function handleGuardarActividad() {
    if (!detalleAccion.trim()) {
      toast.warning("Ingresa un detalle de la acción");
      return;
    }

    if (!oportunidad?.id) {
      toast.error("No se encontró la oportunidad");
      return;
    }

    try {
      setGuardandoActividad(true);

      const etapaId =
        etapaProxima !== "sin-cambio" ? Number(etapaProxima) : null;

      const payload = {
        oportunidad_id: Number(oportunidad.id),
        etapasconversion_id: etapaId,
        detalle: detalleAccion,
        created_by: Number(currentUserId),
      };

      const res = await fetch("/api/actividades-oportunidades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "No se pudo guardar la actividad");
      }

      // Si se seleccionó etapa próxima, actualizar también la oportunidad
      if (etapaId) {
        const updateRes = await fetch(
          `/api/oportunidades/${oportunidad.id}/etapa`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              etapasconversion_id: etapaId,
            }),
          }
        );

        if (updateRes.ok) {
          setForm((prev) => ({
            ...prev,
            etapasconversion_id: String(etapaId),
          }));
          toast.success("Actividad guardada y etapa actualizada");
        }
      } else {
        toast.success("Actividad guardada");
      }

      setDetalleAccion("");
      setEtapaProxima("sin-cambio");
      loadActividades(oportunidad.id);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error al guardar actividad");
    } finally {
      setGuardandoActividad(false);
    }
  }

  async function handleCreate() {
    if (!currentUserId) {
      toast.error("No se encontró el usuario logueado");
      return;
    }

    if (
      !form.cliente_id ||
      !form.marca_id ||
      !form.modelo_id ||
      !form.origen_id ||
      !form.etapasconversion_id ||
      !form.fecha_agenda ||
      !form.hora_agenda
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
        created_by: Number(form.created_by || currentUserId),
        asignado_a: getAsignadoAValue(),
        fecha_agenda: normalizeDateInput(form.fecha_agenda),
        hora_agenda: normalizeTimeInput(form.hora_agenda),
        oportunidad_padre_id: form.oportunidad_padre_id
          ? Number(form.oportunidad_padre_id)
          : null,
      };

      const res = await fetch(baseApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await parseSafeResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo guardar");
      }

      toast.success(`${recordLabelCap} creado${effectiveType === "ld" ? "" : "a"}`);
      onSuccess?.(data);
    } catch (error) {
      console.error(error);
      toast.error(error.message || `No se pudo guardar el ${recordLabel}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    if (!oportunidad?.id) {
      toast.error(`No se encontró el ${recordLabel} a editar`);
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
        created_by: Number(form.created_by || currentUserId),
        asignado_a: getAsignadoAValue(),
        fecha_agenda: normalizeDateInput(form.fecha_agenda),
        hora_agenda: normalizeTimeInput(form.hora_agenda),
      };

      const res = await fetch(`${baseApi}/${oportunidad.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await parseSafeResponse(res);

      if (!res.ok) {
        throw new Error(
          data?.error ||
          data?.sqlMessage ||
          data?.message ||
          "No se pudo actualizar"
        );
      }

      toast.success(data?.message || `${recordLabelCap} actualizado`);
      onSuccess?.(data);
    } catch (error) {
      console.error(error);
      toast.error(error.message || `No se pudo actualizar el ${recordLabel}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleReprogram() {
    if (!oportunidad?.id) {
      toast.error(`No se encontró el ${recordLabel} original`);
      return;
    }

    if (!form.fecha_agenda || !form.hora_agenda) {
      toast.error("Fecha y hora son obligatorias para reprogramar");
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
        created_by: Number(form.created_by || currentUserId),
        asignado_a: getAsignadoAValue(),
        fecha_agenda: normalizeDateInput(form.fecha_agenda),
        hora_agenda: normalizeTimeInput(form.hora_agenda),
        oportunidad_padre_id: Number(oportunidad.id),
      };

      const res = await fetch(baseApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await parseSafeResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo reprogramar");
      }

      toast.success(data?.message || `${recordLabelCap} reprogramado`);
      onSuccess?.(data);
    } catch (error) {
      console.error(error);
      toast.error(error.message || `No se pudo reprogramar el ${recordLabel}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (isEdit) return handleUpdate();
    if (isReprogram) return handleReprogram();
    return handleCreate();
  }

  const etapaActual = etapas.find(
    (e) => String(e.id) === String(form.etapasconversion_id)
  );

  const clienteActual = clientes.find(
    (c) => String(c.id) === String(form.cliente_id)
  );

  return (
    <TooltipProvider>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!loading && !guardandoActividad) onOpenChange(value);
        }}
      >
        <DialogContent className="max-w-5xl h-[95vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-2xl">
                  {isNew && `Nuevo ${recordLabel}`}
                  {isView && `Detalle de ${recordLabel}`}
                  {isEdit && `Editar ${recordLabel}`}
                  {isReprogram && `Reprogramar ${recordLabel}`}
                </DialogTitle>

                {isReprogram && oportunidad?.oportunidad_id && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Se reprograma de la cita N° <span className="font-semibold">{oportunidad.oportunidad_id}</span>
                  </p>
                )}

                {!isReprogram && oportunidad?.oportunidad_id && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Código: <span className="font-semibold text-foreground">{oportunidad.oportunidad_id}</span>
                  </p>
                )}
              </div>

              {oportunidad && (
                <div className="flex gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.push(`/oportunidades/${oportunidad.id}`)}
                        disabled={loading}
                        size="sm"
                        className="gap-2"
                      >
                        <ExternalLink size={16} />
                        Abrir
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Abrir detalle completo de esta oportunidad</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={isEdit ? "default" : "outline"}
                        onClick={() => setMode("edit")}
                        disabled={loading}
                        size="sm"
                        className="gap-2"
                      >
                        <Edit2 size={16} />
                        Editar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Modificar datos de esta oportunidad</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={isReprogram ? "default" : "outline"}
                        onClick={() => {
                          setMode("reprogram");
                          setForm((prev) => ({
                            ...prev,
                            fecha_agenda: "",
                            hora_agenda: "",
                            detalle: "",
                          }));
                        }}
                        disabled={loading}
                        size="sm"
                        className="gap-2"
                      >
                        <RotateCw size={16} />
                        Reprogramar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">Crear nueva cita para esta oportunidad</TooltipContent>
                  </Tooltip>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* CONTENIDO SCROLLEABLE */}
          <div className="flex-1 overflow-y-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium">
                    Cliente * {(isEdit || isReprogram) && <span className="text-xs text-muted-foreground">(No editable)</span>}
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right">Selecciona el cliente para esta oportunidad</TooltipContent>
                  </Tooltip>
                </div>
                {isNew ? (
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
                ) : (
                  <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted font-medium">
                    {clienteActual ? getLabel(clienteActual) : "Seleccionar cliente"}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Creado por</label>
                <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted font-medium">
                  {user?.fullname || user?.username || `ID ${currentUserId || ""}`}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium">Marca *</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right">Marca del vehículo</TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={form.marca_id}
                  onValueChange={(value) => {
                    updateField("marca_id", value);
                    updateField("modelo_id", "");
                  }}
                  disabled={isFieldDisabled("marca_id")}
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
                <label className="text-sm font-medium block mb-2">Modelo *</label>
                <Select
                  value={form.modelo_id}
                  onValueChange={(value) => updateField("modelo_id", value)}
                  disabled={
                    !form.marca_id || loadingModelos || isFieldDisabled("modelo_id")
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingModelos ? "Cargando..." : "Seleccionar modelo"
                      }
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
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium">Origen *</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right">De dónde proviene esta oportunidad</TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={form.origen_id}
                  onValueChange={(value) => {
                    updateField("origen_id", value);
                    updateField("suborigen_id", "");
                  }}
                  disabled={isFieldDisabled("origen_id")}
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
                <label className="text-sm font-medium block mb-2">Suborigen</label>
                <Select
                  value={form.suborigen_id}
                  onValueChange={(value) => updateField("suborigen_id", value)}
                  disabled={
                    !form.origen_id ||
                    loadingSuborigenes ||
                    isFieldDisabled("suborigen_id")
                  }
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingSuborigenes ? "Cargando..." : "Seleccionar suborigen"
                      }
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
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium">Fecha agenda *</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right">Fecha programada para la cita</TooltipContent>
                  </Tooltip>
                </div>
                <input
                  type="date"
                  className="w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.fecha_agenda}
                  onChange={(e) => updateField("fecha_agenda", e.target.value)}
                  disabled={isFieldDisabled("fecha_agenda")}
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium">Hora agenda *</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="right">Hora programada (cada 5 minutos)</TooltipContent>
                  </Tooltip>
                </div>
                <input
                  type="time"
                  className="w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  step="300"
                  value={form.hora_agenda}
                  onChange={(e) => updateField("hora_agenda", e.target.value)}
                  disabled={isFieldDisabled("hora_agenda")}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2">Etapa actual</label>
                <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-gradient-to-r from-blue-50 to-indigo-50 font-medium text-blue-700">
                  {etapaActual ? getLabel(etapaActual) : "Nuevo"}
                </div>
              </div>

              {permViewAll && (
                <div>
                  <label className="text-sm font-medium block mb-2">Asignado a</label>
                  <Select
                    value={form.asignado_a}
                    onValueChange={(value) => updateField("asignado_a", value)}
                    disabled={isFieldDisabled("asignado_a")}
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
              )}

              {!permViewAll && (
                <div>
                  <label className="text-sm font-medium block mb-2">Asignado a</label>
                  <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted font-medium">
                    {user?.fullname || user?.username || `ID ${currentUserId || ""}`}
                  </div>
                </div>
              )}


                <div className="md:col-span-2 space-y-4 pt-6 border-t-2 border-slate-200">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 space-y-3 border border-blue-200">
                    <div className="flex items-center gap-2">
                      <MessageSquare size={18} className="text-blue-600" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Registrar nueva actividad
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">
                          Actividad a realizar (opcional)
                        </label>
                        <Select
                          value={etapaProxima}
                          onValueChange={setEtapaProxima}
                          disabled={guardandoActividad}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seleccionar etapa" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sin-cambio">
                              Sin actividad
                            </SelectItem>
                            {etapas.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {getLabel(item)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-2">
                        Detalle *
                      </label>
                      <textarea
                        className="w-full h-20 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                        value={detalleAccion}
                        onChange={(e) => setDetalleAccion(e.target.value)}
                        placeholder="Describe qué acción se realizó, qué se comentó, etc."
                        disabled={guardandoActividad}
                      />
                    </div>

                    <Button
                      onClick={handleGuardarActividad}
                      disabled={guardandoActividad || !detalleAccion.trim()}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      size="sm"
                    >
                      {guardandoActividad
                        ? "Guardando..."
                        : "Guardar actividad" +
                        (etapaProxima !== "sin-cambio"
                          ? " y cambiar etapa"
                          : "")}
                    </Button>
                  </div>

                  {/* HISTORIAL */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <History size={18} className="text-slate-600" />
                      <h3 className="text-sm font-semibold text-slate-900">
                        Historial ({actividades.length})
                      </h3>
                    </div>

                    {loadingActividades ? (
                      <div className="text-center text-muted-foreground text-sm py-4 bg-slate-50 rounded">
                        Cargando...
                      </div>
                    ) : actividades.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-4 bg-slate-50 rounded border border-dashed border-slate-300">
                        No hay actividades
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                        {actividades.map((actividad, idx) => {
                          const etapaActividad = actividad.etapasconversion_id
                            ? etapas.find(
                              (e) => e.id === actividad.etapasconversion_id
                            )
                            : null;

                          return (
                            <div
                              key={actividad.id}
                              className="border border-slate-200 rounded p-3 bg-white text-xs space-y-2 hover:shadow-md hover:border-blue-300 transition-all"
                            >
                              <div className="flex justify-between items-start gap-2">
                                <div>
                                  <p className="font-semibold text-slate-800">
                                    {actividad.created_by_name ||
                                      `ID ${actividad.created_by}`}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-slate-500">
                                    {format(
                                      new Date(actividad.created_at),
                                      "dd/MM HH:mm",
                                      { locale: es }
                                    )}
                                  </p>
                                </div>
                              </div>

                              {etapaActividad && (
                                <div>
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                                    {getLabel(etapaActividad)}
                                  </span>
                                </div>
                              )}

                              <p className="text-slate-700 line-clamp-3 leading-relaxed">
                                {actividad.detalle}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
           
            </div>
          </div>

          {/* FOOTER */}
          <DialogFooter className="flex-shrink-0 border-t px-6 py-4 bg-slate-50">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || guardandoActividad}
              className="gap-2"
            >
              Cancelar
            </Button>

            {(isNew || isEdit || isReprogram) && (
              <Button
                onClick={handleSave}
                disabled={loading || guardandoActividad}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {isEdit
                  ? "Guardar cambios"
                  : isReprogram
                    ? "Guardar reprogramación"
                    : "Guardar"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}