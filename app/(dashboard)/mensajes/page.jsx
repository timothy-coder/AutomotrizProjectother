"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, Eye, Hourglass, Search, TrendingUp, UserCheck, Users, X } from "lucide-react";
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


// ── Auth token desde cookie (mismo patrón que ConversationWorkspace) ─────────

function getAuthToken() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? match[1] : "";
}

// ── Chatwoot: helpers de fetch ────────────────────────────────────────────────

function channelFromInbox(channelType) {
  if (!channelType) return "whatsapp";
  if (channelType.includes("Whatsapp")) return "whatsapp";
  if (channelType.includes("Instagram")) return "instagram";
  if (channelType.includes("FacebookPage") || channelType.includes("Page")) return "facebook";
  return "whatsapp";
}

function mapConversation(conv) {
  return {
    session_id: conv.id,
    client_name: conv.meta?.sender?.name || "Cliente",
    cliente_nombre: conv.meta?.sender?.name || "Cliente",
    phone: conv.meta?.sender?.phone_number || "",
    celular: conv.meta?.sender?.phone_number || "",
    source_channel: channelFromInbox(conv.meta?.channel),
    assignment_status: conv.status,
    unread_count: conv.unread_count || 0,
    last_activity_at: conv.last_activity_at
      ? new Date(conv.last_activity_at * 1000).toISOString()
      : null,
    last_message_at: conv.last_activity_at
      ? new Date(conv.last_activity_at * 1000).toISOString()
      : null,
    last_message: conv.last_non_activity_message?.content || "",
    ultimomensaje: conv.last_non_activity_message?.content || "",
    sla_due_at: null,
    contact_id: conv.meta?.sender?.id || null,
    assigned_agent_name: conv.meta?.assignee?.name || null,
    assigned_agent_id: conv.meta?.assignee?.id || null,
    team_name: conv.meta?.team?.name || null,
    is_overdue: 0,
    priority_level: "normal",
    created_at: conv.created_at
      ? new Date(conv.created_at * 1000).toISOString()
      : null,
    updated_at: conv.updated_at
      ? new Date(conv.updated_at * 1000).toISOString()
      : null,
  };
}

async function fetchConversations(status = "open") {
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`/api/chatwoot/conversations?status=${status}`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) return [];
  const data = await res.json();
  const payload = data?.data?.payload || [];
  return payload.map(mapConversation);
}

async function fetchSearchResults(q) {
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`/api/chatwoot/search?q=${encodeURIComponent(q)}`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.conversations ?? []).map(mapConversation);
}

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
  if (status === "closed" || status === "resolved") return "bg-gray-400";
  if (status === "snoozed") return "bg-blue-400";
  return "bg-green-500";
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


// ─── Helpers para KPI de chat individual ────────────────────────────────────

function formatSlaStatus(slaDueAt) {
  if (!slaDueAt) return { label: "Sin SLA", detail: "", tone: "neutral" };
  const diff = new Date(slaDueAt).getTime() - Date.now();
  if (diff > 0) {
    const mins = Math.round(diff / 60000);
    if (mins < 5) return { label: `${mins}m`, detail: "restantes", tone: "high" };
    if (mins < 15) return { label: `${mins}m`, detail: "restantes", tone: "medium" };
    return { label: `${mins}m`, detail: "restantes", tone: "low" };
  }
  const mins = Math.round(Math.abs(diff) / 60000);
  const hrs = Math.floor(mins / 60);
  const label = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
  return { label, detail: "vencido", tone: "high" };
}

