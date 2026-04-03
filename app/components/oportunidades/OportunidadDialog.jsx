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

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

import {
  MessageSquare,
  History,
  Edit2,
  Info,
  ExternalLink,
  Trash2,
  AlertCircle,
  Loader,
  Plus,
  Calendar,
  Check,
  ChevronsUpDown,
  RotateCcw,
} from "lucide-react";

function getLabel(item) {
  // Para clientes
  if (item?.nombre_comercial) return item.nombre_comercial;
  if (item?.nombre && item?.apellido) return `${item.nombre} ${item.apellido}`;
  if (item?.nombre) return item.nombre;
  if (item?.celular) return item.celular;
  
  // Para usuarios
  if (item?.fullname) return item.fullname;
  if (item?.username) return item.username;
  
  // Para orígenes y otros
  if (item?.name) return item.name;
  
  // Fallback
  if (item?.full_name) return item.full_name;
  if (item?.razon_social) return item.razon_social;
  if (item?.description) return item.description;
  
  return `ID ${item?.id}`;
}

function normalizeDateInput(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function normalizeTimeInput(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function formatDetallesFecha(fechaStr) {
  if (!fechaStr) return "Sin fecha";
  try {
    const fecha = new Date(fechaStr + "T00:00:00");
    if (isNaN(fecha.getTime())) {
      return "Fecha inválida";
    }
    return format(fecha, "dd/MM/yyyy", { locale: es });
  } catch (error) {
    console.error("Error formateando fecha:", error, fechaStr);
    return "Fecha inválida";
  }
}

function formatDetallesHora(horaStr) {
  return horaStr || "Sin hora";
}

const EMPTY_FORM = {
  cliente_id: "",
  origen_id: "",
  suborigen_id: "",
  detalle: "",
  etapasconversion_id: "",
  asignado_a: "sin-asignar",
};

const EMPTY_DETALLE = {
  fecha_agenda: "",
  hora_agenda: "",
};

const EMPTY_ACTIVIDAD = {
  etapasconversion_id: "sin-cambio",
  detalle: "",
};

// ==================== COMBOBOX COMPONENT MEJORADO ====================
function Combobox({
  items = [],
  value = "",
  onChange,
  placeholder = "Seleccionar...",
  disabled = false,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const selectedItem = items.find((item) => String(item.id) === String(value));

  // Filtrar items por nombre/label
  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) return items;
    
    const lowerSearch = searchValue.toLowerCase();
    return items.filter((item) => {
      const label = getLabel(item).toLowerCase();
      return label.includes(lowerSearch);
    });
  }, [items, searchValue]);

  const handleSelect = (itemId) => {
    onChange(itemId === value ? "" : itemId);
    setSearchValue("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("w-full justify-between h-10", className)}
        >
          <span className="truncate">
            {value && selectedItem ? getLabel(selectedItem) : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Buscar ${placeholder.toLowerCase()}...`}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {filteredItems.length === 0 ? (
              <CommandEmpty>No encontrado.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={String(item.id)}
                    onSelect={() => handleSelect(String(item.id))}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === String(item.id)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {getLabel(item)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function OportunidadDialog({
  open,
  onOpenChange,
  onSuccess,
  oportunidad = null,
}) {
  const router = useRouter();
  const { user, permissions } = useAuth();

  const permViewAll = hasPermission(permissions, "oportunidades", "viewall");

  const currentUserId =
    user?.id || user?.user_id || user?.usuario_id || user?.profile?.id || "";

  const [form, setForm] = useState(EMPTY_FORM);
  const [detalleForm, setDetalleForm] = useState(EMPTY_DETALLE);
  const [detallesLocales, setDetallesLocales] = useState([]);
  const [actividadForm, setActividadForm] = useState(EMPTY_ACTIVIDAD);
  const [actividadesLocales, setActividadesLocales] = useState([]);
  const [editingDetalleLocalId, setEditingDetalleLocalId] = useState(null);
  const [editingDetalleId, setEditingDetalleId] = useState(null);
  const [editingActividadLocalId, setEditingActividadLocalId] = useState(null);
  const [mostrandoFormularioDetalleNuevo, setMostrandoFormularioDetalleNuevo] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [origenes, setOrigenes] = useState([]);
  const [suborigenes, setSuborigenes] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [detalles, setDetalles] = useState([]);
  const [actividades, setActividades] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingSuborigenes, setLoadingSuborigenes] = useState(false);
  const [loadingDetalles, setLoadingDetalles] = useState(false);
  const [guardandoDetalle, setGuardandoDetalle] = useState(false);
  const [guardandoOportunidad, setGuardandoOportunidad] = useState(false);
  const [loadingActividades, setLoadingActividades] = useState(false);
  const [guardandoActividad, setGuardandoActividad] = useState(false);

  const [mode, setMode] = useState("new");
  const [mostrarDetallesAlAsignar, setMostrarDetallesAlAsignar] = useState(false);

  const baseApi = "/api/oportunidades-oportunidades";
  const recordLabel = "oportunidad";
  const recordLabelCap = "Oportunidad";

  // ==================== CARGAR DETALLES ====================
  async function loadDetalles(oportunidadId) {
    try {
      setLoadingDetalles(true);
      const res = await fetch(
        `${baseApi}/${oportunidadId}/detalles`,
        { cache: "no-store" }
      );
      const data = await res.json();

      const detallesList = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      setDetalles(detallesList);
    } catch (error) {
      console.error(error);
      toast.error("No se pudieron cargar los detalles");
    } finally {
      setLoadingDetalles(false);
    }
  }

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

  // ==================== VALIDAR OPORTUNIDAD ACTIVA ====================
  async function verificarOportunidadActiva(clienteId) {
    try {
      const res = await fetch(
        `/api/oportunidades-oportunidades?cliente_id=${clienteId}&limit=100`,
        { cache: "no-store" }
      );
      const data = await res.json();

      const oportunidades = Array.isArray(data)
        ? data
        : Array.isArray(data?.data)
          ? data.data
          : [];

      // Buscar etapa "Cerrada"
      const etapasCerradas = etapas.filter(
        (e) => String(getLabel(e)).trim().toLowerCase() === "cerrada"
      );

      // Filtrar oportunidades activas (no cerradas)
      const oportunidadesActivas = oportunidades.filter((opp) => {
        const etapaId = opp.etapasconversion_id;
        return !etapasCerradas.some((e) => String(e.id) === String(etapaId));
      });

      return oportunidadesActivas.length > 0 ? oportunidadesActivas[0] : null;
    } catch (error) {
      console.error("Error verificando oportunidad activa:", error);
      return null;
    }
  }

  useEffect(() => {
    if (!open) return;

    async function loadInitialData() {
      try {
        const requests = [
          fetch("/api/clientes", { cache: "no-store" }),
          fetch("/api/origenes_citas", { cache: "no-store" }),
          fetch("/api/etapasconversion", { cache: "no-store" }),
        ];

        if (permViewAll) {
          requests.push(fetch("/api/usuarios", { cache: "no-store" }));
        }

        const responses = await Promise.all(requests);
        const jsons = await Promise.all(responses.map((r) => r.json()));

        const clientesData = jsons[0];
        const origenesData = jsons[1];
        const etapasData = jsons[2];
        const usuariosData = permViewAll ? jsons[3] : [];

        const clientesList = Array.isArray(clientesData) ? clientesData : [];
        const origenesList = Array.isArray(origenesData) ? origenesData : [];
        const etapasList = Array.isArray(etapasData) ? etapasData : [];
        const usuariosList = Array.isArray(usuariosData) ? usuariosData : [];

        setClientes(clientesList);
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
            origen_id: oportunidad.origen_id
              ? String(oportunidad.origen_id)
              : "",
            suborigen_id: oportunidad.suborigen_id
              ? String(oportunidad.suborigen_id)
              : "",
            detalle: oportunidad.detalle || "",
            etapasconversion_id: oportunidad.etapasconversion_id
              ? String(oportunidad.etapasconversion_id)
              : "",
            asignado_a: permViewAll
              ? oportunidad.asignado_a
                ? String(oportunidad.asignado_a)
                : "sin-asignar"
              : "sin-asignar",
          });
          setDetalleForm(EMPTY_DETALLE);
          setActividadForm(EMPTY_ACTIVIDAD);
          setDetallesLocales([]);
          setActividadesLocales([]);
          setMostrarDetallesAlAsignar(false);
          setMostrandoFormularioDetalleNuevo(false);
          loadActividades(oportunidad.id);
          loadDetalles(oportunidad.id);
        } else {
          setMode("new");
          setForm({
            ...EMPTY_FORM,
            etapasconversion_id: etapaNuevo?.id ? String(etapaNuevo.id) : "",
            asignado_a: permViewAll ? "sin-asignar" : String(currentUserId),
          });
          setDetalleForm(EMPTY_DETALLE);
          setActividadForm(EMPTY_ACTIVIDAD);
          setDetalles([]);
          setDetallesLocales([]);
          setActividades([]);
          setActividadesLocales([]);
          setMostrarDetallesAlAsignar(false);
          setMostrandoFormularioDetalleNuevo(false);
        }
      } catch (error) {
        console.error(error);
        toast.error("No se pudieron cargar los datos del formulario");
      }
    }

    loadInitialData();
  }, [open, currentUserId, oportunidad, permViewAll]);

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
          `/api/suborigenes_citas?origen_id=${form.origen_id}`,
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

  // ==================== VARIABLES DERIVADAS ====================
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const isNew = mode === "new";

  // ==================== EFECTO: CUANDO ASIGNA USUARIO ====================
  useEffect(() => {
    if (isNew && permViewAll && form.asignado_a && form.asignado_a !== "sin-asignar") {
      const etapaAsignado = etapas.find(
        (e) => String(getLabel(e)).trim().toLowerCase() === "asignado"
      );

      if (etapaAsignado) {
        setForm((prev) => ({
          ...prev,
          etapasconversion_id: String(etapaAsignado.id),
        }));
        setMostrarDetallesAlAsignar(true);
        toast.info("Etapa cambiada a 'Asignado'. Agrega detalles y actividades.");
      }
    } else if (form.asignado_a === "sin-asignar") {
      setMostrarDetallesAlAsignar(false);
    }
  }, [form.asignado_a, isNew, permViewAll, etapas]);

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

  function updateDetalleField(field, value) {
    setDetalleForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateActividadField(field, value) {
    setActividadForm((prev) => ({ ...prev, [field]: value }));
  }

  function isFieldDisabled(field) {
    if (isEdit && field === "cliente_id") return true;
    if (isView && !["etapasconversion_id"].includes(field)) return true;
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
      return form.asignado_a && form.asignado_a !== "sin-asignar"
        ? Number(form.asignado_a)
        : null;
    }
    return currentUserId ? Number(currentUserId) : null;
  }

  // ==================== GESTIONAR DETALLES LOCALES ====================
  function handleAgregarDetalleLocal() {
    if (!detalleForm.fecha_agenda || !detalleForm.hora_agenda) {
      toast.warning("Completa fecha y hora de agenda");
      return;
    }

    // En modo nuevo, solo permitir un detalle
    if (isNew && detallesLocales.length >= 1) {
      toast.warning("Solo puedes agregar un detalle de agenda en nuevas oportunidades");
      return;
    }

    const nuevoDetalle = {
      id: `local-${Date.now()}`,
      fecha_agenda: detalleForm.fecha_agenda,
      hora_agenda: detalleForm.hora_agenda,
    };

    if (editingDetalleLocalId) {
      setDetallesLocales(
        detallesLocales.map((d) =>
          d.id === editingDetalleLocalId ? nuevoDetalle : d
        )
      );
      setEditingDetalleLocalId(null);
      toast.success("Detalle actualizado");
    } else {
      setDetallesLocales([...detallesLocales, nuevoDetalle]);
      toast.success("Detalle agregado");
    }

    setDetalleForm(EMPTY_DETALLE);
  }

  function handleEditarDetalleLocal(detalle) {
    setEditingDetalleLocalId(detalle.id);
    setDetalleForm({
      fecha_agenda: normalizeDateInput(detalle.fecha_agenda),
      hora_agenda: normalizeTimeInput(detalle.hora_agenda),
    });
  }

  function handleEliminarDetalleLocal(detalleId) {
    setDetallesLocales(detallesLocales.filter((d) => d.id !== detalleId));
    if (editingDetalleLocalId === detalleId) {
      setEditingDetalleLocalId(null);
      setDetalleForm(EMPTY_DETALLE);
    }
    toast.success("Detalle eliminado");
  }

  // ==================== GUARDAR/EDITAR DETALLE (EXISTENTE) ====================
  async function handleGuardarDetalle() {
    if (!detalleForm.fecha_agenda || !detalleForm.hora_agenda) {
      toast.warning("Completa fecha y hora de agenda");
      return;
    }

    if (!oportunidad?.id) {
      toast.error("No se encontró la oportunidad");
      return;
    }

    try {
      setGuardandoDetalle(true);

      const payload = {
        fecha_agenda: normalizeDateInput(detalleForm.fecha_agenda),
        hora_agenda: normalizeTimeInput(detalleForm.hora_agenda),
      };

      let res;

      if (editingDetalleId) {
        res = await fetch(
          `${baseApi}/${oportunidad.id}/detalles/${editingDetalleId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          }
        );
      } else {
        res = await fetch(`${baseApi}/${oportunidad.id}/detalles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await parseSafeResponse(res);

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo guardar el detalle");
      }

      toast.success(
        editingDetalleId ? "Detalle actualizado" : "Detalle de agenda creado"
      );

      setDetalleForm(EMPTY_DETALLE);
      setEditingDetalleId(null);
      setMostrandoFormularioDetalleNuevo(false);
      loadDetalles(oportunidad.id);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error al guardar detalle");
    } finally {
      setGuardandoDetalle(false);
    }
  }

  async function handleEditarDetalle(detalle) {
    setEditingDetalleId(detalle.id);
    setDetalleForm({
      fecha_agenda: normalizeDateInput(detalle.fecha_agenda),
      hora_agenda: normalizeTimeInput(detalle.hora_agenda),
    });
  }

  async function handleEliminarDetalle(detalleId) {
    if (!oportunidad?.id) {
      toast.error("No se encontró la oportunidad");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(
        `${baseApi}/${oportunidad.id}/detalles/${detalleId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const data = await parseSafeResponse(res);
        throw new Error(data?.message || "No se pudo eliminar el detalle");
      }

      toast.success("Detalle eliminado");
      loadDetalles(oportunidad.id);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error al eliminar detalle");
    } finally {
      setLoading(false);
    }
  }

  // ==================== GESTIONAR ACTIVIDADES LOCALES ====================
  function handleAgregarActividadLocal() {
    if (!actividadForm.detalle.trim()) {
      toast.warning("Completa el detalle de la actividad");
      return;
    }

    const nuevaActividad = {
      id: `local-${Date.now()}`,
      etapasconversion_id: actividadForm.etapasconversion_id === "sin-cambio" ? null : Number(actividadForm.etapasconversion_id),
      detalle: actividadForm.detalle,
      created_by: Number(currentUserId),
      created_by_name: user?.fullname || user?.username,
      created_at: new Date().toISOString(),
    };

    if (editingActividadLocalId) {
      setActividadesLocales(
        actividadesLocales.map((a) =>
          a.id === editingActividadLocalId ? nuevaActividad : a
        )
      );
      setEditingActividadLocalId(null);
      toast.success("Actividad actualizada");
    } else {
      setActividadesLocales([...actividadesLocales, nuevaActividad]);
      toast.success("Actividad agregada");
    }

    setActividadForm(EMPTY_ACTIVIDAD);
  }

  function handleEditarActividadLocal(actividad) {
    setEditingActividadLocalId(actividad.id);
    setActividadForm({
      etapasconversion_id: actividad.etapasconversion_id ? String(actividad.etapasconversion_id) : "sin-cambio",
      detalle: actividad.detalle,
    });
  }

  function handleEliminarActividadLocal(actividadId) {
    setActividadesLocales(actividadesLocales.filter((a) => a.id !== actividadId));
    if (editingActividadLocalId === actividadId) {
      setEditingActividadLocalId(null);
      setActividadForm(EMPTY_ACTIVIDAD);
    }
    toast.success("Actividad eliminada");
  }

  // ==================== GUARDAR ACTIVIDAD ====================
  async function handleGuardarActividad() {
    if (!actividadForm.detalle.trim()) {
      toast.warning("Completa el detalle de la actividad");
      return;
    }

    if (!oportunidad?.id) {
      toast.error("No se encontró la oportunidad");
      return;
    }

    try {
      setGuardandoActividad(true);

      const etapaId =
        actividadForm.etapasconversion_id !== "sin-cambio"
          ? Number(actividadForm.etapasconversion_id)
          : null;

      const payload = {
        oportunidad_id: Number(oportunidad.id),
        etapasconversion_id: etapaId,
        detalle: actividadForm.detalle,
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

      if (etapaId) {
        const updateRes = await fetch(
          `${baseApi}/${oportunidad.id}/etapa`,
          {
            method: "PATCH",
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

      setActividadForm(EMPTY_ACTIVIDAD);
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
      !form.origen_id ||
      !form.etapasconversion_id
    ) {
      toast.error("Completa los campos obligatorios");
      return;
    }

    // Si hay usuario asignado, requiere detalles Y actividades
    if (form.asignado_a && form.asignado_a !== "sin-asignar") {
      if (detallesLocales.length === 0) {
        toast.error("Debes agregar un detalle de agenda");
        return;
      }
      if (actividadesLocales.length === 0) {
        toast.error("Debes agregar al menos una actividad");
        return;
      }
    }

    // ==================== VALIDAR OPORTUNIDAD ACTIVA ====================
    try {
      setGuardandoOportunidad(true);

      const oportunidadActiva = await verificarOportunidadActiva(form.cliente_id);

      if (oportunidadActiva) {
        const numeroOportunidad =
          oportunidadActiva.oportunidad_id || `OPO-${oportunidadActiva.id}`;
        
        toast.error(
          `No se puede crear una nueva oportunidad. Ya existe una oportunidad activa para este cliente: ${numeroOportunidad}`
        );
        return;
      }

      const payload = {
        cliente_id: Number(form.cliente_id),
        origen_id: Number(form.origen_id),
        suborigen_id: form.suborigen_id ? Number(form.suborigen_id) : null,
        detalle: form.detalle || "",
        etapasconversion_id: Number(form.etapasconversion_id),
        created_by: Number(currentUserId),
        asignado_a: getAsignadoAValue(),
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

      const oportunidadId = data.id;
      const numeroOportunidadNueva =
        data.oportunidad_id || `OPO-${oportunidadId}`;

      // Guardar detalles
      if (form.asignado_a && form.asignado_a !== "sin-asignar" && detallesLocales.length > 0) {
        for (const detalle of detallesLocales) {
          try {
            await fetch(`${baseApi}/${oportunidadId}/detalles`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                fecha_agenda: detalle.fecha_agenda,
                hora_agenda: detalle.hora_agenda,
              }),
            });
          } catch (error) {
            console.error("Error al guardar detalle:", error);
          }
        }
      }

      // Guardar actividades
      if (actividadesLocales.length > 0) {
        for (const actividad of actividadesLocales) {
          try {
            await fetch("/api/actividades-oportunidades", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                oportunidad_id: Number(oportunidadId),
                etapasconversion_id: actividad.etapasconversion_id,
                detalle: actividad.detalle,
                created_by: Number(currentUserId),
              }),
            });

            // Si la actividad tiene cambio de etapa, actualizar
            if (actividad.etapasconversion_id) {
              await fetch(`${baseApi}/${oportunidadId}/etapa`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  etapasconversion_id: actividad.etapasconversion_id,
                }),
              });
            }
          } catch (error) {
            console.error("Error al guardar actividad:", error);
          }
        }
      }

      toast.success(
        `${recordLabelCap} creada: ${numeroOportunidadNueva}`
      );

      onSuccess?.(data);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || `No se pudo guardar la ${recordLabel}`);
    } finally {
      setGuardandoOportunidad(false);
    }
  }

  async function handleUpdate() {
    if (!oportunidad?.id) {
      toast.error(`No se encontró la ${recordLabel} a editar`);
      return;
    }

    try {
      setLoading(true);

      const payload = {
        suborigen_id: form.suborigen_id ? Number(form.suborigen_id) : null,
        detalle: form.detalle || "",
        etapasconversion_id: Number(form.etapasconversion_id),
        asignado_a: getAsignadoAValue(),
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

      toast.success(data?.message || `${recordLabelCap} actualizada`);
      onSuccess?.(data);
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || `No se pudo actualizar la ${recordLabel}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (isEdit) return handleUpdate();
    return handleCreate();
  }

  const etapaActual = etapas.find(
    (e) => String(e.id) === String(form.etapasconversion_id)
  );

  const clienteActual = clientes.find(
    (c) => String(c.id) === String(form.cliente_id)
  );

  const detallesAMostrar = isNew ? detallesLocales : detalles;
  const actividadesAMostrar = isNew ? actividadesLocales : actividades;
  const isCreating = guardandoOportunidad || loading || guardandoDetalle || guardandoActividad;

  // Mostrar detalles si hay usuario asignado o si es view/edit
  const mostrarSeccionDetalles =
    !isNew ||
    (form.asignado_a && form.asignado_a !== "sin-asignar") ||
    mostrarDetallesAlAsignar;

  return (
    <TooltipProvider>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!isCreating) {
            onOpenChange(value);
            if (!value) {
              setMode("new");
              setMostrandoFormularioDetalleNuevo(false);
              setEditingDetalleId(null);
            }
          }
        }}
      >
        <DialogContent className="max-w-5xl h-[95vh] flex flex-col overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-2xl">
                  {isNew && `Nueva ${recordLabel}`}
                  {isView && `Detalle de ${recordLabel}`}
                  {isEdit && `Editar ${recordLabel}`}
                </DialogTitle>

                {!isNew && oportunidad?.oportunidad_id && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Código:{" "}
                    <span className="font-semibold text-foreground">
                      {oportunidad.oportunidad_id}
                    </span>
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
                        onClick={() =>
                          router.push(`/oportunidades/${oportunidad.id}`)
                        }
                        disabled={isCreating}
                        size="sm"
                        className="gap-2"
                      >
                        <ExternalLink size={16} />
                        Abrir
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Abrir detalle completo de esta oportunidad
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant={isEdit ? "default" : "outline"}
                        onClick={() => setMode("edit")}
                        disabled={isCreating}
                        size="sm"
                        className="gap-2"
                      >
                        <Edit2 size={16} />
                        Editar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Modificar datos de esta oportunidad
                    </TooltipContent>
                  </Tooltip>

                  {isEdit && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setMostrandoFormularioDetalleNuevo(true);
                            setDetalleForm(EMPTY_DETALLE);
                          }}
                          disabled={isCreating}
                          size="sm"
                          className="gap-2"
                        >
                          <RotateCcw size={16} />
                          Reprogramar
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Agregar nueva agenda (reprogramar)
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
            </div>
          </DialogHeader>

          {/* CONTENIDO SCROLLEABLE */}
          <div className="flex-1 overflow-y-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-[#5d16ec]">
                    Cliente *{" "}
                    {isEdit && (
                      <span className="text-xs text-muted-foreground">
                        (No editable)
                      </span>
                    )}
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info
                        size={14}
                        className="text-muted-foreground cursor-help text-red-500"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Selecciona el cliente para esta oportunidad
                    </TooltipContent>
                  </Tooltip>
                </div>
                {isNew ? (
                  <Combobox
                    items={clientes}
                    value={form.cliente_id}
                    onChange={(value) => updateField("cliente_id", value)}
                    placeholder="Buscar cliente..."
                    disabled={isFieldDisabled("cliente_id")}
                  />
                ) : (
                  <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted font-medium">
                    {clienteActual
                      ? getLabel(clienteActual)
                      : "Seleccionar cliente"}
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium block mb-2 text-[#5d16ec]">
                  Creado por
                </label>
                <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted font-medium">
                  {user?.fullname || user?.username || `ID ${currentUserId || ""}`}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2 ">
                  <label className="text-sm font-medium text-[#5d16ec]">Origen *</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info
                        size={14}
                        className="text-muted-foreground cursor-help text-red-500"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      De dónde proviene esta oportunidad
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Combobox
                  items={origenes}
                  value={form.origen_id}
                  onChange={(value) => {
                    updateField("origen_id", value);
                    updateField("suborigen_id", "");
                  }}
                  placeholder="Buscar origen..."
                  disabled={isFieldDisabled("origen_id")}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2 text-[#5d16ec]">
                  Suborigen
                </label>
                <Combobox
                  items={suborigenes}
                  value={form.suborigen_id}
                  onChange={(value) => updateField("suborigen_id", value)}
                  placeholder={
                    loadingSuborigenes
                      ? "Cargando..."
                      : "Buscar suborigen..."
                  }
                  disabled={
                    !form.origen_id ||
                    loadingSuborigenes ||
                    isFieldDisabled("suborigen_id")
                  }
                />
              </div>

              <div className="md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-sm font-medium text-[#5d16ec]">Detalle</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info
                        size={14}
                        className="text-muted-foreground cursor-help text-red-500"
                      />
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Descripción detallada de la oportunidad
                    </TooltipContent>
                  </Tooltip>
                </div>
                <textarea
                  className="w-full h-20 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={form.detalle}
                  onChange={(e) => updateField("detalle", e.target.value)}
                  placeholder="Detalles de la oportunidad..."
                  disabled={isFieldDisabled("detalle")}
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-2 text-[#5d16ec]">
                  Etapa actual
                </label>
                <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-[#5d16ec]/20 font-medium text-[#5d16ec]">
                  {etapaActual ? getLabel(etapaActual) : "Nuevo"}
                </div>
              </div>

              {permViewAll && (
                <div>
                  <label className="text-sm font-medium block mb-2 text-[#5d16ec]">
                    Asignado a
                  </label>
                  <Combobox
                    items={[
                      { id: "sin-asignar", fullname: "Sin asignar" },
                      ...usuariosActivos,
                    ]}
                    value={form.asignado_a || "sin-asignar"}
                    onChange={(value) => updateField("asignado_a", value)}
                    placeholder="Buscar usuario..."
                    disabled={isFieldDisabled("asignado_a")}
                  />
                  {form.asignado_a &&
                    form.asignado_a !== "sin-asignar" && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ La etapa cambiará a "Asignado" automáticamente
                      </p>
                    )}
                </div>
              )}

              {!permViewAll && (
                <div>
                  <label className="text-sm font-medium block mb-2">
                    Asignado a
                  </label>
                  <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted font-medium">
                    {user?.fullname ||
                      user?.username ||
                      `ID ${currentUserId || ""}`}
                  </div>
                </div>
              )}

              {/* DETALLES DE AGENDA - MOSTRAR SIEMPRE */}
              <div className="md:col-span-2 space-y-4 pt-6 border-t-2 border-slate-200">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4 space-y-3 border border-green-200">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-green-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Histórico de agendas
                      {isNew &&
                        form.asignado_a &&
                        form.asignado_a !== "sin-asignar" &&
                        " (Obligatorio)"}
                    </h3>
                  </div>

                  {isNew &&
                    form.asignado_a &&
                    form.asignado_a !== "sin-asignar" &&
                    detallesAMostrar.length === 0 && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <AlertCircle
                          size={16}
                          className="flex-shrink-0 mt-0.5"
                        />
                        <p>
                          Debes agregar un detalle de agenda
                        </p>
                      </div>
                    )}

                  {/* LISTA DE DETALLES PRIMERO */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History size={16} className="text-green-600" />
                        <h4 className="text-sm font-semibold text-slate-900">
                          Agendas ({detallesAMostrar.length})
                        </h4>
                      </div>
                    </div>

                    {loadingDetalles ? (
                      <div className="text-center text-muted-foreground text-sm py-4 bg-white rounded border">
                        <Loader className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : detallesAMostrar.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-4 bg-white rounded border border-dashed border-slate-300">
                        No hay agendas registradas
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2">
                        {detallesAMostrar.map((detalle) => (
                          <div
                            key={detalle.id}
                            className="border border-green-200 rounded p-3 bg-white text-sm space-y-2 hover:shadow-md hover:border-green-400 transition-all"
                          >
                            <div className="flex justify-between items-center gap-2">
                              <div className="flex items-center gap-3">
                                <div>
                                  <p className="font-semibold text-slate-800">
                                    📅{" "}
                                    {formatDetallesFecha(
                                      detalle.fecha_agenda
                                    )}
                                  </p>
                                </div>
                                <div>
                                  <p className="font-semibold text-slate-800">
                                    🕐{" "}
                                    {formatDetallesHora(
                                      detalle.hora_agenda
                                    )}
                                  </p>
                                </div>
                              </div>
                              {(isEdit && editingDetalleId === detalle.id) && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() =>
                                          handleGuardarDetalle()
                                        }
                                        size="sm"
                                        variant="default"
                                        className="h-8 px-2 bg-green-600 hover:bg-green-700"
                                        disabled={isCreating}
                                      >
                                        Guardar
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      Guardar cambios
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                              {(isEdit && editingDetalleId !== detalle.id) && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() =>
                                          handleEditarDetalle(detalle)
                                        }
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        disabled={isCreating}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      Editar
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                              {isNew && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() =>
                                          handleEditarDetalleLocal(detalle)
                                        }
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        disabled={isCreating}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      Editar
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() =>
                                          handleEliminarDetalleLocal(
                                            detalle.id
                                          )
                                        }
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        disabled={isCreating}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      Eliminar
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* FORMULARIO DETALLE - SOLO NUEVAS O EDITAR CON BOTÓN REPROGRAMAR */}
                  {isNew && detallesLocales.length === 0 && (
                    <div className="pt-3 border-t border-green-200 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-2">
                            Fecha agenda *
                          </label>
                          <input
                            type="date"
                            className="w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            value={detalleForm.fecha_agenda}
                            onChange={(e) =>
                              updateDetalleField("fecha_agenda", e.target.value)
                            }
                            disabled={isCreating}
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-slate-700 block mb-2">
                            Hora agenda *
                          </label>
                          <input
                            type="time"
                            className="w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                            step="300"
                            value={detalleForm.hora_agenda}
                            onChange={(e) =>
                              updateDetalleField("hora_agenda", e.target.value)
                            }
                            disabled={isCreating}
                          />
                        </div>
                      </div>

                      <Button
                        onClick={handleAgregarDetalleLocal}
                        disabled={isCreating}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="sm"
                      >
                        <Plus size={16} className="mr-1" />
                        Agregar detalle de agenda
                      </Button>
                    </div>
                  )}

                  {isEdit && (
                    <div className="pt-3 border-t border-green-200 space-y-3">
                      {editingDetalleId && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium text-slate-700 block mb-2">
                                Fecha agenda *
                              </label>
                              <input
                                type="date"
                                className="w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                value={detalleForm.fecha_agenda}
                                onChange={(e) =>
                                  updateDetalleField("fecha_agenda", e.target.value)
                                }
                                disabled={isCreating}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-slate-700 block mb-2">
                                Hora agenda *
                              </label>
                              <input
                                type="time"
                                className="w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                                step="300"
                                value={detalleForm.hora_agenda}
                                onChange={(e) =>
                                  updateDetalleField("hora_agenda", e.target.value)
                                }
                                disabled={isCreating}
                              />
                            </div>
                          </div>

                          <Button
                            onClick={handleGuardarDetalle}
                            disabled={isCreating || guardandoDetalle}
                            className="w-full bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            {guardandoDetalle ? (
                              <>
                                <Loader className="h-4 w-4 animate-spin mr-1" />
                                Guardando...
                              </>
                            ) : (
                              "Guardar cambios"
                            )}
                          </Button>
                        </>
                      )}

                      {!editingDetalleId && !mostrandoFormularioDetalleNuevo && (
                        <Button
                          onClick={() => {
                            setMostrandoFormularioDetalleNuevo(true);
                            setDetalleForm(EMPTY_DETALLE);
                          }}
                          disabled={isCreating}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <Plus size={16} className="mr-1" />
                          Reprogramar (Agregar nueva agenda)
                        </Button>
                      )}

                      {mostrandoFormularioDetalleNuevo && !editingDetalleId && (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="text-sm font-medium text-slate-700 block mb-2">
                                Fecha agenda *
                              </label>
                              <input
                                type="date"
                                className="w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                value={detalleForm.fecha_agenda}
                                onChange={(e) =>
                                  updateDetalleField("fecha_agenda", e.target.value)
                                }
                                disabled={isCreating}
                              />
                            </div>

                            <div>
                              <label className="text-sm font-medium text-slate-700 block mb-2">
                                Hora agenda *
                              </label>
                              <input
                                type="time"
                                className="w-full h-10 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                                step="300"
                                value={detalleForm.hora_agenda}
                                onChange={(e) =>
                                  updateDetalleField("hora_agenda", e.target.value)
                                }
                                disabled={isCreating}
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              onClick={handleGuardarDetalle}
                              disabled={isCreating || guardandoDetalle}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              size="sm"
                            >
                              {guardandoDetalle ? (
                                <>
                                  <Loader className="h-4 w-4 animate-spin mr-1" />
                                  Guardando...
                                </>
                              ) : (
                                "Crear nueva agenda"
                              )}
                            </Button>
                            <Button
                              onClick={() => {
                                setMostrandoFormularioDetalleNuevo(false);
                                setDetalleForm(EMPTY_DETALLE);
                              }}
                              disabled={isCreating}
                              variant="outline"
                              size="sm"
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* ACTIVIDADES - MOSTRAR SIEMPRE */}
              <div className="md:col-span-2 space-y-4 pt-6 border-t-2 border-slate-200">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 space-y-3 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Actividades
                      {isNew &&
                        form.asignado_a &&
                        form.asignado_a !== "sin-asignar" &&
                        " (Obligatorio)"}
                    </h3>
                  </div>

                  {isNew &&
                    form.asignado_a &&
                    form.asignado_a !== "sin-asignar" &&
                    actividadesAMostrar.length === 0 && (
                      <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                        <AlertCircle
                          size={16}
                          className="flex-shrink-0 mt-0.5"
                        />
                        <p>
                          Debes agregar al menos una actividad
                        </p>
                      </div>
                    )}

                  {(isNew || isEdit) && (
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">
                          Próxima etapa (opcional)
                        </label>
                        <Select
                          value={actividadForm.etapasconversion_id}
                          onValueChange={(value) =>
                            updateActividadField("etapasconversion_id", value)
                          }
                          disabled={isCreating}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Seleccionar etapa" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sin-cambio">
                              Sin cambio de etapa
                            </SelectItem>
                            {etapas.map((item) => (
                              <SelectItem key={item.id} value={String(item.id)}>
                                {getLabel(item)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-700 block mb-2">
                          Detalle de la actividad *
                        </label>
                        <textarea
                          className="w-full h-20 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                          value={actividadForm.detalle}
                          onChange={(e) =>
                            updateActividadField("detalle", e.target.value)
                          }
                          placeholder="Describe qué acción se realizó, qué se comentó, etc."
                          disabled={isCreating}
                        />
                      </div>

                      <Button
                        onClick={
                          isNew
                            ? handleAgregarActividadLocal
                            : handleGuardarActividad
                        }
                        disabled={isCreating}
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        size="sm"
                      >
                        <Plus size={16} className="mr-1" />
                        {isNew
                          ? "Agregar actividad"
                          : editingActividadLocalId
                            ? "Actualizar actividad"
                            : "Crear actividad"}
                      </Button>
                    </div>
                  )}
                </div>

                {/* LISTA DE ACTIVIDADES */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-slate-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Actividades ({actividadesAMostrar.length})
                    </h3>
                  </div>

                  {loadingActividades ? (
                    <div className="text-center text-muted-foreground text-sm py-4 bg-slate-50 rounded">
                      Cargando...
                    </div>
                  ) : actividadesAMostrar.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-4 bg-slate-50 rounded border border-dashed border-slate-300">
                      No hay actividades
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                      {actividadesAMostrar.map((actividad) => {
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
                              <div className="flex-1">
                                <p className="font-semibold text-slate-800 line-clamp-2">
                                  {actividad.detalle}
                                </p>
                              </div>
                              {(isNew || isEdit) && (
                                <div className="flex gap-1 flex-shrink-0">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() =>
                                          isNew
                                            ? handleEditarActividadLocal(
                                                actividad
                                              )
                                            : undefined
                                        }
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        disabled={isCreating || isEdit}
                                      >
                                        <Edit2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      Editar
                                    </TooltipContent>
                                  </Tooltip>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() =>
                                          isNew
                                            ? handleEliminarActividadLocal(
                                                actividad.id
                                              )
                                            : undefined
                                        }
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                        disabled={isCreating || isEdit}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left">
                                      Eliminar
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                            </div>

                            {etapaActividad && (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                                  {getLabel(etapaActividad)}
                                </span>
                              </div>
                            )}
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
              disabled={isCreating}
              className="gap-2"
            >
              Cancelar
            </Button>

            {(isNew || isEdit) && (
              <Button
                onClick={handleSave}
                disabled={
                  isCreating ||
                  (isNew &&
                    form.asignado_a &&
                    form.asignado_a !== "sin-asignar" &&
                    (detallesAMostrar.length === 0 ||
                      actividadesAMostrar.length === 0))
                }
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                {guardandoOportunidad ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : isEdit ? (
                  "Guardar cambios"
                ) : (
                  `Crear oportunidad`
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}