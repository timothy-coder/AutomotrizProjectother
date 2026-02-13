"use client";

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableHeader
} from "@/components/ui/table";
import { Car,Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ClientesTable({
  data,
  onSelect,
  onVehiculos,
  onCreate,
  onEdit,
  onDelete
}) {

  const columns = useMemo(() => [

    {
      header: "Nombre",
      accessorKey: "nombre"
    },

    {
      header: "Apellido",
      accessorKey: "apellido"
    },

    {
      header: "Celular",
      accessorKey: "celular"
    },

    {
      header: "Vehículos",
      accessorKey: "vehiculos_count"
    },

    {
      header: "Acciones",
      cell: ({ row }) => {

        const cliente = row.original;

        return (
          <div className="flex gap-2 flex-wrap">

            {onSelect && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onSelect(cliente)}
              >
                <Eye size={16} />
              </Button>
            )}

            {onVehiculos && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onVehiculos(cliente)}
              >
                <Car size={16} />
              </Button>
            )}

            {onEdit && (
              <Button
                size="sm"
                onClick={() => onEdit(cliente)}
              >
                <Pencil size={16} />
              </Button>
            )}

            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(cliente)}
              >
                <Trash2 size={16} />
              </Button>
            )}

          </div>
        );
      }
    }

  ], [onSelect, onVehiculos, onEdit, onDelete]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel()
  });

  return (
    <div className="space-y-4">

      {onCreate && (
        <Button onClick={onCreate}>
          Nuevo Cliente
        </Button>
      )}

      <Table>

        <TableHeader>
          {table.getHeaderGroups().map(hg => (
            <TableRow key={hg.id}>
              {hg.headers.map(h => (
                <TableHead key={h.id}>
                  {flexRender(
                    h.column.columnDef.header,
                    h.getContext()
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id}>

              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id}>
                  {flexRender(
                    cell.column.columnDef.cell ?? cell.column.columnDef.accessorKey,
                    cell.getContext()
                  )}
                </TableCell>
              ))}

            </TableRow>
          ))}
        </TableBody>

      </Table>

    </div>
  );
}
