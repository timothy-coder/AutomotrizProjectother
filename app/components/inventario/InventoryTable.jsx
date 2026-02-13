"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { ArrowDown, ArrowUp, ArrowUpDown, Boxes, Eye, Pencil, Trash2 } from "lucide-react";

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 25;

export default function InventoryTable({
  data,
  loading,
  q,
  minStock,
  permEdit,
  permDelete,
  onView,
  onEdit,
  onDelete,
  onDistrib,
}) {
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(() => [
    {
      accessorKey: "numero_parte",
      header: "N° Parte",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium truncate">{row.original.numero_parte || "-"}</p>
          <p className="text-xs text-muted-foreground truncate">
            {row.original.descripcion || ""}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "stock_disponible",
      header: "Disponible",
      cell: ({ row }) => {
        const disp = Number(row.original.stock_disponible || 0);
        const total = Number(row.original.stock_total || 0);
        const usado = Number(row.original.stock_usado || 0);

        const low = disp <= Number(minStock || 0);

        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold">{disp}</span>
              {low && (
                <Badge variant={disp <= 0 ? "destructive" : "secondary"}>
                  {disp <= 0 ? "Sin stock" : "Bajo"}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Total: {total} · Usado: {usado}
            </p>
          </div>
        );
      },
    },
    {
      accessorKey: "precio_venta",
      header: "Precio venta",
      cell: ({ row }) => (
        <span>{row.original.precio_venta != null ? `S/ ${row.original.precio_venta}` : "-"}</span>
      ),
    },
    {
      id: "actions",
      header: <div className="text-right">Acciones</div>,
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2 justify-end">
          <Button size="icon" variant="outline" onClick={() => onDistrib?.(row.original)} title="Distribución">
            <Boxes className="h-4 w-4" />
          </Button>

          <Button size="icon" variant="outline" onClick={() => onView?.(row.original)} title="Ver">
            <Eye className="h-4 w-4" />
          </Button>

          {permEdit && (
            <Button size="icon" variant="outline" onClick={() => onEdit?.(row.original)} title="Editar">
              <Pencil className="h-4 w-4" />
            </Button>
          )}

          {permDelete && (
            <Button size="icon" variant="destructive" onClick={() => onDelete?.(row.original)} title="Eliminar">
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ], [minStock, permEdit, permDelete, onView, onEdit, onDelete, onDistrib]);

  const table = useReactTable({
    data: Array.isArray(data) ? data : [],
    columns,
    state: { sorting, globalFilter: q || "" },
    onSortingChange: setSorting,
    globalFilterFn: (row, _columnId, value) => {
      const v = String(value || "").toLowerCase();
      const np = String(row.original.numero_parte || "").toLowerCase();
      const des = String(row.original.descripcion || "").toLowerCase();
      return np.includes(v) || des.includes(v);
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: PAGE_SIZE } },
  });

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="w-full overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => {
                  const sorted = h.column.getIsSorted();

                  return (
                    <TableHead key={h.id}>
                      <button
                        className="flex items-center gap-1"
                        onClick={h.column.getToggleSortingHandler()}
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {sorted === "asc" && <ArrowUp className="h-4 w-4" />}
                        {sorted === "desc" && <ArrowDown className="h-4 w-4" />}
                        {!sorted && <ArrowUpDown className="h-4 w-4 opacity-40" />}
                      </button>
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
                  Cargando...
                </TableCell>
              </TableRow>
            ) : table.getPaginationRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center py-8 text-muted-foreground">
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
      </div>

      {/* PAGINACIÓN */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 border-t">
        <span className="text-sm text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
        </span>

        <div className="space-x-2">
          <Button size="sm" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Anterior
          </Button>
          <Button size="sm" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}
