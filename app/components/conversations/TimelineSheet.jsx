"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { FileText, Send } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function TimelineSheet({
  open,
  onOpenChange,
  session,
  onConversationUpdated,
}) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [agents, setAgents] = useState([]);
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState("unassigned");
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [priorityLevel, setPriorityLevel] = useState("normal");
  const [slaDueAt, setSlaDueAt] = useState("");
  const [savingPriority, setSavingPriority] = useState(false);
  const [priorityError, setPriorityError] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("whatsapp");
  const scrollRef = useRef(null);
  const lastMarkedRef = useRef(0);

  function toDatetimeLocalValue(dateLike) {
    if (!dateLike) return "";
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  async function loadAgents() {
    try {
      const res = await fetch("/api/usuarios", { cache: "no-store" });
      const data = await res.json();
      const parsed = Array.isArray(data) ? data : [];
      setAgents(parsed.filter((u) => Number(u?.is_active) === 1 || u?.is_active === true));
    } catch (e) {
      console.error("Error cargando asesores:", e);
      setAgents([]);
    }
  }

  async function saveAssignment(nextAssignedAgentId, nextStatus) {
    if (!session?.session_id || savingAssignment) return;

    setSavingAssignment(true);
    setAssignmentError("");

    try {
      const payload = {
        session_id: session.session_id,
        assigned_agent_id: nextAssignedAgentId ? Number(nextAssignedAgentId) : null,
        assignment_status: nextStatus,
      };

      const res = await fetch("/api/conversations/assign", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo actualizar la asignación");
      }

      if (onConversationUpdated) onConversationUpdated();
    } catch (e) {
      setAssignmentError(e?.message || "Error actualizando asignación");
    } finally {
      setSavingAssignment(false);
    }
  }

  async function markAsRead(lastMessageId) {
    if (!session?.session_id || !lastMessageId) return;
    if (lastMarkedRef.current >= lastMessageId) return;

    try {
      await fetch("/api/conversations/mark-read", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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

  async function savePriority(nextPriority, nextSlaDueAt) {
    if (!session?.session_id || savingPriority) return;

    setSavingPriority(true);
    setPriorityError("");

    try {
      const payload = {
        session_id: session.session_id,
        priority_level: nextPriority,
        sla_due_at: nextSlaDueAt ? new Date(nextSlaDueAt).toISOString().slice(0, 19).replace("T", " ") : null,
      };

      const res = await fetch("/api/conversations/priority", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo actualizar prioridad/SLA");
      }

      if (onConversationUpdated) onConversationUpdated();
    } catch (e) {
      setPriorityError(e?.message || "Error actualizando prioridad/SLA");
    } finally {
      setSavingPriority(false);
    }
  }

  async function loadTimeline() {
    if (!session?.session_id) return;

    try {
      const res = await fetch(
        `/api/conversations/timeline?session_id=${session.session_id}`,
        { cache: "no-store" }
      );
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
      console.error(e);
      setMessages([]);
    }
  }

  useEffect(() => {
    if (!open || !session?.session_id) return;
    lastMarkedRef.current = 0;
    setSelectedChannel((session?.source_channel || "whatsapp").toLowerCase());
    setAssignedAgentId(session?.assigned_agent_id ? String(session.assigned_agent_id) : "");
    setAssignmentStatus(session?.assignment_status || "unassigned");
    setPriorityLevel(session?.priority_level || "normal");
    setSlaDueAt(toDatetimeLocalValue(session?.sla_due_at));
    loadAgents();
    loadTimeline();
  }, [session, open]);

  useEffect(() => {
    if (!open || !session?.session_id) return;

    const timer = setInterval(() => {
      loadTimeline();
    }, 5000);

    return () => clearInterval(timer);
  }, [open, session]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendMessage() {
    const text = newMessage.trim();
    if (!text || !session?.session_id || sending) return;

    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/conversations/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          session_id: session.session_id,
          text,
          direction: "outbound",
          source: "manual_ui",
          source_channel: selectedChannel || session?.source_channel || "whatsapp",
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

  const resumen = useMemo(() => {
    return session?.resumen || messages?.[0]?.resumen || "Sin resumen disponible";
  }, [session, messages]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-105 flex flex-col">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>
              {session?.cliente_nombre || "Conversación"}
            </SheetTitle>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <FileText className="h-4 w-4" />
                </Button>
              </PopoverTrigger>

              <PopoverContent align="start" className="w-[320px]">
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Resumen</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {resumen}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <p className="text-sm text-gray-500">{session?.celular}</p>
        </SheetHeader>

        <div className="mt-4 border rounded-lg p-3 bg-gray-50 space-y-2">
          <p className="text-xs font-semibold text-gray-600">Gestión de conversación</p>

          <div className="grid grid-cols-1 gap-2">
            <select
              className="h-9 rounded-md border bg-white px-3 text-sm"
              value={assignedAgentId}
              onChange={(e) => {
                const nextId = e.target.value;
                setAssignedAgentId(nextId);
                const nextStatus = nextId ? (assignmentStatus === "unassigned" ? "open" : assignmentStatus) : "unassigned";
                setAssignmentStatus(nextStatus);
                saveAssignment(nextId, nextStatus);
              }}
              disabled={savingAssignment}
            >
              <option value="">Sin asignar</option>
              {agents.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.fullname}
                </option>
              ))}
            </select>

            <select
              className="h-9 rounded-md border bg-white px-3 text-sm"
              value={assignmentStatus}
              onChange={(e) => {
                const nextStatus = e.target.value;
                setAssignmentStatus(nextStatus);
                saveAssignment(assignedAgentId, nextStatus);
              }}
              disabled={savingAssignment}
            >
              <option value="unassigned">Sin asignar</option>
              <option value="open">Abierta</option>
              <option value="pending">Pendiente</option>
              <option value="closed">Cerrada</option>
            </select>

            <select
              className="h-9 rounded-md border bg-white px-3 text-sm"
              value={priorityLevel}
              onChange={(e) => {
                const nextPriority = e.target.value;
                setPriorityLevel(nextPriority);
                savePriority(nextPriority, slaDueAt);
              }}
              disabled={savingPriority}
            >
              <option value="low">Prioridad baja</option>
              <option value="normal">Prioridad normal</option>
              <option value="high">Prioridad alta</option>
              <option value="urgent">Prioridad urgente</option>
            </select>

            <input
              type="datetime-local"
              className="h-9 rounded-md border bg-white px-3 text-sm"
              value={slaDueAt}
              onChange={(e) => {
                const nextSla = e.target.value;
                setSlaDueAt(nextSla);
                savePriority(priorityLevel, nextSla);
              }}
              disabled={savingPriority}
            />
          </div>

          {assignmentError && (
            <p className="text-xs text-red-600">{assignmentError}</p>
          )}

          {priorityError && (
            <p className="text-xs text-red-600">{priorityError}</p>
          )}
        </div>

        <div
          ref={scrollRef}
          className="mt-3 space-y-3 overflow-y-auto flex-1 min-h-0 pr-2"
        >
          {messages.map((m) => (
            <div key={m.id} className="space-y-1">
              {m.pregunta && (
                <div className="flex justify-start">
                  <div className="bg-gray-200 px-3 py-2 rounded-xl max-w-[80%] text-sm">
                    <p>{m.pregunta}</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      {m.source_channel || "canal"}
                      {m.message_status ? ` · ${m.message_status}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {m.respuesta && (
                <div className="flex justify-end">
                  <div className="bg-[#5e17eb] text-white px-3 py-2 rounded-xl max-w-[80%] text-sm">
                    <p>{m.respuesta}</p>
                    <p className="text-[11px] text-indigo-100 mt-1 text-right">
                      {m.source_channel || "manual"}
                      {m.message_status ? ` · ${m.message_status}` : ""}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 space-y-2 border-t pt-3">
          <div className="flex flex-col sm:flex-row gap-2 items-stretch">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje para el cliente..."
              className="min-h-24 sm:flex-1"
              disabled={sending}
            />

            <div className="sm:w-44 flex flex-col gap-2">
              <select
                className="h-9 rounded-md border bg-white px-3 text-sm"
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                disabled={sending}
              >
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
              </select>

              <Button className="w-full" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Enviando..." : "Enviar"}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </SheetContent>
    </Sheet>
  );
}