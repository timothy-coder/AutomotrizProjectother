"use client";

import { useMemo, useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, UserPlus, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { useRouter } from "next/navigation";

export default function LeadsTable({
  rows,
  loading,
  onEdit,
  onAssign,
  canEdit,
  canAssign,
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState([]);
  const [estadosTiempo, setEstadosTiempo] = useState([]);
  const [filtroRango, setFiltroRango] = useState("todos"); // "todos", "dia", "semana", "mes"

  // Cargar configuración de estados de tiempo
  useEffect(() => {
    fetch("/api/configuracion-estados-tiempo", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setEstadosTiempo(lista);
      })
      .catch(() => setEstadosTiempo([]));
  }, []);

  // Función para obtener rango de fechas
  function getRangoFechas() {
    const ahora = new Date();
    
    switch (filtroRango) {
      case "dia":
        return {
          inicio: startOfDay(ahora),
          fin: endOfDay(ahora),
        };
      case "semana":
        return {
          inicio: startOfWeek(ahora, { weekStartsOn: 1 }),
          fin: endOfWeek(ahora, { weekStartsOn: 1 }),
        };
      case "mes":
        return {
          inicio: startOfMonth(ahora),
          fin: endOfMonth(ahora),
        };
      default:
        return {
          inicio: startOfDay(ahora),
          fin: endOfDay(ahora),
        };
    }
  }

  // Filtrar filas según el rango seleccionado
  const rowsFiltrados = useMemo(() => {
    if (filtroRango === "todos") return rows || [];

    const { inicio, fin } = getRangoFechas();

    return (rows || []).filter((row) => {
      if (!row?.fecha_agenda) return false;

      try {
        const fechaRow = new Date(row.fecha_agenda);
        return fechaRow >= inicio && fechaRow <= fin;
      } catch {
        return false;
      }
    });
  }, [rows, filtroRango]);

  // Función para calcular minutos restantes
  function getMinutosRestantes(fechaAgenda, horaAgenda) {
    if (!fechaAgenda || !horaAgenda) return null;

    try {
      const fechaStr = String(fechaAgenda).trim().split("T")[0];
      const horaStr = String(horaAgenda)
        .trim()
        .split(":")
        .slice(0, 2)
        .join(":");

      const fechaHoraString = `${fechaStr}T${horaStr}:00`;

      const ahora = new Date();
      const agendaDateTime = new Date(fechaHoraString);

      if (isNaN(agendaDateTime.getTime())) {
        return null;
      }

      const diferencia = agendaDateTime.getTime() - ahora.getTime();
      const minutos = Math.floor(diferencia / 1000 / 60);

      return minutos;
    } catch (error) {
      console.error("Error calculando minutos:", error);
      return null;
    }
  }

  // Función para obtener color del estado de tiempo desde la API
  function getColorEstadoTiempo(minutosRestantes, etapasconversion_id) {
    // Solo lógica dinámica si es "Nuevo" (etapasconversion_id === 1)
    if (etapasconversion_id !== 1 && etapasconversion_id !== 2) {
      return {
        bg: "#28a745",
        text: "#000000",
      };
    }

    if (minutosRestantes === null) {
      return {
        bg: "transparent",
        text: "#000000",
      };
    }

    // Buscar el estado que coincida con los minutos
    const estadoActivo = estadosTiempo.find(
      (e) =>
        e.activo &&
        minutosRestantes >= e.minutos_desde &&
        minutosRestantes <= e.minutos_hasta
    );

    if (estadoActivo) {
      return {
        bg: estadoActivo.color_hexadecimal,
        text: esColorOscuro(estadoActivo.color_hexadecimal) ? "#ffffff" : "#000000",
      };
    }

    return {
      bg: "transparent",
      text: "#000000",
    };
  }

  // Función para determinar si el color es oscuro
  function esColorOscuro(color) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }

  const handleVerLead = (lead) => {
    router.push(`/leads/${lead.id}`);
  };

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
        accessorKey: "fecha_agenda",
        header: "Fecha agendada",
        cell: ({ row }) => {
          if (!row.original?.fecha_agenda) {
            return "-";
          }

          return (
            <>
              {new Date(row.original.fecha_agenda).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
              {" a las "}
              {row.original?.hora_agenda
                ? String(row.original.hora_agenda).slice(0, 5)
                : "-"}
            </>
          );
        },
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
            <Button
              className="text-white bg-blue-600 hover:bg-blue-700"
              size="sm"
              onClick={() => handleVerLead(row.original)}
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver
            </Button>

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
    data: rowsFiltrados,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <>
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium">Filtrar por:</span>
        <Select value={filtroRango} onValueChange={setFiltroRango}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Selecciona rango" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="dia">Por día</SelectItem>
            <SelectItem value="semana">Por semana</SelectItem>
            <SelectItem value="mes">Por mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
                  <td colSpan={11} className="px-4 py-6 text-center text-muted-foreground">
                    Cargando...
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-6 text-center text-muted-foreground">
                    No hay leads registrados
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const minutosRestantes = getMinutosRestantes(
                    row.original?.fecha_agenda,
                    row.original?.hora_agenda
                  );
                  const colores = getColorEstadoTiempo(
                    minutosRestantes,
                    row.original?.etapasconversion_id
                  );

                  return (
                    <tr
                      key={row.id}
                      className="border-t transition-colors"
                      style={{
                        backgroundColor: colores.bg,
                        color: colores.text,
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
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