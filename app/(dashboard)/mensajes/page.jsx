"use client";

import { useEffect, useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConversationWorkspace from "@/app/components/conversations/ConversationWorkspace";
import { useAuth } from "@/context/AuthContext";

const METRIC_TOOLTIPS = {
  total: "Total de conversaciones visibles según los filtros activos.",
  active: "Conversaciones abiertas o pendientes. Haz clic para filtrar.",
  unassigned: "Conversaciones sin asesor asignado. Haz clic para filtrar.",
  overdue: "Conversaciones cuyo SLA venció. Haz clic para filtrar.",
  unread: "Total de mensajes entrantes no leídos. Haz clic para filtrar.",
  mine: "Mis conversaciones activas (asignadas a mí). Haz clic para filtrar.",
  ftr: "Tiempo promedio en espera de las conversaciones de esta vista.",
  wait: "Tiempo máximo de espera de las conversaciones de esta vista.",
};

export default function ConversationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [metrics, setMetrics] = useState({
    total_conversations: 0,
    active_conversations: 0,
    unassigned_conversations: 0,
    overdue_conversations: 0,
    total_unread_messages: 0,
    my_active_conversations: 0,
    avg_first_response_seconds: null,
    max_wait_seconds: null,
    metrics_mode: "legacy",
  });
  const [selectedSession, setSelectedSession] = useState(null);
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkChannel, setBulkChannel] = useState("whatsapp");
  const [bulkText, setBulkText] = useState("");
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSummary, setBulkSummary] = useState(null);
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [bulkTargetMode, setBulkTargetMode] = useState("filtered");
  const [pageError, setPageError] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summarySession, setSummarySession] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [focusComposerSignal, setFocusComposerSignal] = useState(0);

  async function load() {
    try {
      setPageError("");

      const [sessionsRes, metricsRes] = await Promise.all([
        fetch("/api/conversations/clients", { cache: "no-store" }),
        fetch(`/api/conversations/metrics?user_id=${user?.id || 0}`, { cache: "no-store" }),
      ]);

      if (sessionsRes.status === 401 || metricsRes.status === 401) {
        localStorage.removeItem("user");
        setPageError("Tu sesión expiró. Redirigiendo a login...");
        router.push("/login");
        return;
      }

      if (!sessionsRes.ok || !metricsRes.ok) {
        throw new Error("No se pudo cargar la bandeja de mensajes");
      }

      const sessionsData = await sessionsRes.json();
      const metricsData = await metricsRes.json();

      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setMetrics((prev) => ({
        ...prev,
        ...(metricsData && typeof metricsData === "object" ? metricsData : {}),
      }));
    } catch (error) {
      console.error("Error cargando conversaciones:", error);
      setPageError(error?.message || "Error cargando conversaciones");
      setSessions([]);
    }
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  function openTimeline(session) {
    setSelectedSession(session);
  }

  function resetQuickFilters() {
    setStatusFilter("all");
    setOwnerFilter("all");
    setAssignmentFilter("all");
    setPriorityFilter("all");
  }

  function applyMetricFilter(filterKey) {
    resetQuickFilters();

    if (filterKey === "active") {
      setAssignmentFilter("active");
      return;
    }

    if (filterKey === "unassigned") {
      setAssignmentFilter("unassigned");
      return;
    }

    if (filterKey === "overdue") {
      setPriorityFilter("overdue");
      return;
    }

    if (filterKey === "unread") {
      setStatusFilter("unread");
      return;
    }

    if (filterKey === "mine") {
      setOwnerFilter("mine");
      setAssignmentFilter("active");
    }
  }

  function severityClass(level) {
    if (level === "high") return "border-red-200 bg-red-50 text-red-900";
    if (level === "medium") return "border-amber-200 bg-amber-50 text-amber-900";
    if (level === "low") return "border-emerald-200 bg-emerald-50 text-emerald-900";
    return "border bg-white text-gray-700";
  }

  function formatDurationCompact(seconds) {
    if (seconds == null) return "--";

    const totalSeconds = Math.max(0, Number(seconds) || 0);
    const totalMinutes = Math.round(totalSeconds / 60);

    if (totalMinutes < 60) {
      return `${totalMinutes}m`;
    }

    const totalHours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (totalHours < 24) {
      return minutes > 0 ? `${totalHours}h ${minutes}m` : `${totalHours}h`;
    }

    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  async function openSummaryDialog(session) {
    setSummarySession(session);
    setSummaryText("");
    setSummaryOpen(true);
    setSummaryLoading(true);

    try {
      // Intentar obtener conversation_summary real desde el timeline
      const res = await fetch(
        `/api/conversations/timeline?session_id=${session.session_id}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // El campo resumen viene unificado desde conversation_sessions
          const resumenReal = data[data.length - 1]?.resumen;
          if (resumenReal && String(resumenReal).trim()) {
            setSummaryText(String(resumenReal).trim());
            setSummaryLoading(false);
            return;
          }
        }
      }
    } catch {
      // fallback a continuación
    }

    // Fallback: intentar extraer del context_json
    const rawContext = String(session?.ultimo_contexto || "").trim();
    if (rawContext) {
      try {
        const parsed = JSON.parse(rawContext);
        if (typeof parsed === "string" && parsed.trim()) {
          setSummaryText(parsed.trim());
          setSummaryLoading(false);
          return;
        }
        const candidate =
          parsed?.resumen || parsed?.summary || parsed?.context_summary;
        if (candidate && String(candidate).trim()) {
          setSummaryText(String(candidate).trim());
          setSummaryLoading(false);
          return;
        }
      } catch {
        if (rawContext.length > 0) {
          setSummaryText(rawContext);
          setSummaryLoading(false);
          return;
        }
      }
    }

    setSummaryText("Sin resumen disponible para esta conversación.");
    setSummaryLoading(false);
  }

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const term = search.trim().toLowerCase();
      const bySearch = !term
        || String(s?.cliente_nombre || "").toLowerCase().includes(term)
        || String(s?.celular || "").toLowerCase().includes(term)
        || String(s?.ultimomensaje || "").toLowerCase().includes(term);

      const sourceChannel = String(s?.source_channel || "").toLowerCase();
      const byChannel = channelFilter === "all" || sourceChannel === channelFilter;

      const messageStatus = String(s?.message_status || "").toLowerCase();
      const unreadCount = Number(s?.unread_count || 0);
      const byStatus = statusFilter === "all"
        || messageStatus === statusFilter
        || (statusFilter === "unread" && unreadCount > 0);

      const assignedAgentId = Number(s?.assigned_agent_id || 0);
      const currentUserId = Number(user?.id || 0);
      const byOwner = ownerFilter === "all"
        || (ownerFilter === "mine" && currentUserId > 0 && assignedAgentId === currentUserId)
        || (ownerFilter === "unassigned" && !assignedAgentId);

      const assignmentStatus = String(s?.assignment_status || "unassigned").toLowerCase();
      const byAssignment = assignmentFilter === "all"
        || (assignmentFilter === "active" && (assignmentStatus === "open" || assignmentStatus === "pending"))
        || assignmentStatus === assignmentFilter;

      const priorityLevel = String(s?.priority_level || "normal").toLowerCase();
      const byPriority = priorityFilter === "all"
        || (priorityFilter === "overdue" && Number(s?.is_overdue || 0) === 1)
        || priorityLevel === priorityFilter;

      return bySearch && byChannel && byStatus && byOwner && byAssignment && byPriority;
    });
  }, [sessions, search, channelFilter, statusFilter, ownerFilter, assignmentFilter, priorityFilter, user]);

  const scopedSessions = useMemo(() => {
    if (!selectedSession?.session_id) return filteredSessions;

    const scoped = filteredSessions.filter(
      (s) => Number(s?.session_id) === Number(selectedSession.session_id)
    );

    if (scoped.length > 0) return scoped;
    return [selectedSession];
  }, [filteredSessions, selectedSession]);

  useEffect(() => {
    const filteredIdSet = new Set(filteredSessions.map((s) => Number(s.session_id)));
    setSelectedSessionIds((prev) => prev.filter((id) => filteredIdSet.has(Number(id))));
  }, [filteredSessions]);

  const selectedSessions = useMemo(() => {
    const selectedIdSet = new Set(selectedSessionIds.map((id) => Number(id)));
    return filteredSessions.filter((s) => selectedIdSet.has(Number(s.session_id)));
  }, [filteredSessions, selectedSessionIds]);

  const allFilteredSelected =
    filteredSessions.length > 0 && selectedSessions.length === filteredSessions.length;

  const metricsCards = useMemo(() => {
    const total = scopedSessions.length;
    const active = scopedSessions.filter((s) => {
      const status = String(s?.assignment_status || "unassigned").toLowerCase();
      return status === "open" || status === "pending";
    }).length;

    const unassigned = scopedSessions.filter((s) => !Number(s?.assigned_agent_id || 0)).length;
    const overdue = scopedSessions.filter((s) => Number(s?.is_overdue || 0) === 1).length;
    const unread = scopedSessions.reduce((acc, s) => acc + Number(s?.unread_count || 0), 0);

    const currentUserId = Number(user?.id || 0);
    const mine = scopedSessions.filter((s) => {
      const assignedId = Number(s?.assigned_agent_id || 0);
      const status = String(s?.assignment_status || "unassigned").toLowerCase();
      return currentUserId > 0 && assignedId === currentUserId && (status === "open" || status === "pending");
    }).length;

    // ── Espera máxima calculada desde scopedSessions ──────────
    // Tiempo desde el último mensaje entrante para conversaciones con mensajes sin leer
    const nowMs = Date.now();
    let maxWaitSeconds = null;

    scopedSessions.forEach((s) => {
      const hasUnread = Number(s?.unread_count || 0) > 0;
      const isOpen = ["open", "pending", "unassigned"].includes(
        String(s?.assignment_status || "unassigned").toLowerCase()
      );
      if (hasUnread || isOpen) {
        const lastAt = s?.last_message_at
          ? new Date(s.last_message_at).getTime()
          : s?.updated_at
            ? new Date(s.updated_at).getTime()
            : 0;
        if (lastAt > 0) {
          const waitSec = (nowMs - lastAt) / 1000;
          if (maxWaitSeconds === null || waitSec > maxWaitSeconds) {
            maxWaitSeconds = waitSec;
          }
        }
      }
    });

    // Si no hay sesiones activas en el scope, usar valor del API global
    const effectiveMaxWait = scopedSessions.length > 0
      ? maxWaitSeconds
      : metrics.max_wait_seconds;

    const maxWaitMinutes = effectiveMaxWait == null
      ? null
      : Math.round(effectiveMaxWait / 60);

    // ── 1ra respuesta promedio calculada desde scopedSessions ──
    // Aproximacion: promedio de (updated_at - created_at) para sesiones con asesor asignado
    // Cuando hay solo 1 sesión (conversación abierta), muestra su tiempo de espera actual
    let avgFtrSeconds = null;
    const sessionsWithAssignment = scopedSessions.filter(
      (s) => Number(s?.assigned_agent_id || 0) > 0
    );
    if (sessionsWithAssignment.length > 0) {
      const totalWait = sessionsWithAssignment.reduce((acc, s) => {
        const updatedAt = s?.updated_at ? new Date(s.updated_at).getTime() : 0;
        const lastAt = s?.last_message_at ? new Date(s.last_message_at).getTime() : updatedAt;
        return acc + Math.max(0, (nowMs - lastAt) / 1000);
      }, 0);
      avgFtrSeconds = Math.round(totalWait / sessionsWithAssignment.length);
    } else if (scopedSessions.length === 0) {
      // Caer al valor global del API si no hay sesiones en el scope
      avgFtrSeconds = metrics.avg_first_response_seconds;
    }

    return [
      {
        key: "total",
        title: "Total",
        value: total,
        tone: "neutral",
      },
      {
        key: "active",
        title: "Activas",
        value: active,
        tone: active > 0 ? "low" : "neutral",
        clickable: true,
      },
      {
        key: "unassigned",
        title: "Sin asignar",
        value: unassigned,
        tone: unassigned >= 5
          ? "high"
          : unassigned > 0
            ? "medium"
            : "low",
        clickable: true,
      },
      {
        key: "overdue",
        title: "SLA vencidas",
        value: overdue,
        tone: overdue >= 3 ? "high" : overdue > 0 ? "medium" : "low",
        clickable: true,
      },
      {
        key: "unread",
        title: "No leídos",
        value: unread,
        tone: unread >= 20 ? "high" : unread > 0 ? "medium" : "low",
        clickable: true,
      },
      {
        key: "mine",
        title: "Mis activas",
        value: mine,
        tone: mine >= 8
          ? "medium"
          : mine > 0
            ? "low"
            : "neutral",
        clickable: true,
      },
      {
        key: "ftr",
        title: "1ra resp. prom.",
        value: formatDurationCompact(avgFtrSeconds),
        tone: avgFtrSeconds == null
          ? "neutral"
          : avgFtrSeconds > 900
            ? "high"
            : avgFtrSeconds > 300
              ? "medium"
              : "low",
      },
      {
        key: "wait",
        title: "Espera máxima",
        value: formatDurationCompact(effectiveMaxWait),
        tone: maxWaitMinutes == null
          ? "neutral"
          : maxWaitMinutes > 60
            ? "high"
            : maxWaitMinutes > 20
              ? "medium"
              : "low",
      },
    ];
  }, [metrics, scopedSessions, user]);

  function toggleSessionSelection(sessionId) {
    const normalized = Number(sessionId);
    setSelectedSessionIds((prev) => {
      if (prev.includes(normalized)) {
        return prev.filter((id) => id !== normalized);
      }
      return [...prev, normalized];
    });
  }

  function toggleSelectAllFiltered() {
    if (allFilteredSelected) {
      setSelectedSessionIds([]);
      return;
    }

    setSelectedSessionIds(filteredSessions.map((s) => Number(s.session_id)));
  }

  async function sendBulkMessage() {
    const text = bulkText.trim();
    if (!text || bulkSending) return;

    const targetSessions = bulkTargetMode === "selected" ? selectedSessions : filteredSessions;

    if (!targetSessions.length) {
      setBulkError(
        bulkTargetMode === "selected"
          ? "No hay conversaciones seleccionadas para enviar."
          : "No hay conversaciones filtradas para enviar."
      );
      return;
    }

    setBulkSending(true);
    setBulkError("");
    setBulkSummary(null);

    try {
      const recipients = targetSessions.map((s) => ({
        session_id: s.session_id,
        phone: s.celular || s.phone || null,
      }));

      const res = await fetch("/api/conversations/bulk-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          source_channel: bulkChannel,
          source: "bulk_ui",
          recipients,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo enviar la campaña básica");
      }

      setBulkSummary(data?.summary || null);
      await load();
    } catch (error) {
      setBulkError(error?.message || "Error enviando masivo");
    } finally {
      setBulkSending(false);
    }
  }

  // Detectar si hay filtros activos (para mostrar etiqueta en indicadores)
  const hasActiveFilters = channelFilter !== "all" || statusFilter !== "all"
    || ownerFilter !== "all" || assignmentFilter !== "all" || priorityFilter !== "all"
    || search.trim() !== "";

  return (
    <TooltipProvider>
      <div className="h-full min-h-0 flex flex-col gap-2 overflow-y-auto pr-1">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-2 items-start">
          {pageError && (
            <div className="xl:col-span-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {pageError}
            </div>
          )}

          {/* Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, celular o mensaje"
              className="sm:col-span-3 h-9"
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <select
                  className="h-8 rounded-md border bg-transparent px-2 text-xs"
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                >
                  <option value="all">Todos los canales</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="instagram">Instagram</option>
                  <option value="messenger">Messenger</option>
                  <option value="n8n">n8n</option>
                </select>
              </TooltipTrigger>
              <TooltipContent>Filtrar por canal de origen del mensaje</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <select
                  className="h-8 rounded-md border bg-transparent px-2 text-xs"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Todos los estados</option>
                  <option value="received">Recibido</option>
                  <option value="queued">En cola</option>
                  <option value="sent">Enviado</option>
                  <option value="delivered">Entregado</option>
                  <option value="read">Leido</option>
                  <option value="failed">Fallido</option>
                  <option value="unread">No leidos</option>
                </select>
              </TooltipTrigger>
              <TooltipContent>Filtrar por estado del último mensaje</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <select
                  className="h-8 rounded-md border bg-transparent px-2 text-xs"
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                >
                  <option value="all">Todas</option>
                  <option value="mine">Mis conversaciones</option>
                  <option value="unassigned">Sin asignar</option>
                </select>
              </TooltipTrigger>
              <TooltipContent>Filtrar por propietario de la conversación</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <select
                  className="h-8 rounded-md border bg-transparent px-2 text-xs"
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                >
                  <option value="all">Todos los flujos</option>
                  <option value="active">Abiertas/Pendientes</option>
                  <option value="open">Abiertas</option>
                  <option value="pending">Pendientes</option>
                  <option value="closed">Cerradas</option>
                  <option value="unassigned">Sin asignar</option>
                </select>
              </TooltipTrigger>
              <TooltipContent>Filtrar por estado de asignación del agente</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <select
                  className="h-8 rounded-md border bg-transparent px-2 text-xs"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="all">Todas las prioridades</option>
                  <option value="urgent">Urgente</option>
                  <option value="high">Alta</option>
                  <option value="normal">Normal</option>
                  <option value="low">Baja</option>
                  <option value="overdue">Vencidas SLA</option>
                </select>
              </TooltipTrigger>
              <TooltipContent>Filtrar por nivel de prioridad o SLA vencido</TooltipContent>
            </Tooltip>

            <div className="flex items-center justify-between sm:col-span-3 text-xs text-gray-500 px-1 gap-1.5">
              <span>
                {filteredSessions.length} conversaciones · {selectedSessions.length} seleccionadas
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={toggleSelectAllFiltered}
                disabled={filteredSessions.length === 0}
              >
                {allFilteredSelected ? "Limpiar selección" : "Seleccionar filtrados"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  setBulkError("");
                  setBulkSummary(null);
                  setBulkTargetMode(selectedSessions.length > 0 ? "selected" : "filtered");
                  setBulkOpen(true);
                }}
              >
                Envío masivo básico
              </Button>
            </div>
          </div>

          {/* Indicadores / Métricas */}
          <div className="border rounded-lg p-1.5 bg-white">
            <div className="flex items-center justify-between px-1 mb-1">
              <p className="text-[10px] text-gray-500">Indicadores</p>
              {hasActiveFilters && (
                <span className="text-[9px] bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-medium">
                  Filtrado activo
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {metricsCards.map((card) => (
                <Tooltip key={card.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => card.clickable && applyMetricFilter(card.key)}
                      className={`rounded-md px-1.5 py-1 text-left transition border ${severityClass(card.tone)} ${card.clickable ? "hover:shadow-sm cursor-pointer hover:opacity-90" : "cursor-default"}`}
                    >
                      <p className="text-[9px] opacity-70 leading-tight truncate">{card.title}</p>
                      <p className="text-[13px] font-semibold leading-tight">{card.value}</p>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-[200px] text-center">
                    {METRIC_TOOLTIPS[card.key] || card.title}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
        </div>

        {/* Layout conversaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)] gap-2 flex-1 min-h-0">
          <div className={`${selectedSession ? "hidden lg:flex" : "flex"} border rounded-xl overflow-hidden bg-white shadow min-h-0 h-full flex-col`}>
            <div className="overflow-y-auto flex-1 min-h-0">
              {filteredSessions.map((s) => (
                <div
                  key={s.session_id}
                  onClick={() => openTimeline(s)}
                  onDoubleClick={() => {
                    openTimeline(s);
                    setFocusComposerSignal((prev) => prev + 1);
                  }}
                  className={`flex items-center justify-between p-4 border-b hover:bg-gray-50 cursor-pointer ${selectedSession?.session_id === s.session_id ? "bg-gray-50" : ""}`}
                >
                  <div>
                    <div className="mb-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedSessionIds.includes(Number(s.session_id))}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleSessionSelection(s.session_id)}
                        aria-label={`Seleccionar conversacion ${s.session_id}`}
                      />
                    </div>

                    <div className="font-semibold">
                      {s.cliente_nombre || "Cliente"}
                    </div>

                    <div className="text-sm text-gray-500 truncate max-w-55">
                      {s.ultimomensaje || "Sin mensajes"}
                    </div>

                    <div className="text-xs text-gray-400">
                      {s.celular || s.phone}
                      {s.source_channel ? ` · ${s.source_channel}` : ""}
                      {s.message_status ? ` · ${s.message_status}` : ""}
                    </div>

                    <div className="text-xs mt-1 text-gray-500">
                      {s.assigned_agent_name
                        ? `Asignado a: ${s.assigned_agent_name}`
                        : "Sin asignar"}
                      {s.assignment_status ? ` · ${s.assignment_status}` : ""}
                    </div>

                    <div className="text-xs mt-1 text-gray-500">
                      Prioridad: {s.priority_level || "normal"}
                      {s.sla_due_at ? ` · SLA: ${new Date(s.sla_due_at).toLocaleString()}` : ""}
                      {Number(s?.is_overdue || 0) === 1 ? " · Vencida" : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {Number(s?.is_overdue || 0) === 1 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="h-6 px-2 rounded-full bg-amber-600 text-white text-xs inline-flex items-center justify-center">
                            SLA
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>SLA vencido — requiere atención urgente</TooltipContent>
                      </Tooltip>
                    )}

                    {Number(s?.unread_count || 0) > 0 && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="min-w-6 h-6 px-2 rounded-full bg-red-600 text-white text-xs inline-flex items-center justify-center">
                            {s.unread_count}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{s.unread_count} mensaje{s.unread_count !== 1 ? "s" : ""} sin leer</TooltipContent>
                      </Tooltip>
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSummaryDialog(s);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Ver resumen de la conversación</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}

              {filteredSessions.length === 0 && (
                <div className="p-6 text-sm text-gray-500 text-center">
                  No hay conversaciones que coincidan con los filtros.
                </div>
              )}
              </div>
            </div>

          <div className={`${selectedSession ? "block" : "hidden lg:block"} min-h-0 h-full`}>
            <ConversationWorkspace
              session={selectedSession}
              onConversationUpdated={load}
              onBack={() => setSelectedSession(null)}
              focusComposerSignal={focusComposerSignal}
            />
          </div>
        </div>

        {/* Dialog: Envío masivo */}
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Envío masivo básico</DialogTitle>
              <DialogDescription>
                Envia el mismo mensaje a las conversaciones filtradas actualmente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Filtrados: {filteredSessions.length} · Seleccionados: {selectedSessions.length}
              </p>

              <select
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={bulkTargetMode}
                onChange={(e) => setBulkTargetMode(e.target.value)}
                disabled={bulkSending}
              >
                <option value="filtered">Enviar a filtrados</option>
                <option value="selected">Enviar solo a seleccionados</option>
              </select>

              <select
                className="h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={bulkChannel}
                onChange={(e) => setBulkChannel(e.target.value)}
                disabled={bulkSending}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
              </select>

              <Textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Escribe el mensaje promocional a enviar..."
                className="min-h-28"
                disabled={bulkSending}
              />

              {bulkError && <p className="text-sm text-red-600">{bulkError}</p>}

              {bulkSummary && (
                <div className="text-xs rounded-md border bg-gray-50 p-2 text-gray-700">
                  Total: {bulkSummary.total || 0} · Enviados: {bulkSummary.sent || 0} · En cola: {bulkSummary.queued || 0} · Fallidos: {bulkSummary.failed || 0} · Omitidos: {bulkSummary.skipped || 0}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkSending}>
                Cerrar
              </Button>
              <Button
                onClick={sendBulkMessage}
                disabled={
                  bulkSending
                  || !bulkText.trim()
                  || (bulkTargetMode === "selected" && selectedSessions.length === 0)
                  || (bulkTargetMode === "filtered" && filteredSessions.length === 0)
                }
              >
                {bulkSending ? "Enviando..." : "Enviar a filtrados"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: Resumen de conversación */}
        <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Resumen de conversación</DialogTitle>
              <DialogDescription>
                {summarySession?.cliente_nombre || "Conversación"}
                {summarySession?.celular ? ` · ${summarySession.celular}` : ""}
                {summarySession?.source_channel ? ` · ${summarySession.source_channel}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap min-h-[80px] flex items-center justify-center">
              {summaryLoading ? (
                <span className="text-gray-400 italic text-xs">Cargando resumen...</span>
              ) : (
                <span className="w-full">{summaryText}</span>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSummaryOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
