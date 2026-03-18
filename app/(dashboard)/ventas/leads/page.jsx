"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronDown, ChevronUp, Filter, Phone, RefreshCw, User, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADOS = ["nuevo", "contactado", "negociando", "cerrado", "perdido"];

const ESTADO_CONFIG = {
  nuevo: { label: "Nuevo", color: "bg-blue-100 text-blue-700" },
  contactado: { label: "Contactado", color: "bg-yellow-100 text-yellow-700" },
  negociando: { label: "Negociando", color: "bg-purple-100 text-purple-700" },
  cerrado: { label: "Cerrado", color: "bg-green-100 text-green-700" },
  perdido: { label: "Perdido", color: "bg-red-100 text-red-700" },
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
  const cfg = ESTADO_CONFIG[estado] || { label: estado, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ─── Panel de detalle del lead ────────────────────────────────────────────────

function LeadPanel({ lead, onClose, onEstadoChanged }) {
  const [estado, setEstado] = useState(lead.estado);
  const [notas, setNotas] = useState(lead.notas_agente || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/ventas/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            >
              {ESTADOS.map((e) => (
                <option key={e} value={e}>{ESTADO_CONFIG[e]?.label || e}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notas del agente</label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              className="w-full border rounded-md px-3 py-2 text-sm resize-none"
              placeholder="Agrega notas o comentarios internos"
            />
          </div>
        </section>
      </div>

      {/* Footer */}
      <div className="border-t px-4 py-3">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VentasLeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [selectedLead, setSelectedLead] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    estado: "",
    desde: "",
    hasta: "",
    page: 1,
  });

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v, page: 1 }));

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.estado) params.set("estado", filters.estado);
      if (filters.desde) params.set("desde", filters.desde);
      if (filters.hasta) params.set("hasta", filters.hasta);
      params.set("page", filters.page);
      params.set("limit", "50");

      const res = await fetch(`/api/ventas/leads?${params}`);
      const data = await res.json();
      setLeads(data.leads || []);
      setPagination(data.pagination || { total: 0, page: 1, pages: 1 });
    } catch {
      toast.error("Error al cargar los leads");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  function handleEstadoChanged(updated) {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setSelectedLead(updated);
  }

  const activeFilters = [filters.estado, filters.desde, filters.hasta].filter(Boolean).length;

  return (
    <div className="flex h-full">
      {/* Lista principal */}
      <div className="flex-1 p-6 overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leads de ventas</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Cotizaciones generadas por el agente de IA · {pagination.total} total
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
              <select
                value={filters.estado}
                onChange={(e) => setFilter("estado", e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white"
              >
                <option value="">Todos</option>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{ESTADO_CONFIG[e]?.label || e}</option>
                ))}
              </select>
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
        <div className="grid grid-cols-5 gap-2 mb-4">
          {ESTADOS.map((e) => {
            const count = leads.filter((l) => l.estado === e).length;
            const cfg = ESTADO_CONFIG[e];
            return (
              <button
                key={e}
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
        />
      )}
    </div>
  );
}
