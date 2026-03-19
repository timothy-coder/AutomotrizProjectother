"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useRequirePerm } from "@/hooks/useRequirePerm";

import TipoInventarioTab from "@/app/components/tipoInventario/TipoInventarioTab";
import VersionesTab from "@/app/components/tipoInventario/VersionesTab";

export default function ConfiguracionInventarioPage() {

  useRequirePerm("configinventario", "view");

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-semibold">Configuración del sistema</h1>

      <Tabs defaultValue="tipoinventario">

        <TabsList className="grid grid-cols-2 md:grid-cols-9 w-full">

          <TabsTrigger value="tipoinventario">Tipo de Inventario</TabsTrigger>
          <TabsTrigger value="versiones">Versiones</TabsTrigger>

        </TabsList>

        <TabsContent value="tipoinventario">
          <Card>
            <CardContent className="pt-6">
              <TipoInventarioTab />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="versiones">
          <Card>
            <CardContent className="pt-6">
              <VersionesTab />
            </CardContent>
          </Card>
        </TabsContent>
       
      </Tabs>


    </div>
  );
}
