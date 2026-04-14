// app/(dashboard)/cotizaciones/[id]/resumen/components/OportunidadInfoCard.jsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    User,
    MapPin,
    Check,
    Mail,
    Calendar,
} from "lucide-react";

export function OportunidadInfoCard({ oportunidad }) {
    if (!oportunidad) return null;

    return (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
            <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg text-purple-900">
                    Información de la Oportunidad
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                    <div className="flex items-start gap-2 sm:gap-3">
                        <User className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                        <div className="min-w-0">
                            <p className="text-xs text-gray-600 font-semibold">Cliente</p>
                            <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                                {oportunidad.cliente_contacto}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{oportunidad.cliente_email}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                        <MapPin className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                        <div className="min-w-0">
                            <p className="text-xs text-gray-600 font-semibold">Oportunidad</p>
                            <p className="text-sm sm:text-base font-bold text-gray-900">
                                {oportunidad.oportunidad_id}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{oportunidad.origen_nombre}</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                        <Check className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                        <div className="min-w-0">
                            <p className="text-xs text-gray-600 font-semibold">Etapa</p>
                            <p className="text-sm sm:text-base font-bold text-purple-700">
                                {oportunidad.etapa_nombre}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                        <User className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                        <div className="min-w-0">
                            <p className="text-xs text-gray-600 font-semibold">Creado por</p>
                            <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                                {oportunidad.creado_por_nombre}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-2 sm:gap-3">
                        <User className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                        <div className="min-w-0">
                            <p className="text-xs text-gray-600 font-semibold">Asignado a</p>
                            <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                                {oportunidad.asignado_a_nombre}
                            </p>
                        </div>
                    </div>

                    

                    {oportunidad.detalles && oportunidad.detalles.length > 0 && (
                        <div className="flex items-start gap-2 sm:gap-3">
                            <Calendar className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                            <div className="min-w-0">
                                <p className="text-xs text-gray-600 font-semibold">Fecha Agendada</p>
                                <p className="text-sm sm:text-base font-medium text-gray-900">
                                    {new Date(oportunidad.detalles[0].fecha_agenda).toLocaleDateString(
                                        "es-ES"
                                    )}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}