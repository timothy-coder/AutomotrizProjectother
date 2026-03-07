"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, RefreshCcw, Loader2 } from "lucide-react";

import CotizacionesTable from "@/app/components/cotizaciones/CotizacionesTable";
import CotizacionDetailDialog from "@/app/components/cotizaciones/CotizacionDetailDialog";
import CotizacionDeleteDialog from "@/app/components/cotizaciones/CotizacionDeleteDialog";

export default function CotizacionTallerPage() {
  useRequirePerm("cotizacion", "view");

  const router = useRouter();
  const { user, permissions } = useAuth();
  const permEdit = hasPermission(permissions, "cotizacion", "edit");
  const permCreate = hasPermission(permissions, "cotizacion", "create");
  const permDelete = hasPermission(permissions, "cotizacion", "delete");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // Dialogs (detail + delete only)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadItems() {
    setLoading(true);
    try {
      const r = await fetch("/api/cotizaciones?tipo=taller", { cache: "no-store" });
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando cotizaciones");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  function handleView(item) {
    setDetailId(item.id);
    setDetailOpen(true);
  }

  function handleEdit(item) {
    router.push(`/cotizacion/taller/${item.id}`);
  }

  function handleCreate() {
    router.push("/cotizacion/taller/nueva");
  }

  function handleDelete(item) {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/cotizaciones/${deleteTarget.id}`, { method: "DELETE" });
      if (r.ok) {
        toast.success("Cotización eliminada");
        setDeleteOpen(false);
        setDeleteTarget(null);
        loadItems();
      } else {
        const d = await r.json();
        toast.error(d.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cotizaciones — Taller</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadItems} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          </Button>
          {permCreate && (
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" /> Nueva Cotización
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading && items.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <CotizacionesTable
              items={items}
              showTipo={false}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              permEdit={permEdit}
              permDelete={permDelete}
            />
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <CotizacionDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        cotizacionId={detailId}
        permEdit={permEdit}
        onStatusChanged={loadItems}
      />

      {/* Delete dialog */}
      <CotizacionDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        cotizacion={deleteTarget}
        onConfirm={confirmDelete}
        deleting={deleting}
      />
    </div>
  );
}
