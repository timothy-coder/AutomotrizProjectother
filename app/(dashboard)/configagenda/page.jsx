"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useRequirePerm } from "@/hooks/useRequirePerm";

import ConversionTab from "@/app/components/configuracion/ConversionTab";

import AgendaCentroTab from "@/app/components/configuracion/AgendaCentroTab";

export default function ConfiguracionAgendaPage() {

  useRequirePerm("configagenda", "view");

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-semibold">Configuración del sistema</h1>

      <Tabs defaultValue="horarios">

        <TabsList className="grid grid-cols-2 md:grid-cols-9 w-full">

          <TabsTrigger value="horarios">Horarios Agenda</TabsTrigger>
          <TabsTrigger value="conversion">Etapas de Conversión</TabsTrigger>


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
      </Tabs>


    </div>
  );
}
