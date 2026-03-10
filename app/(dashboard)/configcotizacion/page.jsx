"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import DescuentosTab from "@/app/components/configuracion/DescuentosTab";


export default function ConfiguracionCotizacionPage() {

  useRequirePerm("configuracion", "view");

  return (
    <div className="space-y-6">

      <h1 className="text-2xl font-semibold">Configuración del sistema</h1>

      <Tabs defaultValue="centros">

        <TabsList className="grid grid-cols-2 md:grid-cols-9 w-full">

          <TabsTrigger value="centros">descuentos</TabsTrigger>


        </TabsList>

        <TabsContent value="centros">
          <Card>
            <CardContent className="pt-6">
              <DescuentosTab />
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>


    </div>
  );
}
