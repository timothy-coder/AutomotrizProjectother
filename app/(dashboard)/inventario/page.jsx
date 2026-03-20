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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Package,
  Plus,
  RefreshCcw,
  Loader2,
  SlidersHorizontal,
  Eye,
  Pencil,
  Trash2,
  Boxes,
  BarChart3,
  TrendingUp,
  AlertTriangle,
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
  // ESTADÍSTICAS
  // =========================
  const stats = useMemo(() => {
    const totalStock = items.reduce((sum, item) => sum + (Number(item.stock_disponible) || 0), 0);
    const lowStockCount = items.filter((item) => Number(item.stock_disponible || 0) <= minStock).length;
    const totalProducts = items.length;
    const totalValue = items.reduce((sum, item) => {
      const qty = Number(item.stock_disponible) || 0;
      const price = Number(item.precio_venta) || 0;
      return sum + (qty * price);
    }, 0);

    return {
      totalStock,
      lowStockCount,
      totalProducts,
      totalValue,
    };
  }, [items, minStock]);

  // =========================
  // TABLE
  // =========================
  const columns = useMemo(() => {
    return [
      {
        accessorKey: "numero_parte",
        header: "N° Parte",
        cell: ({ row }) => (
          <div className="font-mono font-semibold text-sm">{row.original.numero_parte}</div>
        ),
      },
      {
        accessorKey: "descripcion",
        header: "Descripción",
        cell: ({ row }) => (
          <div className="max-w-[300px] truncate text-sm text-slate-700">
            {row.original.descripcion}
          </div>
        ),
      },
      {
        accessorKey: "tipo_nombre",
        header: "Tipo",
        cell: ({ row }) => {
          const tipo = row.original.tipo_nombre;
          return tipo ? (
            <Badge variant="secondary" className="text-xs">{tipo}</Badge>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          );
        },
      },
      {
        accessorKey: "stock_disponible",
        header: "Disponible",
        cell: ({ row }) => {
          const v = Number(row.original.stock_disponible ?? 0);
          const low = v <= Number(minStock || 0);

          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 cursor-help">
                    <span className={`font-bold text-sm ${low ? "text-red-600" : "text-green-600"}`}>
                      {v}
                    </span>
                    {low && (
                      <Badge variant="destructive" className="text-xs gap-1">
                        <AlertTriangle size={12} />
                        Bajo
                      </Badge>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {low ? `Por debajo del mínimo (${minStock})` : `Stock saludable (mínimo: ${minStock})`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        },
      },
      {
  accessorKey: "precio_venta",
  header: "Precio Venta",
  cell: ({ row }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="text-sm font-medium cursor-help">
            {row.original.precio_venta == null ? "-" : `S/ ${Number(row.original.precio_venta).toFixed(2)}`}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          Valor total: S/ {((Number(row.original.stock_disponible) || 0) * (Number(row.original.precio_venta) || 0)).toFixed(2)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
},
      {
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => {
          const p = row.original;

          return (
            <TooltipProvider>
              <div className="flex flex-wrap gap-1 justify-end">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => {
                        setActiveProduct(p);
                        setDialogMode("view");
                        setOpenDialog(true);
                      }}
                    >
                      <Eye size={16} className="text-blue-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver detalles</TooltipContent>
                </Tooltip>

                {permEdit && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setActiveProduct(p);
                            setDialogMode("edit");
                            setOpenDialog(true);
                          }}
                        >
                          <Pencil size={16} className="text-amber-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Editar producto</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            setDistProduct(p);
                            setOpenDist(true);
                          }}
                        >
                          <Boxes size={16} className="text-purple-600" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Distribuir stock</TooltipContent>
                    </Tooltip>
                  </>
                )}

                {permDelete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setDeleteTarget(p);
                          setOpenDelete(true);
                        }}
                      >
                        <Trash2 size={16} className="text-red-600" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Eliminar producto</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
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
    <div className="space-y-6 pb-8">
      {/* HEADER */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Inventario</h1>
              <p className="text-sm text-slate-500 mt-1">Gestión de productos y stock</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={loadAll} 
                    disabled={loading}
                    className="gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    Recargar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Actualizar inventario</TooltipContent>
              </Tooltip>

              {permCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => {
                        setActiveProduct(null);
                        setDialogMode("create");
                        setOpenDialog(true);
                      }}
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="h-4 w-4" />
                      Nuevo Producto
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Crear nuevo producto</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* ESTADÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total Productos</p>
                      <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalProducts}</p>
                    </div>
                    <Package className="h-10 w-10 text-blue-300" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Cantidad total de productos en el sistema</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Stock Total</p>
                      <p className="text-2xl font-bold text-green-900 mt-1">{stats.totalStock.toLocaleString()}</p>
                    </div>
                    <BarChart3 className="h-10 w-10 text-green-300" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Cantidad total de unidades en stock</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">Stock Bajo</p>
                      <p className="text-2xl font-bold text-red-900 mt-1">{stats.lowStockCount}</p>
                    </div>
                    <AlertTriangle className="h-10 w-10 text-red-300" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Productos por debajo del mínimo establecido</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Valor Total</p>
                      <p className="text-2xl font-bold text-purple-900 mt-1">S/ {stats.totalValue.toFixed(2)}</p>
                    </div>
                    <TrendingUp className="h-10 w-10 text-purple-300" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent>Valor total del inventario en stock</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* CONTROLES */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-600" />
            Filtros y búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 pt-6">
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-slate-700">Buscar producto</label>
            <Input 
              placeholder="Buscar por N° parte o descripción..." 
              value={q} 
              onChange={(e) => setQ(e.target.value)}
              className="border-slate-300 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Mínimo stock</label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Mínimo stock (alerta)"
                    value={String(minStock)}
                    onChange={(e) => setMinStock(Number(e.target.value || 0))}
                    className="border-slate-300 focus:border-blue-500 cursor-help"
                  />
                </TooltipTrigger>
                <TooltipContent>Define el nivel mínimo de stock para mostrar alerta "Bajo"</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* TABLA */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50 border-b-2 border-slate-200">
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id} className="hover:bg-slate-50">
                  {hg.headers.map((h) => {
                    const sorted = h.column.getIsSorted();

                    return (
                      <TableHead key={h.id} className="font-semibold text-slate-700">
                        {h.isPlaceholder ? null : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  className="flex items-center gap-2 cursor-pointer hover:text-slate-900 transition-colors"
                                  onClick={h.column.getToggleSortingHandler()}
                                >
                                  {flexRender(h.column.columnDef.header, h.getContext())}

                                  {sorted === "asc" && <ArrowUp className="h-3.5 w-3.5 text-blue-600" />}
                                  {sorted === "desc" && <ArrowDown className="h-3.5 w-3.5 text-blue-600" />}
                                  {!sorted && <ArrowUpDown className="h-3.5 w-3.5 opacity-30" />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Haz clic para ordenar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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
                  <TableCell colSpan={columns.length} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                      <p className="text-sm text-slate-500">Cargando inventario...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : table.getPaginationRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12">
                    <p className="text-sm text-slate-400">No hay productos que coincidan con tu búsqueda</p>
                  </TableCell>
                </TableRow>
              ) : (
                table.getPaginationRowModel().rows.map((row) => (
                  <TableRow 
                    key={row.id} 
                    className="border-b border-slate-100 hover:bg-blue-50 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3">
                        {flexRender(cell.column.columnDef.cell ?? cell.getValue(), cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINACIÓN */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-50 border-t border-slate-200">
          <span className="text-sm font-medium text-slate-600">
            Página <span className="text-blue-600 font-bold">{table.getState().pagination.pageIndex + 1}</span> de <span className="text-blue-600 font-bold">{table.getPageCount()}</span>
            {" • "}
            <span className="text-slate-500">{table.getPaginationRowModel().rows.length} de {filteredData.length} productos</span>
          </span>

          <div className="space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    Anterior
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ir a página anterior</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    Siguiente
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ir a página siguiente</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </Card>

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
              ¿Seguro que deseas eliminar <b className="text-slate-900">{deleteTarget.numero_parte}</b>?
              <br />
              <span className="text-xs text-slate-500 mt-1 block">{deleteTarget.descripcion}</span>
            </>
          ) : null
        }
        loading={loading}
        onConfirm={confirmDelete}
      />
    </div>
  );
}