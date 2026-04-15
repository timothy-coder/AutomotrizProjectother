"use client";

import { ListChecks, Activity, Zap } from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function MantenimientoStats({ stats }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div
        className="p-3 sm:p-4 rounded-lg border-2 transition-all"
        style={{
          borderColor: `${BRAND_PRIMARY}30`,
          backgroundColor: `${BRAND_PRIMARY}08`,
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <ListChecks size={16} style={{ color: BRAND_PRIMARY }} />
          <p className="text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
            Total
          </p>
        </div>
        <p className="text-2xl sm:text-3xl font-bold" style={{ color: BRAND_PRIMARY }}>
          {stats.total}
        </p>
      </div>

      <div
        className="p-3 sm:p-4 rounded-lg border-2 transition-all"
        style={{ borderColor: "#10b98140", backgroundColor: "#10b98110" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Activity size={16} style={{ color: "#059669" }} />
          <p className="text-xs sm:text-sm font-medium" style={{ color: "#059669" }}>
            Activos
          </p>
        </div>
        <p className="text-2xl sm:text-3xl font-bold" style={{ color: "#059669" }}>
          {stats.activos}
        </p>
      </div>

      <div
        className="p-3 sm:p-4 rounded-lg border-2 transition-all"
        style={{ borderColor: "#f59e0b40", backgroundColor: "#f59e0b10" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <Zap size={16} style={{ color: "#d97706" }} />
          <p className="text-xs sm:text-sm font-medium" style={{ color: "#d97706" }}>
            Con base
          </p>
        </div>
        <p className="text-2xl sm:text-3xl font-bold" style={{ color: "#d97706" }}>
          {stats.conBase}
        </p>
      </div>

      <div
        className="p-3 sm:p-4 rounded-lg border-2 transition-all"
        style={{ borderColor: "#3b82f640", backgroundColor: "#3b82f610" }}
      >
        <div className="flex items-center gap-2 mb-1">
          <ListChecks size={16} style={{ color: "#2563eb" }} />
          <p className="text-xs sm:text-sm font-medium" style={{ color: "#2563eb" }}>
            Subs
          </p>
        </div>
        <p className="text-2xl sm:text-3xl font-bold" style={{ color: "#2563eb" }}>
          {stats.totalSubs}
        </p>
      </div>
    </div>
  );
}