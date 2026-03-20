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
import { Download, Upload, AlertCircle, Copy, Loader2, DollarSign } from "lucide-react";

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
      <div className="space-y-6">
        
        {/* HEADER */}
        <div className="flex items-center gap-3 px-1">
          <DollarSign size={28} className="text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Matriz de Precios</h1>
            <p className="text-sm text-gray-600 mt-1">Gestiona precios de mantenimiento por modelo</p>
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="flex gap-2 flex-wrap p-4 bg-slate-50 rounded-lg border border-slate-200">
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => window.open("/api/precios/export-template")}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download size={16} />
                Descargar formato
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Descarga el formato de Excel para importar precios
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={() => window.open("/api/precios/export")}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download size={16} />
                Descargar precios
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Descarga todos los precios actuales en Excel
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <label className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer text-sm font-medium transition-colors">
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Cargar Excel
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
            <TooltipContent side="top">
              Importa precios desde un archivo Excel
            </TooltipContent>
          </Tooltip>

          {/* Info box */}
          <div className="ml-auto flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
            <AlertCircle size={14} />
            <span>Los cambios se guardan automáticamente</span>
          </div>
        </div>

        {/* TABLA */}
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              
              {/* HEADER PRINCIPAL */}
              <thead>
                <tr className="bg-slate-50 border-b">
                  {rowCols.map((c) => (
                    <th 
                      key={c.key} 
                      className="border-r p-3 text-left font-semibold text-slate-700 min-w-max"
                    >
                      {c.label}
                    </th>
                  ))}

                  {grupos.map((grupo) => (
                    <th 
                      key={grupo.type_id} 
                      colSpan={grupo.items.length} 
                      className="border-r p-2 text-center font-semibold text-slate-900 bg-blue-50"
                    >
                      {grupo.type_name}
                    </th>
                  ))}
                </tr>

                {/* HEADER SECUNDARIO (SWITCHES) */}
                <tr className="bg-slate-50 border-b">
                  {rowCols.map((c) => (
                    <th key={c.key} className="border-r" />
                  ))}

                  {grupos.map((grupo) =>
                    grupo.items.map((item) => {
                      const mantenimientoId = getMantenimientoIdFromGrupo(grupo);
                      const ck = colKey(mantenimientoId, item.id);

                      return (
                        <th 
                          key={`${grupo.type_id}_${item.id}`} 
                          className="border-r p-1 text-center min-w-[140px]"
                        >
                          <div className="flex flex-col items-center gap-1 py-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <p className="text-xs font-medium text-slate-700 cursor-help">
                                  {item.name}
                                </p>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                {item.description || "Sin descripción"}
                              </TooltipContent>
                            </Tooltip>

                            {/* Switch 1: TODOS */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-[10px] bg-blue-50 px-1.5 py-0.5 rounded">
                                  <Copy size={10} />
                                  <span>Todos</span>
                                  <Switch
                                    checked={columnSync[ck] || false}
                                    onCheckedChange={(v) => {
                                      if (v) setClassSync((p) => ({ ...p, [ck]: false }));
                                      handleColumnToggle(mantenimientoId, item.id, v);
                                    }}
                                    className="scale-75 data-[state=checked]:bg-blue-600"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Aplicar este precio a todos los modelos
                              </TooltipContent>
                            </Tooltip>

                            {/* Switch 2: POR CLASE */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-1 text-[10px] bg-purple-50 px-1.5 py-0.5 rounded">
                                  <Copy size={10} />
                                  <span>Clase</span>
                                  <Switch
                                    checked={classSync[ck] || false}
                                    onCheckedChange={(v) => {
                                      if (v) setColumnSync((p) => ({ ...p, [ck]: false }));
                                      handleClassColumnToggle(mantenimientoId, item.id, v);
                                    }}
                                    className="scale-75 data-[state=checked]:bg-purple-600"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Aplicar a todos los modelos de la misma clase
                              </TooltipContent>
                            </Tooltip>

                            {/* Indicadores visuales */}
                            {(columnSync[ck] || classSync[ck]) && (
                              <div className={`text-[9px] font-semibold px-1.5 py-0.5 rounded text-white ${
                                columnSync[ck] ? "bg-blue-600" : "bg-purple-600"
                              }`}>
                                {columnSync[ck] ? "Todos activo" : "Clase activa"}
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
                    className={`border-b hover:bg-slate-50 transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    }`}
                  >
                    {rowCols.map((col) => (
                      <td 
                        key={col.key} 
                        className="border-r p-3 text-slate-900 font-medium min-w-max sticky"
                      >
                        {col.render(modelo)}
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

                        return (
                          <td 
                            key={key} 
                            className={`border-r p-1 text-center ${
                              columnSync[ck] || classSync[ck] ? "bg-blue-50/30" : ""
                            }`}
                          >
                            <Input
                              type="number"
                              value={value}
                              className="h-8 text-center text-sm font-medium"
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
                    <td colSpan={rowCols.length + grupos.reduce((acc, g) => acc + g.items.length, 0)} className="p-8 text-center text-gray-500">
                      No hay modelos disponibles
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* STATUS */}
        {saving && (
          <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
            <Loader2 size={16} className="animate-spin" />
            Guardando cambios…
          </div>
        )}

        {/* LEGEND */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-slate-900">Todos activo</p>
              <p className="text-xs text-gray-600">Precio se copia a todos los modelos</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 bg-purple-50 border border-purple-200 rounded flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-slate-900">Clase activa</p>
              <p className="text-xs text-gray-600">Precio se copia a modelos de la misma clase</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <DollarSign size={16} className="text-green-600 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-slate-900">Autoguardado</p>
              <p className="text-xs text-gray-600">Los cambios se guardan automáticamente</p>
            </div>
          </div>
        </div>

      </div>
    </TooltipProvider>
  );
}