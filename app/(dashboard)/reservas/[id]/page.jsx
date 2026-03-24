"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Eye,
  ArrowLeft,
  Building2,
  FileText,
  Download,
  Share2,
  CheckCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ReservaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { userId } = useAuth();
  const permitSignar = useRequirePerm("reservas", "firm");

  const [reserva, setReserva] = useState(null);
  const [oportunidad, setOportunidad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveIndicator, setAutoSaveIndicator] = useState(false);

  const [selectedTab, setSelectedTab] = useState("nota-pedido");

  // Form states - Nota de Pedido
  const [notaPedido, setNotaPedido] = useState({
    tipo_comprobante: "",
    cliente_rfc_legal: "",
    dni_ruc: "",
    fecha_nacimiento: "",
    ocupacion: "",
    provincia: "",
    correo: "",
    correo_copia: "",
    modelo: "",
    version: "",
    año_modelo: "",
    tipo_vehiculo: "",
    nper: "",
    bono_retoma: "",
    tarjeta_placa: "",
    flete: "",
    total: "",
    observaciones: "",
    aceptacion: "",
  });

  // Form states - Carta de Características
  const [cartaCaracteristicas, setCartaCaracteristicas] = useState({
    senores: "",
    presentante: "",
    referencia_cliente: "",
    estimados_senores: "",
    marca: "",
    modelo: "",
    ano_modelo: "",
    numero_chasis: "",
    numero_motor: "",
    color: "",
    clase: "",
    carroceria: "",
    valores_tc_ref: "",
    valor_vehiculo: "",
    cuota_inicial: "",
    monto_aprobado: "",
    observaciones: "",
  });

  const autoSaveDelay = useCallback(
    async (data, type) => {
      setSaving(true);
      setAutoSaveIndicator(true);

      try {
        // Simular guardado automático
        await new Promise((resolve) => setTimeout(resolve, 500));
        setAutoSaveIndicator(false);
      } catch (error) {
        console.error(error);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Auto-save con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (reserva) {
        autoSaveDelay(notaPedido, "nota_pedido");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [notaPedido]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (reserva) {
        autoSaveDelay(cartaCaracteristicas, "carta_caracteristicas");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [cartaCaracteristicas]);

  async function loadReservaDetail() {
    try {
      setLoading(true);
      const res = await fetch(`/api/reservas/${params.id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      setReserva(data);

      // Cargar oportunidad
      if (data.oportunidad_id) {
        const resOp = await fetch(`/api/oportunidades/${data.oportunidad_id}`, {
          cache: "no-store",
        });
        const dataOp = await resOp.json();
        setOportunidad(dataOp);
      }

      // Inicializar forms con datos existentes
      if (data.detalles && data.detalles.length > 0) {
        const detalle = data.detalles[0];
        setNotaPedido({
          tipo_comprobante: "",
          cliente_rfc_legal: "",
          dni_ruc: "",
          fecha_nacimiento: "",
          ocupacion: "",
          provincia: "",
          correo: "",
          correo_copia: "",
          modelo: detalle.modelo || "",
          version: "",
          año_modelo: detalle.anio || "",
          tipo_vehiculo: detalle.usovehiculo || "",
          nper: "",
          bono_retoma: detalle.dsctobonoretoma || "",
          tarjeta_placa: detalle.tarjetaplaca || "",
          flete: detalle.flete || "",
          total: detalle.subtotal || "",
          observaciones: detalle.descripcion || "",
          aceptacion: "",
        });

        setCartaCaracteristicas({
          senores: "",
          presentante: "",
          referencia_cliente: "",
          estimados_senores: "",
          marca: detalle.marca || "",
          modelo: detalle.modelo || "",
          ano_modelo: detalle.anio || "",
          numero_chasis: detalle.vin || "",
          numero_motor: "",
          color: detalle.color_externo || "",
          clase: "",
          carroceria: "",
          valores_tc_ref: "",
          valor_vehiculo: "",
          cuota_inicial: "",
          monto_aprobado: "",
          observaciones: "",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Error cargando reserva");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReservaDetail();
  }, [params.id]);

  const getEstadoBadge = (estado) => {
    const config = {
      borrador: { bg: "bg-gray-100", text: "text-gray-700", label: "Borrador" },
      enviado_firma: { bg: "bg-blue-100", text: "text-blue-700", label: "Enviado a Firma" },
      observado: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Observado" },
      subasando: { bg: "bg-purple-100", text: "text-purple-700", label: "Subasando" },
      firmado: { bg: "bg-green-100", text: "text-green-700", label: "Firmado" },
    };

    const cfg = config[estado] || config.borrador;
    return <Badge className={`${cfg.bg} ${cfg.text}`}>{cfg.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 py-8 px-4 max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.back()}
                >
                  <ArrowLeft size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Volver</TooltipContent>
            </Tooltip>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Reserva #{reserva?.id}
              </h1>
              <p className="text-gray-600 mt-1">
                Oportunidad #{reserva?.oportunidad_id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autoSaveIndicator && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded border border-blue-200">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-blue-600">
                  Guardando...
                </span>
              </div>
            )}
            {reserva && getEstadoBadge(reserva.estado)}
          </div>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/oportunidades/${reserva?.oportunidad_id}`)
                }
                className="gap-2"
              >
                <Building2 size={16} />
                Ver Oportunidad
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Ir a los detalles de la oportunidad
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download size={16} />
                Descargar PDF
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Descargar como PDF</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Share2 size={16} />
                Compartir
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Compartir reserva</TooltipContent>
          </Tooltip>

          {permitSignar && reserva?.estado === "enviado_firma" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <CheckCircle size={16} />
                  Firmar
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Firmar esta reserva
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* TABS */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nota-pedido">Nota de Pedido</TabsTrigger>
            <TabsTrigger value="carta-caracteristicas">
              Carta de Características
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: NOTA DE PEDIDO */}
          <TabsContent value="nota-pedido" className="space-y-4">
            <Card>
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText size={18} />
                    NOTA DE PEDIDO
                  </CardTitle>
                  <div className="text-sm text-gray-600">
                    SANTA CECILIA S.A. - Nissan
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* DATOS DEL CLIENTE */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    DATOS DEL CLIENTE
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Tipo de Comprobante
                      </label>
                      <Input
                        value={notaPedido.tipo_comprobante}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            tipo_comprobante: e.target.value,
                          })
                        }
                        placeholder="Boleta/Factura"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        DNI/RUC
                      </label>
                      <Input
                        value={notaPedido.dni_ruc}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            dni_ruc: e.target.value,
                          })
                        }
                        placeholder="12345678"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Correo
                      </label>
                      <Input
                        value={notaPedido.correo}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            correo: e.target.value,
                          })
                        }
                        placeholder="cliente@email.com"
                        type="email"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Correo Copia
                      </label>
                      <Input
                        value={notaPedido.correo_copia}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            correo_copia: e.target.value,
                          })
                        }
                        placeholder="copia@email.com"
                        type="email"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Ocupación
                      </label>
                      <Input
                        value={notaPedido.ocupacion}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            ocupacion: e.target.value,
                          })
                        }
                        placeholder="Profesión"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Provincia
                      </label>
                      <Input
                        value={notaPedido.provincia}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            provincia: e.target.value,
                          })
                        }
                        placeholder="Provincia"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* DATOS DEL VEHÍCULO */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    DATOS DEL VEHÍCULO
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Modelo
                      </label>
                      <Input
                        value={notaPedido.modelo}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            modelo: e.target.value,
                          })
                        }
                        placeholder="FRONTIER"
                        className="text-sm"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Versión
                      </label>
                      <Input
                        value={notaPedido.version}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            version: e.target.value,
                          })
                        }
                        placeholder="NUEVA 4WD X-E MT"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Año Modelo
                      </label>
                      <Input
                        value={notaPedido.año_modelo}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            año_modelo: e.target.value,
                          })
                        }
                        placeholder="2026"
                        className="text-sm"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Tipo de Vehículo
                      </label>
                      <Input
                        value={notaPedido.tipo_vehiculo}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            tipo_vehiculo: e.target.value,
                          })
                        }
                        placeholder="PARTICULAR"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* DESCUENTOS Y ADICIONALES */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    DESCUENTOS Y ADICIONALES
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Bono Retoma
                      </label>
                      <Input
                        type="number"
                        value={notaPedido.bono_retoma}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            bono_retoma: e.target.value,
                          })
                        }
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Tarjeta Placa
                      </label>
                      <Input
                        type="number"
                        value={notaPedido.tarjeta_placa}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            tarjeta_placa: e.target.value,
                          })
                        }
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Flete
                      </label>
                      <Input
                        type="number"
                        value={notaPedido.flete}
                        onChange={(e) =>
                          setNotaPedido({
                            ...notaPedido,
                            flete: e.target.value,
                          })
                        }
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* TOTAL */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-900">TOTAL:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${parseFloat(notaPedido.total || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* OBSERVACIONES */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Observaciones
                  </label>
                  <Textarea
                    value={notaPedido.observaciones}
                    onChange={(e) =>
                      setNotaPedido({
                        ...notaPedido,
                        observaciones: e.target.value,
                      })
                    }
                    placeholder="Observaciones adicionales..."
                    rows={4}
                    className="text-sm"
                  />
                </div>

                {/* ACEPTACIÓN */}
                <div className="border-t pt-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notaPedido.aceptacion === "si"}
                      onChange={(e) =>
                        setNotaPedido({
                          ...notaPedido,
                          aceptacion: e.target.checked ? "si" : "no",
                        })
                      }
                      className="w-5 h-5"
                    />
                    <span className="text-sm text-gray-700">
                      Acepto los términos y condiciones
                    </span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: CARTA DE CARACTERÍSTICAS */}
          <TabsContent value="carta-caracteristicas" className="space-y-4">
            <Card>
              <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText size={18} />
                    CARTA DE CARACTERÍSTICAS
                  </CardTitle>
                  <div className="text-sm text-gray-600">
                    SANTA CECILIA S.A.
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* ENCABEZADO */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">DATOS</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Señores
                      </label>
                      <Input
                        value={cartaCaracteristicas.senores}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            senores: e.target.value,
                          })
                        }
                        placeholder="MI BANCO S.A."
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Presentante
                      </label>
                      <Input
                        value={cartaCaracteristicas.presentante}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            presentante: e.target.value,
                          })
                        }
                        placeholder="Presentante"
                        className="text-sm"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Referencia Cliente
                      </label>
                      <Input
                        value={cartaCaracteristicas.referencia_cliente}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            referencia_cliente: e.target.value,
                          })
                        }
                        placeholder="Referencia"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* VEHÍCULO */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    INFORMACIÓN DEL VEHÍCULO
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Marca
                      </label>
                      <Input
                        value={cartaCaracteristicas.marca}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            marca: e.target.value,
                          })
                        }
                        placeholder="NISSAN"
                        className="text-sm"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Modelo
                      </label>
                      <Input
                        value={cartaCaracteristicas.modelo}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            modelo: e.target.value,
                          })
                        }
                        placeholder="FRONTIER"
                        className="text-sm"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Año Modelo
                      </label>
                      <Input
                        value={cartaCaracteristicas.ano_modelo}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            ano_modelo: e.target.value,
                          })
                        }
                        placeholder="2026"
                        className="text-sm"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Número de Chasis / VIN
                      </label>
                      <Input
                        value={cartaCaracteristicas.numero_chasis}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            numero_chasis: e.target.value,
                          })
                        }
                        placeholder="VIN"
                        className="text-sm"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Número de Motor
                      </label>
                      <Input
                        value={cartaCaracteristicas.numero_motor}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            numero_motor: e.target.value,
                          })
                        }
                        placeholder="Motor"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Color
                      </label>
                      <Input
                        value={cartaCaracteristicas.color}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            color: e.target.value,
                          })
                        }
                        placeholder="Color"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Clase
                      </label>
                      <Input
                        value={cartaCaracteristicas.clase}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            clase: e.target.value,
                          })
                        }
                        placeholder="Clase"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Carrocería
                      </label>
                      <Input
                        value={cartaCaracteristicas.carroceria}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            carroceria: e.target.value,
                          })
                        }
                        placeholder="Carrocería"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* VALORES */}
                <div className="border-b pb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">VALORES</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        T.C. Ref.
                      </label>
                      <Input
                        value={cartaCaracteristicas.valores_tc_ref}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            valores_tc_ref: e.target.value,
                          })
                        }
                        placeholder="3.4500"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Valor del Vehículo
                      </label>
                      <Input
                        type="number"
                        value={cartaCaracteristicas.valor_vehiculo}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            valor_vehiculo: e.target.value,
                          })
                        }
                        placeholder="15000.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Cuota Inicial
                      </label>
                      <Input
                        type="number"
                        value={cartaCaracteristicas.cuota_inicial}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            cuota_inicial: e.target.value,
                          })
                        }
                        placeholder="3000.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-2">
                        Monto Aprobado
                      </label>
                      <Input
                        type="number"
                        value={cartaCaracteristicas.monto_aprobado}
                        onChange={(e) =>
                          setCartaCaracteristicas({
                            ...cartaCaracteristicas,
                            monto_aprobado: e.target.value,
                          })
                        }
                        placeholder="12000.00"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* OBSERVACIONES */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Observaciones
                  </label>
                  <Textarea
                    value={cartaCaracteristicas.observaciones}
                    onChange={(e) =>
                      setCartaCaracteristicas({
                        ...cartaCaracteristicas,
                        observaciones: e.target.value,
                      })
                    }
                    placeholder="Observaciones adicionales..."
                    rows={4}
                    className="text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* INFO */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="text-3xl">ℹ️</div>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Auto-guardado habilitado
                </p>
                <p className="text-xs text-blue-700">
                  Los cambios se guardan automáticamente mientras escribes. No
                  necesitas hacer clic en un botón de guardar.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}