"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useRequirePerm } from "@/hooks/useRequirePerm";

const ALERT_LABELS = {
  planchado_pintura:         "Planchado y Pintura",
  garantia_recall:           "Garantía / Recalls",
  mostrador_repuesto:        "Mostrador / Repuestos",
  precio_exacto:             "Cliente insiste en precio exacto",
  documentos_financiamiento: "Cliente envía documentos de financiamiento",
  test_drive:                "Visita / Test drive",
  pedido_especial:           "Pedido especial (sin stock)",
  queja:                     "Queja o reclamo",
  duplicado_comprobante:     "Duplicado de comprobante",
  cita_postventa:            "Cita de postventa agendada",
};

function getAuthHeaders() {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  const token = match ? match[1] : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function AlertRow({ row, onSave }) {
  const [teamId, setTeamId]   = useState(row.chatwoot_team_id  ?? "");
  const [agentId, setAgentId] = useState(row.chatwoot_agent_id ?? "");
  const [label, setLabel]     = useState(row.label ?? "");
  const [saving, setSaving]   = useState(false);
  const dirty =
    String(teamId)  !== String(row.chatwoot_team_id  ?? "") ||
    String(agentId) !== String(row.chatwoot_agent_id ?? "") ||
    label !== (row.label ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(row.alert_type, {
        chatwoot_team_id:  teamId  !== "" ? Number(teamId)  : null,
        chatwoot_agent_id: agentId !== "" ? Number(agentId) : null,
        label: label || null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="py-3 pr-4">
        <p className="font-medium text-sm">{ALERT_LABELS[row.alert_type] || row.alert_type}</p>
        <p className="text-xs text-muted-foreground font-mono">{row.alert_type}</p>
      </td>
      <td className="py-3 pr-4">
        <Input
          className="h-8 w-24 text-sm"
          placeholder="ID equipo"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          type="number"
          min="1"
        />
      </td>
      <td className="py-3 pr-4">
        <Input
          className="h-8 w-24 text-sm"
          placeholder="ID agente"
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          type="number"
          min="1"
        />
      </td>
      <td className="py-3 pr-4">
        <Input
          className="h-8 w-36 text-sm"
          placeholder="etiqueta"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </td>
      <td className="py-3 text-right">
        <Button
          size="sm"
          variant={dirty ? "default" : "outline"}
          className="h-7 text-xs"
          onClick={handleSave}
          disabled={!dirty || saving}
        >
          <Save className="w-3 h-3 mr-1" />
          {saving ? "Guardando..." : "Guardar"}
        </Button>
      </td>
    </tr>
  );
}

export default function AlertasConfigPage() {
  useRequirePerm("mensajes", "view");

  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chatwoot/alert", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRows(data.alertas || []);
    } catch {
      toast.error("Error al cargar configuración de alertas");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(alert_type, payload) {
    try {
      const res = await fetch("/api/chatwoot/alert", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ alert_type, ...payload }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Alerta "${ALERT_LABELS[alert_type] || alert_type}" actualizada`);
      load();
    } catch {
      toast.error("Error al guardar configuración");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración de Alertas</h1>
          <p className="text-sm text-muted-foreground">
            Asigná equipo, agente y etiqueta de Chatwoot para cada tipo de alerta del agente IA
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Cuando el agente IA detecta una situación, asigna la conversación al equipo/agente configurado y le agrega la etiqueta.
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-2 pr-4 font-medium">Tipo de alerta</th>
                    <th className="text-left py-2 pr-4 font-medium">ID Equipo</th>
                    <th className="text-left py-2 pr-4 font-medium">ID Agente</th>
                    <th className="text-left py-2 pr-4 font-medium">Etiqueta</th>
                    <th className="text-right py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <AlertRow key={row.id} row={row} onSave={handleSave} />
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay alertas configuradas.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">
            <strong>ID Equipo</strong>: ID numérico del equipo en Chatwoot (Settings → Teams).<br />
            <strong>ID Agente</strong>: ID numérico del agente (tiene prioridad sobre el equipo si ambos están configurados).<br />
            <strong>Etiqueta</strong>: Label que se agrega a la conversación en Chatwoot para filtrado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
