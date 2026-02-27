"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input"; // Aquí importamos Textarea

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

/** ✅ MultiSelect buscable tipo shadcn Command
 *  - abre solo al click
 *  - muestra tags con X
 *  - guarda ids (number[])
 */
function MultiMantenimientoSelector({
  allItems = [],
  selectedIds = [],
  onChange,
  disabled,
  excludeId, // opcional: evitar seleccionar el mismo mantenimiento
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
      {/* “Input” clickable con tags dentro */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={`w-full text-left border rounded-md px-2 py-2 min-h-[44px] flex flex-wrap gap-2 items-center ${
              disabled ? "opacity-50 cursor-not-allowed" : "cursor-text"
            }`}
          >
            {selected.length === 0 ? (
              <span className="text-sm text-muted-foreground">
                Click para buscar y seleccionar mantenimientos...
              </span>
            ) : (
              selected.map((it) => (
                <span
                  key={it.id}
                  className="flex items-center gap-1 bg-primary text-primary-foreground rounded-md px-2 py-1 text-xs"
                >
                  {it.name}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 text-sm leading-none"
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
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">{m.name}</span>
                      {isSelected ? <Check className="h-4 w-4" /> : null}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* texto “real” que se guardará */}
      <div className="text-xs text-muted-foreground">
        Se guarda como: <span className="font-mono">{idsToCommaText(selectedIds)}</span>
      </div>
    </div>
  );
}

export default function ComboMantenimientoPage() {
  // ================= STATE =================
  const [mantenimientos, setMantenimientos] = useState([]);
  const [sub, setSub] = useState([]);
  const [expanded, setExpanded] = useState({});

  // dialog principal (mantenimiento / sub)
  const [dialog, setDialog] = useState({
    open: false,
    mode: "create-mant", // create-mant | edit-mant | create-sub | edit-sub
    item: null
  });

  const [form, setForm] = useState({
    // comunes
    name: "",
    description: "",
    is_active: true,

    // sub
    type_id: "",

    // ✅ resumen (solo mantenimiento)
    resumen: false,
    mantenimiento_ids: [] // number[]
  });

  // delete
  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: null, // mant | sub
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
      // ✅ mantenimiento_id SOLO si resumen está activo
      const mantenimiento_id = form.resumen ? idsToCommaText(form.mantenimiento_ids) : null;

      // ----- MANTENIMIENTO -----
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

      // ----- SUBMANTENIMIENTO -----
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

  // ================= TOGGLE ACTIVO (SOLO MANTENIMIENTO) =================
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
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Mantenimiento</h1>

        <Button onClick={openNewMant}>
          <Plus size={16} /> Nuevo mantenimiento
        </Button>
      </div>

      {/* LISTA */}
      <div className="border rounded-md overflow-hidden">
        {grouped.map((m) => (
          <div key={m.id} className="border-b">
            <div className="flex justify-between p-3 bg-muted">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleExpand(m.id)}>
                {expanded[m.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">({m.items.length})</span>

                {m.mantenimiento_id && String(m.mantenimiento_id).trim() !== "" && (
                  <span className="ml-2 text-[11px] px-2 py-0.5 rounded bg-primary text-primary-foreground">
                    Con mantenimiento base
                  </span>
                )}
              </div>

              <div className="flex gap-2 items-center">
                {/* ✅ switch SOLO para mantenimiento */}
                <Switch checked={Number(m.is_active) === 1} onCheckedChange={(v) => toggleMantActive(m, v)} />

                <Button size="sm" variant="ghost" onClick={() => openEditMant(m)}>
                  <Pencil size={16} />
                </Button>

                <Button size="sm" variant="destructive" onClick={() => askDeleteMant(m)}>
                  <Trash2 size={16} />
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    openNewSub(m.id);
                    setExpanded((p) => ({ ...p, [m.id]: true }));
                  }}
                >
                  <Plus size={14} /> Sub mantenimiento
                </Button>
              </div>
            </div>

            {/* SUB LIST */}
            {expanded[m.id] && (
              <div className="p-3 space-y-2">
                {m.items.map((item) => (
                  <div key={item.id} className="flex justify-between border rounded-md px-3 py-2">
                    <div className="flex gap-3 items-center">{item.name}</div>

                    <div className="flex gap-2 items-center">
                      {/* ✅ sin switch para submantenimiento */}
                      <Button size="sm" variant="ghost" onClick={() => openEditSub(item)}>
                        <Pencil size={16} />
                      </Button>

                      <Button size="sm" variant="destructive" onClick={() => askDeleteSub(item)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}

                {m.items.length === 0 && (
                  <p className="text-sm text-muted-foreground">Sin submantenimientos</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FORM DIALOG */}
      <Dialog open={dialog.open} onOpenChange={(v) => setDialog((p) => ({ ...p, open: v }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode === "create-mant"
                ? "Nuevo mantenimiento"
                : dialog.mode === "edit-mant"
                ? "Editar mantenimiento"
                : dialog.mode === "create-sub"
                ? "Nuevo submantenimiento"
                : "Editar submantenimiento"}
            </DialogTitle>
          </DialogHeader>

          {/* ✅ Enter = Guardar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              save();
            }}
          >
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>

              {(dialog.mode === "create-sub" || dialog.mode === "edit-sub") && (
                <div>
                  <Label>Mantenimiento padre</Label>
                  <Select
                    value={String(form.type_id || "")}
                    onValueChange={(v) => setForm((p) => ({ ...p, type_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione" />
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
              )}

              <div>
                <Label>Descripción</Label>
                <Textarea
                className="overflow-y-auto"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </div>

              <div className="flex gap-2 items-center">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                />
                <Label>Activo</Label>
              </div>

              {/* ✅ SOLO MANTENIMIENTO: switch resumen */}
              {(dialog.mode === "create-mant" || dialog.mode === "edit-mant") && (
                <>
                  <div className="flex gap-2 items-center">
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
                    <Label>Mantenimiento base</Label>
                  </div>

                  {/* ✅ MULTI SELECT SOLO cuando resumen=true */}
                  {form.resumen && (
                    <div>
                      <Label>Mantenimientos que suma</Label>
                      <MultiMantenimientoSelector
                        allItems={mantenimientos}
                        selectedIds={form.mantenimiento_ids}
                        excludeId={dialog.item?.id} // opcional: evita seleccionarse a sí mismo
                        onChange={(ids) => setForm((p) => ({ ...p, mantenimiento_ids: ids }))}
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialog({ open: false, mode: "create-mant", item: null })}
              >
                Cancelar
              </Button>
              <Button type="submit">Guardar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialog.open} onOpenChange={(v) => !v && setDeleteDialog({ open: false, type: null, item: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {deleteDialog.type === "mant"
              ? `¿Eliminar el mantenimiento "${deleteDialog.item?.name}"?`
              : `¿Eliminar el submantenimiento "${deleteDialog.item?.name}"?`}
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, type: null, item: null })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
