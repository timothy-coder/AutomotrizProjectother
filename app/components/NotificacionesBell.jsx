"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const tipoIconos = {
  info: "ℹ️",
  success: "✅",
  warning: "⚠️",
  error: "❌",
};

export default function NotificacionesBell({ usuarioId }) {
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading, setLoading] = useState(true);

  // ✅ Cargar notificaciones
  useEffect(() => {
    loadNotificaciones();

    // ✅ Polling cada 30 segundos
    const interval = setInterval(loadNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [usuarioId]);

  async function loadNotificaciones() {
    try {
      const res = await fetch(
        `/api/notificaciones?usuario_id=${usuarioId}&limite=5`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setNotificaciones(data.notificaciones || []);
      setNoLeidas(data.noLeidas || 0);
    } catch (error) {
      console.error("Error cargando notificaciones:", error);
    } finally {
      setLoading(false);
    }
  }

  async function marcarComoLeida(notificacionId) {
    try {
      const res = await fetch(`/api/notificaciones/${notificacionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuarioId }),
      });

      if (res.ok) {
        await loadNotificaciones();
        toast.success("Notificación marcada como leída");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error marcando notificación");
    }
  }

  async function marcarTodasLeidas() {
    try {
      const res = await fetch("/api/notificaciones/marcar-todas-leidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario_id: usuarioId }),
      });

      if (res.ok) {
        await loadNotificaciones();
        toast.success("Todas marcadas como leídas");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error marcando notificaciones");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-slate-400 hover:text-white hover:bg-white/10 active:bg-white/20 transition-colors relative"
          title="Notificaciones"
        >
          <Bell size={18} />
          {noLeidas > 0 && (
            <Badge
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs"
            >
              {noLeidas > 9 ? "9+" : noLeidas}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-80 max-h-96 overflow-y-auto bg-slate-800 border border-white/10" side="right">
        <div className="p-3 border-b border-white/10 sticky top-0 bg-slate-800">
          <div className="flex items-center justify-between">
            <DropdownMenuLabel className="text-base font-semibold text-white">
              Notificaciones
            </DropdownMenuLabel>
            {noLeidas > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={marcarTodasLeidas}
                className="text-xs h-7 text-slate-300 hover:text-white"
              >
                <Check size={14} className="mr-1" />
                Marcar
              </Button>
            )}
          </div>
          {noLeidas > 0 && (
            <p className="text-xs text-slate-400 mt-1">
              {noLeidas} sin leer
            </p>
          )}
        </div>

        {loading ? (
          <div className="p-6 text-center text-sm text-slate-400">
            Cargando...
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            Sin notificaciones
          </div>
        ) : (
          <div className="space-y-1">
            {notificaciones.map((notif) => (
              <div
                key={notif.id}
                className={`p-3 border-b border-white/5 cursor-pointer hover:bg-white/5 transition-colors ${
                  !notif.leida ? "bg-indigo-600/20" : ""
                }`}
                onClick={() => {
                  if (!notif.leida) marcarComoLeida(notif.id);
                  if (notif.url) window.location.href = notif.url;
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">
                    {tipoIconos[notif.tipo] || tipoIconos.info}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white line-clamp-1">
                      {notif.titulo}
                    </p>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1">
                      {notif.mensaje}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      {new Date(notif.created_at).toLocaleDateString("es-PE")}
                    </p>
                  </div>
                  {!notif.leida && (
                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <DropdownMenuSeparator className="bg-white/10" />
        <div className="p-3 text-center">
          <a
            href="/dashboard/notificaciones"
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium"
          >
            Ver todas
          </a>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}