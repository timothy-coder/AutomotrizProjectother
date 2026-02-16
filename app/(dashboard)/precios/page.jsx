"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function PreciosPage() {

  const [carros, setCarros] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [precios, setPrecios] = useState({});
  const [columnSync, setColumnSync] = useState({});
  const [saving, setSaving] = useState(false);

  // ================= LOAD DATA =================
  async function loadData() {

    const carrosData = await fetch("/api/carrosparamantenimiento").then(r => r.json());

    // SOLO ACTIVOS
    const gruposData = await fetch("/api/submantenimiento/grupos?active=1")
      .then(r => r.json());

    const preciosRes = await fetch("/api/precios");
    const preciosJson = await preciosRes.json();

    const preciosData = Array.isArray(preciosJson)
      ? preciosJson
      : preciosJson?.data || [];

    setCarros(carrosData);
    setGrupos(gruposData);

    const map = {};
    preciosData.forEach(p => {
      map[`${p.carrosparamantenimiento_id}_${p.submantenimiento_id}`] =
        p.precio ?? "";
    });

    setPrecios(map);
  }

  useEffect(() => {
    loadData();
  }, []);

  // ================= SAVE =================
  async function savePrecio(carroId, subId, value) {
    if (value === "") return;

    try {
      setSaving(true);

      await fetch("/api/precios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrosparamantenimiento_id: carroId,
          submantenimiento_id: subId,
          precio: Number(value)
        })
      });

    } catch {
      toast.error("Error guardando");
    } finally {
      setSaving(false);
    }
  }

  // ================= COLUMN SYNC =================
  function handleColumnToggle(subId, enabled) {

    setColumnSync(prev => ({ ...prev, [subId]: enabled }));

    // limpiar columna al activar
    if (enabled) {
      setPrecios(prev => {
        const copy = { ...prev };
        carros.forEach(c => {
          const key = `${c.id}_${subId}`;
          copy[key] = "";
        });
        return copy;
      });
    }
  }

  // ================= HANDLE CHANGE =================
  function handleChange(carroId, subId, val) {

    const key = `${carroId}_${subId}`;

    if (columnSync[subId]) {

      const updates = {};
      carros.forEach(c => {
        const k = `${c.id}_${subId}`;
        updates[k] = val;
        savePrecio(c.id, subId, val);
      });

      setPrecios(prev => ({ ...prev, ...updates }));

    } else {
      setPrecios(prev => ({ ...prev, [key]: val }));
      savePrecio(carroId, subId, val);
    }
  }

  // ================= IMPORT =================
  async function importExcel(file) {
    const formData = new FormData();
    formData.append("file", file);

    await fetch("/api/precios/import", {
      method: "POST",
      body: formData
    });

    toast.success("Importación completada");
    loadData();
  }

  return (
    <div className="space-y-6">

      <h1 className="text-xl font-semibold">Matriz de precios</h1>

      {/* BOTONES */}
      <div className="flex gap-2 flex-wrap">

        <button
          onClick={() => window.open("/api/precios/export-template")}
          className="px-3 py-2 bg-muted rounded-md text-sm"
        >
          Descargar formato
        </button>

        <button
          onClick={() => window.open("/api/precios/export")}
          className="px-3 py-2 bg-muted rounded-md text-sm"
        >
          Descargar precios
        </button>

        <label className="px-3 py-2 bg-muted rounded-md text-sm cursor-pointer">
          Cargar Excel
          <input
            type="file"
            hidden
            accept=".xlsx"
            onChange={(e) => importExcel(e.target.files[0])}
          />
        </label>

      </div>

      <div className="border rounded-md overflow-auto">

        <table className="w-full text-sm">

          {/* HEADER */}
          <thead>

            {/* MANTENIMIENTOS */}
            <tr>
              <th className="border p-2">Modelo</th>
              <th className="border p-2">Marca</th>
              <th className="border p-2">Año</th>
              <th className="border p-2">Versión</th>

              {grupos.map(grupo => (
                <th
                  key={grupo.type_id}
                  colSpan={grupo.items.length}
                  className="border text-center bg-muted"
                >
                  {grupo.type_name}
                </th>
              ))}
            </tr>

            {/* SUBTIPOS */}
            <tr>
              <th className="border"></th>
              <th className="border"></th>
              <th className="border"></th>
              <th className="border"></th>

              {grupos.map(grupo =>
                grupo.items.map(item => (
                  <th key={item.id} className="border text-center p-1">

                    <div className="flex flex-col items-center gap-1">

                      {item.name}

                      <Switch
                        checked={columnSync[item.id] || false}
                        onCheckedChange={(v) =>
                          handleColumnToggle(item.id, v)
                        }
                      />

                    </div>

                  </th>
                ))
              )}
            </tr>

          </thead>

          {/* BODY */}
          <tbody>

            {carros.map(carro => (
              <tr key={carro.id}>

                <td className="border p-2">{carro.modelo_nombre}</td>
                <td className="border p-2">{carro.marca_nombre}</td>
                <td className="border p-2">{carro.year}</td>
                <td className="border p-2">{carro.version}</td>

                {grupos.map(grupo =>
                  grupo.items.map(item => {

                    const key = `${carro.id}_${item.id}`;
                    const value = precios[key] ?? "";

                    return (
                      <td key={key} className="border p-1">

                        <Input
                          value={value}
                          className="h-8 text-center"
                          onChange={(e) =>
                            handleChange(carro.id, item.id, e.target.value)
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

      {saving && (
        <p className="text-xs text-muted-foreground">
          Guardando cambios…
        </p>
      )}

    </div>
  );
}
