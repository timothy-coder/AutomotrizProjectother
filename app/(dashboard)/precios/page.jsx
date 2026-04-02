"use client";

import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Download, Upload, AlertCircle, Copy, Loader2, DollarSign, Coins } from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function PreciosPage() {
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [precios, setPrecios] = useState({});

  const [columnSync, setColumnSync] = useState({});
  const [classSync, setClassSync] = useState({});

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ================= HELPERS =================
  function getMantenimientoIdFromGrupo(grupo) {
    return Number(grupo?.type_id ?? grupo?.mantenimiento_id ?? 0);
  }

  function makeKey({ marcaId, modeloId, mantenimientoId, subId }) {
    return `${marcaId}_${modeloId}_${mantenimientoId}_${subId}`;
  }

  function colKey(mantenimientoId, subId) {
    return `${mantenimientoId}_${subId}`;
  }

  function formatAnios(a) {
    if (a == null) return "";
    if (Array.isArray(a)) return a.join(", ");
    if (typeof a === "string") {
      try {
        const parsed = JSON.parse(a);
        if (Array.isArray(parsed)) return parsed.join(", ");
        return String(parsed ?? a);
      } catch {
        return a;
      }
    }
    return String(a);
  }

  // ================= LOAD DATA =================
  async function loadData() {
    try {
      const [marcasData, modelosData, gruposData] = await Promise.all([
        fetch("/api/marcas", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/modelos", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/submantenimiento/grupos?active=1", { cache: "no-store" }).then((r) => r.json()),
      ]);

      const preciosRes = await fetch("/api/precios", { cache: "no-store" });
      const preciosJson = await preciosRes.json();
      const preciosData = Array.isArray(preciosJson) ? preciosJson : preciosJson?.data || [];

      setMarcas(Array.isArray(marcasData) ? marcasData : []);
      setModelos(Array.isArray(modelosData) ? modelosData : []);
      setGrupos(Array.isArray(gruposData) ? gruposData : []);

      const map = {};
      preciosData.forEach((p) => {
        map[`${p.marca_id}_${p.modelo_id}_${p.mantenimiento_id}_${p.submantenimiento_id}`] = p.precio ?? "";
      });
      setPrecios(map);
    } catch (e) {
      console.log(e);
      toast.error("Error cargando datos");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ================= SAVE =================
  async function savePrecio({ marcaId, modeloId, mantenimientoId, subId, value }) {
    if (value === "") return;

    try {
      setSaving(true);

      await fetch("/api/precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca_id: marcaId,
          modelo_id: modeloId,
          mantenimiento_id: mantenimientoId,
          submantenimiento_id: subId,
          precio: Number(value),
        }),
      });
    } catch {
      toast.error("Error guardando");
    } finally {
      setSaving(false);
    }
  }

  // ================= COLUMN SYNC (TODOS) =================
  function handleColumnToggle(mantenimientoId, subId, enabled) {
    const ck = colKey(mantenimientoId, subId);
    setColumnSync((prev) => ({ ...prev, [ck]: enabled }));

    if (enabled) {
      setPrecios((prev) => {
        const copy = { ...prev };
        modelos.forEach((mo) => {
          const marcaId = Number(mo.marca_id);
          const modeloId = Number(mo.id);
          const k = makeKey({ marcaId, modeloId, mantenimientoId, subId });
          copy[k] = "";
        });
        return copy;
      });
    }
  }

  // ================= COLUMN SYNC (POR CLASE) =================
  function handleClassColumnToggle(mantenimientoId, subId, enabled) {
    const ck = colKey(mantenimientoId, subId);
    setClassSync((prev) => ({ ...prev, [ck]: enabled }));

    if (enabled) {
      setPrecios((prev) => {
        const copy = { ...prev };
        modelos.forEach((mo) => {
          const marcaId = Number(mo.marca_id);
          const modeloId = Number(mo.id);
          const k = makeKey({ marcaId, modeloId, mantenimientoId, subId });
          copy[k] = "";
        });
        return copy;
      });
    }
  }

  // ================= HANDLE CHANGE =================
  function handleChange({ modelo, mantenimientoId, subId, val }) {
    const marcaId = Number(modelo.marca_id);
    const modeloId = Number(modelo.id);
    const claseId = Number(modelo.clase_id || 0);

    if (!marcaId || !modeloId || !mantenimientoId || !subId) return;

    const key = makeKey({ marcaId, modeloId, mantenimientoId, subId });
    const ck = colKey(mantenimientoId, subId);

    // 1) Sync a TODOS
    if (columnSync[ck]) {
      const updates = {};
      modelos.forEach((mo) => {
        const mId = Number(mo.marca_id);
        const moId = Number(mo.id);
        const k = makeKey({ marcaId: mId, modeloId: moId, mantenimientoId, subId });
        updates[k] = val;
        savePrecio({ marcaId: mId, modeloId: moId, mantenimientoId, subId, value: val });
      });

      setPrecios((prev) => ({ ...prev, ...updates }));
      return;
    }

    // 2) Sync por CLASE
    if (classSync[ck]) {
      const updates = {};
      modelos
        .filter((mo) => Number(mo.clase_id || 0) === claseId)
        .forEach((mo) => {
          const mId = Number(mo.marca_id);
          const moId = Number(mo.id);
          const k = makeKey({ marcaId: mId, modeloId: moId, mantenimientoId, subId });
          updates[k] = val;
          savePrecio({ marcaId: mId, modeloId: moId, mantenimientoId, subId, value: val });
        });

      setPrecios((prev) => ({ ...prev, ...updates }));
      return;
    }

    // 3) Solo celda
    setPrecios((prev) => ({ ...prev, [key]: val }));
    savePrecio({ marcaId, modeloId, mantenimientoId, subId, value: val });
  }

  // ================= IMPORT =================
  async function importExcel(file) {
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/precios/import", { method: "POST", body: formData });
      
      if (!res.ok) throw new Error("Error en importación");

      toast.success("Importación completada");
      loadData();
    } catch (e) {
      toast.error("Error importando archivo");
      console.log(e);
    } finally {
      setUploading(false);
    }
  }

  const rowCols = useMemo(
    () => [
      { key: "marca", label: "Marca", render: (m) => m.marca_name || "-" },
      { key: "modelo", label: "Modelo", render: (m) => m.name || "-" },
      { key: "clase", label: "Clase", render: (m) => m.clase_nombre || "Sin clase" },
      { key: "anios", label: "Años", render: (m) => formatAnios(m.anios) },
    ],
    []
  );

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-white gap-3 sm:gap-4">
        
        {/* HEADER - FIJO */}
        <div className="flex-shrink-0 space-y-3 sm:space-y-4 px-2 sm:px-4 pt-2 sm:pt-4">
          
          {/* Título */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-2 sm:p-3 rounded-lg bg-[#5d16ec]" >
              <Coins className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" >
                Matriz de Precios
              </h1>
              <p className="text-xs sm:text-sm" style={{ color: BRAND_SECONDARY }}>
                Gestiona precios de mantenimiento por modelo
              </p>
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="flex flex-col sm:flex-row gap-2 p-2 sm:p-3 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
            
            <div className="flex gap-1.5 sm:gap-2 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => window.open("/api/precios/export-template")}
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Descargar formato</span>
                    <span className="sm:hidden">Formato</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Descarga el formato de Excel para importar precios
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={() => window.open("/api/precios/export")}
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Descargar precios</span>
                    <span className="sm:hidden">Descargar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Descarga todos los precios actuales en Excel
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <label className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border-2 cursor-pointer text-xs sm:text-sm font-medium transition-all h-7 sm:h-8" style={{ borderColor: BRAND_PRIMARY, backgroundColor: `${BRAND_PRIMARY}05` }}>
                    {uploading ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        <span className="hidden sm:inline">Cargando...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span className="hidden sm:inline">Cargar Excel</span>
                        <span className="sm:hidden">Cargar</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      hidden 
                      accept=".xlsx" 
                      onChange={(e) => importExcel(e.target.files?.[0])}
                      disabled={uploading}
                    />
                  </label>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Importa precios desde un archivo Excel
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Info box - Derecha */}
            <div className="ml-auto flex items-center gap-1.5 text-xs px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg" style={{ backgroundColor: '#fef3c710', color: '#92400e' }}>
              <AlertCircle size={14} className="flex-shrink-0" />
              <span className="hidden sm:inline">Los cambios se guardan automáticamente</span>
              <span className="sm:hidden">Autoguardado</span>
            </div>
          </div>
        </div>

        {/* TABLA - SCROLLABLE */}
        <div className="flex-1 min-h-0 overflow-auto px-2 sm:px-4 pb-3">
          <div className="border-2 rounded-lg bg-white overflow-auto" style={{ borderColor: `${BRAND_PRIMARY}30` }}>
            <table className="w-full text-xs sm:text-sm border-collapse">
              
              {/* HEADER PRINCIPAL */}
              <thead className="sticky top-0 z-10">
                <tr style={{ backgroundColor: `${BRAND_PRIMARY}08` }}>
                  {rowCols.map((c) => (
                    <th 
                      key={c.key} 
                      className="border-r p-1.5 sm:p-3 text-left font-semibold min-w-max"
                      style={{ color: BRAND_PRIMARY, borderColor: `${BRAND_PRIMARY}30` }}
                    >
                      {c.label}
                    </th>
                  ))}

                  {grupos.map((grupo) => (
                    <th 
                      key={grupo.type_id} 
                      colSpan={grupo.items.length} 
                      className="border-r p-1 sm:p-2 text-center font-semibold text-xs sm:text-sm"
                      style={{ backgroundColor: `${BRAND_PRIMARY}10`, color: BRAND_PRIMARY, borderColor: `${BRAND_PRIMARY}30` }}
                    >
                      {grupo.type_name}
                    </th>
                  ))}
                </tr>

                {/* HEADER SECUNDARIO (SWITCHES) */}
                <tr style={{ backgroundColor: `${BRAND_PRIMARY}05`, borderBottomColor: `${BRAND_PRIMARY}30` }} className="border-b-2">
                  {rowCols.map((c) => (
                    <th key={c.key} className="border-r" style={{ borderColor: `${BRAND_PRIMARY}30` }} />
                  ))}

                  {grupos.map((grupo) =>
                    grupo.items.map((item) => {
                      const mantenimientoId = getMantenimientoIdFromGrupo(grupo);
                      const ck = colKey(mantenimientoId, item.id);

                      return (
                        <th 
                          key={`${grupo.type_id}_${item.id}`} 
                          className="border-r p-0.5 sm:p-1 text-center min-w-[100px] sm:min-w-[140px]"
                          style={{ borderColor: `${BRAND_PRIMARY}30` }}
                        >
                          <div className="flex flex-col items-center gap-0.5 py-0.5 sm:py-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs font-medium cursor-help truncate max-w-[90px] sm:max-w-full px-1" style={{ color: BRAND_PRIMARY }}>
                                  {item.name}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs">
                                {item.description || "Sin descripción"}
                              </TooltipContent>
                            </Tooltip>

                            {/* Switch 1: TODOS */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-0.5 text-xs px-1 py-0.5 rounded" style={{ backgroundColor: `${BRAND_PRIMARY}15`, color: BRAND_PRIMARY }}>
                                  <Copy size={10} className="hidden sm:block" />
                                  <span className="hidden sm:inline text-xs">Todos</span>
                                  <span className="sm:hidden text-xs">T</span>
                                  <Switch
                                    checked={columnSync[ck] || false}
                                    onCheckedChange={(v) => {
                                      if (v) setClassSync((p) => ({ ...p, [ck]: false }));
                                      handleColumnToggle(mantenimientoId, item.id, v);
                                    }}
                                    className="scale-50 sm:scale-75 -mr-1"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Aplicar a todos
                              </TooltipContent>
                            </Tooltip>

                            {/* Switch 2: POR CLASE */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-0.5 text-xs px-1 py-0.5 rounded" style={{ backgroundColor: '#f3e8ff', color: '#9333ea' }}>
                                  <Copy size={10} className="hidden sm:block" />
                                  <span className="hidden sm:inline text-xs">Clase</span>
                                  <span className="sm:hidden text-xs">C</span>
                                  <Switch
                                    checked={classSync[ck] || false}
                                    onCheckedChange={(v) => {
                                      if (v) setColumnSync((p) => ({ ...p, [ck]: false }));
                                      handleClassColumnToggle(mantenimientoId, item.id, v);
                                    }}
                                    className="scale-50 sm:scale-75 -mr-1"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Aplicar a clase
                              </TooltipContent>
                            </Tooltip>

                            {/* Indicadores visuales */}
                            {(columnSync[ck] || classSync[ck]) && (
                              <div 
                                className="text-xs font-semibold px-1 py-0.5 rounded text-white"
                                style={{ backgroundColor: columnSync[ck] ? BRAND_PRIMARY : '#9333ea' }}
                              >
                                {columnSync[ck] ? "T" : "C"}
                              </div>
                            )}
                          </div>
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>

              {/* BODY */}
              <tbody>
                {modelos.map((modelo, idx) => (
                  <tr 
                    key={`${modelo.marca_id}_${modelo.id}`}
                    className="hover:opacity-80 transition-opacity border-b"
                    style={{ borderColor: `${BRAND_PRIMARY}20` }}
                  >
                    {rowCols.map((col) => (
                      <td 
                        key={col.key} 
                        className="border-r p-1 sm:p-2 font-medium min-w-max"
                        style={{ color: BRAND_PRIMARY, borderColor: `${BRAND_PRIMARY}30` }}
                      >
                        <div className="text-xs sm:text-sm truncate max-w-[70px] sm:max-w-none">
                          {col.render(modelo)}
                        </div>
                      </td>
                    ))}

                    {grupos.map((grupo) =>
                      grupo.items.map((item) => {
                        const marcaId = Number(modelo.marca_id);
                        const modeloId = Number(modelo.id);
                        const mantenimientoId = getMantenimientoIdFromGrupo(grupo);

                        const key = makeKey({
                          marcaId,
                          modeloId,
                          mantenimientoId,
                          subId: item.id,
                        });

                        const value = precios[key] ?? "";
                        const ck = colKey(mantenimientoId, item.id);
                        const inputStyle = {
                          backgroundColor: columnSync[ck] || classSync[ck] ? `${BRAND_PRIMARY}15` : "transparent",
                          borderColor: `${BRAND_PRIMARY}30`,
                          color: BRAND_PRIMARY
                        };

                        return (
                          <td 
                            key={key} 
                            className="border-r p-0.5 sm:p-1 text-center"
                            style={{
                              backgroundColor: columnSync[ck] || classSync[ck] ? `${BRAND_PRIMARY}15` : "transparent",
                              borderColor: `${BRAND_PRIMARY}30`
                            }}
                          >
                            <Input
                              type="number"
                              value={value}
                              className="h-6 sm:h-8 text-center text-xs sm:text-sm font-medium border-0 p-0 focus:ring-2 focus:ring-opacity-50"
                              style={inputStyle}
                              placeholder="—"
                              onChange={(e) =>
                                handleChange({
                                  modelo,
                                  mantenimientoId,
                                  subId: item.id,
                                  val: e.target.value,
                                })
                              }
                            />
                          </td>
                        );
                      })
                    )}
                  </tr>
                ))}

                {modelos.length === 0 && (
                  <tr>
                    <td colSpan={rowCols.length + grupos.reduce((acc, g) => acc + g.items.length, 0)} className="p-4 sm:p-8 text-center" style={{ color: BRAND_SECONDARY }}>
                      <p className="text-sm sm:text-base">No hay modelos disponibles</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* STATUS - FIJO ABAJO */}
        {saving && (
          <div className="flex-shrink-0 flex items-center gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2 rounded-lg mx-2 sm:mx-4 mb-2" style={{ backgroundColor: `${BRAND_PRIMARY}15`, color: BRAND_PRIMARY }}>
            <Loader2 size={14} className="animate-spin flex-shrink-0" />
            <span>Guardando cambios…</span>
          </div>
        )}

        {/* LEGEND - FIJO ABAJO */}
        <div className="flex-shrink-0 grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 sm:p-3 mx-2 sm:mx-4 mb-2 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
          <div className="flex items-start gap-1.5 text-xs">
            <div className="w-3 h-3 rounded flex-shrink-0 mt-0.5" style={{ backgroundColor: `${BRAND_PRIMARY}20` }} />
            <div>
              <p className="font-medium" style={{ color: BRAND_PRIMARY }}>Todos</p>
              <p className="text-xs" style={{ color: BRAND_SECONDARY }}>A todos modelos</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-xs">
            <div className="w-3 h-3 rounded flex-shrink-0 mt-0.5" style={{ backgroundColor: '#f3e8ff' }} />
            <div>
              <p className="font-medium" style={{ color: '#9333ea' }}>Clase</p>
              <p className="text-xs" style={{ color: BRAND_SECONDARY }}>Misma clase</p>
            </div>
          </div>
          <div className="flex items-start gap-1.5 text-xs col-span-2 sm:col-span-1">
            <DollarSign size={12} className="flex-shrink-0 mt-0.5" style={{ color: BRAND_PRIMARY }} />
            <div>
              <p className="font-medium" style={{ color: BRAND_PRIMARY }}>Autoguardado</p>
              <p className="text-xs" style={{ color: BRAND_SECONDARY }}>Cambios auto</p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}