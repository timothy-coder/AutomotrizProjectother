// app/(dashboard)/cotizaciones/[id]/resumen/components/EncabezadoPage.jsx

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

export function EncabezadoPage({
    cotizacion,
    loadingReserva,
    onGoToOportunidad,
    onGoToReserva,
}) {
    return (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-4 w-full sm:flex-1">
                <Link href="/cotizaciones">
                    <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                        <ArrowLeft size={16} />
                    </Button>
                </Link>
                <div className="min-w-0 flex-1">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                        Resumen de Cotización
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                        Q-{String(cotizacion.id).padStart(6, "0")}
                    </p>
                </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
                <Button
                    onClick={onGoToOportunidad}
                    variant="outline"
                    className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
                    disabled={loadingReserva}
                >
                    <ArrowRight size={14} />
                    <span className="hidden sm:inline">Ir a Oportunidad</span>
                    <span className="sm:hidden">Oportunidad</span>
                </Button>
                <Button
                    onClick={onGoToReserva}
                    className="gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm flex-1 sm:flex-none"
                    disabled={loadingReserva}
                >
                    <ArrowRight size={14} />
                    <span className="hidden sm:inline">{loadingReserva ? "Cargando..." : "Llevar a Reserva"}</span>
                    <span className="sm:hidden">{loadingReserva ? "..." : "Reserva"}</span>
                </Button>
            </div>
        </div>
    );
}