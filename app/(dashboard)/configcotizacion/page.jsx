"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useRequirePerm } from "@/hooks/useRequirePerm";

import ConversionTabPv from "@/app/components/configuracion/ConversionTabPv";
import HorariosCentroTab from "@/app/components/configuracion/HorariosCentroTab";
import TarifasTab from "@/app/components/configuracion/TarifasTab";

export default function ConfiguracionPage() {

  useRequirePerm("configuracion", "view");

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-semibold">Configuración del sistema</h1>

      <Tabs defaultValue="horarios">

        <TabsList className="grid grid-cols-2 md:grid-cols-9 w-full">

          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="conversion">Conversión</TabsTrigger>
          <TabsTrigger value="manoobra">Mano de Obra</TabsTrigger>
          <TabsTrigger value="panos">Paños</TabsTrigger>

        </TabsList>

        <TabsContent value="horarios">
          <Card>
            <CardContent className="pt-6">
              <HorariosCentroTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="conversion">
          <Card>
            <CardContent className="pt-6">
              <ConversionTabPv tipo="panos" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="manoobra">
          <Card>
            <CardContent className="pt-6">
              <TarifasTab tipo="mano_obra" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="panos">
          <Card>
            <CardContent className="pt-6">
              <TarifasTab tipo="panos" />
            </CardContent>
          </Card>
        </TabsContent>


      </Tabs>


    </div>
  );
}
