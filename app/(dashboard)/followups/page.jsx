"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { useRequirePerm } from "@/hooks/useRequirePerm";

const CLOSURE_LABELS = {
  sin_respuesta:     "Sin respuesta",
  sin_informacion:   "Sin información",
  compro_otro:       "Compró en otro lugar",
  alerta_no_atendida:"Alerta no atendida",
  facturado:         "Facturado / Vendido",
};

const SOURCE_LABELS = {
  ventas_ia:   "Ventas IA",
  presales_ia: "Presales IA",
  manual:      "Manual",
  campaign:    "Campaña",
};

function getAuthHeaders() {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  const token = match ? match[1] : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function StepBadge({ count }) {
  const steps = [1, 2, 3];
  return (
    <div className="flex gap-1">
      {steps.map((s) => (
        <div
          key={s}
          className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
            count >= s
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-400"
          }`}
        >
          {s}
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = d - now;
  if (Math.abs(diff) < 86400000) {
    const hh = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
    return diff < 0 ? `hace ${hh}` : `hoy ${hh}`;
  }
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function FollowupTable({ rows, onClose, showActions = true }) {
  if (!rows.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        No hay registros en esta sección.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="text-left py-2 pr-4 font-medium">Teléfono</th>
            <th className="text-left py-2 pr-4 font-medium">Cliente</th>
            <th className="text-left py-2 pr-4 font-medium">Origen</th>
            <th className="text-left py-2 pr-4 font-medium">Pasos</th>
            <th className="text-left py-2 pr-4 font-medium">Próximo</th>
            {showActions && (
              <th className="text-right py-2 font-medium">Acciones</th>
            )}
            {!showActions && (
              <th className="text-left py-2 font-medium">Motivo cierre</th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b hover:bg-muted/40 transition-colors">
              <td className="py-2 pr-4 font-mono text-xs">{row.phone}</td>
              <td className="py-2 pr-4">
                {row.nombre_cliente?.trim() || (
                  <span className="text-muted-foreground italic">Sin registro</span>
                )}
              </td>
              <td className="py-2 pr-4">
                <Badge variant="outline" className="text-xs">
                  {SOURCE_LABELS[row.source] || row.source}
                </Badge>
              </td>
              <td className="py-2 pr-4">
                <StepBadge count={row.followup_count} />
              </td>
              <td className="py-2 pr-4 text-xs text-muted-foreground">
                {row.followup_next_at
                  ? formatDate(row.followup_next_at)
                  : row.updated_at
                  ? formatDate(row.updated_at)
                  : "—"}
              </td>
              {showActions && (
                <td className="py-2 text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => onClose(row)}
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Cerrar
                  </Button>
                </td>
              )}
              {!showActions && (
                <td className="py-2 text-xs text-muted-foreground">
                  {CLOSURE_LABELS[row.closure_reason] || row.closure_reason}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function FollowupsPage() {
  useRequirePerm("mensajes", "view");

  const [active, setActive]   = useState([]);
  const [pending, setPending] = useState([]);
  const [closed, setClosed]   = useState([]);
  const [loading, setLoading] = useState(false);

  const [closeDialog, setCloseDialog] = useState({ open: false, row: null, reason: "" });
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [r1, r2, r3] = await Promise.all([
        fetch("/api/conversations/followup", { headers }),
        fetch("/api/conversations/followup?pending=1", { headers }),
        fetch("/api/conversations/followup?closed=1", { headers }),
      ]);
      if (!r1.ok || !r2.ok || !r3.ok) throw new Error("Error al obtener follow-ups");
      const [d1, d2, d3] = await Promise.all([r1.json(), r2.json(), r3.json()]);
      setActive(d1.followups  || []);
      setPending(d2.followups || []);
      setClosed(d3.followups  || []);
    } catch {
      toast.error("Error al cargar follow-ups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleClose() {
    if (!closeDialog.reason) return;
    setClosing(true);
    try {
      const res = await fetch("/api/conversations/followup", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ phone: closeDialog.row.phone, closure_reason: closeDialog.reason }),
      });
      if (!res.ok) throw new Error();
      toast.success("Sesión cerrada correctamente");
      setCloseDialog({ open: false, row: null, reason: "" });
      load();
    } catch {
      toast.error("Error al cerrar la sesión");
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Follow-up 3-3-3</h1>
          <p className="text-sm text-muted-foreground">
            Seguimiento automático de leads — 3 intentos cada 3 días
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Pendientes ahora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">
              {loading ? "—" : pending.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              En proceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {loading ? "—" : active.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-gray-400" />
              Cerrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-500">
              {loading ? "—" : closed.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pendientes">
        <TabsList>
          <TabsTrigger value="pendientes">
            Pendientes
            {!loading && pending.length > 0 && (
              <Badge className="ml-2 bg-amber-500 text-white text-[10px] px-1.5 py-0">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="activos">En proceso</TabsTrigger>
          <TabsTrigger value="cerrados">Cerrados</TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-10">Cargando...</p>
              ) : (
                <FollowupTable
                  rows={pending}
                  onClose={(row) => setCloseDialog({ open: true, row, reason: "" })}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activos" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-10">Cargando...</p>
              ) : (
                <FollowupTable
                  rows={active}
                  onClose={(row) => setCloseDialog({ open: true, row, reason: "" })}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cerrados" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-10">Cargando...</p>
              ) : (
                <FollowupTable rows={closed} showActions={false} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog cierre manual */}
      <Dialog
        open={closeDialog.open}
        onOpenChange={(o) => !o && setCloseDialog({ open: false, row: null, reason: "" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar seguimiento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Seleccioná el motivo de cierre para{" "}
            <span className="font-mono font-semibold">{closeDialog.row?.phone}</span>.
          </p>
          <Select
            value={closeDialog.reason}
            onValueChange={(v) => setCloseDialog((d) => ({ ...d, reason: v }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar motivo..." />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CLOSURE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseDialog({ open: false, row: null, reason: "" })}>
              Cancelar
            </Button>
            <Button onClick={handleClose} disabled={!closeDialog.reason || closing}>
              {closing ? "Cerrando..." : "Confirmar cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
