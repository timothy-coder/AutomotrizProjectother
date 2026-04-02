"use client";

import { Loader2, Calendar, Eye, Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function HistorialDialog({
  open,
  onOpenChange,
  selectedHistorial,
  loading,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Historial de Aperturas</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        ) : selectedHistorial ? (
          <div className="space-y-6">
            {/* ESTADÍSTICAS DE VISTAS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-blue-600 font-medium">
                            Total de Aperturas
                          </p>
                          <p className="text-3xl font-bold text-blue-900 mt-2">
                            {selectedHistorial.vistas_totales}
                          </p>
                        </div>
                        <Eye className="h-12 w-12 text-blue-200" />
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Cantidad de veces que se ha visualizado esta cotización
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-600 font-medium">
                            Última Apertura
                          </p>
                          <p className="text-sm font-bold text-green-900 mt-2">
                            {selectedHistorial.ultima_vista
                              ? new Date(
                                  selectedHistorial.ultima_vista
                                ).toLocaleDateString("es-ES", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Aún no vista"}
                          </p>
                        </div>
                        <Clock className="h-12 w-12 text-green-200" />
                      </div>
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Fecha y hora de la última visualización
                </TooltipContent>
              </Tooltip>
            </div>

            {/* HISTORIAL DETALLADO */}
            {selectedHistorial.historial &&
            selectedHistorial.historial.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                <h3 className="font-semibold text-gray-900">
                  Detalles de aperturas:
                </h3>
                {selectedHistorial.historial.map((vista, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-l-4 ${
                      idx % 2 === 0
                        ? "border-l-purple-500 bg-purple-50 border border-purple-200"
                        : "border-l-gray-500 bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="text-xs text-gray-600 font-medium">
                            Fecha y Hora
                          </p>
                          <p className="font-semibold text-gray-900">
                            {new Date(vista.fecha_hora).toLocaleDateString(
                              "es-ES",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                              }
                            )}
                          </p>
                        </div>
                      </div>


                      <div>
                        <p className="text-xs text-gray-600 font-medium">
                          Dispositivo
                        </p>
                        <p className="text-xs text-gray-700 truncate">
                          {vista.user_agent.includes("Mobile")
                            ? "📱 Móvil"
                            : "💻 Escritorio"}
                          {vista.user_agent.includes("Chrome")
                            ? " - Chrome"
                            : vista.user_agent.includes("Firefox")
                            ? " - Firefox"
                            : vista.user_agent.includes("Safari")
                            ? " - Safari"
                            : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-600">No hay registros de aperturas</p>
              </div>
            )}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}