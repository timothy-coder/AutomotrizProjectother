"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
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
import { Car, Eye, Pencil, Trash2, Search, X, Plus } from "lucide-react";
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
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
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

            {onSelect && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:bg-blue-100 hover:text-blue-700"
                    onClick={() => onSelect(cliente)}
                  >
                    <Eye size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Ver cliente</TooltipContent>
              </Tooltip>
            )}

            {onVehiculos && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:bg-purple-100 hover:text-purple-700"
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
                    className="hover:bg-amber-100 hover:text-amber-700"
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
                    variant="ghost"
                    className="hover:bg-red-100 hover:text-red-700"
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
    getFilteredRowModel: getFilteredRowModel()
  });

  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* Header - Buscador a la izquierda, botones a la derecha */}
        <div className="flex gap-4 items-center justify-between">
          
          {/* Buscador a la izquierda */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
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
          <div className="flex items-center gap-3">
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
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    <Plus size={16} />
                    Nuevo Cliente
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Crear nuevo cliente</TooltipContent>
              </Tooltip>
            )}
          </div>

        </div>

        {/* Tabla */}
        <div className="border rounded-lg overflow-hidden bg-white">
          <Table>

            <TableHeader className="bg-slate-50 border-b">
              {table.getHeaderGroups().map(hg => (
                <TableRow key={hg.id} className="hover:bg-slate-50">
                  {hg.headers.map(h => (
                    <TableHead 
                      key={h.id}
                      className="font-semibold text-slate-700 h-12"
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
                      <span>
                        {searchValue ? "No se encontraron clientes" : "No hay clientes"}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row, index) => (
                  <TableRow 
                    key={row.id} 
                    className={`hover:bg-slate-50 transition-colors border-b ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                    }`}
                  >
                    {row.getVisibleCells().map(cell => (
                      <TableCell 
                        key={cell.id}
                        className="h-12 text-sm"
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

        {/* Footer con información */}
        {filteredData.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 bg-slate-50 rounded-lg">
            <span className="text-sm text-gray-600">
              Total: <span className="font-semibold text-slate-700">{filteredData.length}</span> cliente(s)
            </span>
            {searchValue && (
              <span className="text-xs text-gray-500">
                Filtrando por: <span className="font-medium">"{searchValue}"</span>
              </span>
            )}
          </div>
        )}

      </div>
    </TooltipProvider>
  );
}