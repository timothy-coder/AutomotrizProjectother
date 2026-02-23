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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TipoInventarioTab() {
  const { permissions } = useAuth();

  const permView = hasPermission(permissions, "configuracion", "view");
  const permCreate = hasPermission(permissions, "configuracion", "create");
  const permEdit = hasPermission(permissions, "configuracion", "edit");
  const permDelete = hasPermission(permissions, "configuracion", "delete");

  const [tipos, setTipos] = useState([]);
  const [tab, setTab] = useState("lista");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    description: "",
    is_active: true
  });

  async function loadTipos() {
    const res = await fetch("/api/tipo-inventario");
    const data = await res.json();
    setTipos(data);
  }

  useEffect(() => {
    loadTipos();
  }, []);

  if (!permView) return <p>Sin permiso</p>;

  function openDialog() {
    setEditItem(null);
    setForm({ nombre: "", description: "", is_active: true });
    setDialogOpen(true);
  }

  function editTipo(item) {
    setEditItem(item);
    setForm({
      nombre: item.nombre,
      description: item.description,
      is_active: item.is_active === 1
    });
    setDialogOpen(true);
  }

  async function save() {
    if (!form.nombre.trim()) {
      toast.warning("Ingrese nombre");
      return;
    }

    try {
      if (editItem) {
        await fetch(`/api/tipo-inventario/${editItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        toast.success("Tipo actualizado");
      } else {
        await fetch("/api/tipo-inventario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form)
        });
        toast.success("Tipo creado");
      }
      loadTipos();
      setDialogOpen(false);
    } catch {
      toast.error("Error guardando");
    }
  }

  async function deleteTipo(id) {
    if (confirm("¿Eliminar este tipo de inventario?")) {
      try {
        await fetch(`/api/tipo-inventario/${id}`, { method: "DELETE" });
        toast.success("Tipo eliminado");
        loadTipos();
      } catch {
        toast.error("Error eliminando");
      }
    }
  }

  return (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
          

          {permCreate && (
            <Button size="sm" onClick={openDialog}>
              <Plus className="w-4 h-4 mr-1" />
              Nuevo
            </Button>
          )}
        </div>

          <Card>
            <CardContent className="p-0">
              {tipos.map((t) => (
                <div
                  key={t.id}
                  className="flex justify-between items-center border-b px-4 py-3 hover:bg-muted/40"
                >
                  <span className="font-medium">{t.nombre}</span>
                  <div className="flex gap-2">
                    {permEdit && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => editTipo(t)}
                      >
                        <Pencil size={18} />
                      </Button>
                    )}

                    {permDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteTipo(t.id)}
                      >
                        <Trash2 size={18} className="text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {!tipos.length && (
                <p className="p-4 text-sm text-muted-foreground">
                  No hay tipos registrados.
                </p>
              )}
            </CardContent>
          </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Editar Tipo" : "Nuevo Tipo"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              />
            </div>

          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
