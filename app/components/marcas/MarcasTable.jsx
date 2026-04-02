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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ModelosSubTable from "@/app/components/marcas/ModelosSubTable";
import { Plus, Eye, Pencil, Trash2, ChevronRight, ChevronDown, Search, X } from "lucide-react";

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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={row.getToggleExpandedHandler()}
                  disabled={!hasModels}
                >
                  {row.getIsExpanded() ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {hasModels ? (row.getIsExpanded() ? "Contraer" : "Expandir") : "Sin modelos"}
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "name",
        header: "Marca",
        cell: ({ row }) => (
          <span className="font-medium text-slate-900">{row.original.name}</span>
        ),
      },
      {
        accessorKey: "image_url",
        header: "Logo",
        cell: ({ row }) => {
          const url = row.original.image_url;

          return url ? (
            <img
              src={url}
              alt="marca"
              className="h-10 w-10 rounded-md object-cover border border-slate-200"
            />
          ) : (
            <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-1 rounded">
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
          return (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-[#5d16ec] text-xs font-semibold">
              {list.length}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => {
          const m = row.original;

          return (
            <div className="flex gap-1 justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onViewMarca?.(m)}
                  >
                    <Eye size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Ver marca</TooltipContent>
              </Tooltip>

              {canEditMarca && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditMarca?.(m)}
                    >
                      <Pencil size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Editar marca</TooltipContent>
                </Tooltip>
              )}

              {canDeleteMarca && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onDeleteMarca?.(m)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Eliminar marca</TooltipContent>
                </Tooltip>
              )}

              {canCreateModelo && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-[#5d16ec] hover:bg-[#5d16ec]/70 text-white gap-1"
                      onClick={() => onNewModelo?.(m.id)}
                    >
                      <Plus size={16} />
                      <span className="hidden sm:inline">Modelo</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Crear nuevo modelo</TooltipContent>
                </Tooltip>
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
    getRowCanExpand: () => true,
  });

  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* Header - Buscador a la izquierda, info a la derecha */}
        <div className="flex gap-4 items-center justify-between px-4">
          
          {/* Buscador a la izquierda */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Buscar marca..."
                value={globalFilter ?? ""}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-10 pr-8 h-9"
              />
              {globalFilter && (
                <button
                  onClick={() => setGlobalFilter("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Info a la derecha */}
          <div className="text-sm text-gray-600 whitespace-nowrap">
            {loading ? (
              <span className="text-gray-500">Cargando...</span>
            ) : (
              <>
                <span className="font-semibold text-slate-700">{table.getRowModel().rows.length}</span>
                <span className="text-gray-500"> de {marcas.length} marca(s)</span>
              </>
            )}
          </div>
        </div>

        {/* Tabla */}
        <div className="border rounded-lg overflow-hidden bg-white mx-4">
          <table className="w-full text-sm">

            {/* Header */}
            <thead className="bg-slate-50 border-b">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id} className="hover:bg-slate-50">
                  {hg.headers.map((h) => (
                    <th 
                      key={h.id} 
                      className="p-3 text-left font-semibold text-slate-700 h-12"
                    >
                      {flexRender(
                        h.column.columnDef.header,
                        h.getContext()
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            {/* Body */}
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td 
                    colSpan={columns.length} 
                    className="p-8 text-center text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="text-gray-300" />
                      <span>
                        {globalFilter ? "No se encontraron marcas" : "No hay marcas"}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row, index) => {
                  const marcaId = Number(row.original.id);
                  const models = modelosByMarca.get(marcaId) || [];

                  return (
                    <Fragment key={row.id}>
                      <tr 
                        className={`border-b transition-colors`}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td 
                            key={cell.id} 
                            className="p-3 h-12"
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>

                      {row.getIsExpanded() && (
                        <tr className="bg-slate-50 border-b">
                          <td
                            colSpan={row.getVisibleCells().length}
                            className="p-4"
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
                })
              )}
            </tbody>

          </table>
        </div>

        {/* Footer con información */}
        {table.getRowModel().rows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg mx-4">
            <span className="text-sm text-gray-600">
              Total de marcas: <span className="font-semibold text-slate-700">{marcas.length}</span>
            </span>
            {globalFilter && (
              <span className="text-xs text-gray-500">
                Resultados: <span className="font-medium">{table.getRowModel().rows.length}</span>
              </span>
            )}
          </div>
        )}

      </div>
    </TooltipProvider>
  );
}