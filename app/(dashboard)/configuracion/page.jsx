"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useRequirePerm } from "@/hooks/useRequirePerm";

import CentrosTab from "@/app/components/configuracion/CentrosTab";
import TalleresMostradoresTab from "@/app/components/configuracion/TalleresMostradoresTab";
import MotivosTab from "@/app/components/configuracion/MotivosTab";
import OrigenesTab from "@/app/components/configuracion/OrigenesTab";
import SubOrigenesTab from "@/app/components/configuracion/SubOrigenesTab";
import HorariosCentroTab from "@/app/components/configuracion/HorariosCentroTab";
import TarifasTab from "@/app/components/configuracion/TarifasTab";
import MonedasTab from "@/app/components/configuracion/MonedasTab";

export default function ConfiguracionPage() {

  useRequirePerm("configuracion", "view");

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-semibold">Configuración del sistema</h1>

      <Tabs defaultValue="centros">

        <TabsList className="grid grid-cols-2 md:grid-cols-9 w-full">

          <TabsTrigger value="centros">Centros</TabsTrigger>
          <TabsTrigger value="talleres">Talleres / Mostradores</TabsTrigger>
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="motivos">Motivos</TabsTrigger>
          <TabsTrigger value="origenes">Orígenes</TabsTrigger>
          <TabsTrigger value="suborigenes">Sub Orígenes</TabsTrigger>
          <TabsTrigger value="manoobra">Mano de Obra</TabsTrigger>
          <TabsTrigger value="panos">Paños</TabsTrigger>
          <TabsTrigger value="moneda">Moneda</TabsTrigger>


        </TabsList>

        <TabsContent value="centros">
          <Card>
            <CardContent className="pt-6">
              <CentrosTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="talleres">
          <Card>
            <CardContent className="pt-6">
              <TalleresMostradoresTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="horarios">
          <Card>
            <CardContent className="pt-6">
              <HorariosCentroTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="motivos">
          <Card>
            <CardContent className="pt-6">
              <MotivosTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="origenes">
          <Card>
            <CardContent className="pt-6">
              <OrigenesTab />
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
        <TabsContent value="moneda">
          <Card>
            <CardContent className="pt-6">
              <MonedasTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="suborigenes">
          <Card>
            <CardContent className="pt-6">
              <SubOrigenesTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


    </div>
  );
}
