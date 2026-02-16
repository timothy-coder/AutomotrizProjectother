"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";

import {
  Pencil, Trash2, Plus, ChevronDown, ChevronRight
} from "lucide-react";

export default function MotivosTab() {

  const [motivos, setMotivos] = useState([]);
  const [subs, setSubs] = useState([]);
  const [expanded, setExpanded] = useState({});

  const [loading, setLoading] = useState(false);

  const [dialogMotivo, setDialogMotivo] = useState(false);
  const [dialogSub, setDialogSub] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const [editingMotivo, setEditingMotivo] = useState(null);
  const [editingSub, setEditingSub] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [nombre, setNombre] = useState("");

  // ================= LOAD =================
  async function load() {
    setLoading(true);
    try {
      const m = await fetch("/api/motivos_citas").then(r => r.json());
      const s = await fetch("/api/submotivos-citas").then(r => r.json());
      setMotivos(m);
      setSubs(s);
    } catch {
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const grouped = motivos.map(m => ({
    ...m,
    subs: subs.filter(s => s.motivo_id === m.id)
  }));

  const toggleExpand = id =>
    setExpanded(p => ({ ...p, [id]: !p[id] }));

  // ================= MOTIVOS =================
  function openCreateMotivo() {
    setEditingMotivo(null);
    setNombre("");
    setDialogMotivo(true);
  }

  function openEditMotivo(m) {
    setEditingMotivo(m);
    setNombre(m.nombre);
    setDialogMotivo(true);
  }

  async function saveMotivo() {
    if (!nombre.trim()) return toast.warning("Ingrese nombre");

    const url = editingMotivo
      ? `/api/motivos_citas/${editingMotivo.id}`
      : `/api/motivos_citas`;

    const method = editingMotivo ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre })
    });

    toast.success(editingMotivo ? "Actualizado" : "Creado");
    setDialogMotivo(false);
    load();
  }

  // ================= SUBMOTIVOS =================
  function openCreateSub(motivo) {
    setEditingSub({ motivo_id: motivo.id });
    setNombre("");
    setDialogSub(true);
  }

  function openEditSub(s) {
    setEditingSub(s);
    setNombre(s.nombre);
    setDialogSub(true);
  }

  async function saveSub() {
    if (!nombre.trim()) return;

    const body = {
      motivo_id: editingSub.motivo_id,
      nombre,
      is_active: editingSub.is_active ?? 1
    };

    const url = editingSub.id
      ? `/api/submotivos-citas/${editingSub.id}`
      : `/api/submotivos-citas`;

    const method = editingSub.id ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    toast.success("Guardado");
    setDialogSub(false);
    load();
  }

 

  // ================= DELETE =================
  function openDelete(target) {
    setDeleteTarget(target);
    setDeleteDialog(true);
  }

  async function confirmDelete() {
    const isSub = deleteTarget.motivo_id;

    const url = isSub
      ? `/api/submotivos-citas/${deleteTarget.id}`
      : `/api/motivos_citas/${deleteTarget.id}`;

    await fetch(url, { method: "DELETE" });

    toast.success("Eliminado");
    setDeleteDialog(false);
    load();
  }

  // ================= UI =================
  return (
    <div className="space-y-4">

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Motivos de citas</h2>
        <Button onClick={openCreateMotivo}>
          <Plus className="h-4 w-4 mr-2" /> Nuevo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista</CardTitle>
        </CardHeader>

        <CardContent className="space-y-2">

          {grouped.map(m => (
            <div key={m.id} className="border rounded-md">

              {/* HEADER */}
              <div className="flex justify-between items-center p-3 bg-muted">
                <div
                  className="flex items-center gap-2 cursor-pointer"
                  onClick={() => toggleExpand(m.id)}
                >
                  {expanded[m.id]
                    ? <ChevronDown size={18} />
                    : <ChevronRight size={18} />}
                  <span className="font-medium">{m.nombre}</span>
                  <span className="text-xs text-muted-foreground">
                    ({m.subs.length})
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline"
                    onClick={() => openCreateSub(m)}>
                    <Plus size={14}/> Sub
                  </Button>

                  <Button size="icon" variant="outline"
                    onClick={() => openEditMotivo(m)}>
                    <Pencil size={16}/>
                  </Button>

                  <Button size="icon" variant="destructive"
                    onClick={() => openDelete(m)}>
                    <Trash2 size={16}/>
                  </Button>
                </div>
              </div>

              {/* SUBS */}
              {expanded[m.id] && (
                <div className="p-3 space-y-2">
                  {m.subs.map(s => (
                    <div key={s.id}
                      className="flex justify-between items-center border rounded-md px-3 py-2">

                      <div className="flex items-center gap-3">
                        
                        {s.nombre}
                      </div>

                      <div className="flex gap-2">
                        <Button size="icon" variant="outline"
                          onClick={() => openEditSub(s)}>
                          <Pencil size={16}/>
                        </Button>
                        <Button size="icon" variant="destructive"
                          onClick={() => openDelete(s)}>
                          <Trash2 size={16}/>
                        </Button>
                      </div>

                    </div>
                  ))}
                </div>
              )}

            </div>
          ))}

        </CardContent>
      </Card>

      {/* DIALOG MOTIVO */}
      <Dialog open={dialogMotivo} onOpenChange={setDialogMotivo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMotivo ? "Editar motivo" : "Nuevo motivo"}
            </DialogTitle>
          </DialogHeader>

          <Input value={nombre} onChange={e => setNombre(e.target.value)} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMotivo(false)}>Cancelar</Button>
            <Button onClick={saveMotivo}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG SUB */}
      <Dialog open={dialogSub} onOpenChange={setDialogSub}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submotivo</DialogTitle>
          </DialogHeader>

          <Input value={nombre} onChange={e => setNombre(e.target.value)} />

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogSub(false)}>Cancelar</Button>
            <Button onClick={saveSub}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>

          <p>¿Eliminar <b>{deleteTarget?.nombre}</b>?</p>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
