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

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

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

function getVehiculoLabel(vehiculo) {
  if (!vehiculo) return "";
  const modelo = vehiculo?.modelo_name || "";
  const marca = vehiculo?.marca_name || "";
  const placas = vehiculo?.placas || "";
  
  const partes = [];
  if (marca) partes.push(marca);
  if (modelo) partes.push(modelo);
  if (placas) partes.push(`(${placas})`);
  
  return partes.join(" - ") || `ID ${vehiculo?.id}`;
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
  vehiculo_id: "",
  origen_id: "",
  suborigen_id: "",
  detalle: "",
  etapasconversionpv_id: "",
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
  const { user, permissions } = useAuth();

  const permViewAll = hasPermission(permissions, "agenda", "viewall");

  const currentUserId =
    user?.id || user?.user_id || user?.usuario_id || user?.profile?.id || "";

  const [form, setForm] = useState(EMPTY_FORM);

  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [origenes, setOrigenes] = useState([]);
  const [suborigenes, setSuborigenes] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);
  const [loadingSuborigenes, setLoadingSuborigenes] = useState(false);

  const [mode, setMode] = useState("new");

  const effectiveType = oportunidad?.oportunidad_id
    ? detectRecordTypeFromCodigo(oportunidad.oportunidad_id)
    : recordType;

  const baseApi = effectiveType === "ld" ? "/api/leadspv" : "/api/oportunidadespv";
  const recordLabel = effectiveType === "ld" ? "lead" : "oportunidad";
  const recordLabelCap = effectiveType === "ld" ? "Lead" : "Oportunidad";

  useEffect(() => {
    if (!open) return;

    async function loadInitialData() {
      try {
        const requests = [
          fetch("/api/clientes", { cache: "no-store" }),
          fetch("/api/vehiculos", { cache: "no-store" }),
          fetch("/api/origenes_citas", { cache: "no-store" }),
          fetch("/api/etapasconversionpv", { cache: "no-store" }),
        ];

        if (permViewAll) {
          requests.push(fetch("/api/usuarios", { cache: "no-store" }));
        }

        const responses = await Promise.all(requests);
        const jsons = await Promise.all(responses.map((r) => r.json()));

        const clientesData = jsons[0];
        const vehiculosData = jsons[1];
        const origenesData = jsons[2];
        const etapasData = jsons[3];
        const usuariosData = permViewAll ? jsons[4] : [];

        const clientesList = Array.isArray(clientesData) ? clientesData : [];
        const vehiculosList = Array.isArray(vehiculosData) ? vehiculosData : [];
        const origenesList = Array.isArray(origenesData) ? origenesData : [];
        const etapasList = Array.isArray(etapasData) ? etapasData : [];
        const usuariosList = Array.isArray(usuariosData) ? usuariosData : [];

        setClientes(clientesList);
        setVehiculos(vehiculosList);
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
            vehiculo_id: oportunidad.vehiculo_id
              ? String(oportunidad.vehiculo_id)
              : "",
            origen_id: oportunidad.origen_id
              ? String(oportunidad.origen_id)
              : "",
            suborigen_id: oportunidad.suborigen_id
              ? String(oportunidad.suborigen_id)
              : "",
            detalle: oportunidad.detalle || "",
            etapasconversionpv_id: oportunidad.etapasconversionpv_id
              ? String(oportunidad.etapasconversionpv_id)
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
        } else {
          setMode("new");
          setForm({
            ...EMPTY_FORM,
            created_by: currentUserId ? String(currentUserId) : "",
            etapasconversionpv_id: etapaNuevo?.id ? String(etapaNuevo.id) : "",
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
    if (!form.cliente_id) {
      setVehiculos([]);
      setForm((prev) => ({ ...prev, vehiculo_id: "" }));
      return;
    }

    async function loadVehiculos() {
      try {
        setLoadingVehiculos(true);
        const res = await fetch(`/api/vehiculos?cliente_id=${form.cliente_id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        setVehiculos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        toast.error("No se pudieron cargar los vehículos");
      } finally {
        setLoadingVehiculos(false);
      }
    }

    loadVehiculos();
  }, [form.cliente_id]);

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

  const vehiculoSeleccionado = useMemo(() => {
    return vehiculos.find((v) => String(v.id) === String(form.vehiculo_id));
  }, [vehiculos, form.vehiculo_id]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isReprogram = mode === "reprogram";
  const isNew = mode === "new";

  function isFieldDisabled(field) {
    if (isView) return true;
    if (isReprogram) {
      return !["fecha_agenda", "hora_agenda", "detalle"].includes(field);
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

  async function handleCreate() {
    if (!currentUserId) {
      toast.error("No se encontró el usuario logueado");
      return;
    }

    if (
      !form.cliente_id ||
      !form.vehiculo_id ||
      !form.origen_id ||
      !form.etapasconversionpv_id ||
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
        vehiculo_id: Number(form.vehiculo_id),
        origen_id: Number(form.origen_id),
        suborigen_id: form.suborigen_id ? Number(form.suborigen_id) : null,
        detalle: form.detalle || "",
        etapasconversionpv_id: Number(form.etapasconversionpv_id),
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
        vehiculo_id: Number(form.vehiculo_id),
        origen_id: Number(form.origen_id),
        suborigen_id: form.suborigen_id ? Number(form.suborigen_id) : null,
        detalle: form.detalle || "",
        etapasconversionpv_id: Number(form.etapasconversionpv_id),
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
        vehiculo_id: Number(form.vehiculo_id),
        origen_id: Number(form.origen_id),
        suborigen_id: form.suborigen_id ? Number(form.suborigen_id) : null,
        detalle: form.detalle || "",
        etapasconversionpv_id: Number(form.etapasconversionpv_id),
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
    (e) => String(e.id) === String(form.etapasconversionpv_id)
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!loading) onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <DialogTitle>
                {isNew && `Nuevo ${recordLabel}`}
                {isView && `Detalle de ${recordLabel}`}
                {isEdit && `Editar ${recordLabel}`}
                {isReprogram && `Reprogramar ${recordLabel}`}
              </DialogTitle>

              {isReprogram && oportunidad?.oportunidad_id && (
                <p className="text-sm text-muted-foreground mt-1">
                  Se reprograma de la cita N° {oportunidad.oportunidad_id}
                </p>
              )}

              {!isReprogram && oportunidad?.oportunidad_id && (
                <p className="text-sm text-muted-foreground mt-1">
                  Código: {oportunidad.oportunidad_id}
                </p>
              )}
            </div>

            {oportunidad && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={isEdit ? "default" : "outline"}
                  onClick={() => setMode("edit")}
                  disabled={loading}
                >
                  Editar
                </Button>

                <Button
                  type="button"
                  variant={isReprogram ? "default" : "outline"}
                  onClick={() => {
                    setMode("reprogram");
                    setForm((prev) => ({
                      ...prev,
                      fecha_agenda: "",
                      hora_agenda: "",
                    }));
                  }}
                  disabled={loading}
                >
                  Reprogramar
                </Button>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium">Cliente *</label>
            <Select
              value={form.cliente_id}
              onValueChange={(value) => updateField("cliente_id", value)}
              disabled={isFieldDisabled("cliente_id")}
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
            <label className="text-sm font-medium">Creado por</label>
            <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted">
              {user?.fullname || user?.username || `ID ${currentUserId || ""}`}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Vehículo *</label>
            <Select
              value={form.vehiculo_id}
              onValueChange={(value) => updateField("vehiculo_id", value)}
              disabled={
                !form.cliente_id || loadingVehiculos || isFieldDisabled("vehiculo_id")
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingVehiculos ? "Cargando..." : "Seleccionar vehículo"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {vehiculos.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {getVehiculoLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Vehículo seleccionado</label>
            <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted">
              {vehiculoSeleccionado ? getVehiculoLabel(vehiculoSeleccionado) : "-"}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Origen *</label>
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
            <label className="text-sm font-medium">Suborigen</label>
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
            <label className="text-sm font-medium">Fecha agenda *</label>
            <input
              type="date"
              className="w-full h-10 rounded-md border px-3 text-sm"
              value={form.fecha_agenda}
              onChange={(e) => updateField("fecha_agenda", e.target.value)}
              disabled={isFieldDisabled("fecha_agenda")}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Hora agenda *</label>
            <input
              type="time"
              className="w-full h-10 rounded-md border px-3 text-sm"
              value={form.hora_agenda}
              onChange={(e) => updateField("hora_agenda", e.target.value)}
              disabled={isFieldDisabled("hora_agenda")}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Etapa</label>
            <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted">
              {etapaActual ? getLabel(etapaActual) : "Nuevo"}
            </div>
          </div>

          {permViewAll && (
            <div>
              <label className="text-sm font-medium">Asignado a</label>
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
              <label className="text-sm font-medium">Asignado a</label>
              <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted">
                {user?.fullname || user?.username || `ID ${currentUserId || ""}`}
              </div>
            </div>
          )}

          <div className="md:col-span-2">
            <label className="text-sm font-medium">Detalle</label>
            <textarea
              className="w-full min-h-[110px] rounded-md border px-3 py-2 text-sm"
              value={form.detalle}
              onChange={(e) => updateField("detalle", e.target.value)}
              placeholder={`Detalle del ${recordLabel}`}
              disabled={isFieldDisabled("detalle")}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>

          {(isNew || isEdit || isReprogram) && (
            <Button onClick={handleSave} disabled={loading}>
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
  );
}