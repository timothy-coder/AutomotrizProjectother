"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { Plus, Pencil, Trash2, Info } from "lucide-react";

import TipoInventarioDialog from "./TipoInventarioDialog";

export default function TipoInventarioTab() {
  const [tab, setTab] = useState("lista");

  const [tipos, setTipos] = useState([]);
  const [open, setOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);

  async function loadTipos() {
    const res = await fetch("/api/tipo-inventario");
    const data = await res.json();
    setTipos(data);
  }

  useEffect(() => {
    loadTipos();
  }, []);

  function nuevo() {
    setEditItem(null);
    setOpen(true);
  }

  function editar(item) {
    setEditItem(item);
    setOpen(true);
  }

  async function eliminar(id) {
    if (!confirm("¿Eliminar este tipo?")) return;

    const res = await fetch(`/api/tipo-inventario/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      toast.success("Eliminado");
      loadTipos();
    } else {
      toast.error("Error al eliminar");
    }
  }

  return (
    <div className="space-y-4">

      <Tabs value={tab} onValueChange={setTab}>

        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="lista">Tipos</TabsTrigger>
            <TabsTrigger value="info">Información</TabsTrigger>
          </TabsList>

          <Button size="sm" onClick={nuevo}>
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        </div>

        {/* LISTA */}
        <TabsContent value="lista">
          <Card>
            <CardContent className="p-0">

              {tipos.map((t) => (
                <div
                  key={t.id}
                  className="flex justify-between items-center border-b px-4 py-3 hover:bg-muted/40"
                >
                  <span className="font-medium">{t.nombre}</span>

                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => editar(t)}>
                      <Pencil size={18} />
                    </Button>

                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => eliminar(t.id)}
                    >
                      <Trash2 size={18} className="text-red-500" />
                    </Button>
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
        </TabsContent>

        {/* INFO */}
        <TabsContent value="info">
          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 font-semibold">
                <Info size={18} />
                Clasificación de inventario
              </div>

              <p className="text-sm text-muted-foreground">
                Los tipos permiten organizar los artículos del inventario.
              </p>

              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>Repuestos</li>
                <li>Herramientas</li>
                <li>Lubricantes</li>
                <li>Consumibles</li>
                <li>Equipos</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <TipoInventarioDialog
        open={open}
        onOpenChange={setOpen}
        item={editItem}
        onSaved={loadTipos}
      />
    </div>
  );
}
