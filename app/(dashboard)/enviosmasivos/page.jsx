"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function getAuthHeaders() {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  const token = match ? match[1] : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function toDatetimeLocal(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function getStatusLabel(status) {
  if (status === "scheduled") return "Programado";
  if (status === "running") return "En ejecución";
  if (status === "completed") return "Finalizado";
  if (status === "failed") return "Fallido";
  if (status === "cancelled") return "Cancelado";
  return "Borrador";
}

function formatLocalDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStepTitle(step) {
  if (step === 0) return "Reglas de envío";
  if (step === 1) return "Plantilla de WhatsApp";
  return "Vista preliminar";
}


function getFilterContextByCampaignType(campaignType) {
  if (campaignType === "ventas") {
    return {
      title: "Intereses de compra",
      description: "Se cruza con oportunidades activas y tabla de intereses de ventas por marca/modelo.",
      marcaLabel: "Marca de interes (multiple)",
      modeloLabel: "Modelo de interes (multiple)",
      showEtapas: true,
      etapasLabel: "Etapa de conversión",
    };
  }

  return {
    title: "Parque vehicular postventa",
    description: "Se filtra sobre vehiculos del cliente por marca/modelo/anio para mantenimiento y servicio.",
    marcaLabel: "Marca del vehiculo (multiple)",
    modeloLabel: "Modelo del vehiculo (multiple)",
    showEtapas: false,
    anioLabel: "Ano del vehiculo",
  };
}

