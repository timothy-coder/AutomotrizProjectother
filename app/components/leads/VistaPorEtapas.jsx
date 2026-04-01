"use client";

export default function VistaPorEtapas({
  rows,
  onOpenLead,
  canViewAll,
  currentUserId,
  estadosTiempo,
}) {
  // Agrupar por etapa
  const etapasMap = new Map();

  rows.forEach((row) => {
    const etapaId = row.etapasconversion_id || "sin-etapa";
    if (!etapasMap.has(etapaId)) {
      etapasMap.set(etapaId, []);
    }
    etapasMap.get(etapaId).push(row);
  });

  return (
    <div className="overflow-x-auto p-6">
      <div className="flex gap-4 min-w-full">
        {Array.from(etapasMap.entries()).map(([etapaId, leads]) => (
          <div
            key={etapaId}
            className="flex-shrink-0 w-80 bg-slate-50 rounded-lg border border-slate-200 p-4"
          >
            <h3 className="font-semibold text-slate-900 mb-4">
              {etapaId} ({leads.length})
            </h3>
            <div className="space-y-3">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-3 bg-white rounded border border-slate-200 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onOpenLead(lead)}
                >
                  <p className="font-medium text-blue-600 text-sm">
                    {lead.oportunidad_id || `LD-${lead.id}`}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {lead.detalle?.substring(0, 50) || "Sin detalle"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}