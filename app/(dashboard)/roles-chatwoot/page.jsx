"use client";

import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useRequirePerm } from "@/hooks/useRequirePerm";

function getAuthHeaders() {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
  const token = match ? match[1] : "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function MappingRow({ row, teams, agents, onSave }) {
  const [teamId, setTeamId]   = useState(row.chatwoot_team_id  != null ? String(row.chatwoot_team_id)  : "none");
  const [agentId, setAgentId] = useState(row.chatwoot_agent_id != null ? String(row.chatwoot_agent_id) : "none");
  const [saving, setSaving]   = useState(false);

  const dirty =
    (teamId  === "none" ? null : Number(teamId))  !== (row.chatwoot_team_id  ?? null) ||
    (agentId === "none" ? null : Number(agentId)) !== (row.chatwoot_agent_id ?? null);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(row.role_id, {
        chatwoot_team_id:  teamId  !== "none" ? Number(teamId)  : null,
        chatwoot_agent_id: agentId !== "none" ? Number(agentId) : null,
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
      <td className="py-3 pr-4 min-w-[160px]">
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Sin equipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Sin equipo —</SelectItem>
            {teams.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
      <td className="py-3 pr-4 min-w-[160px]">
        <Select value={agentId} onValueChange={setAgentId}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Sin agente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">— Sin agente —</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
  const [teams, setTeams]     = useState([]);
  const [agents, setAgents]   = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [mappingRes, teamRes, agentRes] = await Promise.all([
        fetch("/api/roles/chatwoot-mapping", { headers }),
        fetch("/api/chatwoot/teams",          { headers }),
        fetch("/api/chatwoot/agents",         { headers }),
      ]);
      if (!mappingRes.ok) throw new Error("mapeo");
      const mappingData = await mappingRes.json();
      setRows(mappingData.mappings || []);
      if (teamRes.ok)  setTeams(await teamRes.json());
      if (agentRes.ok) {
        const agentData = await agentRes.json();
        setAgents(Array.isArray(agentData?.data) ? agentData.data : []);
      }
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
            Asigná un equipo o agente de Chatwoot a cada rol del CRM para filtrar conversaciones y alertas
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
            Los usuarios con cada rol solo verán las conversaciones y recibirán las alertas del equipo asignado. Los admins ven todo.
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
                    <th className="text-left py-2 pr-4 font-medium">Rol CRM</th>
                    <th className="text-left py-2 pr-4 font-medium">Equipo Chatwoot</th>
                    <th className="text-left py-2 pr-4 font-medium">Agente directo (opcional)</th>
                    <th className="text-right py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <MappingRow
                      key={row.role_id}
                      row={row}
                      teams={teams}
                      agents={agents}
                      onSave={handleSave}
                    />
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
            <strong>Equipo Chatwoot</strong>: los usuarios con este rol solo verán conversaciones de ese equipo.<br />
            <strong>Agente directo</strong>: si se configura, las conversaciones se asignan directamente a ese agente (no al equipo).<br />
            <strong>Sin asignación</strong>: el usuario verá todas las conversaciones (misma experiencia que admin).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
