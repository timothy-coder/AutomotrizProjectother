"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  CornerUpLeft,
  Lock,
  MessageSquarePlus,
  Paperclip,
  Send,
  Tag,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function channelFromInbox(channelType) {
  if (!channelType) return "whatsapp";
  if (channelType.includes("Whatsapp")) return "whatsapp";
  if (channelType.includes("Instagram")) return "instagram";
  if (channelType.includes("FacebookPage") || channelType.includes("Page")) return "facebook";
  return "whatsapp";
}

function mapSession(session) {
  if (!session) return null;
  const sid = session.session_id ?? session.id;
  if (!sid) return null;
  // Support both old CRM format and new Chatwoot format
  return {
    session_id: sid,
    client_name: session.client_name ?? session.meta?.sender?.name ?? "Cliente",
    cliente_nombre: session.cliente_nombre ?? session.client_name ?? session.meta?.sender?.name ?? "Cliente",
    phone: session.phone ?? session.celular ?? session.meta?.sender?.phone_number ?? "",
    celular: session.celular ?? session.phone ?? session.meta?.sender?.phone_number ?? "",
    source_channel: session.source_channel ?? channelFromInbox(session.meta?.channel ?? session.channel ?? session.inbox?.channel_type),
    assignment_status: session.assignment_status ?? session.status ?? "open",
    contact_id: session.contact_id ?? session.meta?.sender?.id ?? null,
    resumen: session.resumen ?? "",
  };
}

function getAuthToken() {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  const token = match ? match[1] : "";
  return token;
}

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function formatMsgTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

const STATUS_ICONS = {
  sent: "✓",
  delivered: "✓✓",
  read: "✓✓",
  failed: "✗",
  received: "",
};

