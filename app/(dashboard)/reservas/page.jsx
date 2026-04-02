"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Search,
  Eye,
  CheckCircle,
  AlertCircle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function ReservasPage() {
  const router = useRouter();
  const { userId, permissions, loading: authLoading } = useAuth();
  const permitSignar = hasPermission(permissions, "reservas", "sign");

  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [filterPendienteFirma, setFilterPendienteFirma] = useState("todos");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  async function loadReservas() {
    try {
      setLoading(true);
      const res = await fetch("/api/reservas", { cache: "no-store" });
      const data = await res.json();
      setReservas(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando reservas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!authLoading) {
      loadReservas();
    }
  }, [authLoading]);

  // Filtrar reservas
  const filteredReservas = reservas.filter((reserva) => {
    // Filtro por estado
    if (filterEstado !== "todos" && reserva.estado !== filterEstado) {
      return false;
    }

    // Filtro por pendiente de firma
    if (filterPendienteFirma !== "todos") {
      if (filterPendienteFirma === "pendiente") {
        const tienePendiente =
          reserva.firmas?.some((f) => f.estado === "pendiente") || false;
        if (!tienePendiente) return false;
      } else if (filterPendienteFirma === "completado") {
        const tienePendiente =
          reserva.firmas?.some((f) => f.estado === "pendiente") || false;
        if (tienePendiente) return false;
      }
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        reserva.id.toString().includes(search) ||
        reserva.created_by_name?.toLowerCase().includes(search) ||
        reserva.oportunidad_id.toString().includes(search)
      );
    }

    return true;
  });

  // Paginación
  const totalPages = Math.ceil(filteredReservas.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedReservas = filteredReservas.slice(
    startIdx,
    startIdx + itemsPerPage
  );

  const getEstadoBadge = (estado) => {
    const config = {
      borrador: {
        bg: "bg-gray-100",
        text: "text-gray-700",
        icon: "📝",
        label: "Borrador",
      },
      enviado_firma: {
        bg: "bg-blue-100",
        text: "text-blue-700",
        icon: "📤",
        label: "Enviado a Firma",
      },
      observado: {
        bg: "bg-yellow-100",
        text: "text-yellow-700",
        icon: "👁️",
        label: "Observado",
      },
      subasando: {
        bg: "bg-purple-100",
        text: "text-purple-700",
        icon: "🔄",
        label: "Subasando",
      },
      firmado: {
        bg: "bg-green-100",
        text: "text-green-700",
        icon: "✓",
        label: "Firmado",
      },
    };

    const cfg = config[estado] || config.borrador;
    return (
      <Badge className={`${cfg.bg} ${cfg.text}`}>
        {cfg.icon} {cfg.label}
      </Badge>
    );
  };

  const getProgressFirmas = (firmas) => {
    if (!firmas || firmas.length === 0) return 0;
    const firmadas = firmas.filter((f) => f.estado === "firmado").length;
    return Math.round((firmadas / firmas.length) * 100);
  };

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 py-8 px-4 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reservas</h1>
          <p className="text-gray-600">
            Gestiona todas tus reservas y el proceso de firma
          </p>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {reservas.length}
                      </p>
                    </div>
                    <div className="text-4xl">📊</div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Total de reservas creadas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Firmadas
                      </p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {reservas.filter((r) => r.estado === "firmado").length}
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Reservas completamente firmadas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600 font-medium">
                        Pendientes
                      </p>
                      <p className="text-3xl font-bold text-yellow-900 mt-2">
                        {
                          reservas.filter((r) =>
                            r.firmas?.some((f) => f.estado === "pendiente")
                          ).length
                        }
                      </p>
                    </div>
                    <Clock className="h-12 w-12 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Reservas esperando firmas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600 font-medium">
                        Por Revisar
                      </p>
                      <p className="text-3xl font-bold text-red-900 mt-2">
                        {
                          reservas.filter((r) => r.estado === "observado")
                            .length
                        }
                      </p>
                    </div>
                    <AlertCircle className="h-12 w-12 text-red-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Reservas con observaciones
            </TooltipContent>
          </Tooltip>
        </div>

        {/* FILTROS */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center gap-2">
              <Filter size={18} />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="ID, creador, oportunidad..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Estado
                </label>
                <Select
                  value={filterEstado}
                  onValueChange={(value) => {
                    setFilterEstado(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="enviado_firma">Enviado a Firma</SelectItem>
                    <SelectItem value="observado">Observado</SelectItem>
                    <SelectItem value="subasando">Subasando</SelectItem>
                    <SelectItem value="firmado">Firmado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Firma
                </label>
                <Select
                  value={filterPendienteFirma}
                  onValueChange={(value) => {
                    setFilterPendienteFirma(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    <SelectItem value="pendiente">Pendiente de Firma</SelectItem>
                    <SelectItem value="completado">Firmas Completas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterEstado("todos");
                    setFilterPendienteFirma("todos");
                    setCurrentPage(1);
                  }}
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              Mostrando <span className="font-semibold">{paginatedReservas.length}</span> de{" "}
              <span className="font-semibold">{filteredReservas.length}</span> reservas
            </div>
          </CardContent>
        </Card>

        {/* TABLA DE RESERVAS */}
        <Card>
          <CardContent className="pt-6">
            {paginatedReservas.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-3">📋</div>
                <p className="text-gray-600 font-medium">
                  No hay reservas que coincidan con los filtros
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">ID</TableHead>
                      <TableHead className="font-semibold">
                        Oportunidad
                      </TableHead>
                      <TableHead className="font-semibold">Creado Por</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Firmas</TableHead>
                      <TableHead className="font-semibold">Fecha</TableHead>
                      <TableHead className="font-semibold text-center">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedReservas.map((reserva, idx) => (
                      <TableRow
                        key={reserva.id}
                        className={`hover:bg-blue-50 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <TableCell className="font-semibold text-blue-600">
                          #{reserva.id}
                        </TableCell>
                        <TableCell className="text-sm">
                          #{reserva.oportunidad_id}
                        </TableCell>
                        <TableCell className="text-sm">
                          {reserva.created_by_name || "Usuario"}
                        </TableCell>
                        <TableCell>
                          {getEstadoBadge(reserva.estado)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-xs font-medium text-gray-600">
                              {getProgressFirmas(reserva.firmas)}% Completo
                            </div>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{
                                  width: `${getProgressFirmas(reserva.firmas)}%`,
                                }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(reserva.created_at).toLocaleDateString(
                            "es-ES"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    router.push(`/reservas/${reserva.id}`)
                                  }
                                  className="gap-2"
                                >
                                  <Eye size={14} />
                                  Ver
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Ver detalles completos
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    router.push(
                                      `/oportunidades/${reserva.oportunidad_id}`
                                    )
                                  }
                                  className="gap-2"
                                >
                                  <Eye size={14} />
                                  Oportunidad
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Ver oportunidad relacionada
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.max(1, currentPage - 1))
                    }
                    disabled={currentPage === 1}
                    className="gap-2"
                  >
                    <ChevronUp size={14} />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="gap-2"
                  >
                    Siguiente
                    <ChevronDown size={14} />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* INFO */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="text-3xl">ℹ️</div>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Dos opciones de visualización
                </p>
                <p className="text-xs text-blue-700">
                  Usa el botón "Ver" para acceder a los detalles editables de la
                  reserva. Usa el botón "Oportunidad" para ver la oportunidad relacionada.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}