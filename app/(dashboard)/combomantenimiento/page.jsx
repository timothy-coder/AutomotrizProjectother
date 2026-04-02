"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Check, Wrench, AlertCircle, Activity, ListChecks, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

// ✅ helpers
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

/** ✅ MultiSelect buscable tipo shadcn Command */
function MultiMantenimientoSelector({
  allItems = [],
  selectedIds = [],
  onChange,
  disabled,
  excludeId,
}) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => {
    const s = new Set(selectedIds);
    return allItems.filter((x) => s.has(Number(x.id)));
  }, [allItems, selectedIds]);

  const options = useMemo(() => {
    return (allItems || [])
      .filter((x) => Number(x.id) !== Number(excludeId))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [allItems, excludeId]);

  function toggle(id) {
    const n = Number(id);
    const exists = selectedIds.includes(n);
    const next = exists ? selectedIds.filter((x) => x !== n) : [...selectedIds, n];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`w-full text-left border rounded-lg px-2 sm:px-3 py-2 min-h-[44px] flex flex-wrap gap-1.5 sm:gap-2 items-center transition-colors text-sm ${
              disabled 
                ? "opacity-50 cursor-not-allowed bg-gray-50" 
                : "cursor-text hover:border-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
          >
            {selected.length === 0 ? (
              <span className="text-xs sm:text-sm text-muted-foreground">
                Click para buscar...
              </span>
            ) : (
              selected.map((it) => (
                <span
                  key={it.id}
                  className="flex items-center gap-1 text-white rounded-md px-1.5 sm:px-2 py-0.5 text-xs font-medium flex-shrink-0"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                >
                  {it.name}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-0.5 text-sm leading-none hover:opacity-80 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggle(it.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(it.id);
                      }
                    }}
                    aria-label={`Quitar ${it.name}`}
                  >
                    ×
                  </span>
                </span>
              ))
            )}
          </button>
        </PopoverTrigger>

        <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
          <Command>
            <CommandInput placeholder="Buscar mantenimiento..." />
            <CommandList>
              <CommandEmpty>No se encontró.</CommandEmpty>
              <CommandGroup heading="Mantenimientos">
                {options.map((m) => {
                  const isSelected = selectedIds.includes(Number(m.id));
                  return (
                    <CommandItem
                      key={m.id}
                      value={`${m.name ?? ""} ${m.id}`}
                      onSelect={() => toggle(m.id)}
                      className="flex items-center justify-between cursor-pointer text-sm"
                    >
                      <span>{m.name}</span>
                      {isSelected ? <Check className="h-4 w-4" style={{ color: BRAND_PRIMARY }} /> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="text-xs p-2 rounded" style={{ color: BRAND_SECONDARY, backgroundColor: `${BRAND_PRIMARY}10` }} >
        <span className="font-medium">IDs seleccionados:</span> <span className="font-mono">{idsToCommaText(selectedIds) || "—"}</span>
      </div>
    </div>
  );
}

export default function ComboMantenimientoPage() {
  // ================= STATE =================
  const [mantenimientos, setMantenimientos] = useState([]);
  const [sub, setSub] = useState([]);
  const [expanded, setExpanded] = useState({});

  const [dialog, setDialog] = useState({
    open: false,
    mode: "create-mant",
    item: null
  });

  const [form, setForm] = useState({
    name: "",
    description: "",
    is_active: true,
    type_id: "",
    resumen: false,
    mantenimiento_ids: []
  });

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: null,
    item: null
  });

  // ================= LOAD =================
  async function loadData() {
    try {
      const [m, s] = await Promise.all([
        fetch("/api/mantenimiento", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/submantenimiento", { cache: "no-store" }).then((r) => r.json())
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
      items: (sub || []).filter((s) => Number(s.type_id) === Number(m.id))
    }));
  }, [mantenimientos, sub]);

  // ✅ ESTADÍSTICAS
  const stats = useMemo(() => {
    const total = mantenimientos.length;
    const activos = mantenimientos.filter(m => Number(m.is_active) === 1).length;
    const conBase = mantenimientos.filter(m => m.mantenimiento_id && String(m.mantenimiento_id).trim() !== "").length;
    const totalSubs = sub.length;

    return { total, activos, conBase, totalSubs };
  }, [mantenimientos, sub]);

  const toggleExpand = (id) => setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // ================= OPENERS =================
  function openNewMant() {
    setForm({
      name: "",
      description: "",
      is_active: true,
      type_id: "",
      resumen: false,
      mantenimiento_ids: []
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
      mantenimiento_ids: parseIdsFromCommaText(m.mantenimiento_id)
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
      mantenimiento_ids: []
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
      mantenimiento_ids: []
    });
    setDialog({ open: true, mode: "edit-sub", item });
  }

  // ================= SAVE =================
  async function save() {
    if (!String(form.name || "").trim()) {
      toast.warning("Ingrese nombre");
      return;
    }

    try {
      const mantenimiento_id = form.resumen ? idsToCommaText(form.mantenimiento_ids) : null;

      if (dialog.mode === "create-mant") {
        const res = await fetch("/api/mantenimiento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            is_active: form.is_active ? 1 : 0,
            mantenimiento_id
          })
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
            mantenimiento_id
          })
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
            description: form.description
          })
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
            description: form.description
          })
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

  // ================= DELETE =================
  function askDeleteMant(m) {
    setDeleteDialog({ open: true, type: "mant", item: m });
  }

  function askDeleteSub(item) {
    setDeleteDialog({ open: true, type: "sub", item });
  }

  async function confirmDelete() {
    try {
      if (deleteDialog.type === "mant") {
        const res = await fetch(`/api/mantenimiento/${deleteDialog.item.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(await res.text());
        toast.success("Mantenimiento eliminado");
      }

      if (deleteDialog.type === "sub") {
        const res = await fetch(`/api/submantenimiento/${deleteDialog.item.id}`, { method: "DELETE" });
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

  // ================= TOGGLE ACTIVO =================
  async function toggleMantActive(m, value) {
    try {
      const res = await fetch(`/api/mantenimiento/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: m.name,
          description: m.description,
          is_active: value ? 1 : 0,
          mantenimiento_id: m.mantenimiento_id ?? null
        })
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
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-[#5d16ec] rounded-lg shadow-md">
              <Wrench className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Mantenimientos
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona mantenimientos y submantenimientos
              </p>
            </div>
          </div>

          {/* ESTADÍSTICAS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ borderColor: `${BRAND_PRIMARY}30`, backgroundColor: `${BRAND_PRIMARY}08` }}>
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

            <div className="p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ borderColor: '#10b98140', backgroundColor: '#10b98110' }}>
              <div className="flex items-center gap-2 mb-1">
                <Activity size={16} style={{ color: '#059669' }} />
                <p className="text-xs sm:text-sm font-medium" style={{ color: '#059669' }}>
                  Activos
                </p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#059669' }}>
                {stats.activos}
              </p>
            </div>

            <div className="p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ borderColor: '#f59e0b40', backgroundColor: '#f59e0b10' }}>
              <div className="flex items-center gap-2 mb-1">
                <Zap size={16} style={{ color: '#d97706' }} />
                <p className="text-xs sm:text-sm font-medium" style={{ color: '#d97706' }}>
                  Con base
                </p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#d97706' }}>
                {stats.conBase}
              </p>
            </div>

            <div className="p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ borderColor: '#3b82f640', backgroundColor: '#3b82f610' }}>
              <div className="flex items-center gap-2 mb-1">
                <ListChecks size={16} style={{ color: '#2563eb' }} />
                <p className="text-xs sm:text-sm font-medium" style={{ color: '#2563eb' }}>
                  Subs
                </p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold" style={{ color: '#2563eb' }}>
                {stats.totalSubs}
              </p>
            </div>
          </div>
        </div>

        {/* HEADER CON BOTÓN */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
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
            <TooltipContent side="top" className="text-xs">Crear nuevo mantenimiento</TooltipContent>
          </Tooltip>
        </div>

        {/* LISTA */}
        <div className="border rounded-lg overflow-hidden bg-white">
          {grouped.map((m, idx) => (
            <div key={m.id} className={idx !== grouped.length - 1 ? "border-b" : ""}>
              
              {/* MANTENIMIENTO */}
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-slate-50 transition-colors ${
                Number(m.is_active) === 0 ? "opacity-60" : ""
              }`}>
                
                <div 
                  className="flex items-center gap-2 sm:gap-3 flex-1 cursor-pointer w-full sm:w-auto"
                  onClick={() => toggleExpand(m.id)}
                >
                  {expanded[m.id] ? 
                    <ChevronDown size={18} className="flex-shrink-0" style={{ color: BRAND_PRIMARY }} /> : 
                    <ChevronRight size={18} className="flex-shrink-0 text-gray-400" />
                  }
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base" style={{ color: BRAND_PRIMARY }}>
                      {m.name}
                    </p>
                    <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                      {m.items.length} submantenimiento(s)
                    </p>
                  </div>

                  {m.mantenimiento_id && String(m.mantenimiento_id).trim() !== "" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold flex-shrink-0 cursor-help text-white" style={{ backgroundColor: BRAND_PRIMARY }}>
                          Con base
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Mantenimiento base: {m.mantenimiento_id}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <div className="flex gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-gray-100 rounded-lg flex-shrink-0">
                        <Switch 
                          checked={Number(m.is_active) === 1} 
                          onCheckedChange={(v) => toggleMantActive(m, v)}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {Number(m.is_active) === 1 ? "Desactivar" : "Activar"}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => openEditMant(m)}
                      >
                        <Pencil size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Editar</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => askDeleteMant(m)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Eliminar</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        className="h-8 px-2 text-white text-xs gap-1 flex-shrink-0"
                        style={{ backgroundColor: BRAND_PRIMARY }}
                        onClick={() => {
                          openNewSub(m.id);
                          setExpanded((p) => ({ ...p, [m.id]: true }));
                        }}
                      >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Sub</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">Agregar sub</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* SUBMANTENIMIENTOS */}
              {expanded[m.id] && (
                <div className="bg-slate-50 border-t p-3 sm:p-4 space-y-2" style={{ borderTopColor: `${BRAND_PRIMARY}20` }}>
                  {m.items.length === 0 ? (
                    <p className="text-xs sm:text-sm text-center py-6 sm:py-8" style={{ color: BRAND_SECONDARY }}>
                      Sin submantenimientos
                    </p>
                  ) : (
                    m.items.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border rounded-lg px-2 sm:px-3 py-2 sm:py-3 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 pl-6 sm:pl-8 min-w-0">
                          <p className="font-medium text-sm" style={{ color: BRAND_PRIMARY }}>
                            {item.name}
                          </p>
                          {item.description && (
                            <p className="text-xs mt-0.5" style={{ color: BRAND_SECONDARY }}>
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => openEditSub(item)}
                              >
                                <Pencil size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">Editar</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => askDeleteSub(item)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">Eliminar</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}

          {grouped.length === 0 && (
            <div className="text-center py-8 sm:py-12">
              <Wrench size={36} className="mx-auto mb-2 opacity-30" style={{ color: BRAND_SECONDARY }} />
              <p className="text-sm" style={{ color: BRAND_SECONDARY }}>
                No hay mantenimientos
              </p>
            </div>
          )}
        </div>

        {/* FORM DIALOG */}
        <Dialog open={dialog.open} onOpenChange={(v) => setDialog((p) => ({ ...p, open: v }))}>
          <DialogContent className="max-w-2xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col">
            <DialogHeader className="pb-3 sm:pb-4 border-b flex-shrink-0" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                  <Wrench size={20} style={{ color: BRAND_PRIMARY }} />
                </div>
                <DialogTitle className="text-base sm:text-xl" style={{ color: BRAND_PRIMARY }}>
                  {dialog.mode === "create-mant"
                    ? "Nuevo mantenimiento"
                    : dialog.mode === "edit-mant"
                    ? "Editar mantenimiento"
                    : dialog.mode === "create-sub"
                    ? "Nuevo submantenimiento"
                    : "Editar submantenimiento"}
                </DialogTitle>
              </div>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                save();
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <div className="space-y-3 sm:space-y-4 py-3 sm:py-4 px-3 sm:px-6 overflow-y-auto flex-1">
                
                {/* Sección 1: Información */}
                <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                  <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                    <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>1</span>
                    <span>Información</span>
                  </h3>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                      Nombre
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ej: Cambio de aceite"
                      className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                      Descripción
                    </Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Descripción detallada..."
                      className="min-h-20 sm:min-h-24 resize-none text-xs sm:text-sm border-gray-300"
                    />
                  </div>
                </div>

                {/* Sección 2: Padre (solo para sub) */}
                {(dialog.mode === "create-sub" || dialog.mode === "edit-sub") && (
                  <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                    <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                      <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>2</span>
                      <span>Relación</span>
                    </h3>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                        Mantenimiento padre
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={String(form.type_id || "")}
                        onValueChange={(v) => setForm((p) => ({ ...p, type_id: v }))}
                      >
                        <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300">
                          <SelectValue placeholder="Seleccione mantenimiento" />
                        </SelectTrigger>
                        <SelectContent>
                          {mantenimientos.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)} className="text-xs sm:text-sm">
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Sección 3: Opciones */}
                <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                  <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                    <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>3</span>
                    <span>Opciones</span>
                  </h3>

                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg border-2" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                    />
                    <div>
                      <p className="font-medium text-xs sm:text-sm" style={{ color: BRAND_PRIMARY }}>
                        Activo
                      </p>
                      <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                        {form.is_active ? "Visible en el sistema" : "Oculto"}
                      </p>
                    </div>
                  </div>

                  {/* Mantenimiento base (solo crear/editar mantenimiento) */}
                  {(dialog.mode === "create-mant" || dialog.mode === "edit-mant") && (
                    <>
                      <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg border-2" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
                        <Switch
                          checked={form.resumen}
                          onCheckedChange={(v) =>
                            setForm((p) => ({
                              ...p,
                              resumen: v,
                              mantenimiento_ids: v ? p.mantenimiento_ids : []
                            }))
                          }
                        />
                        <div className="flex-1">
                          <p className="font-medium text-xs sm:text-sm flex items-center gap-1" style={{ color: BRAND_PRIMARY }}>
                            Mantenimiento base
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle size={14} className="cursor-help opacity-60 flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Este mantenimiento es la suma de otros
                              </TooltipContent>
                            </Tooltip>
                          </p>
                          <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                            {form.resumen ? "Activo" : "Inactivo"}
                          </p>
                        </div>
                      </div>

                      {form.resumen && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                            Mantenimientos que suma
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle size={14} className="cursor-help opacity-60 flex-shrink-0" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Selecciona los mantenimientos que forman parte de este
                              </TooltipContent>
                            </Tooltip>
                          </Label>
                          <MultiMantenimientoSelector
                            allItems={mantenimientos}
                            selectedIds={form.mantenimiento_ids}
                            excludeId={dialog.item?.id}
                            onChange={(ids) => setForm((p) => ({ ...p, mantenimiento_ids: ids }))}
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

              </div>

              <DialogFooter className="border-t flex-shrink-0 pt-3 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-4 flex flex-col-reverse sm:flex-row gap-2 justify-end" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialog({ open: false, mode: "create-mant", item: null })}
                  className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="h-8 sm:h-9 text-xs sm:text-sm text-white w-full sm:w-auto"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                >
                  Guardar cambios
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DELETE DIALOG */}
        <Dialog open={deleteDialog.open} onOpenChange={(v) => !v && setDeleteDialog({ open: false, type: null, item: null })}>
          <DialogContent className="max-w-md w-full">
            <DialogHeader>
              <DialogTitle style={{ color: BRAND_PRIMARY }}>
                Confirmar eliminación
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-xs sm:text-sm" style={{ color: BRAND_SECONDARY }}>
                {deleteDialog.type === "mant"
                  ? `¿Eliminar el mantenimiento "${deleteDialog.item?.name}"?`
                  : `¿Eliminar el submantenimiento "${deleteDialog.item?.name}"?`}
              </p>
              
              {deleteDialog.type === "mant" && (
                <div className="p-2 sm:p-3 rounded-lg border-2 flex gap-2" style={{ backgroundColor: '#fef3c710', borderColor: '#fef3c730' }}>
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: '#b45309' }} />
                  <p className="text-xs" style={{ color: '#92400e' }}>
                    Todos los submantenimientos asociados también serán eliminados
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialog({ open: false, type: null, item: null })}
                className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDelete}
                className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
}