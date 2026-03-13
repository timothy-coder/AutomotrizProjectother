"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import {
  Plus,
  ClipboardList,
  Pencil,
  ImagePlus,
  Video,
  Mic,
} from "lucide-react";

import RecepcionDialog from "@/app/components/recepciones/RecepcionDialog";
import MediaRecepcionDialog from "@/app/components/recepciones/MediaRecepcionDialog";
import { useUserScope } from "@/hooks/useUserScope";

export default function RecepcionesPage() {
  const [tab, setTab] = useState("recepciones");

  const [recepciones, setRecepciones] = useState([]);
  const [citasHoy, setCitasHoy] = useState([]);
  const [centros, setCentros] = useState([]);

  const [centroId, setCentroId] = useState(null);

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);
  const [recepcionSeleccionada, setRecepcionSeleccionada] = useState(null);

  const [openMediaDialog, setOpenMediaDialog] = useState(false);
  const [mediaTab, setMediaTab] = useState("fotos");
  const [mediaRecepcion, setMediaRecepcion] = useState(null);

  const {
    centros: allowedCentros,
    talleres: allowedTalleres,
    loading: scopeLoading,
  } = useUserScope();

  useEffect(() => {
    if (scopeLoading) return;

    async function loadCentros() {
      try {
        const r = await fetch("/api/centros", { cache: "no-store" });
        const data = await r.json();
        const lista = Array.isArray(data) ? data : [];

        const filtrados = lista.filter((c) =>
          allowedCentros.includes(Number(c.id))
        );

        setCentros(filtrados);

        setCentroId((prev) => {
          if (prev && filtrados.some((c) => Number(c.id) === Number(prev))) {
            return prev;
          }
          return filtrados.length ? Number(filtrados[0].id) : null;
        });
      } catch (error) {
        console.error(error);
        setCentros([]);
        setCentroId(null);
      }
    }

    loadCentros();
  }, [scopeLoading, allowedCentros]);

  async function loadRecepciones() {
    try {
      const r = await fetch("/api/recepciones", { cache: "no-store" });
      const data = await r.json();
      let lista = Array.isArray(data) ? data : [];

      if (allowedCentros.length > 0) {
        lista = lista.filter((x) =>
          allowedCentros.includes(Number(x.centro_id))
        );
      }

      if (allowedTalleres.length > 0) {
        lista = lista.filter((x) => {
          if (x.taller_id == null) return true;
          return allowedTalleres.includes(Number(x.taller_id));
        });
      }

      if (centroId) {
        lista = lista.filter((x) => Number(x.centro_id) === Number(centroId));
      }

      setRecepciones(lista);
    } catch (error) {
      console.error(error);
      setRecepciones([]);
    }
  }

  async function loadCitasHoy() {
    if (!centroId) {
      setCitasHoy([]);
      return;
    }

    try {
      const hoy = format(new Date(), "yyyy-MM-dd");

      const [citasRes, recepcionesRes] = await Promise.all([
        fetch(`/api/citas?centro_id=${centroId}&start=${hoy}&end=${hoy}`, {
          cache: "no-store",
        }),
        fetch("/api/recepciones", { cache: "no-store" }),
      ]);

      const citasData = await citasRes.json();
      const recepcionesData = await recepcionesRes.json();

      let listaCitas = Array.isArray(citasData) ? citasData : [];
      let listaRecepciones = Array.isArray(recepcionesData)
        ? recepcionesData
        : [];

      if (allowedCentros.length > 0) {
        listaRecepciones = listaRecepciones.filter((x) =>
          allowedCentros.includes(Number(x.centro_id))
        );
      }

      if (allowedTalleres.length > 0) {
        listaCitas = listaCitas.filter((x) => {
          if (x.taller_id == null) return true;
          return allowedTalleres.includes(Number(x.taller_id));
        });

        listaRecepciones = listaRecepciones.filter((x) => {
          if (x.taller_id == null) return true;
          return allowedTalleres.includes(Number(x.taller_id));
        });
      }

      const citasRecepcionadas = new Set(
        listaRecepciones
          .map((r) => Number(r.cita_id))
          .filter((id) => Number.isInteger(id) && id > 0)
      );

      listaCitas = listaCitas.filter(
        (c) => !citasRecepcionadas.has(Number(c.id))
      );

      setCitasHoy(listaCitas);
    } catch (error) {
      console.error(error);
      setCitasHoy([]);
    }
  }

  useEffect(() => {
    if (scopeLoading) return;
    loadRecepciones();
  }, [scopeLoading, centroId, allowedCentros, allowedTalleres]);

  useEffect(() => {
    if (scopeLoading) return;
    loadCitasHoy();
  }, [scopeLoading, centroId, allowedCentros, allowedTalleres]);

  function nuevaRecepcion() {
    setDialogMode("create");
    setRecepcionSeleccionada(null);
    setCitaSeleccionada(null);
    setOpenDialog(true);
  }

  async function recepcionarDesdeCita(cita) {
    try {
      const r = await fetch(`/api/citas/${cita.id}`, {
        cache: "no-store",
      });

      const data = await r.json();

      if (!r.ok) {
        throw new Error(data?.message || "No se pudo cargar la cita");
      }

      setDialogMode("create");
      setRecepcionSeleccionada(null);
      setCitaSeleccionada(data);
      setOpenDialog(true);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error cargando la cita");
    }
  }

  async function editarRecepcion(recepcion) {
    try {
      const r = await fetch(`/api/recepciones/${recepcion.id}`, {
        cache: "no-store",
      });
      const data = await r.json();

      if (!r.ok) {
        throw new Error(data?.message || "No se pudo cargar la recepción");
      }

      setDialogMode("edit");
      setRecepcionSeleccionada(data);
      setCitaSeleccionada(null);
      setOpenDialog(true);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error cargando recepción");
    }
  }

  function abrirMediaDialog(recepcion, tabInicial) {
    setMediaRecepcion(recepcion);
    setMediaTab(tabInicial);
    setOpenMediaDialog(true);
  }

  function crearOrden(recepcion) {
    toast(`Crear orden para recepción #${recepcion.id}`);
  }

  const recepcionesFiltradas = useMemo(() => recepciones, [recepciones]);
  const citasFiltradas = useMemo(() => citasHoy, [citasHoy]);

  if (scopeLoading) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">Recepciones</h1>
        <p className="text-sm text-muted-foreground mt-2">Cargando...</p>
      </div>
    );
  }

  if (centros.length === 0) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold">Recepciones</h1>
        <p className="text-sm text-muted-foreground mt-2">
          No tienes centros asignados.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Recepciones</h1>

        <div className="w-[220px]">
          <Select
            value={centroId ? String(centroId) : ""}
            onValueChange={(v) => setCentroId(Number(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Centro" />
            </SelectTrigger>
            <SelectContent>
              {centros.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.nombre || c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="recepciones">Recepciones</TabsTrigger>
          <TabsTrigger value="citas">Citas de hoy</TabsTrigger>
        </TabsList>

        <TabsContent value="recepciones">
          <div className="flex justify-between mb-3">
            <Button onClick={nuevaRecepcion}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva recepción
            </Button>
          </div>

          <div className="space-y-3">
            {recepcionesFiltradas.map((r) => (
              <Card key={r.id} className="shadow-sm">
                <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
                  <div>
                    <div className="font-semibold">{r.cliente_nombre}</div>

                    <div className="text-sm text-muted-foreground">
                      {r.placas || "-"}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      {format(new Date(r.fecha_recepcion), "dd MMM yyyy", {
                        locale: es,
                      })}{" "}
                      {r.hora_recepcion?.slice(0, 5)}
                    </div>

                    <div className="text-xs text-muted-foreground mt-1">
                      Centro: {r.centro || "-"} | Taller: {r.taller || "-"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => editarRecepcion(r)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirMediaDialog(r, "fotos")}
                    >
                      <ImagePlus className="w-4 h-4 mr-2" />
                      Fotos
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirMediaDialog(r, "videos")}
                    >
                      <Video className="w-4 h-4 mr-2" />
                      Video
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => abrirMediaDialog(r, "audios")}
                    >
                      <Mic className="w-4 h-4 mr-2" />
                      Audios
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => crearOrden(r)}
                    >
                      Crear orden
                    </Button>

                    <ClipboardList className="text-primary self-center ml-1" />
                  </div>
                </CardContent>
              </Card>
            ))}

            {!recepcionesFiltradas.length && (
              <p className="text-sm text-muted-foreground">
                No hay recepciones registradas.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="citas">
          <div className="space-y-3">
            {citasFiltradas.map((c) => (
              <Card key={c.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{c.cliente}</div>
                    <div className="text-sm text-muted-foreground">
                      {c.placa}
                    </div>
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

            {!citasFiltradas.length && (
              <p className="text-sm text-muted-foreground">
                No hay citas hoy.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <RecepcionDialog
        open={openDialog}
        onOpenChange={(v) => {
          setOpenDialog(v);
          if (!v) {
            setCitaSeleccionada(null);
            setRecepcionSeleccionada(null);
          }
        }}
        mode={dialogMode}
        cita={citaSeleccionada}
        recepcion={recepcionSeleccionada}
        onSaved={() => {
          loadRecepciones();
          loadCitasHoy();
          setCitaSeleccionada(null);
          setRecepcionSeleccionada(null);
        }}
      />

      <MediaRecepcionDialog
        open={openMediaDialog}
        onOpenChange={setOpenMediaDialog}
        recepcion={mediaRecepcion}
        initialTab={mediaTab}
      />
    </div>
  );
}