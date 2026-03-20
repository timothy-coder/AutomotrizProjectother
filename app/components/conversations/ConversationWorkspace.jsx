"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  Send,
  SlidersHorizontal,
  UserPlus,
  ListChecks,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { useAuth } from "@/context/AuthContext";

export default function ConversationWorkspace({
  session,
  onConversationUpdated,
  onBack,
  focusComposerSignal = 0,
}) {
  const { user } = useAuth();

  // ── Mensajes / timeline ──────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [selectedChannel, setSelectedChannel] = useState("whatsapp");
  const scrollRef = useRef(null);
  const composerRef = useRef(null);
  const lastMarkedRef = useRef(0);
  const stickToBottomRef = useRef(true);

  // ── Gestión de sesión ────────────────────────────────────────
  const [agents, setAgents] = useState([]);
  const [assignedAgentId, setAssignedAgentId] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState("unassigned");
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [priorityLevel, setPriorityLevel] = useState("normal");
  const [slaDueAt, setSlaDueAt] = useState("");
  const [savingPriority, setSavingPriority] = useState(false);
  const [priorityError, setPriorityError] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [auditItems, setAuditItems] = useState([]);

  // ── Crear Lead ───────────────────────────────────────────────
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadMarcas, setLeadMarcas] = useState([]);
  const [leadModelos, setLeadModelos] = useState([]);
  const [leadEtapas, setLeadEtapas] = useState([]);
  const [leadOrigenes, setLeadOrigenes] = useState([]);
  const [leadForm, setLeadForm] = useState({
    marca_id: "",
    modelo_id: "",
    etapasconversion_id: "",
    origen_id: "",
    detalle: "",
  });
  const [leadSaving, setLeadSaving] = useState(false);
  const [leadError, setLeadError] = useState("");
  const [leadSuccess, setLeadSuccess] = useState(null); // { oportunidad_id }

  // ── Ver Leads ────────────────────────────────────────────────
  const [leadsOpen, setLeadsOpen] = useState(false);
  const [leadsData, setLeadsData] = useState([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState("");

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────

  function toDatetimeLocalValue(dateLike) {
    if (!dateLike) return "";
    const date = new Date(dateLike);
    if (Number.isNaN(date.getTime())) return "";
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  // ─────────────────────────────────────────────────────────────
  // Gestión de sesión
  // ─────────────────────────────────────────────────────────────

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo actualizar la asignación");
      }

      if (onConversationUpdated) onConversationUpdated();
      loadAudit();
    } catch (e) {
      setAssignmentError(e?.message || "Error actualizando asignación");
    } finally {
      setSavingAssignment(false);
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
        sla_due_at: nextSlaDueAt
          ? new Date(nextSlaDueAt).toISOString().slice(0, 19).replace("T", " ")
          : null,
      };

      const res = await fetch("/api/conversations/priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo actualizar prioridad/SLA");
      }

      if (onConversationUpdated) onConversationUpdated();
      loadAudit();
    } catch (e) {
      setPriorityError(e?.message || "Error actualizando prioridad/SLA");
    } finally {
      setSavingPriority(false);
    }
  }

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

  async function loadAudit() {
    if (!session?.session_id) return;

    try {
      const res = await fetch(
        `/api/conversations/audit?session_id=${session.session_id}&limit=10`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setAuditItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando auditoría:", e);
      setAuditItems([]);
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

  // ─────────────────────────────────────────────────────────────
  // Crear Lead: cargar catálogos
  // ─────────────────────────────────────────────────────────────

  async function loadLeadCatalogs() {
    try {
      const [marcasRes, etapasRes, origenesRes] = await Promise.all([
        fetch("/api/marcas", { cache: "no-store" }),
        fetch("/api/etapasconversion", { cache: "no-store" }),
        fetch("/api/origenes_citas", { cache: "no-store" }),
      ]);

      const marcas = marcasRes.ok ? await marcasRes.json() : [];
      const etapas = etapasRes.ok ? await etapasRes.json() : [];
      const origenes = origenesRes.ok ? await origenesRes.json() : [];

      setLeadMarcas(Array.isArray(marcas) ? marcas : []);
      setLeadEtapas(Array.isArray(etapas) ? etapas : []);
      setLeadOrigenes(Array.isArray(origenes) ? origenes : []);
    } catch (e) {
      console.error("Error cargando catálogos de lead:", e);
    }
  }

  async function loadModelosByMarca(marcaId) {
    if (!marcaId) {
      setLeadModelos([]);
      return;
    }
    try {
      const res = await fetch(`/api/modelos?marca_id=${marcaId}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setLeadModelos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando modelos:", e);
      setLeadModelos([]);
    }
  }

  function openLeadDialog() {
    setLeadForm({ marca_id: "", modelo_id: "", etapasconversion_id: "", origen_id: "", detalle: "" });
    setLeadError("");
    setLeadSuccess(null);
    setLeadModelos([]);
    setLeadOpen(true);
    loadLeadCatalogs();
  }

  async function submitLead() {
    const clienteId = session?.client_id;
    if (!clienteId) {
      setLeadError("No se pudo obtener el cliente de esta conversación.");
      return;
    }
    if (!leadForm.marca_id || !leadForm.modelo_id || !leadForm.etapasconversion_id || !leadForm.origen_id) {
      setLeadError("Completa marca, modelo, etapa y origen para continuar.");
      return;
    }

    setLeadSaving(true);
    setLeadError("");

    try {
      const payload = {
        cliente_id: Number(clienteId),
        marca_id: Number(leadForm.marca_id),
        modelo_id: Number(leadForm.modelo_id),
        etapasconversion_id: Number(leadForm.etapasconversion_id),
        origen_id: Number(leadForm.origen_id),
        detalle: leadForm.detalle.trim() || null,
        created_by: Number(user?.id || 0),
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo crear el lead");
      }

      setLeadSuccess({ oportunidad_id: data.oportunidad_id });
    } catch (e) {
      setLeadError(e?.message || "Error creando lead");
    } finally {
      setLeadSaving(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Ver Leads
  // ─────────────────────────────────────────────────────────────

  async function openLeadsDialog() {
    setLeadsData([]);
    setLeadsError("");
    setLeadsOpen(true);
    setLeadsLoading(true);

    const clienteId = session?.client_id;
    if (!clienteId) {
      setLeadsError("No se encontró el cliente vinculado a esta conversación.");
      setLeadsLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/leads/bycliente?cliente_id=${clienteId}`, { cache: "no-store" });
      const data = res.ok ? await res.json() : [];
      setLeadsData(Array.isArray(data) ? data : []);
    } catch (e) {
      setLeadsError("Error cargando leads del cliente.");
    } finally {
      setLeadsLoading(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Enviar mensaje
  // ─────────────────────────────────────────────────────────────

  async function sendMessage() {
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

  // ─────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!session?.session_id) return;
    lastMarkedRef.current = 0;
    setManageOpen(false);
    setSelectedChannel((session?.source_channel || "whatsapp").toLowerCase());
    setAssignedAgentId(session?.assigned_agent_id ? String(session.assigned_agent_id) : "");
    setAssignmentStatus(session?.assignment_status || "unassigned");
    setPriorityLevel(session?.priority_level || "normal");
    setSlaDueAt(toDatetimeLocalValue(session?.sla_due_at));
    loadAgents();
    loadAudit();
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
        <div className="border-b p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="lg:hidden"
                  onClick={onBack}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Volver a la lista</TooltipContent>
            </Tooltip>

            <div className="font-semibold flex-1 min-w-0 truncate">
              {session?.cliente_nombre || "Conversación"}
            </div>

            {/* Botón Gestión */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setManageOpen((v) => !v)}
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Gestión
                  <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${manageOpen ? "rotate-180" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Asignar asesor, cambiar estado y prioridad</TooltipContent>
            </Tooltip>

            {/* Popover Resumen */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" className="h-8 w-8">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-[320px]">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Resumen de conversación</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{resumen}</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </TooltipTrigger>
              <TooltipContent>Ver resumen generado de la conversación</TooltipContent>
            </Tooltip>

            {/* Botón Crear Lead */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={openLeadDialog}
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Crear un nuevo lead para este cliente</TooltipContent>
            </Tooltip>

            {/* Botón Ver Leads */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={openLeadsDialog}
                >
                  <ListChecks className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Ver leads/oportunidades del cliente</TooltipContent>
            </Tooltip>
          </div>

          <p className="text-sm text-gray-500 mt-1">{session?.celular || session?.phone}</p>
        </div>

        {/* ── Gestión panel ───────────────────────────────────── */}
        {manageOpen && (
          <div className="p-4 border-b bg-gray-50 space-y-2">
            <p className="text-xs font-semibold text-gray-600">Gestión de conversación</p>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
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

            {assignmentError && <p className="text-xs text-red-600">{assignmentError}</p>}
            {priorityError && <p className="text-xs text-red-600">{priorityError}</p>}

            <div className="border rounded-md bg-white p-2 space-y-1">
              <p className="text-xs font-semibold text-gray-600">Actividad reciente</p>
              {auditItems.length === 0 ? (
                <p className="text-xs text-gray-500">Sin actividad registrada.</p>
              ) : (
                <div className="max-h-28 overflow-y-auto space-y-1 pr-1">
                  {auditItems.map((item) => (
                    <div key={item.id} className="text-xs text-gray-600 border-b last:border-b-0 pb-1">
                      <p className="font-medium">
                        {(item.actor_name || item.actor_role || "Sistema")} · {item.action_type}
                      </p>
                      <p className="text-gray-500">{new Date(item.created_at).toLocaleString()}</p>
                      {Array.isArray(item.changes) && item.changes.length > 0 && (
                        <p className="text-gray-500 truncate">
                          {item.changes.map((c) => `${c.field}: ${c.before ?? "--"} -> ${c.after ?? "--"}`).join(" | ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Timeline de mensajes ─────────────────────────────── */}
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
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

        {/* ── Dialog: Crear Lead ───────────────────────────────── */}
        <Dialog open={leadOpen} onOpenChange={setLeadOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Crear Lead</DialogTitle>
              <DialogDescription>
                {session?.cliente_nombre || "Cliente"} ·{" "}
                {session?.celular || session?.phone || ""}
              </DialogDescription>
            </DialogHeader>

            {leadSuccess ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                <p className="font-semibold text-lg">Lead creado exitosamente</p>
                <p className="text-2xl font-bold text-emerald-600">{leadSuccess.oportunidad_id}</p>
                <p className="text-sm text-gray-500">El lead ha sido registrado y aparecerá en la sección de Leads.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Marca */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Marca *</label>
                  <select
                    className="h-9 w-full rounded-md border bg-white px-3 text-sm"
                    value={leadForm.marca_id}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLeadForm((f) => ({ ...f, marca_id: v, modelo_id: "" }));
                      loadModelosByMarca(v);
                    }}
                    disabled={leadSaving}
                  >
                    <option value="">Selecciona una marca</option>
                    {leadMarcas.map((m) => (
                      <option key={m.id} value={String(m.id)}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Modelo */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Modelo *</label>
                  <select
                    className="h-9 w-full rounded-md border bg-white px-3 text-sm"
                    value={leadForm.modelo_id}
                    onChange={(e) => setLeadForm((f) => ({ ...f, modelo_id: e.target.value }))}
                    disabled={leadSaving || !leadForm.marca_id}
                  >
                    <option value="">
                      {leadForm.marca_id ? "Selecciona un modelo" : "Primero selecciona una marca"}
                    </option>
                    {leadModelos.map((m) => (
                      <option key={m.id} value={String(m.id)}>{m.name}</option>
                    ))}
                  </select>
                </div>

                {/* Etapa de conversión */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Etapa de conversión *</label>
                  <select
                    className="h-9 w-full rounded-md border bg-white px-3 text-sm"
                    value={leadForm.etapasconversion_id}
                    onChange={(e) => setLeadForm((f) => ({ ...f, etapasconversion_id: e.target.value }))}
                    disabled={leadSaving}
                  >
                    <option value="">Selecciona una etapa</option>
                    {leadEtapas.map((e) => (
                      <option key={e.id} value={String(e.id)}>{e.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Origen */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Origen *</label>
                  <select
                    className="h-9 w-full rounded-md border bg-white px-3 text-sm"
                    value={leadForm.origen_id}
                    onChange={(e) => setLeadForm((f) => ({ ...f, origen_id: e.target.value }))}
                    disabled={leadSaving}
                  >
                    <option value="">Selecciona un origen</option>
                    {leadOrigenes.map((o) => (
                      <option key={o.id} value={String(o.id)}>{o.name}</option>
                    ))}
                  </select>
                </div>

                {/* Detalle */}
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Observación (opcional)</label>
                  <Textarea
                    value={leadForm.detalle}
                    onChange={(e) => setLeadForm((f) => ({ ...f, detalle: e.target.value }))}
                    placeholder="Ej: Cliente interesado en financiamiento, quiere probar el vehículo..."
                    className="min-h-16 text-sm"
                    disabled={leadSaving}
                  />
                </div>

                {leadError && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                    {leadError}
                  </p>
                )}
              </div>
            )}

            <DialogFooter>
              {leadSuccess ? (
                <Button onClick={() => setLeadOpen(false)}>Cerrar</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => setLeadOpen(false)} disabled={leadSaving}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={submitLead}
                    disabled={leadSaving}
                  >
                    {leadSaving ? "Creando..." : "Crear Lead"}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Dialog: Ver Leads ────────────────────────────────── */}
        <Dialog open={leadsOpen} onOpenChange={setLeadsOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Leads del cliente</DialogTitle>
              <DialogDescription>
                {session?.cliente_nombre || "Cliente"} ·{" "}
                {session?.celular || session?.phone || ""}
              </DialogDescription>
            </DialogHeader>

            {leadsLoading ? (
              <div className="py-8 text-center text-sm text-gray-500 italic">
                Cargando leads...
              </div>
            ) : leadsError ? (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {leadsError}
              </p>
            ) : leadsData.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-500 mb-2">Este cliente no tiene leads registrados.</p>
                <Button size="sm" variant="outline" onClick={() => { setLeadsOpen(false); openLeadDialog(); }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Crear primer lead
                </Button>
              </div>
            ) : (
              <div className="overflow-auto max-h-96">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-500 text-left">
                      <th className="pb-2 pr-3 font-medium">Código</th>
                      <th className="pb-2 pr-3 font-medium">Etapa</th>
                      <th className="pb-2 pr-3 font-medium">Marca / Modelo</th>
                      <th className="pb-2 pr-3 font-medium">Asignado a</th>
                      <th className="pb-2 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leadsData.map((lead) => (
                      <tr key={lead.id} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 pr-3 font-mono font-semibold text-indigo-700 whitespace-nowrap">
                          {lead.oportunidad_id || `#${lead.id}`}
                        </td>
                        <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">
                          {lead.etapa_name || lead.etapasconversion_id || "—"}
                        </td>
                        <td className="py-2 pr-3 text-gray-700 whitespace-nowrap">
                          {[lead.marca_name, lead.modelo_name].filter(Boolean).join(" / ") || "—"}
                        </td>
                        <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">
                          {lead.asignado_a_name || "Sin asignar"}
                        </td>
                        <td className="py-2 text-gray-400 whitespace-nowrap text-xs">
                          {lead.fecha_agenda
                            ? new Date(lead.fecha_agenda).toLocaleDateString()
                            : lead.created_at
                              ? new Date(lead.created_at).toLocaleDateString()
                              : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {leadsData.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setLeadsOpen(false); openLeadDialog(); }}
                  className="gap-2"
                >
                  <UserPlus className="h-4 w-4" />
                  Crear nuevo lead
                </Button>
              )}
              <Button variant="outline" onClick={() => setLeadsOpen(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}
