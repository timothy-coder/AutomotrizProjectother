"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

export default function ComboMantenimientoPage() {
  const { permissions } = useAuth();

  const permView = hasPermission(permissions, "combomantenimiento", "view");
  const permCreate = hasPermission(permissions, "combomantenimiento", "create");
  const permEdit = hasPermission(permissions, "combomantenimiento", "edit");
  const permDelete = hasPermission(permissions, "combomantenimiento", "delete");

  const [mantenimientos, setMantenimientos] = useState([]);
  const [sub, setSub] = useState([]);
  const [expanded, setExpanded] = useState({});

  const [dialog, setDialog] = useState({
    open: false,
    mode: "create-sub",
    item: null
  });

  const [form, setForm] = useState({
    name: "",
    type_id: "",
    is_active: true,
    description: ""
  });

  const [cascadeDialog, setCascadeDialog] = useState({
    open: false,
    mantenimiento: null
  });

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    type: null,
    item: null
  });

  async function loadData() {
    const m = await fetch("/api/mantenimiento", { cache: "no-store" }).then(r => r.json());
    const s = await fetch("/api/submantenimiento", { cache: "no-store" }).then(r => r.json());
    setMantenimientos(m);
    setSub(s);
  }

  useEffect(() => {
    loadData();
  }, []);

  if (!permView) return <p>Sin permiso</p>;

  const grouped = mantenimientos.map(m => ({
    ...m,
    items: sub.filter(s => s.type_id === m.id)
  }));

  const toggleExpand = id => {
    setExpanded(p => ({ ...p, [id]: !p[id] }));
  };

  // ================= SAVE =================
  async function save() {
    if (!form.name.trim()) {
      toast.warning("Ingrese nombre");
      return;
    }

    try {
      if (dialog.mode === "create-mant") {
        await fetch("/api/mantenimiento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            is_active: form.is_active ? 1 : 0
          })
        });
        toast.success("Creado");
      }

      if (dialog.mode === "edit-mant") {
        await fetch(`/api/mantenimiento/${dialog.item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            description: form.description,
            is_active: form.is_active ? 1 : 0
          })
        });
        toast.success("Actualizado");
      }

      if (dialog.mode === "create-sub") {
        await fetch("/api/submantenimiento", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            type_id: Number(form.type_id),
            is_active: form.is_active ? 1 : 0,
            description: form.description
          })
        });
        toast.success("Sub creado");
      }

      if (dialog.mode === "edit-sub") {
        await fetch(`/api/submantenimiento/${dialog.item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            type_id: Number(form.type_id),
            is_active: form.is_active ? 1 : 0,
            description: form.description
          })
        });
        toast.success("Sub actualizado");
      }

      setDialog({ open: false, mode: "create-sub", item: null });
      loadData();
    } catch {
      toast.error("Error al guardar");
    }
  }

  // ================= DELETE =================
  function removeMant(m) {
    setDeleteDialog({ open: true, type: "mant", item: m });
  }

  function removeSub(item) {
    setDeleteDialog({ open: true, type: "sub", item });
  }

  async function confirmDelete() {
    try {
      if (deleteDialog.type === "mant") {
        await fetch(`/api/mantenimiento/${deleteDialog.item.id}`, { method: "DELETE" });
        toast.success("Mantenimiento eliminado");
      }

      if (deleteDialog.type === "sub") {
        await fetch(`/api/submantenimiento/${deleteDialog.item.id}`, { method: "DELETE" });
        toast.success("Sub eliminado");
      }

      setDeleteDialog({ open: false, type: null, item: null });
      loadData();
    } catch {
      toast.error("No se pudo eliminar");
    }
  }

  // ================= SWITCH =================
  async function toggleSubActive(item, value) {
    await fetch(`/api/submantenimiento/${item.id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: value ? 1 : 0 })
    });

    setSub(prev => prev.map(s => (s.id === item.id ? { ...s, is_active: value ? 1 : 0 } : s)));
  }

  async function requestToggleMant(m, value) {
    const childs = sub.filter(s => s.type_id === m.id);
    if (!value && childs.length > 0) {
      setCascadeDialog({ open: true, mantenimiento: m });
      return;
    }
    toggleMantActive(m, value, false);
  }

  async function toggleMantActive(m, value, cascade) {
    await fetch(`/api/mantenimiento/${m.id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: value ? 1 : 0 })
    });

    if (cascade) {
      await fetch(`/api/submantenimiento/toggle-by-type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type_id: m.id, is_active: 0 })
      });
    }

    loadData();
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Mantenimiento</h1>

        {permCreate && (
          <Button onClick={() => {
            setForm({ name: "", description: "", is_active: true });
            setDialog({ open: true, mode: "create-mant" });
          }}>
            <Plus size={16} /> Nuevo mantenimiento
          </Button>
        )}
      </div>

      {/* LISTA */}
      <div className="border rounded-md overflow-hidden">
        {grouped.map(m => (
          <div key={m.id} className="border-b">
            <div className="flex justify-between p-3 bg-muted">
              <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleExpand(m.id)}>
                {expanded[m.id] ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                <span className="font-medium">{m.name}</span>
                <span className="text-xs text-muted-foreground">({m.items.length})</span>
              </div>

              <div className="flex gap-2 items-center">
                <Switch checked={m.is_active === 1} onCheckedChange={v => requestToggleMant(m, v)} />

                {permEdit && (
                  <Button size="sm" variant="ghost" onClick={() => {
                    setForm({ name: m.name, description: m.description, is_active: m.is_active === 1 });
                    setDialog({ open: true, mode: "edit-mant", item: m });
                  }}>
                    <Pencil size={16} />
                  </Button>
                )}

                {permDelete && (
                  <Button size="sm" variant="destructive" onClick={() => removeMant(m)}>
                    <Trash2 size={16} />
                  </Button>
                )}

                {permCreate && (
                  <Button size="sm" variant="outline" onClick={() => {
                    setForm({ name: "", type_id: String(m.id), is_active: true });
                    setDialog({ open: true, mode: "create-sub" });
                    setExpanded(p => ({ ...p, [m.id]: true }));
                  }}>
                    <Plus size={14} /> Sub
                  </Button>
                )}
              </div>
            </div>

            {expanded[m.id] && (
              <div className="p-3 space-y-2">
                {m.items.map(item => (
                  <div key={item.id} className="flex justify-between border rounded-md px-3 py-2">
                    <div className="flex gap-3 items-center">
                      {item.name}
                    </div>

                    <div className="flex gap-2 items-center">
                      <Switch checked={item.is_active === 1} onCheckedChange={v => toggleSubActive(item, v)} />
                      <Button size="sm" variant="ghost" onClick={() => {
                        setForm({
                          name: item.name,
                          type_id: String(item.type_id),
                          is_active: item.is_active === 1,
                          description: item.description
                        });
                        setDialog({ open: true, mode: "edit-sub", item });
                      }}>
                        <Pencil size={16} />
                      </Button>

                      <Button size="sm" variant="destructive" onClick={() => removeSub(item)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* FORM DIALOG */}
      <Dialog open={dialog.open} onOpenChange={v => setDialog(p => ({ ...p, open: v }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <Label>Nombre</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            {dialog.mode?.includes("sub") && (
              <div>
                <Label>Mantenimiento</Label>
                <Select value={String(form.type_id || "")} onValueChange={v => setForm(p => ({ ...p, type_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                  <SelectContent>
                    {mantenimientos.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Descripción</Label>
              <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="flex gap-2 items-center">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))} />
              <Label>Activo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, mode: "create-sub", item: null })}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialog.open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {deleteDialog.type === "mant"
              ? "Se eliminará el mantenimiento y sus submantenimientos."
              : "Se eliminará el submantenimiento."}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false })}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CASCADE */}
      <Dialog open={cascadeDialog.open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desactivar mantenimiento</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Desactivar también los submantenimientos?
          </p>
          <DialogFooter>
            <Button variant="outline"
              onClick={() => {
                toggleMantActive(cascadeDialog.mantenimiento, false, false);
                setCascadeDialog({ open: false });
              }}>
              Solo mantenimiento
            </Button>
            <Button
              onClick={() => {
                toggleMantActive(cascadeDialog.mantenimiento, false, true);
                setCascadeDialog({ open: false });
              }}>
              Desactivar todo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
