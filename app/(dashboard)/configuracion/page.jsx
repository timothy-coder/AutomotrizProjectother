"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useRequirePerm } from "@/hooks/useRequirePerm";

import CentrosTab from "@/app/components/configuracion/CentrosTab";
import TalleresMostradoresTab from "@/app/components/configuracion/TalleresMostradoresTab";
import MotivosTab from "@/app/components/configuracion/MotivosTab";
import OrigenesTab from "@/app/components/configuracion/OrigenesTab";
import HorariosCentroTab from "@/app/components/configuracion/HorariosCentroTab";
import TipoInventarioTab from "@/app/components/tipoInventario/TipoInventarioTab";

export default function ConfiguracionPage() {

  useRequirePerm("configuracion", "view");

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-semibold">Configuración del sistema</h1>

      <Tabs defaultValue="centros">

        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">

          <TabsTrigger value="centros">Centros</TabsTrigger>
          <TabsTrigger value="talleres">Talleres / Mostradores</TabsTrigger>
          <TabsTrigger value="motivos">Motivos</TabsTrigger>
          <TabsTrigger value="origenes">Orígenes</TabsTrigger>
          <TabsTrigger value="horarios">Horarios</TabsTrigger>
          <TabsTrigger value="tipoinventario">Tipo de Inventario</TabsTrigger>


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

        <TabsContent value="horarios">
          <Card>
            <CardContent className="pt-6">
              <HorariosCentroTab />
            </CardContent>
          </Card>
        </TabsContent>
<TabsContent value="tipoinventario">
          <Card>
            <CardContent className="pt-6">
              <TipoInventarioTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


    </div>
  );
}
