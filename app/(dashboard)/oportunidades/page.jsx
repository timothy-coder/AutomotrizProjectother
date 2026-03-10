"use client";

import { useEffect, useMemo, useState } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, getPaginationRowModel, flexRender } from "@tanstack/react-table";
import { ArrowUpDown, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import OportunidadDialog from "@/app/components/oportunidades/OportunidadDialog";


function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PE");
}

export default function OportunidadesPage() {
  const canView = useRequirePerm("oportunidades", "view");
  const canCreate = useRequirePerm("oportunidades", "create");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sorting, setSorting] = useState([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch("/api/oportunidades", { cache: "no-store" });
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo cargar oportunidades");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canView) loadData();
  }, [canView]);

  const filteredRows = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) => {
      const vehiculo = `${row.modelo_name || ""} ${row.marca_name || ""}`.toLowerCase();
      return (
        String(row.cliente_name || "").toLowerCase().includes(q) ||
        String(row.creado_por_name || "").toLowerCase().includes(q) ||
        String(row.origen_name || "").toLowerCase().includes(q) ||
        String(row.suborigen_name || "").toLowerCase().includes(q) ||
        String(row.etapa_name || "").toLowerCase().includes(q) ||
        vehiculo.includes(q)
      );
    });
  }, [rows, globalFilter]);

  const columns = useMemo(
    () => [
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
        cell: ({ row }) => row.original.cliente_name || "-",
      },
      {
        accessorKey: "creado_por_name",
        header: "Creado por",
        cell: ({ row }) => row.original.creado_por_name || "-",
      },
      {
        accessorKey: "origen_name",
        header: "Origen",
        cell: ({ row }) => row.original.origen_name || "-",
      },
      {
        accessorKey: "suborigen_name",
        header: "Suborigen",
        cell: ({ row }) => row.original.suborigen_name || "-",
      },
      {
        id: "vehiculo",
        header: "Vehículo",
        cell: ({ row }) => {
          const modelo = row.original.modelo_name || "";
          const marca = row.original.marca_name || "";
          return `${modelo}${modelo && marca ? " - " : ""}${marca}` || "-";
        },
      },
      {
        accessorKey: "etapa_name",
        header: "Etapa",
        cell: ({ row }) => row.original.etapa_name || "-",
      },
      {
        accessorKey: "created_at",
        header: "Fecha creación",
        cell: ({ row }) => formatDate(row.original.created_at),
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (!canView) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Oportunidades</h1>

      <Tabs defaultValue="listado" className="space-y-4">
        <TabsList>
          <TabsTrigger value="listado">Listado</TabsTrigger>
        </TabsList>

        <TabsContent value="listado">
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>Gestión de oportunidades</CardTitle>

              <div className="flex flex-col md:flex-row gap-2">
                <Input
                  placeholder="Buscar por cliente, creador, origen, etapa..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="w-full md:w-[320px]"
                />

                <Button variant="outline" onClick={loadData} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Recargar
                </Button>

                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva oportunidad
                  </Button>
               
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <div className="overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      {table.getHeaderGroups().map((headerGroup) => (
                        <tr key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <th key={header.id} className="px-4 py-3 text-left font-medium">
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
                          <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                            Cargando...
                          </td>
                        </tr>
                      ) : table.getRowModel().rows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                            No hay oportunidades registradas
                          </td>
                        </tr>
                      ) : (
                        table.getRowModel().rows.map((row) => (
                          <tr key={row.id} className="border-t">
                            {row.getVisibleCells().map((cell) => (
                              <td key={cell.id} className="px-4 py-3">
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <OportunidadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          setDialogOpen(false);
          loadData();
        }}
      />
    </div>
  );
}