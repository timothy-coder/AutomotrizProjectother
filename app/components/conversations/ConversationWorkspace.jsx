"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Send,
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

export default function ConversationWorkspace({
  session,
  onConversationUpdated,
  onBack,
  focusComposerSignal = 0,
}) {
  const { user } = useAuth();

  // ── Mensajes / timeline ──────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);
  const composerRef = useRef(null);
  const lastMarkedRef = useRef(0);
  const stickToBottomRef = useRef(true);


  async function markAsRead(lastMessageId) {
    if (!session?.session_id || !lastMessageId) return;
    if (lastMarkedRef.current >= lastMessageId) return;

    try {
      await fetch("/api/conversations/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          last_message_id: lastMessageId,
        }),
      });
      lastMarkedRef.current = lastMessageId;
      if (onConversationUpdated) onConversationUpdated();
    } catch (e) {
      console.error("Error marcando leído:", e);
    }
  }

  async function loadTimeline() {
    if (!session?.session_id) return;

    setTimelineLoading(true);
    try {
      const res = await fetch(
        `/api/conversations/timeline?session_id=${session.session_id}`,
        { cache: "no-store" }
      );
      if (!res.ok) {
        throw new Error(`Error ${res.status} cargando timeline`);
      }
      const data = await res.json();
      const parsed = Array.isArray(data) ? data : [];
      setMessages(parsed);

      const latestInbound = [...parsed]
        .reverse()
        .find((m) => (m?.message_direction || "") === "inbound" || Boolean(m?.pregunta));

      if (latestInbound?.id) {
        await markAsRead(latestInbound.id);
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
    if (!text || !session?.session_id || sending) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/conversations/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          text,
          direction: "outbound",
          source: "manual_ui",
          source_channel: channelToSend,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo enviar el mensaje");
      }

      setNewMessage("");
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
    if (!session?.session_id) return;
    lastMarkedRef.current = 0;
    loadTimeline();
  }, [session]);

  useEffect(() => {
    if (!session?.session_id) return;

    const timer = setInterval(() => {
      loadTimeline();
    }, 5000);

    return () => clearInterval(timer);
  }, [session]);

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

    if (stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!session?.session_id) return;
    if (!focusComposerSignal) return;

    const node = composerRef.current;
    if (!node) return;

    node.focus();
    const end = node.value?.length || 0;
    node.setSelectionRange(end, end);
  }, [focusComposerSignal, session?.session_id]);

  // ─────────────────────────────────────────────────────────────
  // Canal automático: detectar del último mensaje entrante
  // ─────────────────────────────────────────────────────────────

  const channelToSend = useMemo(() => {
    const lastInbound = [...messages].reverse().find(
      (m) => (m?.message_direction || "") === "inbound" || Boolean(m?.pregunta)
    );
    return (lastInbound?.source_channel || session?.source_channel || "whatsapp").toLowerCase();
  }, [messages, session]);

  // ─────────────────────────────────────────────────────────────
  // Resumen desde el timeline
  // ─────────────────────────────────────────────────────────────

  const resumen = useMemo(() => {
    // El campo resumen viene en cada row del timeline tomado de conversation_sessions.conversation_summary
    if (messages.length > 0) {
      const lastWithResumen = [...messages].reverse().find((m) => m?.resumen && String(m.resumen).trim());
      if (lastWithResumen?.resumen) return String(lastWithResumen.resumen).trim();
    }
    return session?.resumen || "Sin resumen disponible.";
  }, [messages, session]);

  // ─────────────────────────────────────────────────────────────
  // Render vacío
  // ─────────────────────────────────────────────────────────────

  if (!session?.session_id) {
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
          <Button variant="ghost" size="icon" className="lg:hidden -ml-2 flex-shrink-0" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>

          {/* Avatar + info */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm flex-shrink-0">
              {getInitials(session?.cliente_nombre)}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-gray-900 truncate">
                {session?.cliente_nombre || "Conversación"}
              </p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">{session?.celular || session?.phone}</span>
                {channelToSend && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    channelToSend === "instagram" ? "bg-pink-100 text-pink-700" :
                    channelToSend === "facebook" ? "bg-blue-100 text-blue-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {channelToSend}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Resumen */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8 flex-shrink-0">
                    <FileText className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[320px]">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Resumen de conversación</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{resumen}</p>
                  </div>
                </PopoverContent>
              </Popover>
            </TooltipTrigger>
            <TooltipContent>Ver resumen generado de la conversación</TooltipContent>
          </Tooltip>
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
              {m.pregunta && (
                <div className="flex items-end gap-2 max-w-[80%]">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
                    {getInitials(session?.cliente_nombre)}
                  </div>
                  <div>
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-gray-800">
                      {m.pregunta}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 ml-1">
                      {formatMsgTime(m.created_at)}
                    </p>
                  </div>
                </div>
              )}

              {/* Respuesta del agente — derecha */}
              {m.respuesta && (
                <div className="flex items-end gap-2 max-w-[80%] ml-auto flex-row-reverse">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0">
                    {getInitials(user?.fullname || "A")}
                  </div>
                  <div>
                    <div className="bg-indigo-600 text-white shadow-sm rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm">
                      {m.respuesta}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 text-right mr-1">
                      {formatMsgTime(m.created_at)}{" "}
                      <span className={m.message_status === "read" ? "text-blue-500" : ""}>
                        {STATUS_ICONS[m.message_status] || ""}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Compositor ──────────────────────────────────────── */}
        <div className="border-t p-3 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <Textarea
              ref={composerRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje para el cliente..."
              className="min-h-24 sm:flex-1"
              disabled={sending}
            />

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

              <Button className="w-full" onClick={() => handleSendMessage()} disabled={sending || !newMessage.trim()}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

      </div>
    </TooltipProvider>
  );
}