function formatChatDuration(createdAt) {
  if (!createdAt) return "--";
  const diff = Date.now() - new Date(createdAt).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ─── Brand icons (SVG inline — lucide-react no incluye logos de marca) ────────

function WhatsAppIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function InstagramIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function FacebookIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

const CHANNEL_CFG = {
  whatsapp: { Icon: WhatsAppIcon, iconColor: "text-green-500", bg: "bg-green-50 border-green-200", label: "WhatsApp" },
  instagram: { Icon: InstagramIcon, iconColor: "text-pink-500", bg: "bg-pink-50 border-pink-200", label: "Instagram" },
  facebook: { Icon: FacebookIcon, iconColor: "text-blue-600", bg: "bg-blue-50 border-blue-200", label: "Facebook" },
};

const CHANNEL_FILTERS = [
  {
    key: "whatsapp",
    label: "WA",
    Icon: WhatsAppIcon,
    active: "border-green-500 bg-green-50 ring-1 ring-green-300",
    inactive: "border-gray-200 hover:border-green-300 hover:bg-green-50/50",
    iconColor: "text-green-500",
    countColor: "text-green-700",
  },
  {
    key: "instagram",
    label: "IG",
    Icon: InstagramIcon,
    active: "border-pink-500 bg-pink-50 ring-1 ring-pink-300",
    inactive: "border-gray-200 hover:border-pink-300 hover:bg-pink-50/50",
    iconColor: "text-pink-500",
    countColor: "text-pink-700",
  },
  {
    key: "facebook",
    label: "FB",
    Icon: FacebookIcon,
    active: "border-blue-500 bg-blue-50 ring-1 ring-blue-300",
    inactive: "border-gray-200 hover:border-blue-300 hover:bg-blue-50/50",
    iconColor: "text-blue-600",
    countColor: "text-blue-700",
  },
];

function ChatKpiCards({ session }) {
  const unread = Number(session?.unread_count || 0);
  const sla = formatSlaStatus(session?.sla_due_at);
  const duration = formatChatDuration(session?.created_at);
  const ch = String(session?.source_channel || "").toLowerCase();
  const cfg = CHANNEL_CFG[ch] || { Icon: null, iconColor: "text-gray-400", bg: "bg-gray-50 border-gray-200", label: ch || "Sin canal" };
  const ChanIcon = cfg.Icon;

  const slaBg = sla.tone === "high" ? "bg-red-50 border-red-200"
    : sla.tone === "medium" ? "bg-amber-50 border-amber-200"
    : sla.tone === "low" ? "bg-green-50 border-green-200"
    : "bg-gray-50 border-gray-200";
  const slaIconColor = sla.tone === "high" ? "text-red-500"
    : sla.tone === "medium" ? "text-amber-500"
    : "text-gray-400";
  const slaTextColor = sla.tone === "high" ? "text-red-700"
    : sla.tone === "medium" ? "text-amber-700"
    : sla.tone === "low" ? "text-green-700"
    : "text-gray-400";

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {/* No leídos */}
      <div className={`rounded-xl border p-2 ${unread > 0 ? "bg-blue-50 border-blue-200" : "bg-gray-50 border-gray-200"}`}>
        <p className={`text-[8px] uppercase tracking-wide font-semibold mb-1 truncate ${unread > 0 ? "text-blue-500" : "text-gray-400"}`}>No leídos</p>
        <p className={`text-base font-bold leading-none ${unread > 0 ? "text-blue-700" : "text-gray-400"}`}>{unread}</p>
      </div>

      {/* SLA */}
      <div className={`rounded-xl border p-2 ${slaBg}`}>
        <div className="flex items-center gap-1 mb-1">
          <Hourglass className={`w-3 h-3 flex-shrink-0 ${slaIconColor}`} />
          <p className={`text-[8px] uppercase tracking-wide font-semibold truncate ${slaIconColor}`}>Urgente</p>
        </div>
        <p className={`text-base font-bold leading-none ${slaTextColor}`}>{sla.label}</p>
        {sla.detail && <p className="text-[8px] text-gray-400 mt-0.5">{sla.detail}</p>}
      </div>

      {/* Duración */}
      <div className="rounded-xl border p-2 bg-slate-50 border-slate-200">
        <div className="flex items-center gap-1 mb-1">
          <Users className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <p className="text-[8px] uppercase tracking-wide font-semibold text-slate-500 truncate">Duración</p>
        </div>
        <p className="text-base font-bold text-slate-700 leading-none">{duration}</p>
      </div>

      {/* Canal */}
      <div className={`rounded-xl border p-2 ${cfg.bg}`}>
        <div className="flex items-center gap-1 mb-1">
          {ChanIcon && <ChanIcon className={`w-3 h-3 flex-shrink-0 ${cfg.iconColor}`} />}
          <p className={`text-[8px] uppercase tracking-wide font-semibold truncate ${cfg.iconColor}`}>Canal</p>
        </div>
        <p className={`text-[10px] font-bold leading-none ${cfg.iconColor}`}>{cfg.label}</p>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [myTeam, setMyTeam] = useState(null);
  const [botAlerts, setBotAlerts] = useState([]);
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
  const [serverSearchResults, setServerSearchResults] = useState(null);
  const [serverSearchLoading, setServerSearchLoading] = useState(false);
  const [viewFilter, setViewFilter] = useState("team"); // "team" | "mine"
  const [channelFilter, setChannelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [assignmentFilter, setAssignmentFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [pageError, setPageError] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summarySession, setSummarySession] = useState(null);
  const [summaryText, setSummaryText] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [focusComposerSignal, setFocusComposerSignal] = useState(0);
  const [avgInteractionMin, setAvgInteractionMin] = useState(null);
  const [agents, setAgents] = useState([]);
  const prevUrgentCountRef = useRef(0);
  const prevUnreadTotalRef = useRef(0);

  async function load() {
    setIsLoading(true);
    try {
      setPageError("");

      const token = getAuthToken();
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

      const [newSessions, metricsRes, interactionRes, agentsRes] = await Promise.all([
        fetchConversations("open"),
        fetch(`/api/conversations/metrics?user_id=${user?.id || 0}`, { cache: "no-store", headers: authHeaders }),
        fetch("/api/conversations/interaction-metrics", { cache: "no-store", headers: authHeaders }),
        fetch("/api/chatwoot/agents", { cache: "no-store", headers: authHeaders }),
      ]);

      if (metricsRes.status === 401) {
        localStorage.removeItem("user");
        setPageError("Tu sesión expiró. Redirigiendo a login...");
        router.push("/login");
        return;
      }

      setSessions(newSessions);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics((prev) => ({
          ...prev,
          ...(metricsData && typeof metricsData === "object" ? metricsData : {}),
        }));
      }

      if (interactionRes.ok) {
        const interactionData = await interactionRes.json();
        setAvgInteractionMin(interactionData?.avg_interaction_minutes ?? null);
      } else {
        console.error("interaction-metrics failed:", interactionRes.status);
      }

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(Array.isArray(agentsData?.data) ? agentsData.data : []);
      }
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

  useEffect(() => {
    if (!user?.id) return;
    const token = getAuthToken();
    fetch("/api/chatwoot/my-team", {
      cache: "no-store",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((d) => { if (d?.team) setMyTeam(d.team); })
      .catch((err) => console.error("Error cargando equipo:", err));
  }, [user?.id]);

  // ── Server-side search (debounced 400ms) ──────────────────────────────────────
  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setServerSearchResults(null);
      setServerSearchLoading(false);
      return;
    }
    setServerSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await fetchSearchResults(q);
        setServerSearchResults(results);
      } catch (err) {
        console.error("Server search error:", err);
        setServerSearchResults([]);
      } finally {
        setServerSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── SSE: actualizaciones en tiempo real (reemplaza polling de 15 s) ──────────
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    // Resolver el status de Chatwoot a partir del filtro activo
    const chatwootStatuses = ["open", "pending", "resolved"];
    const activeStatus = chatwootStatuses.includes(assignmentFilter) ? assignmentFilter : "open";

    // SSE para actualizaciones en tiempo real
    const evtSource = new EventSource(`/api/chatwoot/sse?token=${token}`);

    evtSource.addEventListener("new_message", () => {
      fetchConversations(activeStatus).then(setSessions).catch(console.error);
    });
    evtSource.addEventListener("new_conversation", () => {
      fetchConversations(activeStatus).then(setSessions).catch(console.error);
    });
    evtSource.addEventListener("conversation_status", () => {
      fetchConversations(activeStatus).then(setSessions).catch(console.error);
    });
    evtSource.addEventListener("bot_alert", (e) => {
      try {
        const data = JSON.parse(e.data);
        setBotAlerts((prev) => [
          data,
          ...prev.filter((a) => a.conversation_id !== data.conversation_id),
        ]);
      } catch (err) {
        console.error("SSE bot_alert parse error:", err);
      }
    });
    evtSource.onerror = () => {
      console.error("Chatwoot SSE: connection error — browser will auto-reconnect. readyState:", evtSource.readyState);
    };

    return () => evtSource.close();
  }, [user?.id, assignmentFilter]);

  // ── Favicon + título con contador de no leídos ───────────────
  useEffect(() => {
    const total = sessions.reduce((acc, s) => acc + Number(s?.unread_count || 0), 0);
    document.title = total > 0 ? `(${total}) Mensajes — CRM` : "Mensajes — CRM";
    prevUnreadTotalRef.current = total;
  }, [sessions]);

  // ── Sonido de alerta cuando llega nueva conversación urgente ─
  useEffect(() => {
    const urgentCount = sessions.filter(
      (s) => s?.priority_level === "urgent" || Number(s?.is_overdue || 0) === 1
    ).length;

    if (urgentCount > prevUrgentCountRef.current) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);
      } catch (err) {
        console.error("Error reproduciendo alerta de sonido:", err);
      }
    }

    prevUrgentCountRef.current = urgentCount;
  }, [sessions]);

  function handleOpenTimeline(session) {
    setSelectedSession({ ...session, unread_count: 0 });
    if (Number(session.unread_count) > 0) {
      setSessions((prev) =>
        prev.map((s) =>
          s.session_id === session.session_id ? { ...s, unread_count: 0 } : s
        )
      );
    }
  }

  function handleToggleChannel(ch) {
    setChannelFilter((prev) => (prev === ch ? "all" : ch));
  }

  function handleOpenConversationById(sessionId) {
    const found = sessions.find((s) => Number(s.session_id) === Number(sessionId));
    if (found) setSelectedSession(found);
  }

  async function handleQuickStatusChange(sessionId, nextStatus) {
    try {
      const token = getAuthToken();
      // Mapear "closed" → "resolved" para compatibilidad con Chatwoot
      const chatwootStatus = nextStatus === "closed" ? "resolved" : nextStatus;
      const res = await fetch(`/api/chatwoot/conversations/${sessionId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: chatwootStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || "No se pudo actualizar el estado");
      }
      await load();
    } catch (err) {
      console.error("Error en quick-assign:", err);
      setPageError(err?.message || "No se pudo actualizar el estado");
    }
  }

  async function handleQuickAgentAssign(sessionId, agentIdStr) {
    const agentId = agentIdStr ? Number(agentIdStr) : null;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/chatwoot/conversations/${sessionId}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ agent_id: agentId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.message || "No se pudo asignar agente");
      }
      await load();
    } catch (err) {
      console.error("Error en asignación de agente:", err);
      setPageError(err?.message || "No se pudo asignar agente");
    }
  }

  function resetQuickFilters() {
    setStatusFilter("all");
    setOwnerFilter("all");
    setAssignmentFilter("all");
    setPriorityFilter("all");
  }

  function handleApplyMetricFilter(filterKey) {
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


  function handleStatusTabChange(tab) {
    const chatwootStatus = tab === "pending" ? "pending" : "open";
    setAssignmentFilter(tab === "pending" ? "pending" : "all");
    fetchConversations(chatwootStatus).then(setSessions).catch(console.error);
  }

  async function handleOpenSummaryDialog(session) {
    setSummarySession(session);
    setSummaryText("");
    setSummaryOpen(true);
    setSummaryLoading(true);

    try {
      // Intentar obtener conversation_summary real desde el timeline
      const token = getAuthToken();
      const res = await fetch(
        `/api/conversations/timeline?session_id=${session.session_id}`,
        { cache: "no-store", headers: token ? { Authorization: `Bearer ${token}` } : {} }
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
      } catch (err) {
        console.error("Error parseando context_json del resumen:", err);
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
    const baseList = serverSearchResults !== null ? serverSearchResults : sessions;
    return baseList.filter((s) => {
      const term = search.trim().toLowerCase();
      const bySearch = serverSearchResults !== null
        || !term
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
      const chatwootAgentId = Number(user?.chatwoot_agent_id || 0);
      const byOwner = ownerFilter === "all"
        || (ownerFilter === "mine" && chatwootAgentId > 0 && assignedAgentId === chatwootAgentId)
        || (ownerFilter === "unassigned" && !assignedAgentId);

      const byView = viewFilter === "team"
        || (viewFilter === "mine" && chatwootAgentId > 0 && assignedAgentId === chatwootAgentId);

      const assignmentStatus = String(s?.assignment_status || "unassigned").toLowerCase();
      const byAssignment = assignmentFilter === "all"
        || (assignmentFilter === "active" && (assignmentStatus === "open" || assignmentStatus === "pending"))
        || assignmentStatus === assignmentFilter;

      const priorityLevel = String(s?.priority_level || "normal").toLowerCase();
      const byPriority = priorityFilter === "all"
        || (priorityFilter === "overdue" && Number(s?.is_overdue || 0) === 1)
        || priorityLevel === priorityFilter;

      return bySearch && byChannel && byStatus && byOwner && byAssignment && byPriority && byView;
    });
  }, [sessions, search, channelFilter, statusFilter, ownerFilter, assignmentFilter, priorityFilter, viewFilter, user]);

  const scopedSessions = useMemo(() => {
    if (!selectedSession?.session_id) return filteredSessions;

    const scoped = filteredSessions.filter(
      (s) => Number(s?.session_id) === Number(selectedSession.session_id)
    );

    if (scoped.length > 0) return scoped;
    return [selectedSession];
  }, [filteredSessions, selectedSession]);

  const metricsCards = useMemo(() => {
    const total = scopedSessions.length;
    const active = scopedSessions.filter((s) => {
      const status = String(s?.assignment_status || "unassigned").toLowerCase();
      return status === "open" || status === "pending";
    }).length;

    const unassigned = scopedSessions.filter((s) => !Number(s?.assigned_agent_id || 0)).length;
    const overdue = scopedSessions.filter((s) => Number(s?.is_overdue || 0) === 1).length;
    const unread = scopedSessions.reduce((acc, s) => acc + Number(s?.unread_count || 0), 0);

    const chatwootAgentId = Number(user?.chatwoot_agent_id || 0);
    const mine = scopedSessions.filter((s) => {
      const assignedId = Number(s?.assigned_agent_id || 0);
      const status = String(s?.assignment_status || "unassigned").toLowerCase();
      return chatwootAgentId > 0 && assignedId === chatwootAgentId && (status === "open" || status === "pending");
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

  const channelCounts = useMemo(() => {
    const counts = { whatsapp: 0, instagram: 0, facebook: 0 };
    for (const s of sessions) {
      const ch = String(s?.source_channel || "").toLowerCase();
      if (ch in counts) counts[ch]++;
    }
    return counts;
  }, [sessions]);

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
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-gray-800">Mensajes</h1>
              {myTeam ? (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-violet-100 text-violet-700 border border-violet-200">
                  <Users className="w-2.5 h-2.5" />
                  {myTeam.name}
                </span>
              ) : user?.role && !String(user.role).toLowerCase().includes("admin") ? null : null}
            </div>
            <NotificationPanel
              conversations={sessions}
              botAlerts={botAlerts}
              onOpenConversation={handleOpenConversationById}
            />
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, celular o mensaje..."
              className={`h-10 pl-9 pr-8 transition-colors ${search.trim() ? "border-blue-400 ring-1 ring-blue-300" : ""}`}
            />
            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* KPI: vista global o por chat según selección */}
          {selectedSession ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400 truncate">
                  {selectedSession.cliente_nombre || "Chat seleccionado"}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSession(null)}
                  className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Ver todo
                </button>
              </div>
              <ChatKpiCards session={selectedSession} />
            </div>
          ) : (
          <div className="grid grid-cols-7 gap-1.5">
            {/* Asignados */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleApplyMetricFilter("mine")}
                  className={`rounded-xl border p-2 text-left transition-all hover:shadow-sm ${
                    ownerFilter === "mine"
                      ? "bg-green-100 border-green-300 ring-1 ring-green-400"
                      : "bg-green-50 border-green-200 hover:border-green-300"
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <UserCheck className="w-3 h-3 text-green-600 flex-shrink-0" />
                    <span className="text-[8px] text-green-600 uppercase tracking-wide font-semibold truncate">Asignados</span>
                  </div>
                  <p className="text-base font-bold text-green-700 leading-none">{kpiByKey["mine"]?.value ?? 0}</p>
                </button>
              </TooltipTrigger>
              <TooltipContent>Mis conversaciones activas asignadas. Clic para filtrar.</TooltipContent>
            </Tooltip>

            {/* At. Urgente */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleApplyMetricFilter("overdue")}
                  className={`rounded-xl border p-2 text-left transition-all hover:shadow-sm ${
                    priorityFilter === "overdue"
                      ? "bg-red-100 border-red-300 ring-1 ring-red-400"
                      : "bg-red-50 border-red-200 hover:border-red-300"
                  }`}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <Hourglass className="w-3 h-3 text-red-500 animate-pulse flex-shrink-0" />
                    <span className="text-[8px] text-red-500 uppercase tracking-wide font-semibold truncate">Urgente</span>
                  </div>
                  <p className="text-base font-bold text-red-700 leading-none">{kpiByKey["overdue"]?.value ?? 0}</p>
                </button>
              </TooltipTrigger>
              <TooltipContent>Conversaciones con SLA vencido. Clic para filtrar.</TooltipContent>
            </Tooltip>

            {/* Ritmo resp. */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-xl border p-2 text-left bg-blue-50 border-blue-200 cursor-default">
                  <div className="flex items-center gap-1 mb-1">
                    <TrendingUp className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    <span className="text-[8px] text-blue-500 uppercase tracking-wide font-semibold truncate">Ritmo</span>
                  </div>
                  <p className="text-base font-bold text-blue-700 leading-none">{kpiByKey["ftr"]?.value ?? "--"}</p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Tiempo promedio de primera respuesta.</TooltipContent>
            </Tooltip>

            {/* Interacción */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-xl border p-2 text-left bg-slate-50 border-slate-200 cursor-default">
                  <div className="flex items-center gap-1 mb-1">
                    <Users className="w-3 h-3 text-slate-500 flex-shrink-0" />
                    <span className="text-[8px] text-slate-500 uppercase tracking-wide font-semibold truncate">Interacc.</span>
                  </div>
                  <p className="text-base font-bold text-slate-700 leading-none">
                    {avgInteractionMin != null ? `${avgInteractionMin}m` : "--"}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent>Duración promedio de sesiones de conversación activas.</TooltipContent>
            </Tooltip>

            {/* Canal cards */}
            {CHANNEL_FILTERS.map(({ key, label, Icon, active, inactive, iconColor, countColor }) => (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => handleToggleChannel(key)}
                    className={`rounded-xl border p-2 text-left transition-all cursor-pointer ${
                      channelFilter === key ? active : inactive
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${channelFilter === key ? iconColor : "text-gray-400"}`} />
                    <p className={`text-base font-bold leading-none ${channelFilter === key ? countColor : "text-gray-500"}`}>
                      {channelCounts[key]}
                    </p>
                    <p className="text-[8px] text-gray-400 mt-0.5">{label}</p>
                  </button>
                </TooltipTrigger>
                <TooltipContent>{channelFilter === key ? `Quitar filtro ${label}` : `Filtrar por ${label}`}</TooltipContent>
              </Tooltip>
            ))}
          </div>
          )}

          <div className="flex items-center justify-end">
            <span className="text-xs text-gray-400">{filteredSessions.length} conv.</span>
          </div>
        </div>

        {/* Layout conversaciones */}
        <div className="grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)] gap-2 flex-1 min-h-0">
          <div className={`${selectedSession ? "hidden lg:flex" : "flex"} border rounded-xl overflow-hidden bg-white shadow min-h-0 h-full flex-col`}>
            {/* Tabs Del equipo / Mis chats (solo si el usuario tiene agente Chatwoot) */}
            {user?.chatwoot_agent_id && (
              <div className="flex border-b bg-gray-50 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setViewFilter("team")}
                  className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                    viewFilter === "team"
                      ? "border-b-2 border-violet-500 text-violet-700 bg-violet-50"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Del equipo
                </button>
                <button
                  type="button"
                  onClick={() => setViewFilter("mine")}
                  className={`flex-1 py-1.5 text-[11px] font-medium transition-colors ${
                    viewFilter === "mine"
                      ? "border-b-2 border-violet-500 text-violet-700 bg-violet-50"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Mis chats
                </button>
              </div>
            )}

            {/* Tabs Activos / Pendientes */}
            <div className="flex border-b bg-white flex-shrink-0">
              <button
                type="button"
                onClick={() => handleStatusTabChange("open")}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  assignmentFilter !== "pending"
                    ? "border-b-2 border-blue-500 text-blue-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Activos
              </button>
              <button
                type="button"
                onClick={() => handleStatusTabChange("pending")}
                className={`flex-1 py-2 text-xs font-medium transition-colors ${
                  assignmentFilter === "pending"
                    ? "border-b-2 border-amber-500 text-amber-600"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Pendientes
              </button>
            </div>

            {search.trim() && (
              <div className="px-4 py-2 border-b bg-blue-50/60 flex items-center justify-between">
                <span className="text-xs text-blue-700 font-medium">
                  {serverSearchLoading
                    ? "Buscando en Chatwoot..."
                    : serverSearchResults !== null
                      ? `${filteredSessions.length} resultado${filteredSessions.length !== 1 ? "s" : ""} en Chatwoot para "${search.trim()}"`
                      : `${filteredSessions.length} resultado${filteredSessions.length !== 1 ? "s" : ""} para "${search.trim()}"`
                  }
                </span>
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
                >
                  Limpiar
                </button>
              </div>
            )}
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <ChannelPill channel={s.source_channel} />
                          {/* Quick-assign status */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                            <div className="relative flex items-center">
                              <select
                                value={s.assignment_status === "resolved" ? "closed" : (s.assignment_status || "open")}
                                onChange={(e) => handleQuickStatusChange(s.session_id, e.target.value)}
                                className={`appearance-none text-[10px] pr-4 pl-1.5 py-0.5 rounded-full border font-medium cursor-pointer transition-colors ${
                                  s.assignment_status === "open" ? "bg-green-50 border-green-300 text-green-700" :
                                  s.assignment_status === "pending" ? "bg-amber-50 border-amber-300 text-amber-700" :
                                  (s.assignment_status === "closed" || s.assignment_status === "resolved") ? "bg-gray-100 border-gray-300 text-gray-500" :
                                  s.assignment_status === "snoozed" ? "bg-blue-50 border-blue-300 text-blue-600" :
                                  "bg-green-50 border-green-300 text-green-700"
                                }`}
                              >
                                <option value="open">Abierta</option>
                                <option value="pending">Pendiente</option>
                                <option value="closed">Cerrada</option>
                              </select>
                              <ChevronDown className="absolute right-1 w-2.5 h-2.5 pointer-events-none text-current opacity-60" />
                            </div>
                          </div>
                          <span className="group-hover:hidden text-[10px] font-medium">
                            {s.assignment_status === "open" ? <span className="text-green-600">Abierta</span> :
                             s.assignment_status === "pending" ? <span className="text-amber-600">Pendiente</span> :
                             (s.assignment_status === "resolved" || s.assignment_status === "closed") ? <span className="text-gray-400">Cerrada</span> :
                             s.assignment_status === "snoozed" ? <span className="text-blue-500">Pospuesta</span> :
                             <span className="text-green-600">Abierta</span>}
                          </span>
                          {/* Agente asignado — siempre visible si existe */}
                          {s.assigned_agent_name && (
                            <span className="text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-1.5 py-0.5 truncate max-w-[80px]">
                              {s.assigned_agent_name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Quick-assign agente (hover) */}
                          {agents.length > 0 && (
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              <div className="relative flex items-center">
                                <select
                                  value={s.assigned_agent_id || ""}
                                  onChange={(e) => handleQuickAgentAssign(s.session_id, e.target.value)}
                                  className="appearance-none text-[10px] pr-4 pl-1.5 py-0.5 rounded-full border bg-indigo-50 border-indigo-200 text-indigo-700 font-medium cursor-pointer"
                                >
                                  <option value="">Asignar...</option>
                                  {agents.map((a) => (
                                    <option key={a.id} value={a.id}>{a.name}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-1 w-2.5 h-2.5 pointer-events-none text-indigo-500 opacity-60" />
                              </div>
                            </div>
                          )}
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
