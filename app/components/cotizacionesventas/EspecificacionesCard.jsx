// app/(dashboard)/cotizaciones/[id]/resumen/components/EspecificacionesCard.jsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Zap,
    Video,
    Image as ImageIcon,
} from "lucide-react";

export function EspecificacionesCard({ especificaciones }) {
    if (especificaciones.length === 0) return null;

    return (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg text-blue-900">
                    Especificaciones del Modelo
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                    {especificaciones.map((espec) => (
                        <div
                            key={espec.id}
                            className="bg-white p-2 sm:p-4 rounded-lg border border-blue-200"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                {espec.especificacion_nombre === "motor" && (
                                    <Zap className="text-blue-600 flex-shrink-0" size={16} />
                                )}
                                {espec.especificacion_nombre === "full" && (
                                    <ImageIcon className="text-blue-600 flex-shrink-0" size={16} />
                                )}
                                {espec.especificacion_nombre === "imagen" && (
                                    <ImageIcon className="text-blue-600 flex-shrink-0" size={16} />
                                )}
                                {espec.especificacion_nombre === "video" && (
                                    <Video className="text-blue-600 flex-shrink-0" size={16} />
                                )}
                                <p className="text-xs font-semibold text-gray-700 capitalize truncate">
                                    {espec.especificacion_nombre}
                                </p>
                            </div>

                            {espec.tipo_dato === "media" && (
                                <img
                                    src={espec.valor}
                                    alt={espec.especificacion_nombre}
                                    className="w-full h-24 sm:h-32 object-cover rounded"
                                />
                            )}

                            {espec.tipo_dato === "texto" && espec.especificacion_nombre === "video" && (
                                <a
                                    href={espec.valor}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-xs break-all"
                                >
                                    Ver Video
                                </a>
                            )}

                            {espec.tipo_dato === "texto" &&
                                espec.especificacion_nombre !== "video" &&
                                !espec.valor.includes("http") && (
                                    <p className="text-sm sm:text-base font-bold text-gray-900">
                                        {espec.valor}
                                    </p>
                                )}

                            {espec.tipo_dato === "texto" && espec.valor.includes("http") && (
                                <img
                                    src={espec.valor}
                                    alt={espec.especificacion_nombre}
                                    className="w-full h-24 sm:h-32 object-cover rounded"
                                />
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}