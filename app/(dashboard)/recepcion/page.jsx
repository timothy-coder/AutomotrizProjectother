"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Plus, ClipboardList } from "lucide-react";
import RecepcionDialog from "@/app/components/recepciones/RecepcionDialog";

export default function RecepcionesPage() {
  const [tab, setTab] = useState("recepciones");
  const [recepciones, setRecepciones] = useState([]);
  const [citasHoy, setCitasHoy] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);

  async function loadRecepciones() {
    const r = await fetch("/api/recepciones");
    const data = await r.json();
    setRecepciones(data);
  }

  async function loadCitasHoy() {
    const hoy = format(new Date(), "yyyy-MM-dd");

    const r = await fetch(`/api/citas?fecha=${hoy}`);
    const data = await r.json();

    setCitasHoy(Array.isArray(data) ? data : []);
  }

  useEffect(() => {
    loadRecepciones();
    loadCitasHoy();
  }, []);

  function nuevaRecepcion() {
    setCitaSeleccionada(null);
    setOpenDialog(true);
  }

  function recepcionarDesdeCita(cita) {
    setCitaSeleccionada(cita);
    setOpenDialog(true);
  }

  return (
    <div className="p-4 space-y-4">

      <h1 className="text-2xl font-bold">Recepciones</h1>

      <Tabs value={tab} onValueChange={setTab}>

        <TabsList>
          <TabsTrigger value="recepciones">Recepciones</TabsTrigger>
          <TabsTrigger value="citas">Citas de hoy</TabsTrigger>
        </TabsList>

        {/* TAB RECEPCIONES */}
        <TabsContent value="recepciones">

          <div className="flex justify-between mb-3">
            <Button onClick={nuevaRecepcion}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva recepción
            </Button>
          </div>

          <div className="space-y-3">
            {recepciones.map(r => (
              <Card key={r.id} className="shadow-sm">
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">
                      {r.cliente_nombre}
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {r.placas}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {format(new Date(r.fecha_recepcion), "dd MMM yyyy", { locale: es })}
                      {" "}
                      {r.hora_recepcion?.slice(0,5)}
                    </div>
                  </div>

                  <ClipboardList className="text-primary" />
                </CardContent>
              </Card>
            ))}

            {!recepciones.length && (
              <p className="text-sm text-muted-foreground">
                No hay recepciones registradas.
              </p>
            )}
          </div>
        </TabsContent>

        {/* TAB CITAS HOY */}
        <TabsContent value="citas">

          <div className="space-y-3">
            {citasHoy.map(c => (
              <Card key={c.id}>
                <CardContent className="p-4 flex justify-between items-center">

                  <div>
                    <div className="font-semibold">{c.cliente}</div>
                    <div className="text-sm text-muted-foreground">{c.placa}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(c.start_at), "HH:mm")}
                    </div>
                  </div>

                  <Button size="sm" onClick={() => recepcionarDesdeCita(c)}>
                    Recepcionar
                  </Button>

                </CardContent>
              </Card>
            ))}

            {!citasHoy.length && (
              <p className="text-sm text-muted-foreground">
                No hay citas hoy.
              </p>
            )}
          </div>

        </TabsContent>

      </Tabs>

      <RecepcionDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        cita={citaSeleccionada}
        onSaved={loadRecepciones}
      />
    </div>
  );
}