function AttachmentBubble({ attachment, isOutbound }) {
  const { file_type, data_url, thumb_url, extension } = attachment;

  if (file_type === "image" || file_type === "sticker") {
    return (
      <a href={data_url} target="_blank" rel="noopener noreferrer">
        <img
          src={thumb_url || data_url}
          alt="imagen"
          className="max-w-[220px] max-h-[220px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
        />
      </a>
    );
  }

  if (file_type === "audio") {
    return <audio controls src={data_url} className="max-w-[240px] rounded-lg" />;
  }

  if (file_type === "video") {
    return (
      <video controls src={data_url} className="max-w-[240px] max-h-[180px] rounded-xl object-cover" />
    );
  }

  const filename = data_url?.split("/").pop()?.split("?")[0] || `archivo.${extension || "bin"}`;
  return (
    <a
      href={data_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
        isOutbound
          ? "bg-indigo-500 text-white hover:bg-indigo-400"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      <FileText className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate max-w-[160px]">{filename}</span>
    </a>
  );
}

const CANNED_RESPONSES = [
  { label: "Saludo", text: "¡Hola! Buen día, ¿en qué puedo ayudarte hoy?" },
  { label: "Un momento", text: "¡Claro! Permíteme un momento para verificar esa información." },
  { label: "Horario", text: "Nuestro horario de atención es de lunes a viernes de 9 a 18 hs y sábados de 9 a 13 hs." },
  { label: "Cotización", text: "Con gusto te preparo una cotización. ¿Podés indicarme el modelo que te interesa y si necesitás financiamiento?" },
  { label: "Turno taller", text: "Para coordinar un turno en el taller, necesito tu nombre, el modelo del vehículo y el servicio que necesitás. ¿Me podés facilitar esos datos?" },
  { label: "Gracias", text: "¡Muchas gracias por contactarnos! Quedamos a tu disposición para cualquier consulta." },
  { label: "Seguimiento", text: "Te escribo para hacer un seguimiento de tu consulta. ¿Pudiste revisar la información que te enviamos?" },
];

function hasMensajesPerm(permissions, action) {
  const mod = permissions?.mensajes;
  if (!mod) return false;
  if (Array.isArray(mod)) {
    const actionMap = {
      view: ["read", "view"],
      create: ["create", "write"],
      edit: ["edit", "update", "write"],
    };
    return (actionMap[action] || [action]).some((a) => mod.includes(a));
  }
  if (typeof mod === "object") {
    if (mod.viewall === true || mod.all === true) return true;
    return mod?.[action] === true;
  }
  return false;
}

export default function ConversationWorkspace({
  session,
  onConversationUpdated,
  onBack,
  focusComposerSignal = 0,
}) {
  const { user, permissions } = useAuth();

  const isAdmin = String(user?.role || "").toLowerCase().includes("admin");
  const canEdit = isAdmin || hasMensajesPerm(permissions, "edit");
  const canWrite = isAdmin || hasMensajesPerm(permissions, "create") || hasMensajesPerm(permissions, "edit");

  // ── Normalizar session prop (soporta CRM viejo y Chatwoot) ──
  const sess = mapSession(session);

  // ── Mensajes / timeline ──────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [quotedMessage, setQuotedMessage] = useState(null);
  const [cannedOpen, setCannedOpen] = useState(false);
  const [isPrivateNote, setIsPrivateNote] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const [labels, setLabels] = useState([]);
  const [agents, setAgents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [snoozing, setSnoozing] = useState(false);
  const [contact, setContact] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const scrollRef = useRef(null);
  const composerRef = useRef(null);
  const lastMarkedRef = useRef(0);
  const stickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef(null);


  async function loadLabels() {
    if (!sess?.session_id) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/chatwoot/conversations/${sess.session_id}/labels`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setLabels(data?.labels ?? []);
    } catch (err) {
      console.error("Error cargando labels:", err.message);
      setError("No se pudieron cargar las etiquetas");
    }
  }

  async function loadContact() {
    if (!sess?.contact_id) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/chatwoot/contacts/${sess.contact_id}`, {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setContact(data);
    } catch (err) {
      console.error("Error cargando perfil de contacto:", err.message);
      setError("No se pudo cargar el perfil del contacto");
    }
  }

  async function loadAgents() {
    if (agents.length > 0) return;
    try {
      const token = getAuthToken();
      const res = await fetch("/api/chatwoot/agents", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setAgents(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      console.error("Error cargando agentes:", err.message);
      setError("No se pudo cargar la lista de agentes");
    }
  }

  async function loadTeams() {
    if (teams.length > 0) return;
    try {
      const token = getAuthToken();
      const res = await fetch("/api/chatwoot/teams", {
        cache: "no-store",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return;
      const data = await res.json();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando equipos:", err.message);
      setError("No se pudo cargar la lista de equipos");
    }
  }

  async function handleAssignTeam(teamId) {
    if (!sess?.session_id) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/chatwoot/conversations/${sess.session_id}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ team_id: teamId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo asignar el equipo");
      setAssignOpen(false);
      if (onConversationUpdated) onConversationUpdated();
    } catch (err) {
      console.error("Error asignando equipo:", err);
      setError(err?.message || "Error asignando equipo");
    }
  }

  async function handleAssign(agentId) {
    if (!sess?.session_id) return;
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/chatwoot/conversations/${sess.session_id}/assign`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ agent_id: agentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo asignar el agente");
      setAssignOpen(false);
      if (onConversationUpdated) onConversationUpdated();
    } catch (err) {
      console.error("Error asignando agente:", err);
      setError(err?.message || "Error asignando agente");
    }
  }

  async function handleResolve() {
    if (!sess?.session_id || resolving) return;
    setResolving(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`/api/chatwoot/conversations/${sess.session_id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: "resolved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo resolver la conversación");
      if (onConversationUpdated) onConversationUpdated();
    } catch (err) {
      console.error("Error resolviendo conversación:", err);
      setError(err?.message || "Error resolviendo conversación");
    } finally {
      setResolving(false);
    }
  }

  async function handleSnooze(minutes) {
    if (!sess?.session_id || snoozing) return;
    setSnoozing(true);
    setSnoozeOpen(false);
    try {
      const token = getAuthToken();
      const snoozedUntil = Math.floor(Date.now() / 1000) + minutes * 60;
      const res = await fetch(`/api/chatwoot/conversations/${sess.session_id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: "snoozed", snoozed_until: snoozedUntil }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "No se pudo posponer la conversación");
      if (onConversationUpdated) onConversationUpdated();
    } catch (err) {
      console.error("Error posponiendo conversación:", err);
      setError(err?.message || "Error posponiendo conversación");
    } finally {
      setSnoozing(false);
    }
  }

  async function markAsRead() {
    if (!sess?.session_id) return;
    try {
      const token = getAuthToken();
      await fetch(`/api/chatwoot/conversations/${sess.session_id}/mark-read`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    } catch (err) {
      console.error("Error marcando como leído:", err);
    }
  }

  async function loadTimeline() {
    if (!sess?.session_id) return;

    setTimelineLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `/api/chatwoot/conversations/${sess.session_id}/messages`,
        {
          cache: "no-store",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!res.ok) {
        throw new Error(`Error ${res.status} cargando timeline`);
      }
      const data = await res.json();
      // Chatwoot returns { payload: [...messages] }
      const raw = Array.isArray(data) ? data : (data.payload || []);
      const parsed = raw.map((msg) => ({
        id: msg.id,
        pregunta: msg.message_type === 0 ? msg.content : null,
        respuesta: (msg.message_type === 1 || msg.message_type === 3) ? msg.content : null,
        message_direction: msg.message_type === 0 ? "inbound" : "outbound",
        isPrivate: Boolean(msg.private),
        attachments: Array.isArray(msg.attachments) ? msg.attachments : [],
        source_channel: sess.source_channel || "whatsapp",
        created_at: msg.created_at
          ? (typeof msg.created_at === "number"
            ? new Date(msg.created_at * 1000).toISOString()
            : new Date(msg.created_at).toISOString())
          : null,
        message_status: msg.status || "sent",
        sender_name: msg.sender?.name || "",
        resumen: null,
      }))
        .filter((m) => m.pregunta !== null || m.respuesta !== null || m.attachments.length > 0);
      setMessages(parsed);

      const latestInbound = [...parsed]
        .reverse()
        .find((m) => m?.message_direction === "inbound");

      if (latestInbound?.id) {
        markAsRead();
      }
    } catch (e) {
      console.error("Error cargando timeline:", e);
      setMessages([]);
      setError("No se pudo cargar los mensajes. Intentá de nuevo.");
    } finally {
      setTimelineLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Enviar mensaje
  // ─────────────────────────────────────────────────────────────

  async function handleSendMessage() {
    const text = newMessage.trim();
    if (!text && !selectedFile) return;
    if (!sess?.session_id || sending) return;

    setSending(true);
    setError("");

    const content = quotedMessage && text
      ? `> ${quotedMessage}\n\n${text}`
      : text;

    try {
      const token = getAuthToken();
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

      let res;
      if (selectedFile) {
        const form = new FormData();
        if (content) form.append("content", content);
        form.append("private", String(isPrivateNote));
        form.append("file", selectedFile, selectedFile.name);
        res = await fetch(
          `/api/chatwoot/conversations/${sess.session_id}/messages`,
          { method: "POST", headers: authHeader, body: form }
        );
      } else {
        res = await fetch(
          `/api/chatwoot/conversations/${sess.session_id}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeader },
            body: JSON.stringify({ content, private: isPrivateNote }),
          }
        );
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo enviar el mensaje");
      }

      setNewMessage("");
      setQuotedMessage(null);
      setIsPrivateNote(false);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadTimeline();
      if (onConversationUpdated) onConversationUpdated();
    } catch (e) {
      setError(e?.message || "Error enviando mensaje");
    } finally {
      setSending(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!sess?.session_id) return;
    lastMarkedRef.current = 0;
    lastMessageIdRef.current = null;
    stickToBottomRef.current = true;
    loadTimeline();
    loadLabels();
    loadAgents();
    loadContact();
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sess?.session_id) return;

    const timer = setInterval(() => {
      loadTimeline();
    }, 5000);

    return () => clearInterval(timer);
  }, [session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function handleScroll() {
      const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickToBottomRef.current = distanceToBottom < 80;
    }

    el.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const lastMsg = messages[messages.length - 1];
    const latestId = lastMsg?.id ?? null;
    const isNewMessage = latestId !== lastMessageIdRef.current;
    lastMessageIdRef.current = latestId;

    // Solo hacer scroll si llegó un mensaje nuevo Y el usuario estaba al fondo
    if (isNewMessage && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!sess?.session_id) return;
    if (!focusComposerSignal) return;

    const node = composerRef.current;
    if (!node) return;

    node.focus();
    const end = node.value?.length || 0;
    node.setSelectionRange(end, end);
  }, [focusComposerSignal, sess?.session_id]);

  // ─────────────────────────────────────────────────────────────
  // Canal automático: detectar del último mensaje entrante
  // ─────────────────────────────────────────────────────────────

  const channelToSend = useMemo(() => {
    const lastInbound = [...messages].reverse().find(
      (m) => (m?.message_direction || "") === "inbound" || Boolean(m?.pregunta)
    );
    return (lastInbound?.source_channel || sess?.source_channel || "whatsapp").toLowerCase();
  }, [messages, sess]);

  // ─────────────────────────────────────────────────────────────
  // Resumen desde el timeline
  // ─────────────────────────────────────────────────────────────

  const resumen = useMemo(() => {
    // El campo resumen viene en cada row del timeline tomado de conversation_sessions.conversation_summary
    if (messages.length > 0) {
      const lastWithResumen = [...messages].reverse().find((m) => m?.resumen && String(m.resumen).trim());
      if (lastWithResumen?.resumen) return String(lastWithResumen.resumen).trim();
    }
    return sess?.resumen || "Sin resumen disponible.";
  }, [messages, sess]);

  // ─────────────────────────────────────────────────────────────
  // Render vacío
  // ─────────────────────────────────────────────────────────────

  if (!sess?.session_id) {
    return (
      <div className="h-full border rounded-xl bg-white shadow flex items-center justify-center text-sm text-gray-500">
        Selecciona una conversación para comenzar.
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Render principal
  // ─────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="h-full border rounded-xl bg-white shadow flex flex-col">

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="border-b px-4 py-3 flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden -ml-2 flex-shrink-0" onClick={onBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Volver a la lista de conversaciones</TooltipContent>
          </Tooltip>

          {/* Avatar + info */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Popover open={contactOpen} onOpenChange={setContactOpen}>
              <PopoverTrigger asChild>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0 hover:ring-2 hover:ring-indigo-300 transition-all">
                      {getInitials(sess?.cliente_nombre)}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Ver perfil del contacto</TooltipContent>
                </Tooltip>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-64 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold flex-shrink-0">
                    {getInitials(sess?.cliente_nombre)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{contact?.name || sess?.cliente_nombre}</p>
                    {contact?.company && (
                      <p className="text-xs text-gray-500 truncate">{contact.company}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-gray-600">
                  {contact?.phone && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-12 flex-shrink-0">Teléfono</span>
                      <span className="font-medium">{contact.phone}</span>
                    </div>
                  )}
                  {contact?.email && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-12 flex-shrink-0">Email</span>
                      <span className="font-medium truncate">{contact.email}</span>
                    </div>
                  )}
                  {contact?.location && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-12 flex-shrink-0">Ciudad</span>
                      <span className="font-medium">{contact.location}</span>
                    </div>
                  )}
                  {contact?.conversations_count != null && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 w-12 flex-shrink-0">Convs.</span>
                      <span className="font-medium">{contact.conversations_count} conversaciones</span>
                    </div>
                  )}
                  {!contact && (
                    <p className="text-gray-400 italic">Cargando perfil...</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">
                {sess?.cliente_nombre || "Conversación"}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-500">{sess?.celular || sess?.phone}</span>
                {channelToSend && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    channelToSend === "instagram" ? "bg-pink-100 text-pink-700" :
                    channelToSend === "facebook" ? "bg-blue-100 text-blue-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {channelToSend}
                  </span>
                )}
                {labels.map((label) => (
                  <span key={label} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700">
                    <Tag className="w-2.5 h-2.5" />
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Asignar agente — solo usuarios con permiso edit */}
            {canEdit && <Popover open={assignOpen} onOpenChange={(o) => { setAssignOpen(o); if (o) { loadAgents(); loadTeams(); } }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <UserCheck className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Asignar conversación a agente o equipo</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-64 p-2 space-y-1">
                {/* Equipos */}
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1 pb-0.5 flex items-center gap-1">
                  <Users className="w-3 h-3" /> Equipo
                </p>
                {teams.length === 0 && (
                  <p className="text-xs text-gray-400 px-2 py-1">Cargando equipos...</p>
                )}
                {teams.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleAssignTeam(t.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-violet-50 transition-colors flex items-center gap-2"
                  >
                    <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700 flex-shrink-0">
                      {(t.name || "?")[0].toUpperCase()}
                    </div>
                    <p className="text-xs font-medium text-gray-800 truncate">{t.name}</p>
                  </button>
                ))}
                {/* Agentes */}
                <div className="border-t pt-1 mt-1">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1 pb-0.5 flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Agente
                  </p>
                  {agents.length === 0 && (
                    <p className="text-xs text-gray-400 px-2 py-1">Cargando agentes...</p>
                  )}
                  {agents.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => handleAssign(a.id)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-2"
                    >
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 flex-shrink-0">
                        {(a.crm_user?.fullname || a.name || "?")[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {a.crm_user?.fullname || a.name}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {a.crm_user
                            ? `@${a.crm_user.username} · ${a.crm_user.role_name || a.role}`
                            : a.role}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>}

            {/* Snooze — solo usuarios con permiso edit */}
            {canEdit && <Popover open={snoozeOpen} onOpenChange={setSnoozeOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 text-amber-600 hover:bg-amber-50 hover:border-amber-300"
                      disabled={snoozing}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Posponer conversación</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-52 p-2 space-y-1">
                <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1 pb-1">Posponer por</p>
                {[
                  { label: "30 minutos", minutes: 30 },
                  { label: "1 hora", minutes: 60 },
                  { label: "3 horas", minutes: 180 },
                  { label: "Mañana (9 AM)", minutes: null },
                ].map(({ label, minutes }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (minutes !== null) {
                        handleSnooze(minutes);
                      } else {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(9, 0, 0, 0);
                        handleSnooze(Math.round((tomorrow.getTime() - Date.now()) / 60000));
                      }
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 text-xs text-gray-700 transition-colors"
                  >
                    {label}
                  </button>
                ))}
              </PopoverContent>
            </Popover>}

            {/* Resolver — solo usuarios con permiso edit */}
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 text-green-600 hover:bg-green-50 hover:border-green-300"
                    onClick={() => handleResolve()}
                    disabled={resolving}
                  >
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Marcar conversación como resuelta</TooltipContent>
              </Tooltip>
            )}

            {/* Resumen */}
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>Ver resumen generado de la conversación</TooltipContent>
              </Tooltip>
              <PopoverContent align="end" className="w-[320px]">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Resumen de conversación</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{resumen}</p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* ── Timeline de mensajes ─────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {timelineLoading && messages.length === 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-gray-400 italic">
              Cargando mensajes...
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className="space-y-2">
              {/* Mensaje del cliente — izquierda */}
              {m.message_direction === "inbound" && (m.pregunta || m.attachments?.length > 0) && (
                <div className="flex items-end gap-2 max-w-[80%] group/msg">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
                    {getInitials(sess?.cliente_nombre)}
                  </div>
                  <div className="space-y-1">
                    {m.attachments?.map((att) => (
                      <AttachmentBubble key={att.id} attachment={att} isOutbound={false} />
                    ))}
                    {m.pregunta && (
                      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-gray-800">
                        {m.pregunta}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5 ml-1">
                      <p className="text-[10px] text-gray-400">{formatMsgTime(m.created_at)}</p>
                      {m.pregunta && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setQuotedMessage(m.pregunta)}
                              className="opacity-0 group-hover/msg:opacity-100 transition-opacity text-gray-400 hover:text-indigo-500"
                            >
                              <CornerUpLeft className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">Citar este mensaje</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Respuesta del agente — derecha */}
              {m.message_direction === "outbound" && (m.respuesta || m.attachments?.length > 0) && (
                <div className="flex items-end gap-2 max-w-[80%] ml-auto flex-row-reverse group/msg">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${m.isPrivate ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-600"}`}>
                    {m.isPrivate ? <Lock className="w-3 h-3" /> : getInitials(user?.fullname || "A")}
                  </div>
                  <div className="space-y-1">
                    {m.isPrivate && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-600 font-medium justify-end">
                        <Lock className="w-2.5 h-2.5" />
                        Nota interna
                      </div>
                    )}
                    {m.attachments?.map((att) => (
                      <AttachmentBubble key={att.id} attachment={att} isOutbound={true} />
                    ))}
                    {m.respuesta && (
                      <div className={`shadow-sm rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm ${m.isPrivate ? "bg-amber-50 border border-amber-200 text-amber-900" : "bg-indigo-600 text-white"}`}>
                        {m.respuesta}
                      </div>
                    )}
                    <div className="flex items-center justify-end gap-2 mt-0.5 mr-1">
                      {m.respuesta && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => setQuotedMessage(m.respuesta)}
                              className="opacity-0 group-hover/msg:opacity-100 transition-opacity text-gray-400 hover:text-indigo-500"
                            >
                              <CornerUpLeft className="w-3 h-3" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="left">Citar este mensaje</TooltipContent>
                        </Tooltip>
                      )}
                      <p className="text-[10px] text-gray-400">
                        {formatMsgTime(m.created_at)}{" "}
                        <span className={m.message_status === "read" ? "text-blue-500" : ""}>
                          {STATUS_ICONS[m.message_status] || ""}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Compositor — solo usuarios con permiso write ──────── */}
        {canWrite && <div className="border-t p-3 space-y-2">

          {/* Cita de mensaje */}
          {quotedMessage && (
            <div className="flex items-start gap-2 bg-indigo-50 border-l-2 border-indigo-400 rounded-r-lg px-3 py-2">
              <CornerUpLeft className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-700 line-clamp-2 flex-1">{quotedMessage}</p>
              <button
                type="button"
                onClick={() => setQuotedMessage(null)}
                className="text-indigo-300 hover:text-indigo-600 transition-colors flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Toggle nota privada */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setIsPrivateNote((prev) => !prev)}
                  className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors ${
                    isPrivateNote
                      ? "bg-amber-50 border-amber-300 text-amber-700"
                      : "bg-white border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  {isPrivateNote ? "Nota interna activa" : "Nota interna"}
                </button>
              </TooltipTrigger>
              <TooltipContent>Las notas internas solo son visibles para el equipo, no para el cliente</TooltipContent>
            </Tooltip>
            {isPrivateNote && (
              <span className="text-[10px] text-amber-600">Solo visible para el equipo</span>
            )}
            {/* Botón adjuntar archivo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border bg-white border-gray-200 text-gray-500 hover:border-gray-300 transition-colors"
                >
                  <Paperclip className="w-3 h-3" />
                  Adjuntar
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {channelToSend === "whatsapp"
                  ? "Imágenes, audio, video o archivos"
                  : "Solo imágenes (Instagram / Facebook)"}
              </TooltipContent>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept={channelToSend === "whatsapp" ? "*/*" : "image/*"}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setSelectedFile(f);
              }}
            />
          </div>

          {/* Preview del archivo seleccionado */}
          {selectedFile && (
            <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-2">
              {selectedFile.type.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt={selectedFile.name}
                  className="w-10 h-10 object-cover rounded"
                />
              ) : (
                <FileText className="w-8 h-8 text-gray-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-700 truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-gray-400">
                  {(selectedFile.size / 1024).toFixed(0)} KB
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <div className="sm:flex-1 relative">
              <Textarea
                ref={composerRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isPrivateNote ? "Escribe una nota interna (no visible para el cliente)..." : "Escribe un mensaje para el cliente..."}
                className={`min-h-16 w-full rounded-xl pr-10 transition-colors ${isPrivateNote ? "bg-amber-50 border-amber-300 focus:border-amber-400" : ""}`}
                disabled={sending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              {/* Respuestas rápidas */}
              <Popover open={cannedOpen} onOpenChange={setCannedOpen}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className="absolute right-2.5 bottom-2.5 text-gray-400 hover:text-indigo-500 transition-colors"
                      >
                        <MessageSquarePlus className="w-4 h-4" />
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="top">Respuestas rápidas predefinidas</TooltipContent>
                </Tooltip>
                <PopoverContent align="end" side="top" className="w-72 p-2 space-y-1">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide px-1 pb-1">Respuestas rápidas</p>
                  {CANNED_RESPONSES.map((r) => (
                    <button
                      key={r.label}
                      type="button"
                      onClick={() => {
                        setNewMessage((prev) => prev ? `${prev} ${r.text}` : r.text);
                        setCannedOpen(false);
                        composerRef.current?.focus();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      <p className="text-xs font-semibold text-gray-700">{r.label}</p>
                      <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">{r.text}</p>
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            </div>

            <div className="sm:w-36 flex flex-col gap-2 justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`h-7 px-2.5 rounded-full border flex items-center gap-1.5 text-[11px] font-medium cursor-default self-end ${
                    channelToSend === "instagram"
                      ? "border-pink-200 bg-pink-50 text-pink-700"
                      : channelToSend === "facebook"
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-green-200 bg-green-50 text-green-700"
                  }`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      channelToSend === "instagram" ? "bg-pink-500" :
                      channelToSend === "facebook" ? "bg-blue-500" :
                      "bg-green-500"
                    }`} />
                    {channelToSend === "instagram" ? "Instagram" :
                     channelToSend === "facebook" ? "Facebook" :
                     "WhatsApp"}
                  </div>
                </TooltipTrigger>
                <TooltipContent>Respondiendo por {channelToSend} — canal del cliente</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button className="w-full" onClick={() => handleSendMessage()} disabled={sending || (!newMessage.trim() && !selectedFile)}>
                    <Send className="h-4 w-4 mr-2" />
                    {sending ? "Enviando..." : "Enviar"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Enviar mensaje (Ctrl+Enter)</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>}

        {!canWrite && (
          <div className="border-t px-4 py-3 bg-gray-50 text-xs text-gray-400 text-center">
            Solo lectura — no tenés permisos para enviar mensajes
          </div>
        )}

      </div>
    </TooltipProvider>
  );
}
