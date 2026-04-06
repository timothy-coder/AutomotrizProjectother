"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useRequirePerm } from "@/hooks/useRequirePerm";

function getAuthHeaders() {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  const token = match ? match[1] : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function MappingRow({ row, onSave }) {
  const [teamId, setTeamId]   = useState(row.chatwoot_team_id  ?? "");
  const [agentId, setAgentId] = useState(row.chatwoot_agent_id ?? "");
  const [saving, setSaving]   = useState(false);

  const dirty =
    String(teamId)  !== String(row.chatwoot_team_id  ?? "") ||
    String(agentId) !== String(row.chatwoot_agent_id ?? "");

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(row.role_id, {
        chatwoot_team_id:  teamId  !== "" ? Number(teamId)  : null,
        chatwoot_agent_id: agentId !== "" ? Number(agentId) : null,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="py-3 pr-4">
        <p className="font-medium text-sm">{row.role_name}</p>
        {row.description && (
          <p className="text-xs text-muted-foreground">{row.description}</p>
        )}
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

export default function RolesChatwootPage() {
  useRequirePerm("configuracion", "view");

  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/roles/chatwoot-mapping", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRows(data.mappings || []);
    } catch {
      toast.error("Error al cargar mapeo de roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(roleId, payload) {
    try {
      const res = await fetch("/api/roles/chatwoot-mapping", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ role_id: roleId, ...payload }),
      });
      if (!res.ok) throw new Error();
      toast.success("Mapeo actualizado");
      load();
    } catch {
      toast.error("Error al guardar mapeo");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Roles ↔ Chatwoot</h1>
          <p className="text-sm text-muted-foreground">
            Asigná un equipo o agente de Chatwoot a cada rol del CRM para asignación automática de conversaciones
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
            Cuando se asigna una conversación a un rol, se usará el equipo o agente configurado en Chatwoot.
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
                    <th className="text-left py-2 pr-4 font-medium">Rol</th>
                    <th className="text-left py-2 pr-4 font-medium">ID Equipo</th>
                    <th className="text-left py-2 pr-4 font-medium">ID Agente</th>
                    <th className="text-right py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <MappingRow key={row.role_id} row={row} onSave={handleSave} />
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hay roles configurados.
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
            <strong>ID Agente</strong>: ID numérico del agente en Chatwoot (tiene prioridad sobre el equipo si ambos están configurados).<br />
            Si ambos están vacíos, la conversación queda sin asignación automática para ese rol.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
