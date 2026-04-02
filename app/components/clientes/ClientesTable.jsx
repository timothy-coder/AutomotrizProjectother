"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Car, Eye, Pencil, Trash2, Search, X, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ClientesTable({
  data,
  onSelect,
  onVehiculos,
  onCreate,
  onEdit,
  onDelete
}) {

  const [searchValue, setSearchValue] = useState("");

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
      header: "DNI",
      accessorKey: "identificacion_fiscal"
    },

    {
      header: "Vehículos",
      accessorKey: "vehiculos_count",
      cell: ({ row }) => (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-[#5d16ec] text-xs font-semibold">
          {row.original.vehiculos_count || 0}
        </span>
      )
    },

    {
      header: "Acciones",
      cell: ({ row }) => {

        const cliente = row.original;

        return (
          <div className="flex gap-1">

            

            {onVehiculos && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onVehiculos(cliente)}
                  >
                    <Car size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Ver vehículos</TooltipContent>
              </Tooltip>
            )}

            {onEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onEdit(cliente)}
                  >
                    <Pencil size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Editar cliente</TooltipContent>
              </Tooltip>
            )}

            {onDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onDelete(cliente)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Eliminar cliente</TooltipContent>
              </Tooltip>
            )}

          </div>
        );
      }
    }

  ], [onSelect, onVehiculos, onEdit, onDelete]);

  // Filtrado personalizado
  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return data;

    const searchLower = searchValue.toLowerCase();

    return data.filter(cliente => {
      const nombre = cliente.nombre?.toLowerCase() || "";
      const apellido = cliente.apellido?.toLowerCase() || "";
      const dni = cliente.identificacion_fiscal?.toLowerCase() || "";
      const celular = cliente.celular?.toLowerCase() || "";

      return (
        nombre.includes(searchLower) ||
        apellido.includes(searchLower) ||
        dni.includes(searchLower) ||
        celular.includes(searchLower)
      );
    });
  }, [data, searchValue]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 25,
      },
    },
  });

  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* Header - Buscador a la izquierda, botones a la derecha */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center justify-between">
          
          {/* Buscador a la izquierda */}
          <div className="flex items-center gap-2 flex-1 max-w-md w-full sm:w-auto">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <Input
                type="text"
                placeholder="Buscar por nombre, apellido, DNI..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10 pr-8 h-9"
              />
              {searchValue && (
                <button
                  onClick={() => setSearchValue("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Información de búsqueda y botón crear a la derecha */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {searchValue && (
              <span className="text-xs text-gray-600 whitespace-nowrap">
                {filteredData.length} resultado(s)
              </span>
            )}

            {onCreate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={onCreate}
                    size="sm"
                    className="bg-[#5d16ec]  hover:bg-[#5d16ec]/70 text-white gap-2 w-full sm:w-auto"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">Nuevo Cliente</span>
                    <span className="sm:hidden">Nuevo</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Crear nuevo cliente</TooltipContent>
              </Tooltip>
            )}
          </div>

        </div>

        {/* Tabla */}
        <div className="border rounded-lg overflow-x-auto bg-white">
          <Table>

            <TableHeader className="bg-slate-50 border-b">
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id}>
                  {hg.headers.map(h => (
                    <TableHead 
                      key={h.id}
                      className="font-semibold text-slate-700 h-12 text-xs sm:text-sm whitespace-nowrap"
                    >
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
              {table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={columns.length} 
                    className="text-center py-8 text-gray-500"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Search size={32} className="text-gray-300" />
                      <span className="text-sm sm:text-base">
                        {searchValue ? "No se encontraron clientes" : "No hay clientes"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row, index) => (
                  <TableRow 
                    key={row.id} 
                    className={` transition-colors border-b `}
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell 
                        key={cell.id}
                        className="h-12 text-xs sm:text-sm py-2 sm:py-3 px-2 sm:px-4"
                      >
                        {flexRender(
                          cell.column.columnDef.cell ?? cell.column.columnDef.accessorKey,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>

          </Table>
        </div>

        {/* Paginación */}
        {filteredData.length > 0 && (
          <div className="space-y-4">
            {/* Footer con información */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 bg-slate-50 rounded-lg">
              <span className="text-xs sm:text-sm text-gray-600">
                Total: <span className="font-semibold text-slate-700">{filteredData.length}</span> cliente(s)
                {searchValue && ` (filtrando)`}
              </span>
              
              {/* Información de paginación */}
              <span className="text-xs sm:text-sm text-gray-600">
                Página <span className="font-semibold">{table.getState().pagination.pageIndex + 1}</span> de <span className="font-semibold">{table.getPageCount()}</span>
                {" • "}
                Mostrando <span className="font-semibold">{Math.min(25, filteredData.length - (table.getState().pagination.pageIndex * 25))}</span> de <span className="font-semibold">{filteredData.length}</span>
              </span>
            </div>

            {/* Controles de paginación */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              
              {/* Botones de navegación */}
              <div className="flex gap-2 w-full sm:w-auto">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                      className="flex-1 sm:flex-none gap-1"
                    >
                      <ChevronLeft size={16} />
                      <span className="hidden sm:inline">Anterior</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Ir a página anterior</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                      className="flex-1 sm:flex-none gap-1"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Ir a página siguiente</TooltipContent>
                </Tooltip>
              </div>

              {/* Información de tamaño de página */}
              <div className="text-xs sm:text-sm text-gray-600">
                Mostrando <span className="font-semibold">25 por página</span>
              </div>

            </div>
          </div>
        )}

      </div>
    </TooltipProvider>
  );
}