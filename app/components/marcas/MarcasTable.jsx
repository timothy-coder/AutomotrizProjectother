"use client";

import { useMemo, useState, Fragment } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ModelosSubTable from "@/app/components/marcas/ModelosSubTable";

export default function MarcasTable({
  loading,
  marcas = [],
  modelosByMarca = new Map(),

  canEditMarca,
  canDeleteMarca,
  canCreateModelo,
  canEditModelo,
  canDeleteModelo,

  onViewMarca,
  onEditMarca,
  onDeleteMarca,

  onNewModelo,
  onEditModelo,
  onDeleteModelo,
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [expanded, setExpanded] = useState({});

  const columns = useMemo(() => {
    return [
      {
        id: "expander",
        header: "",
        cell: ({ row }) => {
          const marcaId = Number(row.original.id);
          const hasModels =
            (modelosByMarca.get(marcaId) || []).length > 0;

          return (
            <Button
              variant="ghost"
              size="sm"
              onClick={row.getToggleExpandedHandler()}
              disabled={!hasModels}
              className="px-2"
            >
              {row.getIsExpanded() ? "▾" : "▸"}
            </Button>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Marca",
      },
      {
        accessorKey: "image_url",
        header: "Imagen",
        cell: ({ row }) => {
          const url = row.original.image_url;

          return url ? (
            <img
              src={url}
              alt="marca"
              className="h-10 w-10 rounded-md object-cover border"
            />
          ) : (
            <span className="text-xs text-muted-foreground">
              Sin imagen
            </span>
          );
        },
      },
      {
        id: "models_count",
        header: "Modelos",
        cell: ({ row }) => {
          const marcaId = Number(row.original.id);
          const list = modelosByMarca.get(marcaId) || [];
          return list.length;
        },
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => {
          const m = row.original;

          return (
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onViewMarca?.(m)}
              >
                Ver
              </Button>

              {canEditMarca && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEditMarca?.(m)}
                >
                  Editar
                </Button>
              )}

              {canDeleteMarca && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDeleteMarca?.(m)}
                >
                  Eliminar
                </Button>
              )}

              {canCreateModelo && (
                <Button
                  size="sm"
                  onClick={() => onNewModelo?.(m.id)}
                >
                  + Modelo
                </Button>
              )}
            </div>
          );
        },
      },
    ];
  }, [
    modelosByMarca,
    canEditMarca,
    canDeleteMarca,
    canCreateModelo,
    onViewMarca,
    onEditMarca,
    onDeleteMarca,
    onNewModelo,
  ]);

  const table = useReactTable({
    data: marcas,
    columns,
    state: {
      globalFilter,
      expanded,
      pagination: {
        pageIndex: 0,
        pageSize: 25,
      },
    },
    onExpandedChange: setExpanded,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Input
          placeholder="Buscar marca..."
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />

        <div className="text-sm text-muted-foreground">
          {loading ? "Cargando..." : `Total: ${marcas.length}`}
        </div>
      </div>

      <div className="overflow-x-auto border rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="p-3 text-left">
                    {flexRender(
                      h.column.columnDef.header,
                      h.getContext()
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.map((row) => {
              const marcaId = Number(row.original.id);
              const models =
                modelosByMarca.get(marcaId) || [];

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
                      <td
                        colSpan={row.getVisibleCells().length}
                        className="p-3"
                      >
                        <ModelosSubTable
                          marca={row.original}
                          modelos={models}
                          canEdit={canEditModelo}
                          canDelete={canDeleteModelo}
                          onEdit={onEditModelo}
                          onDelete={onDeleteModelo}
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
