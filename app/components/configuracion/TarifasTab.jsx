"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Pencil, Trash2, Plus, AlertTriangle, Loader2 } from "lucide-react";

function formatCurrency(v) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v || 0);
}

export default function TarifasTab({ tipo }) {
  const label = tipo === "mano_obra" ? "Mano de Obra" : "Paños";

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [nombre, setNombre] = useState("");
  const [precioHora, setPrecioHora] = useState("");
  const [activo, setActivo] = useState(true);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/cotizacion-tarifas?tipo=${tipo}`, { cache: "no-store" });
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error(`Error cargando tarifas de ${label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tipo]);

  function openCreate() {
    setEditing(null);
    setNombre("");
    setPrecioHora("");
    setActivo(true);
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setNombre(item.nombre);
    setPrecioHora(String(item.precio_hora));
    setActivo(item.activo === 1 || item.activo === true);
    setDialogOpen(true);
  }

  async function save() {
    if (!nombre.trim()) return toast.warning("Ingrese un nombre");
    if (!precioHora || Number(precioHora) <= 0) return toast.warning("Ingrese un precio válido");

    try {
      const payload = {
        tipo,
        nombre: nombre.trim(),
        precio_hora: Number(precioHora),
        activo: activo ? 1 : 0,
      };

      const url = editing
        ? `/api/cotizacion-tarifas/${editing.id}`
        : "/api/cotizacion-tarifas";
      const method = editing ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json();
      if (!r.ok) {
        toast.error(data.message || "Error al guardar");
        return;
      }

      toast.success(editing ? "Tarifa actualizada" : "Tarifa creada");
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Error de conexión");
    }
  }

  function openDelete(item) {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/cotizacion-tarifas/${deleteTarget.id}`, { method: "DELETE" });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.message || "Error al eliminar");
        return;
      }
      toast.success("Tarifa eliminada");
      setDeleteOpen(false);
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Tarifas de {label}</h3>
          <p className="text-sm text-muted-foreground">
            Configure las tarifas por hora para {label.toLowerCase()} que se usarán en cotizaciones
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="w-4 h-4 mr-2" /> Nueva tarifa
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No hay tarifas configuradas. Haga clic en &quot;Nueva tarifa&quot; para crear una.
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead className="text-right">Precio/hora</TableHead>
                <TableHead className="text-center">Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.nombre}</TableCell>
                  <TableCell className="text-right">{item.precio_hora}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.activo ? "default" : "secondary"}>
                      {item.activo ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDelete(item)}
                        className="text-red-500 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar" : "Nueva"} tarifa de {label.toLowerCase()}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre *</Label>
              <Input
                placeholder={`Ej: {tipo === "mano_obra" ? "Mano de obra estándar" : "Paños básicos"}`}
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Precio por hora *</Label>
              <Input
                type="number" min={0} step="0.01"
                placeholder="0.00"
                value={precioHora}
                onChange={(e) => setPrecioHora(e.target.value)}
              />
            </div>
            {editing && (
              <div className="flex items-center gap-3">
                <Switch checked={activo} onCheckedChange={setActivo} />
                <Label>Tarifa activa</Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>{editing ? "Actualizar" : "Crear"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Eliminar tarifa
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Estás seguro de que deseas eliminar la tarifa <strong>&quot;{deleteTarget?.nombre}&quot;</strong>?
            No se podrá eliminar si está siendo usada en alguna cotización.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
