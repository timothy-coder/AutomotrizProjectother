"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Wrench, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import MantenimientoStats from "@/app/components/mantenimientos/MantenimientoStats";
import MantenimientoRow from "@/app/components/mantenimientos/MantenimientoRow";
import MantenimientoSubRow from "@/app/components/mantenimientos/MantenimientoSubRow";
import MantenimientoFormDialog from "@/app/components/mantenimientos/MantenimientoFormDialog";
import ConfirmDeleteDialog from "@/app/components/mantenimientos/ConfirmDeleteDialog";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

function parseIdsFromCommaText(text) {
  if (!text) return [];
  return String(text)
    .split(",")
    .map((x) => Number(String(x).trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function idsToCommaText(ids) {
  return (ids || []).join(",");
}

export default function ComboMantenimientoPage() {
  const [mantenimientos, setMantenimientos] = useState([]);
  const [sub, setSub] = useState([]);
  const [expanded, setExpanded] = useState({});

  const [dialog, setDialog] = useState({
    open: false,
    mode: "create-mant",
    item: null,
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    is_active: true,
    type_id: "",
    resumen: false,
    mantenimiento_ids: [],
  });

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: null,
    item: null,
  });

  async function loadData() {
    try {
      const [m, s] = await Promise.all([
        fetch("/api/mantenimiento", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/submantenimiento", { cache: "no-store" }).then((r) => r.json()),
      ]);
      setMantenimientos(Array.isArray(m) ? m : []);
      setSub(Array.isArray(s) ? s : []);
    } catch (e) {
      toast.error("Error cargando data");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const grouped = useMemo(() => {
    return (mantenimientos || []).map((m) => ({
      ...m,
      items: (sub || []).filter((s) => Number(s.type_id) === Number(m.id)),
    }));
  }, [mantenimientos, sub]);

  const stats = useMemo(() => {
    const total = mantenimientos.length;
    const activos = mantenimientos.filter((m) => Number(m.is_active) === 1).length;
    const conBase = mantenimientos.filter(
      (m) => m.mantenimiento_id && String(m.mantenimiento_id).trim() !== ""
    ).length;
    const totalSubs = sub.length;
    return { total, activos, conBase, totalSubs };
  }, [mantenimientos, sub]);

  const toggleExpand = (id) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  function openNewMant() {
    setForm({
      name: "",
      description: "",
      is_active: true,
      type_id: "",
      resumen: false,
      mantenimiento_ids: [],
    });
    setDialog({ open: true, mode: "create-mant", item: null });
  }

  function openEditMant(m) {
    setForm({
      name: m.name || "",
      description: m.description || "",
      is_active: Number(m.is_active) === 1,
      type_id: "",
      resumen: !!m.mantenimiento_id && String(m.mantenimiento_id).trim() !== "",
      mantenimiento_ids: parseIdsFromCommaText(m.mantenimiento_id),
    });
    setDialog({ open: true, mode: "edit-mant", item: m });
  }

  function openNewSub(mantId) {
    setForm({
      name: "",
      description: "",
      is_active: true,
      type_id: String(mantId || ""),
      resumen: false,
      mantenimiento_ids: [],
    });
    setDialog({ open: true, mode: "create-sub", item: null });
  }

  function openEditSub(item) {
    setForm({
      name: item.name || "",
      description: item.description || "",
      is_active: Number(item.is_active) === 1,
      type_id: String(item.type_id || ""),
      resumen: false,
      mantenimiento_ids: [],
    });
    setDialog({ open: true, mode: "edit-sub", item });
  }

  async function save() {
    if (!String(form.name || "").trim()) {
      toast.warning("Ingrese nombre");
      return;
    }

    try {
      const mantenimiento_id = form.resumen
        ? idsToCommaText(form.mantenimiento_ids)
        : null;

      if (dialog.mode === "create-mant") {
        const res = await fetch("/api/mantenimiento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            is_active: form.is_active ? 1 : 0,
            mantenimiento_id,
          }),
        });

        if (!res.ok) throw new Error(await res.text());
        toast.success("Mantenimiento creado");
      }

      if (dialog.mode === "edit-mant") {
        const res = await fetch(`/api/mantenimiento/${dialog.item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            is_active: form.is_active ? 1 : 0,
            mantenimiento_id,
          }),
        });

        if (!res.ok) throw new Error(await res.text());
        toast.success("Mantenimiento actualizado");
      }

      if (dialog.mode === "create-sub") {
        if (!form.type_id) {
          toast.warning("Seleccione mantenimiento padre");
          return;
        }

        const res = await fetch("/api/submantenimiento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            type_id: Number(form.type_id),
            is_active: form.is_active ? 1 : 0,
            description: form.description,
          }),
        });

        if (!res.ok) throw new Error(await res.text());
        toast.success("Submantenimiento creado");
      }

      if (dialog.mode === "edit-sub") {
        const res = await fetch(`/api/submantenimiento/${dialog.item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            type_id: Number(form.type_id),
            is_active: form.is_active ? 1 : 0,
            description: form.description,
          }),
        });

        if (!res.ok) throw new Error(await res.text());
        toast.success("Submantenimiento actualizado");
      }

      setDialog({ open: false, mode: "create-mant", item: null });
      loadData();
    } catch (e) {
      console.error(e);
      toast.error("Error al guardar");
    }
  }

  function askDeleteMant(m) {
    setDeleteDialog({ open: true, type: "mant", item: m });
  }

  function askDeleteSub(item) {
    setDeleteDialog({ open: true, type: "sub", item });
  }

  async function confirmDelete() {
    try {
      if (deleteDialog.type === "mant") {
        const res = await fetch(`/api/mantenimiento/${deleteDialog.item.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Mantenimiento eliminado");
      }

      if (deleteDialog.type === "sub") {
        const res = await fetch(`/api/submantenimiento/${deleteDialog.item.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Submantenimiento eliminado");
      }

      setDeleteDialog({ open: false, type: null, item: null });
      loadData();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar");
    }
  }

  async function toggleMantActive(m, value) {
    try {
      const res = await fetch(`/api/mantenimiento/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: m.name,
          description: m.description,
          is_active: value ? 1 : 0,
          mantenimiento_id: m.mantenimiento_id ?? null,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      loadData();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar el estado");
    }
  }

  return (
    <TooltipProvider>
      <div className="space-y-4 sm:space-y-6">
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#5d16ec] rounded-lg shadow-md">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Mantenimientos</h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona mantenimientos y submantenimientos
              </p>
            </div>
          </div>

          <MantenimientoStats stats={stats} />
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <h2
              className="text-lg sm:text-xl font-semibold flex items-center gap-2"
              style={{ color: BRAND_PRIMARY }}
            >
              <ListChecks size={20} />
              Listado de Mantenimientos ({stats.total})
            </h2>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={openNewMant}
                className="w-full sm:w-auto text-white gap-2 text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-4"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                <Plus size={16} />
                <span>Nuevo Mantenimiento</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Crear nuevo mantenimiento
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="border rounded-lg overflow-hidden bg-white">
          {grouped.map((m, idx) => (
            <div key={m.id} className={idx !== grouped.length - 1 ? "border-b" : ""}>
              <MantenimientoRow
                mantenimiento={m}
                expanded={!!expanded[m.id]}
                onToggleExpand={() => toggleExpand(m.id)}
                onEdit={() => openEditMant(m)}
                onDelete={() => askDeleteMant(m)}
                onToggleActive={toggleMantActive}
                onAddSub={() => {
                  openNewSub(m.id);
                  setExpanded((p) => ({ ...p, [m.id]: true }));
                }}
              >
                <div
                  className="bg-slate-50 border-t p-3 sm:p-4 space-y-2"
                  style={{ borderTopColor: `${BRAND_PRIMARY}20` }}
                >
                  {m.items.length === 0 ? (
                    <p
                      className="text-xs sm:text-sm text-center py-6 sm:py-8"
                      style={{ color: BRAND_SECONDARY }}
                    >
                      Sin submantenimientos
                    </p>
                  ) : (
                    m.items.map((item) => (
                      <MantenimientoSubRow
                        key={item.id}
                        item={item}
                        onEdit={() => openEditSub(item)}
                        onDelete={() => askDeleteSub(item)}
                      />
                    ))
                  )}
                </div>
              </MantenimientoRow>
            </div>
          ))}

          {grouped.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <Wrench
                size={36}
                className="mx-auto mb-2 opacity-30"
                style={{ color: BRAND_SECONDARY }}
              />
              <p className="text-sm" style={{ color: BRAND_SECONDARY }}>
                No hay mantenimientos
              </p>
            </div>
          )}
        </div>

        <MantenimientoFormDialog
          dialog={dialog}
          setDialog={setDialog}
          form={form}
          setForm={setForm}
          mantenimientos={mantenimientos}
          onSave={save}
        />

        <ConfirmDeleteDialog
          open={deleteDialog.open}
          type={deleteDialog.type}
          item={deleteDialog.item}
          onConfirm={confirmDelete}
          onOpenChange={(v) =>
            !v && setDeleteDialog({ open: false, type: null, item: null })
          }
        />
      </div>
    </TooltipProvider>
  );
}