"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LeadsTable({
  rows,
  loading,
  onEdit,
  onAssign,
  canEdit,
  canAssign,
}) {
  const [sorting, setSorting] = useState([]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "oportunidad_id",
        header: "Código",
        cell: ({ row }) => row.original?.oportunidad_id || "-",
      },
      {
        accessorKey: "cliente_name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="px-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Cliente
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => row.original?.cliente_name || "-",
      },
      {
        accessorKey: "asignado_a_name",
        header: "Asignado a",
        cell: ({ row }) => row.original?.asignado_a_name || "Sin asignar",
      },
      {
        accessorKey: "origen_name",
        header: "Origen",
        cell: ({ row }) => row.original?.origen_name || "-",
      },
      {
        accessorKey: "suborigen_name",
        header: "Suborigen",
        cell: ({ row }) => row.original?.suborigen_name || "-",
      },
      {
        id: "vehiculo",
        header: "Vehículo",
        cell: ({ row }) => {
          const modelo = row.original?.modelo_name || "";
          const marca = row.original?.marca_name || "";
          const texto = `${modelo}${modelo && marca ? " - " : ""}${marca}`;
          return texto || "-";
        },
      },
      {
        accessorKey: "etapa_name",
        header: "Etapa",
        cell: ({ row }) => row.original?.etapa_name || "-",
      },
      {
        accessorKey: "temperatura",
        header: "Temperatura",
        cell: ({ row }) => row.original?.temperatura ?? 0,
      },
      {
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-2">
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => onEdit(row.original)}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}

            {canAssign && (
              <Button variant="outline" size="sm" onClick={() => onAssign(row.original)}>
                <UserPlus className="h-4 w-4 mr-1" />
                Asignar
              </Button>
            )}
          </div>
        ),
      },
    ],
    [canEdit, canAssign, onEdit, onAssign]
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-medium whitespace-nowrap"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
                    No hay leads registrados
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount() || 1}
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </>
  );
}
