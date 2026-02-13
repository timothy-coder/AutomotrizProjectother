"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Package,
  Plus,
  RefreshCcw,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";


import ProductDialog from "@/app/components/inventario/ProductDialog";
import ConfirmDeleteDialog from "@/app/components/inventario/ConfirmDeleteDialog";
import StockDistributionModal from "@/app/components/inventario/StockDistributionModal";

export default function InventarioPage() {
  useRequirePerm("inventario", "view");

  const { permissions } = useAuth();

  const permCreate = hasPermission(permissions, "inventario", "create");
  const permEdit = hasPermission(permissions, "inventario", "edit");
  const permDelete = hasPermission(permissions, "inventario", "delete");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // buscador
  const [q, setQ] = useState("");

  // mínimo stock (UI) - ✅ corregido para SSR
  const [minStock, setMinStock] = useState(5);

  useEffect(() => {
    const v = Number(window.localStorage.getItem("inv_min_stock") || "5");
    setMinStock(Number.isFinite(v) ? v : 5);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("inv_min_stock", String(minStock));
  }, [minStock]);

  // dialogs
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("view"); // view | create | edit
  const [activeProduct, setActiveProduct] = useState(null);

  const [openDelete, setOpenDelete] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [openDist, setOpenDist] = useState(false);
  const [distProduct, setDistProduct] = useState(null);

  // =========================
  // LOAD
  // =========================
  async function loadAll() {
    try {
      setLoading(true);

      const r = await fetch("/api/productos", { cache: "no-store" });
      const data = await r.json();

      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando inventario");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // =========================
  // SAVE (create/edit)
  // =========================
  async function saveProduct(payload) {
    try {
      setLoading(true);

      const isEdit = dialogMode === "edit";
      const url = isEdit ? `/api/productos/${activeProduct.id}` : "/api/productos";
      const method = isEdit ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) return toast.error(data.message || "No se pudo guardar");

      toast.success(isEdit ? "Actualizado" : "Creado");
      setOpenDialog(false);
      setActiveProduct(null);
      await loadAll();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // DELETE
  // =========================
  async function confirmDelete() {
    if (!deleteTarget?.id) return;

    try {
      setLoading(true);

      const r = await fetch(`/api/productos/${deleteTarget.id}`, { method: "DELETE" });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) return toast.error(data.message || "No se pudo eliminar");

      toast.success("Eliminado");
      setOpenDelete(false);
      setDeleteTarget(null);

      await loadAll();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  // =========================
  // TABLE
  // =========================
  const columns = useMemo(() => {
    return [
      {
        accessorKey: "numero_parte",
        header: "N° Parte",
        cell: ({ row }) => (
          <div className="font-medium">{row.original.numero_parte}</div>
        ),
      },
      {
        accessorKey: "descripcion",
        header: "Descripción",
        cell: ({ row }) => (
          <div className="max-w-[420px] truncate text-sm text-muted-foreground">
            {row.original.descripcion}
          </div>
        ),
      },
      {
        accessorKey: "stock_disponible",
        header: "Disponible",
        cell: ({ row }) => {
          const v = Number(row.original.stock_disponible ?? 0);
          const low = v <= Number(minStock || 0);

          return (
            <div className="flex items-center gap-2">
              <span className="font-semibold">{v}</span>
              {low && <Badge variant="destructive">Bajo</Badge>}
            </div>
          );
        },
      },
      {
        accessorKey: "precio_venta",
        header: "Venta",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.precio_venta == null ? "-" : `S/ ${row.original.precio_venta}`}
          </span>
        ),
      },
      {
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => {
          const p = row.original;

          return (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setActiveProduct(p);
                  setDialogMode("view");
                  setOpenDialog(true);
                }}
              >
                Ver
              </Button>

              {permEdit && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActiveProduct(p);
                      setDialogMode("edit");
                      setOpenDialog(true);
                    }}
                  >
                    Editar
                  </Button>

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDistProduct(p);
                      setOpenDist(true);
                    }}
                  >
                    Distribución
                  </Button>
                </>
              )}

              {permDelete && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setDeleteTarget(p);
                    setOpenDelete(true);
                  }}
                >
                  Eliminar
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [permEdit, permDelete, minStock]);

  // filtro por buscador
  const filteredData = useMemo(() => {
    const s = String(q || "").toLowerCase().trim();
    if (!s) return items;

    return items.filter((x) => {
      const a = String(x.numero_parte || "").toLowerCase();
      const b = String(x.descripcion || "").toLowerCase();
      return a.includes(s) || b.includes(s);
    });
  }, [items, q]);

  const table = useReactTable({
    data: filteredData,
    columns,
    initialState: {
      pagination: { pageSize: 25, pageIndex: 0 },
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // =========================
  // UI
  // =========================
  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Inventario</h1>
        </div>

        <div className="flex flex-wrap gap-2 justify-end">
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            Recargar
            {loading ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="ml-2 h-4 w-4" />
            )}
          </Button>

          {permCreate && (
            <Button
              onClick={() => {
                setActiveProduct(null);
                setDialogMode("create");
                setOpenDialog(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          )}
        </div>
      </div>

      {/* CONTROLES */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1 md:col-span-2">
            <Input placeholder="Buscar por N° parte o descripción..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Input
              type="number"
              min={0}
              placeholder="Mínimo stock (alerta)"
              value={String(minStock)}
              onChange={(e) => setMinStock(Number(e.target.value || 0))}
            />
            <p className="text-xs text-muted-foreground">
              Marca “Bajo” si disponible ≤ mínimo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* TABLA */}
      <div className="rounded-md border overflow-hidden">
        <Table>

          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();

                  return (
                    <TableHead key={h.id}>
                      {h.isPlaceholder ? null : (
                        <button
                          className="flex items-center gap-1"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(h.column.columnDef.header, h.getContext())}

                          {sorted === "asc" && <ArrowUp className="h-4 w-4" />}
                          {sorted === "desc" && <ArrowDown className="h-4 w-4" />}
                          {!sorted && <ArrowUpDown className="h-4 w-4 opacity-40" />}
                        </button>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8">
                  <Loader2 className="animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : table.getPaginationRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-sm text-muted-foreground">
                  Sin resultados
                </TableCell>
              </TableRow>
            ) : (
              table.getPaginationRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell ?? cell.getValue(), cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>

        </Table>

        {/* PAGINACIÓN */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4">
          <span className="text-sm text-muted-foreground">
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>

          <div className="space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Anterior
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </div>

      {/* DIALOG PRODUCTO */}
      <ProductDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        mode={dialogMode}
        product={activeProduct}
        onSave={saveProduct}
        onRefresh={loadAll}
      />

      {/* MODAL DISTRIBUCIÓN */}
      <StockDistributionModal
        open={openDist}
        onOpenChange={setOpenDist}
        product={distProduct}
        permEdit={permEdit}
        onChanged={loadAll}
      />

      {/* DELETE */}
      <ConfirmDeleteDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        title="Eliminar producto"
        description={
          deleteTarget ? (
            <>
              ¿Seguro que deseas eliminar <b>{deleteTarget.numero_parte}</b>?
              <br />
              <span className="text-xs text-muted-foreground">{deleteTarget.descripcion}</span>
            </>
          ) : null
        }
        loading={loading}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
