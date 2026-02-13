"use client";

import { useMemo, useState } from "react";

import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

import {
  Eye,
  Pencil,
  Trash2,
} from "lucide-react";

export default function UsersTable({
  data = [],
  loading = false,
  canEdit = false,
  canDelete = false,
  onEdit,
  onView,
  onDelete,
  onToggleActive,
}) {

  // -----------------------------
  // PAGINACIÓN FIJA 25
  // -----------------------------
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 25,
  });

  // -----------------------------
  // COLUMNAS
  // -----------------------------
  const columns = useMemo(() => [

    {
      accessorKey: "username",
      header: "Usuario",
    },

    {
      accessorKey: "fullname",
      header: "Nombre completo",
    },

    {
      id: "active",
      header: "Activo",
      cell: ({ row }) => {

        const user = row.original;

        return (
          <Switch
            checked={!!user.is_active}
            onCheckedChange={() => onToggleActive(user)}
            className={"bg-black text-white"}
          />
        );
      },
    },

    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => {

        const user = row.original;

        return (
          <div className="flex gap-2">

            {/* VER */}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onView(user)}
            >
              <Eye size={18} />
            </Button>

            {/* EDITAR */}
            {canEdit && (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => onEdit(user)}
              >
                <Pencil size={18} />
              </Button>
            )}

            {/* DELETE */}
            {canDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="text-red-500"
                onClick={() => onDelete(user)}
              >
                <Trash2 size={18} />
              </Button>
            )}

          </div>
        );
      },
    },

  ], [canEdit, canDelete, onEdit, onView, onDelete, onToggleActive]);

  // -----------------------------
  // TABLA
  // -----------------------------
  const safeData = Array.isArray(data) ? data : [];

  const table = useReactTable({
    data: safeData,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="rounded-xl border overflow-hidden">

      <div className="overflow-x-auto">
        <table className="w-full text-sm">

          {/* HEADER */}
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="text-left p-3 font-medium"
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          {/* BODY */}
          <tbody>

            {loading && (
              <tr>
                <td colSpan={4} className="p-6 text-center">
                  Cargando usuarios...
                </td>
              </tr>
            )}

            {!loading && table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center">
                  No hay usuarios
                </td>
              </tr>
            )}

            {!loading && table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-t">

                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="p-3">

                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}

                  </td>
                ))}

              </tr>
            ))}

          </tbody>

        </table>
      </div>

      {/* PAGINACIÓN */}
      <div className="flex items-center justify-between p-3 border-t">

        <span className="text-sm text-muted-foreground">
          Página {pagination.pageIndex + 1} de {table.getPageCount()}
        </span>

        <div className="flex gap-2">

          <Button
            size="sm"
            variant="outline"
            disabled={!table.getCanPreviousPage()}
            onClick={() => table.previousPage()}
          >
            Anterior
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={!table.getCanNextPage()}
            onClick={() => table.nextPage()}
          >
            Siguiente
          </Button>

        </div>

      </div>

    </div>
  );
}
