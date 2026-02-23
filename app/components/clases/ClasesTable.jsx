"use client";

import { Fragment, useMemo, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Eye, Pencil, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import CarrosSubTable from "@/app/components/clases/CarrosSubTable";

export default function ClasesTable({
  loading,
  clases = [],
  carrosByClase = new Map(),

  canEditClase,
  canDeleteClase,

  canCreateCarro,
  canEditCarro,
  canDeleteCarro,

  onViewClase,
  onEditClase,
  onDeleteClase,

  onNewCarro,
  onViewCarro,
  onEditCarro,
  onDeleteCarro,
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [expanded, setExpanded] = useState({});

  const columns = useMemo(() => {
    return [
      {
        id: "expander",
        header: "",
        cell: ({ row }) => {
          const claseId = Number(row.original.id);
          const hasCars = (carrosByClase.get(claseId) || []).length > 0;

          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={row.getToggleExpandedHandler()}
              disabled={!hasCars}
              className="px-2"
              title={hasCars ? "Ver carros" : "Sin carros"}
            >
              {row.getIsExpanded() ? <ChevronDown /> : <ChevronRight />}
            </Button>
          );
        },
      },
      { accessorKey: "name", header: "Clase" },
      {
        id: "carros_count",
        header: "Carros",
        cell: ({ row }) => {
          const claseId = Number(row.original.id);
          return (carrosByClase.get(claseId) || []).length;
        },
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => {
          const c = row.original;

          return (
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => onViewClase?.(c)}>
                <Eye size={16} />
              </Button>

              {canEditClase && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEditClase?.(c)}
                >
                  <Pencil size={16} />
                </Button>
              )}

              {canDeleteClase && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteClase?.(c)}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [
    carrosByClase,
    canEditClase,
    canDeleteClase,
    onViewClase,
    onEditClase,
    onDeleteClase,
  ]);

  const table = useReactTable({
    data: clases,
    columns,
    state: {
      globalFilter,
      expanded,
      pagination: { pageIndex: 0, pageSize: 25 },
    },
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getRowCanExpand: () => true,
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar clase..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground">
          {loading ? "Cargando..." : `Total: ${clases.length}`}
        </div>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="p-3 text-left">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row) => {
              const claseId = Number(row.original.id);
              const cars = carrosByClase.get(claseId) || [];

              return (
                <Fragment key={row.id}>
                  <tr className="border-t">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="p-3">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>

                  {row.getIsExpanded() && (
                    <tr className="bg-muted/30">
                      <td colSpan={row.getVisibleCells().length} className="p-3">
                        <CarrosSubTable
                          clase={row.original}
                          carros={cars}
                          canCreate={canCreateCarro}
                          canEdit={canEditCarro}
                          canDelete={canDeleteCarro}
                          onNew={onNewCarro}
                          onView={onViewCarro}
                          onEdit={onEditCarro}
                          onDelete={onDeleteCarro}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}