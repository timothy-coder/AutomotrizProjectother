"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function TiposActividadesTable({
  data = [],
  onView,
  onEdit,
  onDelete,
  onToggleActive,
}) {

  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo(() => [
    {
      accessorKey: "name",
      header: "Nombre",
    },
    
    {
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
          {onView && (
            <Button size="sm" variant="ghost" onClick={() => onView(row.original)}>
              Ver
            </Button>
          )}
          {onEdit && (
            <Button size="sm" variant="ghost" onClick={() => onEdit(row.original)}>
              Editar
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="destructive" onClick={() => onDelete(row.original)}>
              Eliminar
            </Button>
          )}
        </div>
      ),
    },
  ], [onView, onEdit, onDelete]);

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="space-y-3">

      <Input
        placeholder="Buscar..."
        value={globalFilter ?? ""}
        onChange={(e) => setGlobalFilter(e.target.value)}
      />

      <div className="overflow-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="p-3 text-left">
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-t">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="p-3">
                    {flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.accessorKey, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
