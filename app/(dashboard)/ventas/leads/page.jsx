"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import {
  ArrowUpRight, ChevronDown, ChevronUp, Filter, RefreshCw, Trash2, User, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAuthHeaders() {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  const token = match ? match[1] : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const ESTADOS = ["nuevo", "en_gestion", "vendido", "perdido"];

const ESTADO_CONFIG = {
  nuevo:      { label: "Nuevo",       color: "bg-blue-100 text-blue-700",   tooltip: "Cotización recién capturada por el agente. Ningún asesor la revisó todavía." },
  en_gestion: { label: "En gestión",  color: "bg-yellow-100 text-yellow-700", tooltip: "El asesor está trabajando activamente este lead: contactó al cliente, enviando propuestas o evaluando financiamiento." },
  vendido:    { label: "Vendido",     color: "bg-green-100 text-green-700",  tooltip: "La venta se concretó. El lead se convirtió en cliente." },
  perdido:    { label: "Perdido",     color: "bg-red-100 text-red-700",      tooltip: "El lead no prosperó: el cliente no respondió, compró en otro lugar o descartó la compra." },
};

function formatPrice(value, moneda = "PEN") {
  if (value == null) return "—";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EstadoBadge({ estado }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, color: "bg-gray-100 text-gray-700", tooltip: "" };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-default ${cfg.color}`}>
          {cfg.label}
        </span>
      </TooltipTrigger>
      {cfg.tooltip && (
        <TooltipContent side="top" className="max-w-48 text-center">
          {cfg.tooltip}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

// ─── Panel de detalle del lead ────────────────────────────────────────────────

function LeadPanel({ lead, onClose, onEstadoChanged, onDeleted }) {
  const [estado, setEstado] = useState(lead.estado);
  const [notas, setNotas] = useState(lead.notas_agente || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [oportunidadId, setOportunidadId] = useState(lead.oportunidad_crm_codigo || (lead.oportunidad_crm_id ? `LD-?` : null));

  async function handlePromover() {
    if (oportunidadId) return;
    setPromoting(true);
    try {
      const res = await fetch(`/api/ventas/leads/${lead.id}/promover`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al promover");
      if (data.already_promoted || data.ok) {
        setOportunidadId(data.oportunidad_id);
        toast.success(`Lead enviado a Ventas: ${data.oportunidad_id}`);
      }
    } catch (err) {
      toast.error(err.message || "No se pudo promover el lead");
    } finally {
      setPromoting(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`¿Eliminar la cotización de ${lead.nombre_cliente || "este cliente"}? Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/ventas/leads/${lead.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Error al eliminar");
      toast.success("Cotización eliminada");
      onDeleted(lead.id);
    } catch {
      toast.error("No se pudo eliminar la cotización");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/ventas/leads/${lead.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ estado, notas_agente: notas }),
      });
      if (!res.ok) throw new Error("Error al actualizar");
      toast.success("Lead actualizado");
      onEstadoChanged({ ...lead, estado, notas_agente: notas });
    } catch {
      toast.error("No se pudo actualizar el lead");
    } finally {
      setSaving(false);
    }
  }

  function campo(label, value) {
    return (
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || "—"}</p>
      </div>
    );
  }

  return (
    <div className="w-96 border-l bg-white flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div>
          <p className="font-semibold text-gray-900">{lead.nombre_cliente || "Cliente sin nombre"}</p>
          <p className="text-xs text-gray-500">{lead.telefono}</p>
        </div>
        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Cotización */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cotización</h3>
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            {campo("Modelo", lead.modelo_nombre)}
            {campo("Versión", lead.version_nombre)}
            {campo("Precio final", formatPrice(lead.precio_final, lead.moneda))}
            {campo("Forma de pago", lead.forma_pago === "financiamiento"
              ? `Financiamiento${lead.plazo_meses ? ` — ${lead.plazo_meses} meses` : ""}${lead.cuota_inicial ? ` · Cuota inicial: ${formatPrice(lead.cuota_inicial, lead.moneda)}` : ""}`
              : lead.forma_pago === "contado" ? "Contado" : "—")}
            {campo("Tiempo de entrega", lead.tiempo_entrega_dias != null ? `${lead.tiempo_entrega_dias} días hábiles` : "—")}
          </div>
        </section>

        {/* Datos del cliente */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Perfil del cliente</h3>
          <div className="space-y-2">
            {campo("Email", lead.email)}
            {campo("Uso del vehículo", lead.uso_vehiculo)}
            {campo("Personas habituales", lead.personas_habituales)}
            {campo("Presupuesto estimado", lead.presupuesto_rango)}
            {campo("Equipamiento requerido", lead.equipamiento_requerido)}
            {campo("Historial crediticio", lead.tiene_historial_crediticio === 1 ? "Sí" : lead.tiene_historial_crediticio === 0 ? "No" : "—")}
          </div>
        </section>

        {/* Timestamps */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Fechas</h3>
          <div className="space-y-1 text-xs text-gray-500">
            <p>Cotización generada: <span className="text-gray-700">{formatDate(lead.created_at)}</span></p>
            <p>Resumen enviado: <span className="text-gray-700">{formatDate(lead.cotizacion_enviada_at)}</span></p>
          </div>
        </section>

        {/* Gestión */}
        <section>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Gestión</h3>

          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado del lead</label>
            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS.map((e) => (
                  <SelectItem key={e} value={e}>{ESTADO_CONFIG[e]?.label || e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas del agente</label>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="resize-none text-sm"
              placeholder="Agrega notas o comentarios internos"
            />
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3 space-y-2">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
        <Button
          variant={oportunidadId ? "outline" : "default"}
          className={`w-full ${oportunidadId ? "text-green-700 border-green-200 bg-green-50 hover:bg-green-50 cursor-default" : ""}`}
          onClick={() => handlePromover()}
          disabled={promoting || !!oportunidadId}
        >
          <ArrowUpRight className="w-4 h-4 mr-2" />
          {oportunidadId
            ? `Enviado a Ventas: ${oportunidadId}`
            : promoting
            ? "Enviando a Ventas…"
            : "Enviar a Ventas"}
        </Button>
        <Button
          variant="outline"
          className="w-full text-red-600 border-red-200 hover:bg-red-50"
          onClick={() => handleDelete()}
          disabled={deleting}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {deleting ? "Eliminando…" : "Eliminar cotización"}
        </Button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VentasLeadsPage() {
  useRequirePerm("mensajes", "view");

  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [estadoCounts, setEstadoCounts] = useState({ nuevo: 0, en_gestion: 0, vendido: 0, perdido: 0 });
  const [selectedLead, setSelectedLead] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    estado: "",
    desde: "",
    hasta: "",
    page: 1,
  });

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  const fetchLeads = useCallback(async (signal) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.estado) params.set("estado", filters.estado);
      if (filters.desde) params.set("desde", filters.desde);
      if (filters.hasta) params.set("hasta", filters.hasta);
      params.set("page", filters.page);
      params.set("limit", "50");

      const res = await fetch(`/api/ventas/leads?${params}`, { headers: getAuthHeaders(), signal });
      const data = await res.json();
      setLeads(data.leads || []);
      setPagination(data.pagination || { total: 0, page: 1, pages: 1 });
      if (data.estado_counts) setEstadoCounts(data.estado_counts);
    } catch (err) {
      if (err?.name === "AbortError") return;
      toast.error("Error al cargar los leads");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    fetchLeads(controller.signal);
    return () => controller.abort();
  }, [fetchLeads]);

  function handleEstadoChanged(updated) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
  }

  function handleLeadDeleted(id) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setSelectedLead(null);
    setPagination((p) => ({ ...p, total: Math.max(0, p.total - 1) }));
  }

  const activeFilters = [filters.estado, filters.desde, filters.hasta].filter(Boolean).length;

  return (
    <TooltipProvider>
    <div className="flex h-full">
      {/* Lista principal */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads del agente IA</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Cotizaciones generadas por el agente de IA · {pagination.total} en total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters((v) => !v)}
              className={activeFilters > 0 ? "border-blue-500 text-blue-600" : ""}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filtros
              {activeFilters > 0 && (
                <span className="ml-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchLeads} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Filtros */}
        {showFilters && (
          <div className="mb-4 p-4 border rounded-lg bg-gray-50 grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
              <Select value={filters.estado || "todos"} onValueChange={(v) => setFilter("estado", v === "todos" ? "" : v)}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>{ESTADO_CONFIG[e]?.label || e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
              <Input type="date" value={filters.desde} onChange={(e) => setFilter("desde", e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
              <Input type="date" value={filters.hasta} onChange={(e) => setFilter("hasta", e.target.value)} />
            </div>
            {activeFilters > 0 && (
              <div className="col-span-3 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters({ estado: "", desde: "", hasta: "", page: 1 })}
                >
                  <X className="w-4 h-4 mr-1" /> Limpiar filtros
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Resumen por estado */}
        <div className="grid grid-cols-4 gap-2 mb-4">
            {ESTADOS.map((e) => {
              const count = estadoCounts[e] ?? 0;
              const cfg = ESTADO_CONFIG[e];
              return (
                <Tooltip key={e}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setFilter("estado", filters.estado === e ? "" : e)}
                      className={`text-center p-2 rounded-lg border text-xs transition-all ${
                        filters.estado === e ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mb-1 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <p className="font-bold text-gray-800">{count}</p>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-48 text-center">
                    {cfg.tooltip}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Cargando leads…</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <User className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">No hay leads registrados</p>
            <p className="text-xs mt-1">Los leads aparecerán aquí cuando el agente de IA complete cotizaciones</p>
          </div>
        ) : (
          <div className="space-y-2">
            {leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => setSelectedLead(selectedLead?.id === lead.id ? null : lead)}
                className={`w-full text-left border rounded-lg px-4 py-3 bg-white hover:bg-gray-50 transition-colors ${
                  selectedLead?.id === lead.id ? "ring-2 ring-blue-500 border-blue-300" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">
                        {lead.nombre_cliente || "Sin nombre"}&nbsp;
                        <span className="font-normal text-gray-400 text-xs">· {lead.telefono}</span>
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {lead.modelo_nombre || "Modelo no especificado"}
                        {lead.version_nombre ? ` — ${lead.version_nombre}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {lead.precio_final && (
                      <span className="text-sm font-semibold text-gray-800">
                        {formatPrice(lead.precio_final, lead.moneda)}
                      </span>
                    )}
                    <EstadoBadge estado={lead.estado} />
                    <span className="text-xs text-gray-400 hidden sm:block">
                      {formatDate(lead.created_at)}
                    </span>
                    {selectedLead?.id === lead.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </div>
                </div>

                {lead.uso_vehiculo && (
                  <p className="mt-1 text-xs text-gray-400 truncate pl-11">
                    Uso: {lead.uso_vehiculo}
                  </p>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Paginación */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              Anterior
            </Button>
            <span className="flex items-center text-sm text-gray-500">
              Página {pagination.page} de {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= pagination.pages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>

      {/* Panel lateral de detalle */}
      {selectedLead && (
        <LeadPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onEstadoChanged={handleEstadoChanged}
          onDeleted={handleLeadDeleted}
        />
      )}
    </div>
    </TooltipProvider>
  );
}
