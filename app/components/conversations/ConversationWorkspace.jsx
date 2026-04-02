"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  FileText,
  CornerUpLeft,
  MessageSquarePlus,
  Send,
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

const CANNED_RESPONSES = [
  { label: "Saludo", text: "¡Hola! Buen día, ¿en qué puedo ayudarte hoy?" },
  { label: "Un momento", text: "¡Claro! Permíteme un momento para verificar esa información." },
  { label: "Horario", text: "Nuestro horario de atención es de lunes a viernes de 9 a 18 hs y sábados de 9 a 13 hs." },
  { label: "Cotización", text: "Con gusto te preparo una cotización. ¿Podés indicarme el modelo que te interesa y si necesitás financiamiento?" },
  { label: "Turno taller", text: "Para coordinar un turno en el taller, necesito tu nombre, el modelo del vehículo y el servicio que necesitás. ¿Me podés facilitar esos datos?" },
  { label: "Gracias", text: "¡Muchas gracias por contactarnos! Quedamos a tu disposición para cualquier consulta." },
  { label: "Seguimiento", text: "Te escribo para hacer un seguimiento de tu consulta. ¿Pudiste revisar la información que te enviamos?" },
];

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
  const [quotedMessage, setQuotedMessage] = useState(null);
  const [cannedOpen, setCannedOpen] = useState(false);
  const scrollRef = useRef(null);
  const composerRef = useRef(null);
  const lastMarkedRef = useRef(0);
  const stickToBottomRef = useRef(true);
  const lastMessageIdRef = useRef(null);


  async function markAsRead(lastMessageId) {
    if (!session?.session_id || !lastMessageId) return;
    if (lastMarkedRef.current >= lastMessageId) return;

    try {
      const res = await fetch("/api/conversations/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          last_message_id: lastMessageId,
        }),
      });
      if (!res.ok) throw new Error(`mark-read failed: ${res.status}`);
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

    const fullText = quotedMessage
      ? `> ${quotedMessage}\n\n${text}`
      : text;

    try {
      const res = await fetch("/api/conversations/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          text: fullText,
          direction: "outbound",
          source: "manual_ui",
          source_channel: channelToSend,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo enviar el mensaje");
      }

      // Advertir si el mensaje se registró pero no llegó al proveedor de mensajería
      if (data?.message_status === "failed" || data?.n8n?.forwarded === false) {
        setError("Mensaje guardado, pero no se pudo entregar al cliente. Verificá la configuración del servidor de envío.");
      }

      setNewMessage("");
      setQuotedMessage(null);
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
    lastMessageIdRef.current = null;
    stickToBottomRef.current = true;
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
                <div className="flex items-end gap-2 max-w-[80%] group/msg">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
                    {getInitials(session?.cliente_nombre)}
                  </div>
                  <div>
                    <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-gray-800">
                      {m.pregunta}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 ml-1">
                      <p className="text-[10px] text-gray-400">{formatMsgTime(m.created_at)}</p>
                      <button
                        type="button"
                        onClick={() => setQuotedMessage(m.pregunta)}
                        className="opacity-0 group-hover/msg:opacity-100 transition-opacity text-gray-400 hover:text-indigo-500"
                      >
                        <CornerUpLeft className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Respuesta del agente — derecha */}
              {m.respuesta && (
                <div className="flex items-end gap-2 max-w-[80%] ml-auto flex-row-reverse group/msg">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0">
                    {getInitials(user?.fullname || "A")}
                  </div>
                  <div>
                    <div className="bg-indigo-600 text-white shadow-sm rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm">
                      {m.respuesta}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-0.5 mr-1">
                      <button
                        type="button"
                        onClick={() => setQuotedMessage(m.respuesta)}
                        className="opacity-0 group-hover/msg:opacity-100 transition-opacity text-gray-400 hover:text-indigo-500"
                      >
                        <CornerUpLeft className="w-3 h-3" />
                      </button>
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

        {/* ── Compositor ──────────────────────────────────────── */}
        <div className="border-t p-3 space-y-2">

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

          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <div className="sm:flex-1 relative">
              <Textarea
                ref={composerRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Escribe un mensaje para el cliente..."
                className="min-h-16 w-full rounded-xl pr-10"
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
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="absolute right-2.5 bottom-2.5 text-gray-400 hover:text-indigo-500 transition-colors"
                  >
                    <MessageSquarePlus className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
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
