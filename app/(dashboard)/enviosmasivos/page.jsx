"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Circle, RefreshCw, Send, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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

function buildMessageFromTemplate(content) {
  const greeting = String(content?.greeting || "").trim();
  const body = String(content?.body || "").trim();
  const closing = String(content?.closing || "").trim();

  const blocks = [greeting, body, closing].filter(Boolean);

  if (content?.show_cta) {
    blocks.push('Presione el botón "QUIERO QUE ME CONTACTEN" y nos pondremos en contacto con usted.');
    blocks.push('Presione el botón "DETENER PROMOCIONES" para dejar de recibir estos mensajes.');
  }

  return blocks.join("\n\n");
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
  const [syncingInterests, setSyncingInterests] = useState(false);
  const [detailLoadingId, setDetailLoadingId] = useState(null);
  const [campaignDetail, setCampaignDetail] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);

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
      template_mode: "texto",
      image_url: "",
      greeting: "Hola, [Nombre de cliente]",
      body: "Tenemos una promoción especial para su próximo servicio de mantenimiento.",
      closing: "¡Estamos listos para atenderle!",
      show_cta: true,
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
        template_mode: "texto",
        image_url: "",
        greeting: "Hola, [Nombre de cliente]",
        body: "Tenemos una promoción especial para su próximo servicio de mantenimiento.",
        closing: "¡Estamos listos para atenderle!",
        show_cta: true,
      },
    });
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

  useEffect(() => {
    if (!canView) return;
    loadRows();
    loadCatalogs();
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

  async function uploadTemplateImage(file) {
    if (!file) return;

    try {
      setImageUploading(true);
      const body = new FormData();
      body.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo subir la imagen");
      }

      setForm((prev) => ({
        ...prev,
        content: {
          ...prev.content,
          image_url: data?.url || "",
        },
      }));

      toast.success("Imagen subida correctamente");
    } catch (error) {
      toast.error(error?.message || "Error subiendo imagen");
    } finally {
      setImageUploading(false);
    }
  }

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

      const finalMessage = buildMessageFromTemplate(form.content);

      const payload = {
        campaign_name: form.campaign_name,
        campaign_type: form.campaign_type,
        send_type: "personalizado",
        send_now: form.send_now,
        scheduled_at: form.send_now ? null : form.scheduled_at,
        filters: form.filters,
        content: {
          template_mode: form.content.template_mode,
          image_url: form.content.template_mode === "imagen_texto" ? form.content.image_url : "",
          greeting: form.content.greeting,
          body: form.content.body,
          closing: form.content.closing,
          show_cta: form.content.show_cta,
          message: finalMessage,
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
    const body = String(form.content?.body || "").trim();
    if (!body) {
      toast.error("El texto principal es obligatorio");
      return;
    }

    if (form.content.template_mode === "imagen_texto" && !String(form.content.image_url || "").trim()) {
      toast.error("Sube una imagen para la plantilla");
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Envíos masivos WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Campañas de WhatsApp para ventas y postventa con programación y seguimiento.
          </p>
          <p className="text-xs text-muted-foreground">
            Atenciones CTA: interacciones de clientes sobre botones de campana (contacto o detener promociones).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={syncInteresesVentas} disabled={syncingInterests}>
            {syncingInterests ? "Sincronizando..." : "Sincronizar intereses ventas"}
          </Button>
          <Button variant="outline" onClick={loadRows} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            onClick={() => {
              resetWizardState();
              setWizardOpen(true);
            }}
          >
            Nuevo envío masivo
          </Button>
        </div>
      </div>

      <p className="-mt-4 text-xs text-muted-foreground">
        El boton "Sincronizar intereses ventas" carga/actualiza intereses desde oportunidades para que el filtro de campanas de ventas impacte al publico correcto.
      </p>

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-base font-semibold">Lista de envíos masivos</h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-215 text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Fecha de envío</th>
                <th className="px-3 py-2">Fecha de término</th>
                <th className="px-3 py-2">Indicadores</th>
                <th className="px-3 py-2">Estatus</th>
                <th className="px-3 py-2 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="px-3 py-2 font-medium">{row.campaign_name}</td>
                  <td className="px-3 py-2 capitalize">{row.campaign_type}</td>
                  <td className="px-3 py-2">{row.send_now ? "Inmediato" : formatLocalDate(row.scheduled_at)}</td>
                  <td className="px-3 py-2">{formatLocalDate(row.finished_at)}</td>
                  <td className="px-3 py-2">
                    <div>Enviados: {Number(row.sent_count || 0)}</div>
                    <div>Entregados: {Number(row.delivered_count || 0)}</div>
                    <div>Respondieron: {Number(row.responded_count || 0)}</div>
                    <div>Contacto CTA: {Number(row.contact_cta_count || 0)}</div>
                    <div>Baja CTA: {Number(row.stop_cta_count || 0)}</div>
                  </td>
                  <td className="px-3 py-2">{getStatusLabel(row.status)}</td>
                  <td className="px-3 py-2 text-right">
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
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => dispatchCampaign(row.id)}
                          disabled={dispatchingId === row.id}
                        >
                          {dispatchingId === row.id ? "Procesando..." : "Ejecutar ahora"}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {!rows.length && (
                <tr>
                  <td className="px-3 py-6 text-sm text-muted-foreground" colSpan={7}>
                    {loading ? "Cargando..." : "No hay campañas registradas"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog
        open={wizardOpen}
        onOpenChange={(next) => {
          setWizardOpen(next);
          if (!next) resetWizardState();
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-245">
          <DialogHeader>
            <DialogTitle>Nuevo envío masivo</DialogTitle>
            <DialogDescription>
              {getStepTitle(step)}
            </DialogDescription>
          </DialogHeader>

          <div className="mb-2 grid grid-cols-3 items-center gap-2">
            {["Reglas de envío", "Plantilla de WhatsApp", "Vista preliminar"].map((label, index) => {
              const reached = index <= step;
              const active = index === step;

              return (
                <div key={label} className="flex items-center gap-2">
                  <div className={`flex h-5 w-5 items-center justify-center rounded-full ${active ? "bg-blue-600 text-white" : reached ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"}`}>
                    {reached ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                  </div>
                  <span className={`text-xs ${active ? "font-semibold text-blue-700" : "text-slate-600"}`}>{label}</span>
                </div>
              );
            })}
          </div>
          <div className="mb-4 h-1 overflow-hidden rounded bg-slate-200">
            <div
              className="h-full rounded bg-emerald-500 transition-all"
              style={{ width: `${((step + 1) / 3) * 100}%` }}
            />
          </div>

          {step === 0 && (
            <section className="space-y-4 rounded-md border p-4">
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
                  <label className="text-sm font-medium">Tipo de envío *</label>
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
                  <label className="inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
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
                      const checked = Array.isArray(form.filters.modelo_ids)
                        && form.filters.modelo_ids.includes(Number(modelo.id));

                      return (
                        <label key={modelo.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => setForm((prev) => {
                              const current = Array.isArray(prev.filters.modelo_ids) ? prev.filters.modelo_ids : [];
                              const next = e.target.checked
                                ? [...current, Number(modelo.id)]
                                : current.filter((id) => Number(id) !== Number(modelo.id));

                              return {
                                ...prev,
                                filters: {
                                  ...prev.filters,
                                  modelo_ids: [...new Set(next)],
                                },
                              };
                            })}
                          />
                          {modelo.name}
                        </label>
                      );
                    })}
                    {!modelosFiltrados.length && (
                      <p className="text-xs text-muted-foreground">Selecciona una o más marcas para filtrar modelos.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {filterContext.showEtapas ? (
                    <>
                      <label className="text-sm font-medium">{filterContext.etapasLabel}</label>
                      <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                        {etapas.map((etapa) => {
                          const checked = Array.isArray(form.filters.etapa_ids)
                            && form.filters.etapa_ids.includes(Number(etapa.id));

                          return (
                            <label key={etapa.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => setForm((prev) => {
                                  const current = Array.isArray(prev.filters.etapa_ids) ? prev.filters.etapa_ids : [];
                                  const next = e.target.checked
                                    ? [...current, Number(etapa.id)]
                                    : current.filter((id) => Number(id) !== Number(etapa.id));

                                  return {
                                    ...prev,
                                    filters: {
                                      ...prev.filters,
                                      etapa_ids: [...new Set(next)],
                                    },
                                  };
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

              <div className="rounded-md border bg-slate-50 p-3 text-sm">
                <p className="font-medium">Clientes impactados</p>
                <p className="text-muted-foreground">
                  Total deduplicado: {preview.total} {previewing ? "(actualizando...)" : ""}
                </p>
                {preview.sample.length > 0 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Muestra: {preview.sample
                      .slice(0, 5)
                      .map((row) => row.recipient_name || row.phone)
                      .join(", ")}
                  </p>
                )}
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="space-y-4 rounded-md border p-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de plantilla *</label>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="template-mode"
                      checked={form.content.template_mode === "texto"}
                      onChange={() => setForm((prev) => ({
                        ...prev,
                        content: { ...prev.content, template_mode: "texto" },
                      }))}
                    />
                    Texto
                  </label>

                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="template-mode"
                      checked={form.content.template_mode === "imagen_texto"}
                      onChange={() => setForm((prev) => ({
                        ...prev,
                        content: { ...prev.content, template_mode: "imagen_texto" },
                      }))}
                    />
                    Imagen y texto
                  </label>
                </div>
              </div>

              {form.content.template_mode === "imagen_texto" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Imagen de la plantilla *</label>
                  <div className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
                        <Upload className="h-4 w-4" />
                        {imageUploading ? "Subiendo..." : "Subir imagen desde dispositivo"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          disabled={imageUploading}
                          onChange={(e) => uploadTemplateImage(e.target.files?.[0])}
                        />
                      </label>

                      {form.content.image_url && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm"
                          onClick={() => setForm((prev) => ({
                            ...prev,
                            content: { ...prev.content, image_url: "" },
                          }))}
                        >
                          <X className="h-4 w-4" />
                          Quitar imagen
                        </button>
                      )}
                    </div>

                    {form.content.image_url && (
                      <div className="mt-3">
                        <img
                          src={form.content.image_url}
                          alt="Vista de imagen"
                          className="h-36 w-full rounded-md border object-cover md:w-80"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Inicio del mensaje</label>
                <Textarea
                  rows={2}
                  value={form.content.greeting}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    content: { ...prev.content, greeting: e.target.value },
                  }))}
                  placeholder="Hola, [Nombre de cliente]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Texto principal *</label>
                <Textarea
                  rows={5}
                  value={form.content.body}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    content: { ...prev.content, body: e.target.value },
                  }))}
                  placeholder="Escribe el mensaje principal"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Final del mensaje</label>
                <Textarea
                  rows={2}
                  value={form.content.closing}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    content: { ...prev.content, closing: e.target.value },
                  }))}
                  placeholder="¡Estamos listos para atenderle!"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={Boolean(form.content.show_cta)}
                  onChange={(e) => setForm((prev) => ({
                    ...prev,
                    content: { ...prev.content, show_cta: e.target.checked },
                  }))}
                />
                Incluir botones de CTA (contacto y detener promociones)
              </label>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-4 rounded-md border p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Resumen de envío</h3>
                  <div className="rounded-md border p-3 text-sm">
                    <p><span className="font-medium">Nombre:</span> {form.campaign_name || "-"}</p>
                    <p><span className="font-medium">Tipo:</span> {form.campaign_type}</p>
                    <p><span className="font-medium">Tipo de envío:</span> personalizado</p>
                    <p><span className="font-medium">Fecha envío:</span> {form.send_now ? "Inmediato" : form.scheduled_at}</p>
                    <p><span className="font-medium">Impactados:</span> {preview.total}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Vista WhatsApp</h3>
                  <div className="rounded-lg border bg-[#f5f0e8] p-3">
                    <div className="mx-auto max-w-sm rounded-md bg-white p-3 text-xs shadow-sm">
                      {form.content.template_mode === "imagen_texto" && form.content.image_url && (
                        <img
                          src={form.content.image_url}
                          alt="Plantilla"
                          className="mb-3 h-32 w-full rounded object-cover"
                        />
                      )}
                      <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-700">
                        {buildMessageFromTemplate(form.content) || "Sin contenido"}
                      </p>
                      {form.content.show_cta && (
                        <div className="mt-3 space-y-1">
                          <button type="button" className="w-full rounded border py-1 text-[11px] font-semibold text-blue-700">
                            QUIERO QUE ME CONTACTEN
                          </button>
                          <button type="button" className="w-full rounded border py-1 text-[11px] font-semibold text-blue-700">
                            DETENER PROMOCIONES
                          </button>
                        </div>
                      )}
                    </div>
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
              <Button onClick={goToPreviewStep}>
                Continuar
              </Button>
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
            <DialogDescription>
              {campaignDetail?.campaign?.campaign_name || "Campaña"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-md border p-3 text-sm">
              <p><span className="font-medium">Tipo:</span> {campaignDetail?.campaign?.campaign_type || "-"}</p>
              <p><span className="font-medium">Estado:</span> {getStatusLabel(campaignDetail?.campaign?.status)}</p>
              <p><span className="font-medium">Creado por:</span> {campaignDetail?.campaign?.created_by_name || "-"}</p>
              <p><span className="font-medium">Creado:</span> {formatLocalDate(campaignDetail?.campaign?.created_at)}</p>
            </div>

            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium mb-1">Resumen por estado</p>
              <p>Pendientes: {Number(campaignDetail?.status_summary?.pending || 0)}</p>
              <p>En cola: {Number(campaignDetail?.status_summary?.queued || 0)}</p>
              <p>Entregados: {Number(campaignDetail?.status_summary?.delivered || 0)}</p>
              <p>Leídos: {Number(campaignDetail?.status_summary?.read || 0)}</p>
              <p>Respondieron: {Number(campaignDetail?.status_summary?.responded || 0)}</p>
              <p>Fallidos: {Number(campaignDetail?.status_summary?.failed || 0)}</p>
            </div>

            <div className="rounded-md border p-3 text-sm">
              <p className="mb-1 font-medium">Acciones CTA</p>
              <p>Solicitaron contacto: {Number(campaignDetail?.cta_summary?.contact || 0)}</p>
              <p>Detener promociones: {Number(campaignDetail?.cta_summary?.stop_promotions || 0)}</p>
              <p>Acciones no mapeadas: {Number(campaignDetail?.cta_summary?.unknown || 0)}</p>
              <p>Total acciones: {Number(campaignDetail?.cta_summary?.total || 0)}</p>
            </div>
          </div>

          <div className="rounded-md border">
            <div className="border-b px-3 py-2 text-sm font-medium">Acciones CTA recientes</div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Acción</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {(campaignDetail?.cta_actions_recent || []).map((action) => (
                    <tr key={action.id} className="border-b">
                      <td className="px-3 py-2">{action.recipient_name || [action.cliente_nombre, action.cliente_apellido].filter(Boolean).join(" ") || "-"}</td>
                      <td className="px-3 py-2 capitalize">{String(action.action_type || "unknown").replace("_", " ")}</td>
                      <td className="px-3 py-2">{action.phone_normalized || "-"}</td>
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

          <div className="rounded-md border">
            <div className="border-b px-3 py-2 text-sm font-medium">Destinatarios recientes</div>
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-xs uppercase text-muted-foreground">
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2">Respondió</th>
                  </tr>
                </thead>
                <tbody>
                  {(campaignDetail?.recipients_recent || []).map((recipient) => (
                    <tr key={recipient.id} className="border-b">
                      <td className="px-3 py-2">{recipient.recipient_name || [recipient.cliente_nombre, recipient.cliente_apellido].filter(Boolean).join(" ") || "-"}</td>
                      <td className="px-3 py-2">{recipient.phone_normalized || "-"}</td>
                      <td className="px-3 py-2 capitalize">{recipient.status || "-"}</td>
                      <td className="px-3 py-2">{recipient.responded_at ? formatLocalDate(recipient.responded_at) : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