export default function EnviosMasivosPage() {
  const canView = useRequirePerm("mensajes", "view");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dispatchingId, setDispatchingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [syncingInterests, setSyncingInterests] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [campaignDetail, setCampaignDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);

  // ── Template aprobada de Meta ─────────────────────────────────────
  const [inboxes, setInboxes] = useState([]);
  const [inboxesLoading, setInboxesLoading] = useState(false);
  const [campaignTemplates, setCampaignTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [selectedInboxId, setSelectedInboxId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [form, setForm] = useState({
    campaign_name: "",
    campaign_type: "postventa",
    send_type: "personalizado",
    send_now: true,
    scheduled_at: toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
    filters: {
      marca_ids: [],
      modelo_ids: [],
      anio: "",
      etapa_ids: [],
    },
    content: {
      whatsapp_template_name: "",
      whatsapp_template_language: "es",
      whatsapp_template_variables: [],
    },
  });

  const [preview, setPreview] = useState({ total: 0, sample: [] });

  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [etapas, setEtapas] = useState([]);

  function resetWizardState() {
    setStep(0);
    setPreview({ total: 0, sample: [] });
    setForm({
      campaign_name: "",
      campaign_type: "postventa",
      send_type: "personalizado",
      send_now: true,
      scheduled_at: toDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000)),
      filters: {
        marca_ids: [],
        modelo_ids: [],
        anio: "",
        etapa_ids: [],
      },
      content: {
        whatsapp_template_name: "",
        whatsapp_template_language: "es",
        whatsapp_template_variables: [],
      },
    });
    setSelectedTemplate(null);
    setSelectedInboxId("");
  }

  const filterContext = useMemo(
    () => getFilterContextByCampaignType(form.campaign_type),
    [form.campaign_type]
  );

  const filterPreviewKey = useMemo(
    () => JSON.stringify({
      campaign_type: form.campaign_type,
      marca_ids: form.filters.marca_ids,
      modelo_ids: form.filters.modelo_ids,
      anio: form.filters.anio,
      etapa_ids: form.filters.etapa_ids,
    }),
    [form.campaign_type, form.filters.anio, form.filters.marca_ids, form.filters.modelo_ids, form.filters.etapa_ids]
  );

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/envios-masivos", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo cargar campañas");
      }

      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error?.message || "Error cargando campañas");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCatalogs = useCallback(async () => {
    try {
      const [marcasRes, modelosRes, etapasRes] = await Promise.all([
        fetch("/api/marcas", { cache: "no-store" }),
        fetch("/api/modelos", { cache: "no-store" }),
        fetch("/api/etapasconversion", { cache: "no-store" }),
      ]);

      const [marcasData, modelosData, etapasData] = await Promise.all([
        marcasRes.json(),
        modelosRes.json(),
        etapasRes.json(),
      ]);

      if (!marcasRes.ok || !modelosRes.ok) {
        throw new Error("No se pudieron cargar catálogos");
      }

      setMarcas(Array.isArray(marcasData) ? marcasData : []);
      setModelos(Array.isArray(modelosData) ? modelosData : []);
      setEtapas(Array.isArray(etapasData) ? etapasData : []);
    } catch (error) {
      toast.error(error?.message || "Error cargando catálogos");
      setMarcas([]);
      setModelos([]);
      setEtapas([]);
    }
  }, []);

  const loadInboxes = useCallback(async () => {
    setInboxesLoading(true);
    try {
      const res = await fetch("/api/chatwoot/inboxes?channel_type=Channel::Whatsapp", {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error cargando inboxes");
      setInboxes(Array.isArray(data?.inboxes) ? data.inboxes : []);
    } catch (err) {
      toast.error(err?.message || "Error cargando bandejas WhatsApp");
      setInboxes([]);
    } finally {
      setInboxesLoading(false);
    }
  }, []);

  const loadCampaignTemplates = useCallback(async (inboxId) => {
    if (!inboxId) return;
    setTemplatesLoading(true);
    setCampaignTemplates([]);
    try {
      const res = await fetch(`/api/chatwoot/templates?inbox_id=${inboxId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error cargando plantillas");
      setCampaignTemplates(Array.isArray(data?.templates) ? data.templates : []);
    } catch (err) {
      toast.error(err?.message || "Error cargando plantillas");
      setCampaignTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canView) return;
    loadRows();
    loadCatalogs();
    loadInboxes();
  }, [canView]);

  useEffect(() => {
    if (!canView) return;

    const timer = setInterval(() => {
      loadRows();
    }, 30000);

    return () => clearInterval(timer);
  }, [canView, loadRows]);

  const modelosFiltrados = useMemo(() => {
    const selectedMarcaIds = Array.isArray(form.filters.marca_ids)
      ? form.filters.marca_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id) && id > 0)
      : [];

    if (!selectedMarcaIds.length) return modelos;
    return modelos.filter((m) => selectedMarcaIds.includes(Number(m?.marca_id || 0)));
  }, [modelos, form.filters.marca_ids]);

  useEffect(() => {
    const allowedModelIds = new Set(modelosFiltrados.map((m) => Number(m.id)));
    setForm((prev) => {
      const current = Array.isArray(prev.filters.modelo_ids) ? prev.filters.modelo_ids : [];
      const next = current.filter((id) => allowedModelIds.has(Number(id)));
      if (next.length === current.length) return prev;
      return {
        ...prev,
        filters: {
          ...prev.filters,
          modelo_ids: next,
        },
      };
    });
  }, [modelosFiltrados]);


  async function previewAudience(options = {}) {
    const silent = Boolean(options?.silent);

    try {
      setPreviewing(true);

      const res = await fetch("/api/envios-masivos/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_type: form.campaign_type,
          filters: form.filters,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo calcular audiencia");
      }

      setPreview({
        total: Number(data?.total || 0),
        sample: Array.isArray(data?.sample) ? data.sample : [],
      });

      if (!silent) {
        toast.success(`Audiencia calculada: ${Number(data?.total || 0)} clientes`);
      }
    } catch (error) {
      if (!silent) {
        toast.error(error?.message || "Error en vista previa");
      }
      setPreview({ total: 0, sample: [] });
    } finally {
      setPreviewing(false);
    }
  }

  useEffect(() => {
    if (!wizardOpen || step !== 0) return;

    const timer = setTimeout(() => {
      previewAudience({ silent: true });
    }, 350);

    return () => clearTimeout(timer);
  }, [wizardOpen, step, filterPreviewKey]);

  async function createCampaign() {
    try {
      setSaving(true);

      const payload = {
        campaign_name: form.campaign_name,
        campaign_type: form.campaign_type,
        send_type: "personalizado",
        send_now: form.send_now,
        scheduled_at: form.send_now ? null : form.scheduled_at,
        filters: form.filters,
        content: {
          template_source: "aprobada",
          template_mode: "texto",
          image_url: "",
          greeting: "",
          body: selectedTemplate?.body || "",
          closing: "",
          show_cta: false,
          message: selectedTemplate?.body || form.content.whatsapp_template_name,
          whatsapp_template_name: form.content.whatsapp_template_name,
          whatsapp_template_language: form.content.whatsapp_template_language || "es",
          whatsapp_template_variables: form.content.whatsapp_template_variables,
        },
      };

      const res = await fetch("/api/envios-masivos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo crear campaña");
      }

      toast.success(data?.message || "Campaña creada");
  setWizardOpen(false);
  resetWizardState();
      await loadRows();
    } catch (error) {
      toast.error(error?.message || "Error guardando campaña");
    } finally {
      setSaving(false);
    }
  }

  async function goToTemplateStep() {
    if (!String(form.campaign_name || "").trim()) {
      toast.error("Ingresa el nombre del envío");
      return;
    }

    if (!form.send_now && !String(form.scheduled_at || "").trim()) {
      toast.error("Selecciona fecha y hora de envío");
      return;
    }

    await previewAudience({ silent: true });
    setStep(1);
  }

  function goToPreviewStep() {
    if (!form.content.whatsapp_template_name?.trim()) {
      toast.error("Seleccioná una plantilla aprobada de Meta");
      return;
    }
    setStep(2);
  }

  async function dispatchCampaign(id) {
    try {
      setDispatchingId(id);
      const res = await fetch(`/api/envios-masivos/${id}/dispatch`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo despachar la campaña");
      }

      toast.success("Campaña encolada correctamente");
      await loadRows();
    } catch (error) {
      toast.error(error?.message || "Error al ejecutar campaña");
    } finally {
      setDispatchingId(null);
    }
  }

  async function handleDeleteCampaign(id) {
    try {
      setDeletingId(id);
      const res = await fetch(`/api/envios-masivos/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo eliminar la campaña");
      }
      toast.success("Campaña eliminada");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      toast.error(error?.message || "Error al eliminar campaña");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  async function syncInteresesVentas() {
    try {
      setSyncingInterests(true);
      const res = await fetch("/api/envios-masivos/sync-intereses", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo sincronizar intereses");
      }

      toast.success(`Intereses sincronizados: ${Number(data?.total_seeded_interest_rows || 0)} registros base`);
    } catch (error) {
      toast.error(error?.message || "Error sincronizando intereses");
    } finally {
      setSyncingInterests(false);
    }
  }

  async function openCampaignDetail(id) {
    try {
      setDetailLoadingId(id);
      const res = await fetch(`/api/envios-masivos/${id}`, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo obtener detalle");
      }

      setCampaignDetail(data);
      setDetailOpen(true);
    } catch (error) {
      toast.error(error?.message || "Error cargando detalle");
    } finally {
      setDetailLoadingId(null);
    }
  }

  if (!canView) return null;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Envíos masivos WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Campañas de WhatsApp para ventas y postventa con programación y seguimiento.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={syncInteresesVentas} disabled={syncingInterests}>
            {syncingInterests ? "Sincronizando..." : "Sincronizar intereses"}
          </Button>
          <Button size="sm" variant="outline" onClick={loadRows} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            size="sm"
            onClick={() => {
              resetWizardState();
              setWizardOpen(true);
            }}
          >
            + Nuevo envío
          </Button>
        </div>
      </div>

      {/* ── Table section ──────────────────────────────────── */}
      <section className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Lista de envíos masivos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-xs uppercase text-muted-foreground">
                <th className="px-4 py-2.5">Nombre</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Fecha envío</th>
                <th className="px-4 py-2.5">Fin</th>
                <th className="px-4 py-2.5">Métricas</th>
                <th className="px-4 py-2.5">Estado</th>
                <th className="px-4 py-2.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium">{row.campaign_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      row.campaign_type === "ventas"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {row.campaign_type === "ventas" ? "Ventas" : "Postventa"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">{row.send_now ? "Inmediato" : formatLocalDate(row.scheduled_at)}</td>
                  <td className="px-4 py-3 text-xs">{formatLocalDate(row.finished_at) || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-slate-600">
                      <span className="text-slate-400">Enviados:</span> {Number(row.sent_count || 0)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {row.status === "running" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                        En progreso
                      </span>
                    )}
                    {row.status === "scheduled" && (
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                        Programado
                      </span>
                    )}
                    {row.status === "completed" && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        Completado
                      </span>
                    )}
                    {row.status === "failed" && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-700">
                        Fallido
                      </span>
                    )}
                    {row.status === "cancelled" && (
                      <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700">
                        Cancelado
                      </span>
                    )}
                    {!["running", "scheduled", "completed", "failed", "cancelled"].includes(row.status) && (
                      <span className="text-xs text-muted-foreground">{getStatusLabel(row.status)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openCampaignDetail(row.id)}
                        disabled={detailLoadingId === row.id}
                      >
                        {detailLoadingId === row.id ? "Cargando..." : "Detalle"}
                      </Button>
                      {row.status === "scheduled" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => dispatchCampaign(row.id)}
                            disabled={dispatchingId === row.id}
                          >
                            {dispatchingId === row.id ? "..." : "Ejecutar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:border-red-300 hover:bg-red-50"
                            onClick={() => setConfirmDeleteId(row.id)}
                            disabled={deletingId === row.id}
                          >
                            Eliminar
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td className="px-4 py-8 text-sm text-muted-foreground" colSpan={7}>
                    {loading ? "Cargando..." : "No hay campañas registradas"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Wizard dialog ──────────────────────────────────── */}
      <Dialog
        open={wizardOpen}
        onOpenChange={(next) => {
          setWizardOpen(next);
          if (!next) resetWizardState();
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nuevo envío masivo</DialogTitle>
            <DialogDescription>{getStepTitle(step)}</DialogDescription>
          </DialogHeader>

          {/* Step indicator */}
          <div className="mb-4 flex items-center">
            {["Reglas de envío", "Plantilla", "Vista preliminar"].map((label, index) => {
              const done = index < step;
              const active = index === step;
              return (
                <div key={label} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                      done ? "bg-emerald-500 text-white" : active ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
                    }`}>
                      {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </div>
                    <span className={`text-[11px] leading-none ${active ? "font-semibold text-blue-700" : done ? "text-emerald-600" : "text-slate-400"}`}>
                      {label}
                    </span>
                  </div>
                  {index < 2 && (
                    <div className={`mx-1 mb-4 h-0.5 flex-1 transition-colors ${index < step ? "bg-emerald-400" : "bg-slate-200"}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Step 0: Filtros ────────────────────────────── */}
          {step === 0 && (
            <section className="space-y-4 rounded-xl border p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre del envío *</label>
                  <Input
                    value={form.campaign_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, campaign_name: e.target.value }))}
                    placeholder="Ingresa el nombre de tu nuevo envío masivo"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de campaña *</label>
                  <select
                    className="h-10 w-full rounded-md border px-3 text-sm"
                    value={form.campaign_type}
                    onChange={(e) => setForm((prev) => ({ ...prev, campaign_type: e.target.value }))}
                  >
                    <option value="postventa">Postventa</option>
                    <option value="ventas">Ventas</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de envío</label>
                  <div className="h-10 rounded-md border bg-slate-50 px-3 text-sm leading-10 text-blue-700">
                    Personalizado
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Canal</label>
                  <div className="h-10 rounded-md border bg-slate-50 px-3 text-sm leading-10">
                    WhatsApp
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Enviar ahora</label>
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={form.send_now}
                      onChange={(e) => setForm((prev) => ({ ...prev, send_now: e.target.checked }))}
                    />
                    Activar envío inmediato
                  </label>
                </div>
              </div>

              {!form.send_now && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha y hora de envío *</label>
                  <Input
                    type="datetime-local"
                    value={form.scheduled_at}
                    onChange={(e) => setForm((prev) => ({ ...prev, scheduled_at: e.target.value }))}
                  />
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{filterContext.marcaLabel}</label>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                    {marcas.map((marca) => {
                      const checked = Array.isArray(form.filters.marca_ids)
                        && form.filters.marca_ids.includes(Number(marca.id));

                      return (
                        <label key={marca.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setForm((prev) => {
                              const current = Array.isArray(prev.filters.marca_ids) ? prev.filters.marca_ids : [];
                              const next = e.target.checked
                                ? [...current, Number(marca.id)]
                                : current.filter((id) => Number(id) !== Number(marca.id));

                              return {
                                ...prev,
                                filters: {
                                  ...prev.filters,
                                  marca_ids: [...new Set(next)],
                                },
                              };
                            })}
                          />
                          {marca.name}
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{filterContext.modeloLabel}</label>
                  <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                    {modelosFiltrados.map((modelo) => {
                      const checked = Array.isArray(form.filters.modelo_ids) && form.filters.modelo_ids.includes(Number(modelo.id));
                      return (
                        <label key={modelo.id} className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setForm((prev) => {
                              const current = Array.isArray(prev.filters.modelo_ids) ? prev.filters.modelo_ids : [];
                              const next = e.target.checked
                                ? [...current, Number(modelo.id)]
                                : current.filter((id) => Number(id) !== Number(modelo.id));
                              return { ...prev, filters: { ...prev.filters, modelo_ids: [...new Set(next)] } };
                            })}
                          />
                          {modelo.name}
                        </label>
                      );
                    })}
                    {!modelosFiltrados.length && (
                      <p className="text-xs text-muted-foreground">Seleccioná una o más marcas para filtrar modelos.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {filterContext.showEtapas ? (
                    <>
                      <label className="text-sm font-medium">{filterContext.etapasLabel}</label>
                      <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                        {etapas.map((etapa) => {
                          const checked = Array.isArray(form.filters.etapa_ids) && form.filters.etapa_ids.includes(Number(etapa.id));
                          return (
                            <label key={etapa.id} className="flex cursor-pointer items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setForm((prev) => {
                                  const current = Array.isArray(prev.filters.etapa_ids) ? prev.filters.etapa_ids : [];
                                  const next = e.target.checked
                                    ? [...current, Number(etapa.id)]
                                    : current.filter((id) => Number(id) !== Number(etapa.id));
                                  return { ...prev, filters: { ...prev.filters, etapa_ids: [...new Set(next)] } };
                                })}
                              />
                              {etapa.nombre}
                            </label>
                          );
                        })}
                        {!etapas.length && (
                          <p className="text-xs text-muted-foreground">No hay etapas configuradas.</p>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <label className="text-sm font-medium">{filterContext.anioLabel}</label>
                      <Input
                        value={form.filters.anio}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          filters: { ...prev.filters, anio: e.target.value.replace(/\D/g, "").slice(0, 4) },
                        }))}
                        placeholder="Todos los años"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-md border border-dashed bg-slate-50 p-2 text-xs text-muted-foreground">
                <p className="font-medium text-slate-700">{filterContext.title}</p>
                <p>{filterContext.description}</p>
              </div>

              {/* Audience card */}
              <div className="rounded-xl border bg-blue-50 p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-blue-600">Clientes impactados</p>
                <p className="text-4xl font-bold text-blue-700">
                  {previewing ? <span className="text-2xl text-blue-400">...</span> : preview.total}
                </p>
                {preview.sample.length > 0 && (
                  <p className="mt-1.5 text-xs text-blue-500">
                    Muestra: {preview.sample.slice(0, 5).map((r) => r.recipient_name || r.phone).join(", ")}
                  </p>
                )}
              </div>
            </section>
          )}

          {/* ── Step 1: Plantilla ─────────────────────────── */}
          {step === 1 && (
            <section className="space-y-4 rounded-xl border p-4">
              {/* Info box */}
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-xs text-green-800">
                <p className="font-semibold">Solo plantillas aprobadas por Meta</p>
                <p>Los envíos masivos usan exclusivamente plantillas aprobadas. Esto garantiza la entrega independientemente de cuándo haya interactuado el cliente por última vez. Creá tus plantillas en <strong>Meta Business Manager → WhatsApp Manager → Plantillas de mensajes</strong>.</p>
              </div>

              <div className="space-y-4 rounded-xl border bg-slate-50 p-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Bandeja WhatsApp</label>
                  <select
                    className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                    value={selectedInboxId}
                    onChange={(e) => {
                      setSelectedInboxId(e.target.value);
                      setSelectedTemplate(null);
                      setForm((prev) => ({
                        ...prev,
                        content: { ...prev.content, whatsapp_template_name: "", whatsapp_template_variables: [] },
                      }));
                      loadCampaignTemplates(e.target.value);
                    }}
                  >
                    <option value="">{inboxesLoading ? "Cargando bandejas..." : "— Seleccioná una bandeja —"}</option>
                    {inboxes.map((inbox) => (
                      <option key={inbox.id} value={inbox.id}>{inbox.name}</option>
                    ))}
                  </select>
                </div>

                {selectedInboxId && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Plantilla aprobada</label>
                    <select
                      className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                      value={form.content.whatsapp_template_name}
                      onChange={(e) => {
                        const tmpl = campaignTemplates.find((t) => t.name === e.target.value) || null;
                        const bodyText = tmpl?.components?.find((c) => c.type === "BODY")?.text || "";
                        setSelectedTemplate(tmpl ? { ...tmpl, body: bodyText } : null);
                        const varCount = (bodyText.match(/\{\{(\d+)\}\}/g) || []).length;
                        setForm((prev) => ({
                          ...prev,
                          content: {
                            ...prev.content,
                            whatsapp_template_name: e.target.value,
                            whatsapp_template_language: tmpl?.language || prev.content.whatsapp_template_language,
                            whatsapp_template_variables: Array.from({ length: varCount }, (_, i) =>
                              i === 0 ? "{{nombre_cliente}}" : ""
                            ),
                          },
                        }));
                      }}
                    >
                      <option value="">{templatesLoading ? "Cargando plantillas..." : "— Seleccioná una plantilla —"}</option>
                      {campaignTemplates.map((t) => (
                        <option key={t.id ?? t.name} value={t.name}>{t.name} ({t.status ?? "aprobada"})</option>
                      ))}
                    </select>
                    {!templatesLoading && !campaignTemplates.length && selectedInboxId && (
                      <p className="text-xs text-muted-foreground">No hay plantillas aprobadas para esta bandeja. Creálas en Meta Business Manager.</p>
                    )}
                  </div>
                )}

                {selectedTemplate && (
                  <div className="space-y-3">
                    {/* WhatsApp bubble preview */}
                    <div className="rounded-xl border bg-[#e5ddd5] p-3">
                      <p className="mb-2 text-[11px] font-medium text-slate-500">Vista previa:</p>
                      <div className="mx-auto max-w-xs space-y-1">
                        <div className="rounded-lg rounded-tl-none bg-white p-3 text-xs leading-relaxed text-slate-800 shadow-sm whitespace-pre-wrap">
                          {selectedTemplate.body}
                        </div>
                        {selectedTemplate.components?.find((c) => c.type === "BUTTONS")?.buttons?.map((btn, i) => (
                          <button key={i} type="button" className="w-full rounded-lg bg-white py-1.5 text-xs font-semibold text-[#00a884] shadow-sm">
                            {btn.text}
                          </button>
                        ))}
                      </div>
                    </div>

                    {Array.isArray(form.content.whatsapp_template_variables) && form.content.whatsapp_template_variables.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Variables de la plantilla</p>
                        <p className="text-xs text-muted-foreground">
                          Usá <code className="rounded bg-slate-100 px-1">{"{{nombre_cliente}}"}</code> para insertar el nombre del destinatario automáticamente en cada envío.
                          También podés escribir un valor fijo (ej: <span className="italic">"tu próximo servicio"</span>).
                        </p>
                        {form.content.whatsapp_template_variables.map((val, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="w-16 shrink-0 text-xs text-muted-foreground">{`{{${idx + 1}}}`}</span>
                            <Input
                              value={val}
                              placeholder={idx === 0 ? "{{nombre_cliente}}" : `Valor para {{${idx + 1}}}`}
                              onChange={(e) => setForm((prev) => {
                                const next = [...prev.content.whatsapp_template_variables];
                                next[idx] = e.target.value;
                                return { ...prev, content: { ...prev.content, whatsapp_template_variables: next } };
                              })}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Idioma de la plantilla</label>
                      <select
                        className="h-10 w-full rounded-md border bg-white px-3 text-sm"
                        value={form.content.whatsapp_template_language}
                        onChange={(e) => setForm((prev) => ({
                          ...prev,
                          content: { ...prev.content, whatsapp_template_language: e.target.value },
                        }))}
                      >
                        <option value="es">Español (es)</option>
                        <option value="es_AR">Español Argentina (es_AR)</option>
                        <option value="es_MX">Español México (es_MX)</option>
                        <option value="es_PE">Español Perú (es_PE)</option>
                        <option value="en_US">Inglés (en_US)</option>
                        <option value="pt_BR">Portugués Brasil (pt_BR)</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Step 2: Vista preliminar ──────────────────── */}
          {step === 2 && (
            <section className="space-y-4 rounded-xl border p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Resumen de envío</h3>
                  <div className="space-y-2 rounded-xl border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Nombre</span>
                      <span className="font-medium">{form.campaign_name || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Tipo</span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        form.campaign_type === "ventas" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"
                      }`}>{form.campaign_type === "ventas" ? "Ventas" : "Postventa"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Plantilla</span>
                      <span className="font-mono text-xs">{form.content.whatsapp_template_name || "—"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Envío</span>
                      <span className="font-medium">{form.send_now ? "Inmediato" : form.scheduled_at}</span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="text-muted-foreground">Clientes impactados</span>
                      <span className="text-2xl font-bold text-blue-700">{preview.total}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Vista WhatsApp</h3>
                  <div className="rounded-xl border bg-[#e5ddd5] p-3">
                    <div className="mx-auto max-w-xs space-y-1">
                      <div className="rounded-lg rounded-tl-none bg-white p-3 text-xs leading-relaxed text-slate-800 shadow-sm whitespace-pre-wrap">
                        {selectedTemplate?.body || form.content.whatsapp_template_name || "Sin plantilla seleccionada"}
                      </div>
                      {selectedTemplate?.components?.find((c) => c.type === "BUTTONS")?.buttons?.map((btn, i) => (
                        <button key={i} type="button" className="w-full rounded-lg bg-white py-1.5 text-xs font-semibold text-[#00a884] shadow-sm">
                          {btn.text}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 text-center text-[11px] text-green-700">✓ Plantilla aprobada — entrega garantizada</p>
                  </div>
                </div>
              </div>
            </section>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => (step > 0 ? setStep(step - 1) : setWizardOpen(false))}>
              {step > 0 ? "Regresar" : "Cancelar"}
            </Button>
            {step === 0 && (
              <Button onClick={goToTemplateStep} disabled={previewing}>
                {previewing ? "Calculando..." : "Continuar"}
              </Button>
            )}
            {step === 1 && (
              <Button onClick={goToPreviewStep}>Continuar</Button>
            )}
            {step === 2 && (
              <Button onClick={createCampaign} disabled={saving}>
                <Send className="mr-2 h-4 w-4" />
                {saving ? "Guardando..." : "Crear envío"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail dialog ──────────────────────────────────── */}
      <Dialog
        open={detailOpen}
        onOpenChange={(next) => {
          setDetailOpen(next);
          if (!next) setCampaignDetail(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalle de envío masivo</DialogTitle>
            <DialogDescription>{campaignDetail?.campaign?.campaign_name || "Campaña"}</DialogDescription>
          </DialogHeader>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Enviados", value: campaignDetail?.campaign?.sent_count ?? 0, color: "text-blue-700", bg: "bg-blue-50" },
              { label: "Entregados", value: campaignDetail?.status_summary?.delivered ?? 0, color: "text-emerald-700", bg: "bg-emerald-50" },
              { label: "Respondieron", value: campaignDetail?.status_summary?.responded ?? 0, color: "text-violet-700", bg: "bg-violet-50" },
              { label: "Fallidos", value: campaignDetail?.status_summary?.failed ?? 0, color: "text-red-700", bg: "bg-red-50" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={`rounded-xl border p-3 ${bg}`}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-3xl font-bold ${color}`}>{Number(value)}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border p-3 text-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Campaña</p>
              <p><span className="text-muted-foreground">Tipo:</span> {campaignDetail?.campaign?.campaign_type || "—"}</p>
              <p><span className="text-muted-foreground">Estado:</span> {getStatusLabel(campaignDetail?.campaign?.status)}</p>
              <p><span className="text-muted-foreground">Creado por:</span> {campaignDetail?.campaign?.created_by_name || "—"}</p>
              <p><span className="text-muted-foreground">Creado:</span> {formatLocalDate(campaignDetail?.campaign?.created_at)}</p>
            </div>

            <div className="rounded-xl border p-3 text-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estados de entrega</p>
              <p>Pendientes: <span className="font-medium">{Number(campaignDetail?.status_summary?.pending || 0)}</span></p>
              <p>En cola: <span className="font-medium">{Number(campaignDetail?.status_summary?.queued || 0)}</span></p>
              <p>Entregados: <span className="font-medium">{Number(campaignDetail?.status_summary?.delivered || 0)}</span></p>
              <p>Leídos: <span className="font-medium">{Number(campaignDetail?.status_summary?.read || 0)}</span></p>
              <p>Respondieron: <span className="font-medium">{Number(campaignDetail?.status_summary?.responded || 0)}</span></p>
              <p>Fallidos: <span className="font-medium text-red-600">{Number(campaignDetail?.status_summary?.failed || 0)}</span></p>
            </div>

            <div className="rounded-xl border p-3 text-sm">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Acciones CTA</p>
              <p>Solicitaron contacto: <span className="font-medium text-blue-700">{Number(campaignDetail?.cta_summary?.contact || 0)}</span></p>
              <p>Detener promociones: <span className="font-medium text-orange-600">{Number(campaignDetail?.cta_summary?.stop_promotions || 0)}</span></p>
              <p>No mapeadas: <span className="font-medium">{Number(campaignDetail?.cta_summary?.unknown || 0)}</span></p>
              <p>Total acciones: <span className="font-bold">{Number(campaignDetail?.cta_summary?.total || 0)}</span></p>
            </div>
          </div>

          <div className="rounded-xl border">
            <div className="border-b px-3 py-2 text-sm font-semibold">Acciones CTA recientes</div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Acción</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {(campaignDetail?.cta_actions_recent || []).map((action) => (
                    <tr key={action.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2">{action.recipient_name || [action.cliente_nombre, action.cliente_apellido].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-3 py-2 capitalize">{String(action.action_type || "unknown").replace("_", " ")}</td>
                      <td className="px-3 py-2">{action.phone_normalized || "—"}</td>
                      <td className="px-3 py-2">{formatLocalDate(action.created_at)}</td>
                    </tr>
                  ))}
                  {!Array.isArray(campaignDetail?.cta_actions_recent) || !campaignDetail?.cta_actions_recent.length ? (
                    <tr>
                      <td className="px-3 py-4 text-muted-foreground" colSpan={4}>Sin acciones CTA registradas.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border">
            <div className="border-b px-3 py-2 text-sm font-semibold">Destinatarios recientes</div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Respondió</th>
                  </tr>
                </thead>
                <tbody>
                  {(campaignDetail?.recipients_recent || []).map((recipient) => (
                    <tr key={recipient.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2">{recipient.recipient_name || [recipient.cliente_nombre, recipient.cliente_apellido].filter(Boolean).join(" ") || "—"}</td>
                      <td className="px-3 py-2">{recipient.phone_normalized || "—"}</td>
                      <td className="px-3 py-2 capitalize">{recipient.status || "—"}</td>
                      <td className="px-3 py-2">{recipient.responded_at ? formatLocalDate(recipient.responded_at) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete dialog ──────────────────────────── */}
      <AlertDialog
        open={confirmDeleteId !== null}
        onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar campaña programada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminarán la campaña y todos sus destinatarios pendientes.
              Solo se pueden eliminar campañas con estado <strong>Programado</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => handleDeleteCampaign(confirmDeleteId)}
            >
              {deletingId === confirmDeleteId ? "Eliminando..." : "Sí, eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
