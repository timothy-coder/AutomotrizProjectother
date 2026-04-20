"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useRequirePerm } from "@/hooks/useRequirePerm";

import ConversionTab from "@/app/components/configuracion/ConversionTab";
import ConfiguracionEstadosTiempoTab from "@/app/components/configuracion/ConfiguracionEstadosTiempoTab";
import AgendaCentroTab from "@/app/components/configuracion/AgendaCentroTab";
import EspecificacionesTab from "@/app/components/configuracion/EspecficacionesTab";
import CierresDetalleTab from "@/app/components/configuracion/CierreDetalleTab";

export default function ConfiguracionAgendaPage() {

  useRequirePerm("configagenda", "view");

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-semibold">Configuración del sistema</h1>

      <Tabs defaultValue="horarios">

        <TabsList className="grid grid-cols-2 md:grid-cols-9 w-full">

          <TabsTrigger value="horarios">Horarios Agenda</TabsTrigger>
          <TabsTrigger value="conversion">Etapas de Conversión</TabsTrigger>
          <TabsTrigger value="tiempos">Tiempos</TabsTrigger>
          <TabsTrigger value="tipoespecificaciones">Tipo de Especificaciones</TabsTrigger>
          <TabsTrigger value="cierres">Detalles de cierre</TabsTrigger>
        </TabsList>
        <TabsContent value="horarios">
          <Card>
            <CardContent className="pt-6">
              <AgendaCentroTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="conversion">
          <Card>
            <CardContent className="pt-6">
              <ConversionTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tiempos">
          <Card>
            <CardContent className="pt-6">
              <ConfiguracionEstadosTiempoTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="tipoespecificaciones">
          <Card>
            <CardContent className="pt-6">
              <EspecificacionesTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="cierres">
          <Card>
            <CardContent className="pt-6">
              <CierresDetalleTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


    </div>
  );
}
