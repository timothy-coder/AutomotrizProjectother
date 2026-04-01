"use client";

export default function VistaPorUsuarios({
  rows,
  usuarios,
  onOpenLead,
  canViewAll,
  currentUserId,
  estadosTiempo,
}) {
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {usuarios.map((usuario) => {
          const leadsUsuario = rows.filter(
            (r) => String(r.asignado_a) === String(usuario.id)
          );

          return (
            <div key={usuario.id} className="border rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-3">
                {usuario.fullname || usuario.username}
              </h3>
              <div className="space-y-2">
                {leadsUsuario.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Sin leads asignados
                  </p>
                ) : (
                  leadsUsuario.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-2 bg-slate-50 rounded border border-slate-200 text-sm cursor-pointer hover:bg-slate-100"
                      onClick={() => onOpenLead(lead)}
                    >
                      <p className="font-medium text-blue-600">
                        {lead.oportunidad_id || `LD-${lead.id}`}
                      </p>
                      <p className="text-xs text-gray-600">
                        {lead.detalle?.substring(0, 40) || "Sin detalle"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}