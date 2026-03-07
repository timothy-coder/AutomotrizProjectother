"use client";

import { useState } from "react";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import CotizacionForm from "@/app/components/cotizaciones/CotizacionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, PaintBucket, MoreHorizontal, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const TIPOS = [
  {
    value: "taller",
    label: "Taller",
    description: "Cotización de servicios de taller mecánico",
    icon: Wrench,
  },
  {
    value: "pyp",
    label: "Planchado y Pintura",
    description: "Cotización de planchado y pintura",
    icon: PaintBucket,
  },
  {
    value: "otros",
    label: "Otros",
    description: "Otro tipo de cotización",
    icon: MoreHorizontal,
  },
];

export default function NuevaCotizacionGeneralPage() {
  useRequirePerm("cotizacion", "create");

  const router = useRouter();
  const [selectedTipo, setSelectedTipo] = useState(null);

  if (!selectedTipo) {
    return (
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/cotizacion")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Nueva Cotización</h1>
            <p className="text-sm text-muted-foreground">
              Seleccione el tipo de cotización que desea crear
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {TIPOS.map((t) => {
            const Icon = t.icon;
            return (
              <Card
                key={t.value}
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                onClick={() => setSelectedTipo(t.value)}
              >
                <CardContent className="flex items-center gap-4 py-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">{t.label}</p>
                    <p className="text-sm text-muted-foreground">{t.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <CotizacionForm tipo={selectedTipo} backUrl="/cotizacion" />
    </div>
  );
}
