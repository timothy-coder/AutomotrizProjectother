"use client";

import { useEffect, useMemo, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PreciosPage() {
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [precios, setPrecios] = useState({});

  // ✅ sync a TODOS (como ya tenías)
  const [columnSync, setColumnSync] = useState({});

  // ✅ NUEVO: sync por CLASE
  const [classSync, setClassSync] = useState({});

  const [saving, setSaving] = useState(false);

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

    // limpiar columna al activar
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

  // ================= NUEVO: COLUMN SYNC (POR CLASE) =================
  function handleClassColumnToggle(mantenimientoId, subId, enabled) {
    const ck = colKey(mantenimientoId, subId);
    setClassSync((prev) => ({ ...prev, [ck]: enabled }));

    // opcional: limpiar columna al activar (igual que el otro)
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
    const formData = new FormData();
    formData.append("file", file);

    await fetch("/api/precios/import", { method: "POST", body: formData });

    toast.success("Importación completada");
    loadData();
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
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Matriz de precios</h1>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => window.open("/api/precios/export-template")} className="px-3 py-2 bg-muted rounded-md text-sm">
          Descargar formato
        </button>

        <button onClick={() => window.open("/api/precios/export")} className="px-3 py-2 bg-muted rounded-md text-sm">
          Descargar precios
        </button>

        <label className="px-3 py-2 bg-muted rounded-md text-sm cursor-pointer">
          Cargar Excel
          <input type="file" hidden accept=".xlsx" onChange={(e) => importExcel(e.target.files?.[0])} />
        </label>
      </div>

      <div className="border rounded-md overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              {rowCols.map((c) => (
                <th key={c.key} className="border p-2">
                  {c.label}
                </th>
              ))}

              {grupos.map((grupo) => (
                <th key={grupo.type_id} colSpan={grupo.items.length} className="border text-center bg-muted">
                  {grupo.type_name}
                </th>
              ))}
            </tr>

            <tr>
              {rowCols.map((c) => (
                <th key={c.key} className="border" />
              ))}

              {grupos.map((grupo) =>
                grupo.items.map((item) => {
                  const mantenimientoId = getMantenimientoIdFromGrupo(grupo);
                  const ck = colKey(mantenimientoId, item.id);

                  return (
                    <th key={`${grupo.type_id}_${item.id}`} className="border text-center p-1">
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-xs">{item.name}</div>

                        {/* ✅ Switch 1: replica a TODOS */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Todos</span>
                          <Switch
                            checked={columnSync[ck] || false}
                            onCheckedChange={(v) => {
                              // si activas TODOS, apago CLASE para evitar confusión
                              if (v) setClassSync((p) => ({ ...p, [ck]: false }));
                              handleColumnToggle(mantenimientoId, item.id, v);
                            }}
                          />
                        </div>

                        {/* ✅ Switch 2: replica POR CLASE */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">Clase</span>
                          <Switch
                            checked={classSync[ck] || false}
                            onCheckedChange={(v) => {
                              // si activas CLASE, apago TODOS
                              if (v) setColumnSync((p) => ({ ...p, [ck]: false }));
                              handleClassColumnToggle(mantenimientoId, item.id, v);
                            }}
                          />
                        </div>
                      </div>
                    </th>
                  );
                })
              )}
            </tr>
          </thead>

          <tbody>
            {modelos.map((modelo) => (
              <tr key={`${modelo.marca_id}_${modelo.id}`}>
                {rowCols.map((col) => (
                  <td key={col.key} className="border p-2">
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

                    return (
                      <td key={key} className="border p-1">
                        <Input
                          value={value}
                          className="h-8 text-center"
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
          </tbody>
        </table>
      </div>

      {saving && <p className="text-xs text-muted-foreground">Guardando cambios…</p>}
    </div>
  );
}