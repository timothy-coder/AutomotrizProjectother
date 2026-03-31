"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Bell, Car, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Listas de keywords para detección de intención ────────────────────────

const PURCHASE_KEYWORDS = [
  "deseo adquirir",
  "quiero comprar",
  "precio de",
  "cotización",
  "disponible el modelo",
  "cuánto cuesta",
  "cuanto cuesta",
  "financiamiento",
  "me interesa el",
  "cuota mensual",
  "me interesa un",
  "quiero ver",
  "quisiera ver",
  "información del",
  "informacion del",
];

const WORKSHOP_KEYWORDS = [
  "cita para taller",
  "mantenimiento",
  "revisión",
  "revision",
  "reparación",
  "reparacion",
  "falla",
  "problema con",
  "no enciende",
  "hace un ruido",
  "aceite",
  "frenos",
  "batería",
  "bateria",
  "kilometraje",
  "service",
];

const URGENT_KEYWORDS = [
  "urgente",
  "emergencia",
  "accidente",
  "ayuda por favor",
  "necesito ayuda urgente",
  "lo antes posible",
  "cuanto antes",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

function buildNotifications(conversations) {
  const notifs = [];

  for (const c of conversations) {
    const hasUnread = Number(c?.unread_count || 0) > 0;
    const isUrgentPriority = c?.priority_level === "urgent";
    const isOverdue = Number(c?.is_overdue || 0) === 1;
    const text = String(c?.ultimomensaje || "").toLowerCase();

    if (!hasUnread && !isUrgentPriority && !isOverdue) continue;

    if (
      isUrgentPriority ||
      isOverdue ||
      URGENT_KEYWORDS.some((k) => text.includes(k))
    ) {
      notifs.push({ type: "urgent", conversation: c });
    } else if (PURCHASE_KEYWORDS.some((k) => text.includes(k))) {
      notifs.push({ type: "purchase_intent", conversation: c });
    } else if (WORKSHOP_KEYWORDS.some((k) => text.includes(k))) {
      notifs.push({ type: "workshop_intent", conversation: c });
    }
  }

  const order = { urgent: 0, purchase_intent: 1, workshop_intent: 2 };
  return notifs.sort((a, b) => order[a.type] - order[b.type]);
}

// ─── NotificationCard ───────────────────────────────────────────────────────

const TYPE_CONFIG = {
  urgent: {
    icon: AlertTriangle,
    label: "URGENTE",
    borderColor: "border-l-red-500",
    bg: "bg-red-50",
    iconColor: "text-red-500",
    labelColor: "text-red-600",
  },
  purchase_intent: {
    icon: Car,
    label: "Intención de compra",
    borderColor: "border-l-blue-500",
    bg: "bg-blue-50",
    iconColor: "text-blue-500",
    labelColor: "text-blue-600",
  },
  workshop_intent: {
    icon: Wrench,
    label: "Solicitud de taller",
    borderColor: "border-l-amber-500",
    bg: "bg-amber-50",
    iconColor: "text-amber-500",
    labelColor: "text-amber-600",
  },
};

function NotificationCard({ notification, onOpen, onDismiss }) {
  const { type, conversation: c } = notification;
  const cfg = TYPE_CONFIG[type];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-xl border-l-4 ${cfg.borderColor} ${cfg.bg} p-3 space-y-1.5`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.iconColor}`} />
          <span className={`text-[10px] font-bold uppercase tracking-wide ${cfg.labelColor}`}>
            {cfg.label}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-gray-400">{timeAgo(c.last_message_at)}</span>
          <button
            type="button"
            onClick={() => onDismiss(c.session_id)}
            className="text-gray-300 hover:text-gray-500 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-800 truncate">
          {c.cliente_nombre || "Cliente"}
          <span className="font-normal text-gray-500 ml-1">
            · {c.source_channel || "canal"}
          </span>
        </p>
        <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
          {c.ultimomensaje || "Sin mensaje"}
        </p>
      </div>

      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2.5 text-xs w-full"
        onClick={() => onOpen(c.session_id)}
      >
        Abrir chat →
      </Button>
    </div>
  );
}

// ─── NotificationPanel principal ────────────────────────────────────────────

export default function NotificationPanel({ conversations = [], onOpenConversation }) {
  const [dismissed, setDismissed] = useState(new Set());
  const [open, setOpen] = useState(false);

  const notifications = useMemo(
    () => buildNotifications(conversations).filter(
      (n) => !dismissed.has(n.conversation.session_id)
    ),
    [conversations, dismissed]
  );

  function handleDismiss(sessionId) {
    setDismissed((prev) => new Set([...prev, sessionId]));
  }

  function handleOpen(sessionId) {
    if (onOpenConversation) onOpenConversation(sessionId);
    setOpen(false);
  }

  const urgentCount = notifications.filter((n) => n.type === "urgent").length;
  const totalCount = notifications.length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <button
              type="button"
              className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              <Bell className="w-4 h-4 text-gray-600" />
              {totalCount > 0 && (
                <span className={`absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
                  urgentCount > 0 ? "bg-red-500" : "bg-blue-500"
                }`}>
                  {totalCount > 9 ? "9+" : totalCount}
                </span>
              )}
            </button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {totalCount === 0
            ? "Sin alertas activas"
            : `${totalCount} alerta${totalCount !== 1 ? "s" : ""} — ${urgentCount} urgente${urgentCount !== 1 ? "s" : ""}`}
        </TooltipContent>
      </Tooltip>

      <SheetContent side="right" className="w-80 sm:w-96 flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-sm font-semibold">Alertas del sistema</SheetTitle>
            {dismissed.size > 0 && (
              <button
                type="button"
                onClick={() => setDismissed(new Set())}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Restaurar
              </button>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Sin alertas activas</p>
              <p className="text-xs text-gray-300 mt-1">
                Las alertas aparecen cuando hay mensajes urgentes o intenciones de compra/taller.
              </p>
            </div>
          ) : (
            notifications.map((n) => (
              <NotificationCard
                key={`${n.type}-${n.conversation.session_id}`}
                notification={n}
                onOpen={handleOpen}
                onDismiss={handleDismiss}
              />
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
