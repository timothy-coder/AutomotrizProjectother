"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Check, Wrench, AlertCircle } from "lucide-react";

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
            className={`w-full text-left border rounded-lg px-3 py-2 min-h-[44px] flex flex-wrap gap-2 items-center transition-colors ${
              disabled 
                ? "opacity-50 cursor-not-allowed bg-gray-50" 
                : "cursor-text hover:border-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            }`}
          >
            {selected.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Click para buscar y seleccionar...
              </span>
            ) : (
              selected.map((it) => (
                <span
                  key={it.id}
                  className="flex items-center gap-1 bg-blue-600 text-white rounded-md px-2 py-1 text-xs font-medium"
                >
                  {it.name}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 text-sm leading-none hover:opacity-80 cursor-pointer"
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
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <span className="text-sm">{m.name}</span>
                      {isSelected ? <Check className="h-4 w-4 text-blue-600" /> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <div className="text-xs text-gray-600 bg-slate-50 p-2 rounded">
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
      <div className="space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-center px-1">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Wrench size={28} className="text-blue-600" />
              Mantenimientos
            </h1>
            <p className="text-sm text-gray-600 mt-1">Gestiona mantenimientos y submantenimientos</p>
          </div>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                onClick={openNewMant}
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                <Plus size={16} />
                Nuevo mantenimiento
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Crear nuevo mantenimiento</TooltipContent>
          </Tooltip>
        </div>

        {/* LISTA */}
        <div className="border rounded-lg overflow-hidden bg-white">
          {grouped.map((m, idx) => (
            <div key={m.id} className={idx !== grouped.length - 1 ? "border-b" : ""}>
              
              {/* MANTENIMIENTO */}
              <div className={`flex justify-between items-center p-4 hover:bg-slate-50 transition-colors ${
                Number(m.is_active) === 0 ? "opacity-60" : ""
              }`}>
                
                <div 
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => toggleExpand(m.id)}
                >
                  {expanded[m.id] ? 
                    <ChevronDown size={20} className="text-blue-600" /> : 
                    <ChevronRight size={20} className="text-gray-400" />
                  }
                  
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900">{m.name}</p>
                    <p className="text-xs text-gray-600">{m.items.length} submantenimiento(s)</p>
                  </div>

                  {m.mantenimiento_id && String(m.mantenimiento_id).trim() !== "" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-[11px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold cursor-help">
                          Con base
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Mantenimiento base: {m.mantenimiento_id}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>

                <div className="flex gap-2 items-center ml-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-lg">
                        <Switch 
                          checked={Number(m.is_active) === 1} 
                          onCheckedChange={(v) => toggleMantActive(m, v)}
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {Number(m.is_active) === 1 ? "Desactivar" : "Activar"}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="hover:bg-amber-100 hover:text-amber-700"
                        onClick={() => openEditMant(m)}
                      >
                        <Pencil size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Editar mantenimiento</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="hover:bg-red-100 hover:text-red-700"
                        onClick={() => askDeleteMant(m)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Eliminar mantenimiento</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                        onClick={() => {
                          openNewSub(m.id);
                          setExpanded((p) => ({ ...p, [m.id]: true }));
                        }}
                      >
                        <Plus size={14} />
                        <span className="hidden sm:inline">Sub</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Agregar submantenimiento</TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* SUBMANTENIMIENTOS */}
              {expanded[m.id] && (
                <div className="bg-slate-50 border-t p-4 space-y-2">
                  {m.items.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      Sin submantenimientos - Crea uno nuevo
                    </p>
                  ) : (
                    m.items.map((item) => (
                      <div 
                        key={item.id} 
                        className="flex justify-between items-center border rounded-lg px-3 py-3 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex-1 pl-8">
                          <p className="font-medium text-slate-900">{item.name}</p>
                          {item.description && (
                            <p className="text-xs text-gray-600">{item.description}</p>
                          )}
                        </div>

                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="hover:bg-amber-100 hover:text-amber-700"
                                onClick={() => openEditSub(item)}
                              >
                                <Pencil size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Editar submantenimiento</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="hover:bg-red-100 hover:text-red-700"
                                onClick={() => askDeleteSub(item)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Eliminar submantenimiento</TooltipContent>
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
            <div className="text-center py-12">
              <Wrench size={40} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-500">No hay mantenimientos</p>
            </div>
          )}
        </div>

        {/* FORM DIALOG */}
        <Dialog open={dialog.open} onOpenChange={(v) => setDialog((p) => ({ ...p, open: v }))}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader className="border-b pb-4">
              <div className="flex items-center gap-2">
                <Wrench size={24} className="text-blue-600" />
                <DialogTitle className="text-xl">
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
            >
              <div className="space-y-5 py-4">
                
                {/* Sección 1: Información */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                    Información
                  </h3>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      Nombre
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Ej: Cambio de aceite"
                      className="h-9"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descripción</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="Descripción detallada..."
                      className="min-h-24 resize-none"
                    />
                  </div>
                </div>

                {/* Sección 2: Padre (solo para sub) */}
                {(dialog.mode === "create-sub" || dialog.mode === "edit-sub") && (
                  <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                      Relación
                    </h3>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        Mantenimiento padre
                        <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={String(form.type_id || "")}
                        onValueChange={(v) => setForm((p) => ({ ...p, type_id: v }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Seleccione mantenimiento" />
                        </SelectTrigger>
                        <SelectContent>
                          {mantenimientos.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Sección 3: Opciones */}
                <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                    Opciones
                  </h3>

                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                    <Switch
                      checked={form.is_active}
                      onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                      className="data-[state=checked]:bg-green-600"
                    />
                    <div>
                      <p className="font-medium text-sm">Activo</p>
                      <p className="text-xs text-gray-600">{form.is_active ? "Visible en el sistema" : "Oculto"}</p>
                    </div>
                  </div>

                  {/* Mantenimiento base (solo crear/editar mantenimiento) */}
                  {(dialog.mode === "create-mant" || dialog.mode === "edit-mant") && (
                    <>
                      <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                        <Switch
                          checked={form.resumen}
                          onCheckedChange={(v) =>
                            setForm((p) => ({
                              ...p,
                              resumen: v,
                              mantenimiento_ids: v ? p.mantenimiento_ids : []
                            }))
                          }
                          className="data-[state=checked]:bg-blue-600"
                        />
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1">
                            Mantenimiento base
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle size={14} className="text-gray-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Este mantenimiento es la suma de otros
                              </TooltipContent>
                            </Tooltip>
                          </p>
                          <p className="text-xs text-gray-600">
                            {form.resumen ? "Activo" : "Inactivo"}
                          </p>
                        </div>
                      </div>

                      {form.resumen && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-1">
                            Mantenimientos que suma
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertCircle size={14} className="text-gray-400 cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent side="top">
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

              <DialogFooter className="border-t pt-4 flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialog({ open: false, mode: "create-mant", item: null })}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Guardar cambios
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* DELETE DIALOG */}
        <Dialog open={deleteDialog.open} onOpenChange={(v) => !v && setDeleteDialog({ open: false, type: null, item: null })}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Confirmar eliminación</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <p className="text-sm text-gray-700">
                {deleteDialog.type === "mant"
                  ? `¿Eliminar el mantenimiento "${deleteDialog.item?.name}"?`
                  : `¿Eliminar el submantenimiento "${deleteDialog.item?.name}"?`}
              </p>
              
              {deleteDialog.type === "mant" && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    Todos los submantenimientos asociados también serán eliminados
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDeleteDialog({ open: false, type: null, item: null })}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={confirmDelete}
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