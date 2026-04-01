"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Eye, Hourglass, TrendingUp, UserCheck, Users } from "lucide-react";
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
import NotificationPanel from "@/app/components/conversations/NotificationPanel";
import { useAuth } from "@/context/AuthContext";


// ── Helpers globales ─────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function formatRelativeTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0)
    return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return d.toLocaleDateString("es-AR", { weekday: "short" });
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
}

function assignmentColorClass(status) {
  if (status === "open") return "bg-green-500";
  if (status === "pending") return "bg-amber-400";
  if (status === "closed") return "bg-gray-400";
  return "bg-gray-300";
}

function ChannelPill({ channel }) {
  const cfg = {
    whatsapp: { abbr: "W", bg: "bg-green-500", label: "WhatsApp" },
    instagram: { abbr: "IG", bg: "bg-gradient-to-br from-purple-500 to-pink-500", label: "Instagram" },
    facebook: { abbr: "f", bg: "bg-blue-600", label: "Facebook" },
  };
  const c =
    cfg[String(channel || "").toLowerCase()] || {
      abbr: "?",
      bg: "bg-gray-400",
      label: channel || "canal",
    };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${c.bg} text-white font-bold text-[8px] flex-shrink-0`}
        >
          {c.abbr}
        </span>
      </TooltipTrigger>
      <TooltipContent>{c.label}</TooltipContent>
    </Tooltip>
  );
}

function formatDurationCompact(seconds) {
  if (seconds == null) return "--";
  const totalMinutes = Math.round(Math.max(0, Number(seconds) || 0) / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const totalHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (totalHours < 24) return minutes > 0 ? `${totalHours}h ${minutes}m` : `${totalHours}h`;
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

// ─────────────────────────────────────────────────────────────────────────────

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
  const [isLoading, setIsLoading] = useState(false);
  const [focusComposerSignal, setFocusComposerSignal] = useState(0);

  async function load() {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [user?.id]);

  function handleOpenTimeline(session) {
    setSelectedSession(session);
  }

  function handleToggleChannel(ch) {
    setChannelFilter((prev) => (prev === ch ? "all" : ch));
  }

  function openConversationById(sessionId) {
    const found = sessions.find((s) => Number(s.session_id) === Number(sessionId));
    if (found) setSelectedSession(found);
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


  async function handleOpenSummaryDialog(session) {
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
    } catch (err) {
      console.error("Error cargando timeline en handleOpenSummaryDialog:", err);
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

    // ── 1ra respuesta promedio — valor real del API ────────────
    const avgFtrSeconds = metrics?.avg_first_response_seconds ?? null;

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

  const kpiByKey = useMemo(
    () => Object.fromEntries(metricsCards.map((c) => [c.key, c])),
    [metricsCards]
  );

  const avgInteractionMin = useMemo(() => {
    const nowMs = Date.now();
    const active = scopedSessions.filter(
      (s) =>
        s?.assignment_status === "open" || s?.assignment_status === "pending"
    );
    if (active.length === 0) return null;
    const totalMs = active.reduce((acc, s) => {
      const created = s?.created_at ? new Date(s.created_at).getTime() : 0;
      return acc + Math.max(0, nowMs - created);
    }, 0);
    return Math.round(totalMs / active.length / 60000);
  }, [scopedSessions]);

  function handleToggleSessionSelection(sessionId) {
    const normalized = Number(sessionId);
    setSelectedSessionIds((prev) => {
      if (prev.includes(normalized)) {
        return prev.filter((id) => id !== normalized);
      }
      return [...prev, normalized];
    });
  }

  function handleToggleSelectAll() {
    if (allFilteredSelected) {
      setSelectedSessionIds([]);
      return;
    }

    setSelectedSessionIds(filteredSessions.map((s) => Number(s.session_id)));
  }

  async function handleSendBulkMessage() {
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
        {pageError && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {pageError}
          </div>
        )}

        {/* Panel de filtros */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-base font-semibold text-gray-800">Mensajes</h1>
            <NotificationPanel
              conversations={sessions}
              onOpenConversation={openConversationById}
            />
          </div>

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, celular o mensaje..."
            className="h-10"
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => applyMetricFilter("mine")}
                  className={`rounded-2xl border p-3 text-left transition-all shadow-sm hover:shadow-md ${
                    ownerFilter === "mine"
                      ? "bg-green-100 border-green-300 ring-2 ring-green-400"
                      : "bg-green-50 border-green-200 hover:border-green-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <UserCheck className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-[9px] text-green-600 uppercase tracking-wide font-semibold">Asignados</span>
                  </div>
                  <p className="text-xl font-semibold text-green-700 leading-none">{kpiByKey["mine"]?.value ?? 0}</p>
                </button>
              </TooltipTrigger>
              <TooltipContent>Mis conversaciones activas asignadas. Clic para filtrar.</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => applyMetricFilter("overdue")}
                  className={`rounded-2xl border p-3 text-left transition-all shadow-sm hover:shadow-md ${
                    priorityFilter === "overdue"
                      ? "bg-red-100 border-red-300 ring-2 ring-red-400"
                      : "bg-red-50 border-red-200 hover:border-red-300"
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <Hourglass className="w-3.5 h-3.5 text-red-500 animate-pulse" />
                    <span className="text-[9px] text-red-500 uppercase tracking-wide font-semibold">At. Urgente</span>
                  </div>
                  <p className="text-xl font-semibold text-red-700 leading-none">{kpiByKey["overdue"]?.value ?? 0}</p>
                </button>
              </TooltipTrigger>
              <TooltipContent>Conversaciones con SLA vencido. Clic para filtrar.</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-2xl border p-3 text-left shadow-sm bg-blue-50 border-blue-200 cursor-default">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[9px] text-blue-500 uppercase tracking-wide font-semibold">Ritmo resp.</span>
                  </div>
                  <p className="text-xl font-semibold text-blue-700 leading-none">{kpiByKey["ftr"]?.value ?? "--"}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Tiempo promedio de primera respuesta (dato real del servidor).</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-2xl border p-3 text-left shadow-sm bg-slate-50 border-slate-200 cursor-default">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[9px] text-slate-500 uppercase tracking-wide font-semibold">Interacción</span>
                  </div>
                  <p className="text-xl font-semibold text-slate-700 leading-none">
                    {avgInteractionMin != null ? `${avgInteractionMin} min` : "--"}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Duración promedio de conversaciones activas/pendientes.</TooltipContent>
            </Tooltip>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleToggleChannel("whatsapp")}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all text-[11px] font-bold ${
                      channelFilter === "whatsapp"
                        ? "border-green-500 bg-green-50 shadow-md scale-110 text-green-700"
                        : "border-gray-200 text-gray-400 hover:border-green-300 hover:text-green-600"
                    }`}
                  >
                    WA
                  </button>
                </TooltipTrigger>
                <TooltipContent>{channelFilter === "whatsapp" ? "Quitar filtro WhatsApp" : "Filtrar por WhatsApp"}</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleToggleChannel("instagram")}
                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all text-[11px] font-bold ${
                      channelFilter === "instagram"
                        ? "border-pink-500 bg-pink-50 shadow-md scale-110 text-pink-700"
                        : "border-gray-200 text-gray-400 hover:border-pink-300 hover:text-pink-600"
                    }`}
                  >
                    IG
                  </button>
                </TooltipTrigger>
                <TooltipContent>{channelFilter === "instagram" ? "Quitar filtro Instagram" : "Filtrar por Instagram"}</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{filteredSessions.length} conv. · {selectedSessions.length} sel.</span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => handleToggleSelectAll()}
                disabled={filteredSessions.length === 0}
              >
                {allFilteredSelected ? "Limpiar" : "Seleccionar"}
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
                Masivo
              </Button>
            </div>
          </div>
        </div>

        {/* Layout conversaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)] gap-2 flex-1 min-h-0">
          <div className={`${selectedSession ? "hidden lg:flex" : "flex"} border rounded-xl overflow-hidden bg-white shadow min-h-0 h-full flex-col`}>
            <div className="overflow-y-auto flex-1 min-h-0">
              {filteredSessions.map((s) => {
                const unread = Number(s?.unread_count || 0);
                const isOverdue = Number(s?.is_overdue || 0) === 1;
                const isSelected = selectedSession?.session_id === s.session_id;
                return (
                  <div
                    key={s.session_id}
                    onClick={() => handleOpenTimeline(s)}
                    onDoubleClick={() => {
                      handleOpenTimeline(s);
                      setFocusComposerSignal((prev) => prev + 1);
                    }}
                    className={`flex items-start gap-3 px-4 py-3 border-b cursor-pointer transition-colors hover:bg-gray-50/80 group border-l-2 ${
                      isSelected ? "bg-blue-50/50 border-l-blue-500" : "border-l-transparent"
                    }`}
                  >
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      className="mt-1 h-3.5 w-3.5 rounded flex-shrink-0"
                      checked={selectedSessionIds.includes(Number(s.session_id))}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleToggleSessionSelection(s.session_id)}
                      aria-label={`Seleccionar conversacion ${s.session_id}`}
                    />

                    {/* Avatar con iniciales */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white ${assignmentColorClass(s.assignment_status)}`}>
                      {getInitials(s.cliente_nombre)}
                    </div>

                    {/* Contenido principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {s.cliente_nombre || "Cliente"}
                        </p>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[10px] text-gray-400">{formatRelativeTime(s.last_message_at)}</span>
                          {unread > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] rounded-full px-1.5 py-0.5 font-semibold">
                              {unread}
                            </span>
                          )}
                          {isOverdue && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5 font-semibold flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  Urgente
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>SLA vencido — requiere atención urgente</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 truncate mt-0.5 leading-snug">
                        {s.ultimomensaje || "Sin mensajes"}
                      </p>

                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <ChannelPill channel={s.source_channel} />
                          <span className="text-[10px] text-gray-400 capitalize">
                            {s.assignment_status || "sin asignar"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSummaryDialog(s);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-100"
                        >
                          <Eye className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="p-6 text-sm text-gray-400 text-center italic">
                  Cargando conversaciones...
                </div>
              )}

              {!isLoading && filteredSessions.length === 0 && (
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
                onClick={() => handleSendBulkMessage()}
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
