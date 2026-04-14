"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Gift,
  AlertCircle,
  Check,
  ChevronsUpDown,
} from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function RegalosPage() {
  const router = useRouter();
  const [regalos, setRegalos] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [impuestos, setImpuestos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMoneda, setFilterMoneda] = useState("todos");
  const [filterImpuesto, setFilterImpuesto] = useState("todos");
  const [filterRegalotienda, setFilterRegalotienda] = useState("todos");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRegalo, setSelectedRegalo] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Popovers
  const [openMoneda, setOpenMoneda] = useState(false);
  const [openImpuesto, setOpenImpuesto] = useState(false);

  // Form
  const [form, setForm] = useState({
    detalle: "",
    lote: "",
    precio_compra: "",
    precio_venta: "",
    moneda_id: "",
    impuesto_id: "",
    regalo_tienda: false,
  });

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [regalosRes, monedasRes, impuestosRes] = await Promise.all([
        fetch("/api/regalos-disponibles", { cache: "no-store" }),
        fetch("/api/monedas", { cache: "no-store" }),
        fetch("/api/impuestos", { cache: "no-store" }),
      ]);

      if (!regalosRes.ok) {
        throw new Error(`Error al cargar regalos: ${regalosRes.status}`);
      }
      if (!monedasRes.ok) {
        throw new Error(`Error al cargar monedas: ${monedasRes.status}`);
      }
      if (!impuestosRes.ok) {
        throw new Error(`Error al cargar impuestos: ${impuestosRes.status}`);
      }

      const regalosData = await regalosRes.json();
      const monedasData = await monedasRes.json();
      const impuestosData = await impuestosRes.json();

      setRegalos(Array.isArray(regalosData) ? regalosData : []);
      setMonedas(Array.isArray(monedasData) ? monedasData : []);
      setImpuestos(Array.isArray(impuestosData) ? impuestosData : []);
    } catch (error) {
      console.error("Error completo:", error);
      setError(error.message);
      toast.error(`Error: ${error.message}`);
      setRegalos([]);
      setMonedas([]);
      setImpuestos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar regalos
  const filteredRegalos = useMemo(() => {
    return regalos.filter((regalo) => {
      const matchSearch =
        !searchTerm ||
        regalo.detalle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        regalo.lote?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMoneda =
        filterMoneda === "todos" || regalo.moneda_id.toString() === filterMoneda;

      const matchImpuesto =
        filterImpuesto === "todos" || regalo.impuesto_id?.toString() === filterImpuesto;

      const matchRegalotienda =
        filterRegalotienda === "todos" ||
        (filterRegalotienda === "si" && regalo.regalo_tienda) ||
        (filterRegalotienda === "no" && !regalo.regalo_tienda);

      return matchSearch && matchMoneda && matchImpuesto && matchRegalotienda;
    });
  }, [regalos, searchTerm, filterMoneda, filterImpuesto, filterRegalotienda]);

  // Paginación
  const totalPages = Math.ceil(filteredRegalos.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedRegalos = filteredRegalos.slice(
    startIdx,
    startIdx + itemsPerPage
  );

  async function handleSave() {
    try {
      if (
        !form.detalle ||
        !form.lote ||
        !form.precio_compra ||
        !form.moneda_id
      ) {
        toast.warning("Completa los campos requeridos");
        return;
      }

      // ✅ Validar que precio_venta sea mayor que precio_compra
      if (form.precio_venta && parseFloat(form.precio_venta) < parseFloat(form.precio_compra)) {
        toast.warning("El precio de venta debe ser mayor o igual que el precio de compra");
        return;
      }

      setSaving(true);

      const payload = {
        detalle: form.detalle,
        lote: form.lote,
        precio_compra: form.precio_compra,
        precio_venta: form.precio_venta || null,
        moneda_id: form.moneda_id,
        impuesto_id: form.impuesto_id || null,
        regalo_tienda: form.regalo_tienda,
      };

      if (selectedRegalo) {
        const res = await fetch(`/api/regalos-disponibles/${selectedRegalo.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok) {
          toast.success("Regalo actualizado");
          setDialogOpen(false);
          loadData();
        } else {
          toast.error(data.message || "Error actualizando regalo");
        }
      } else {
        const res = await fetch("/api/regalos-disponibles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (res.ok) {
          toast.success("Regalo creado");
          setDialogOpen(false);
          setForm({
            detalle: "",
            lote: "",
            precio_compra: "",
            precio_venta: "",
            moneda_id: "",
            impuesto_id: impuestos.length > 0 ? impuestos[0].id.toString() : "",
            regalo_tienda: false,
          });
          loadData();
        } else {
          toast.error(data.message || "Error creando regalo");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Error guardando regalo");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      setSaving(true);

      const res = await fetch(`/api/regalos-disponibles/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Regalo eliminado");
        setDeleteDialog(false);
        loadData();
      } else {
        toast.error(data.message || "Error eliminando regalo");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando regalo");
    } finally {
      setSaving(false);
    }
  }

  function openCreateDialog() {
    setSelectedRegalo(null);
    setForm({
      detalle: "",
      lote: "",
      precio_compra: "",
      precio_venta: "",
      moneda_id: "",
      impuesto_id: impuestos.length > 0 ? impuestos[0].id.toString() : "",
      regalo_tienda: false,
    });
    setDialogOpen(true);
  }

  function openEditDialog(regalo) {
    setSelectedRegalo(regalo);
    setForm({
      detalle: regalo.detalle,
      lote: regalo.lote,
      precio_compra: regalo.precio_compra.toString(),
      precio_venta: regalo.precio_venta ? regalo.precio_venta.toString() : "",
      moneda_id: regalo.moneda_id.toString(),
      impuesto_id: regalo.impuesto_id ? regalo.impuesto_id.toString() : "",
      regalo_tienda: Boolean(regalo.regalo_tienda),
    });
    setDialogOpen(true);
  }

  const getMonedaLabel = (id) => {
    const m = monedas.find(mo => mo.id.toString() === id);
    return m ? `${m.nombre} (${m.simbolo})` : "Todas";
  };

  const getImpuestoLabel = (id) => {
    if (!id) {
      if (impuestos.length > 0) {
        return `${impuestos[0].nombre} (${impuestos[0].porcentaje}%)`;
      }
      return "Sin impuesto";
    }
    const i = impuestos.find(imp => imp.id.toString() === id);
    return i ? `${i.nombre} (${i.porcentaje}%)` : "Sin impuesto";
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: BRAND_PRIMARY }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 py-4 sm:py-8 px-3 sm:px-4 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 sm:h-8 w-6 sm:w-8 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-sm sm:text-base text-red-900">Error al cargar datos</h3>
                <p className="text-xs sm:text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <Button
              onClick={loadData}
              className="mt-4 bg-red-600 hover:bg-red-700 text-xs sm:text-sm"
            >
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-4 sm:space-y-6 py-1 max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="border-b pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <Gift className="h-6 sm:h-8 w-6 sm:w-8 flex-shrink-0" />
                <span>Regalos</span>
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: BRAND_SECONDARY }}>
                Gestiona todos los regalos disponibles
              </p>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openCreateDialog}
                  className="w-full sm:w-auto text-white text-xs sm:text-sm h-8 sm:h-9 gap-1 sm:gap-2"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                >
                  <Plus className="h-4 sm:h-5 w-4 sm:w-5" />
                  <span>Nuevo Regalo</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                Crear nuevo regalo
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help border-2" style={{ borderColor: `${BRAND_PRIMARY}30`, backgroundColor: `${BRAND_PRIMARY}08` }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>Total</p>
                      <p className="text-lg sm:text-3xl font-bold mt-1" style={{ color: BRAND_PRIMARY }}>
                        {regalos.length}
                      </p>
                    </div>
                    <span className="text-2xl sm:text-4xl flex-shrink-0">🎁</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Total de regalos disponibles
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help border-2" style={{ borderColor: '#e9d5ff40', backgroundColor: '#f3e8ff60' }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-purple-600">De Tienda</p>
                      <p className="text-lg sm:text-3xl font-bold mt-1 text-purple-900">
                        {regalos.filter(r => r.regalo_tienda).length}
                      </p>
                    </div>
                    <span className="text-2xl sm:text-4xl flex-shrink-0">🏪</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Regalos de tienda
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help border-2" style={{ borderColor: '#fed7aa40', backgroundColor: '#fef3c710' }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-orange-600">Monedas</p>
                      <p className="text-lg sm:text-3xl font-bold mt-1 text-orange-900">
                        {monedas.length}
                      </p>
                    </div>
                    <span className="text-2xl sm:text-4xl flex-shrink-0">💱</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Monedas configuradas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help border-2" style={{ borderColor: '#fce7f340', backgroundColor: '#fffbeb60' }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-yellow-600">Impuestos</p>
                      <p className="text-lg sm:text-3xl font-bold mt-1 text-yellow-900">
                        {impuestos.length}
                      </p>
                    </div>
                    <span className="text-2xl sm:text-4xl flex-shrink-0">📊</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Impuestos configurados
            </TooltipContent>
          </Tooltip>
        </div>

        {/* FILTROS */}
        <Card className="border-2" style={{ borderColor: `${BRAND_PRIMARY}30` }}>
          <CardHeader className="pb-3 sm:pb-4" style={{ backgroundColor: `${BRAND_PRIMARY}08` }}>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg" style={{ color: BRAND_PRIMARY }}>
              <Filter size={18} />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 sm:pt-6">
            <div className="space-y-3 sm:space-y-4">
              {/* Búsqueda */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: BRAND_SECONDARY }}>
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: BRAND_SECONDARY }} />
                  <Input
                    placeholder="Detalle, lote..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 text-xs sm:text-sm h-8 sm:h-9 border-gray-300"
                  />
                </div>
              </div>

              {/* Filtros */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {/* Moneda */}
                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: BRAND_SECONDARY }}>
                    Moneda
                  </label>
                  <Popover open={openMoneda} onOpenChange={setOpenMoneda}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openMoneda}
                        className="w-full justify-between text-xs sm:text-sm h-8 sm:h-9"
                      >
                        {getMonedaLabel(filterMoneda)}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar moneda..." className="text-xs" />
                        <CommandList>
                          <CommandEmpty>No encontrado</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="todos"
                              onSelect={() => {
                                setFilterMoneda("todos");
                                setCurrentPage(1);
                                setOpenMoneda(false);
                              }}
                              className="text-xs sm:text-sm cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  filterMoneda === "todos" ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              Todas
                            </CommandItem>
                            {monedas.map((moneda) => (
                              <CommandItem
                                key={moneda.id}
                                value={moneda.id.toString()}
                                onSelect={() => {
                                  setFilterMoneda(moneda.id.toString());
                                  setCurrentPage(1);
                                  setOpenMoneda(false);
                                }}
                                className="text-xs sm:text-sm cursor-pointer"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    filterMoneda === moneda.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                {moneda.nombre} ({moneda.simbolo})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Impuesto */}
                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: BRAND_SECONDARY }}>
                    Impuesto
                  </label>
                  <Popover open={openImpuesto} onOpenChange={setOpenImpuesto}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openImpuesto}
                        className="w-full justify-between text-xs sm:text-sm h-8 sm:h-9"
                      >
                        {filterImpuesto === "todos" ? "Todos" : getImpuestoLabel(filterImpuesto)}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar impuesto..." className="text-xs" />
                        <CommandList>
                          <CommandEmpty>No encontrado</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="todos"
                              onSelect={() => {
                                setFilterImpuesto("todos");
                                setCurrentPage(1);
                                setOpenImpuesto(false);
                              }}
                              className="text-xs sm:text-sm cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  filterImpuesto === "todos" ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              Todos
                            </CommandItem>
                            {impuestos.map((impuesto) => (
                              <CommandItem
                                key={impuesto.id}
                                value={impuesto.id.toString()}
                                onSelect={() => {
                                  setFilterImpuesto(impuesto.id.toString());
                                  setCurrentPage(1);
                                  setOpenImpuesto(false);
                                }}
                                className="text-xs sm:text-sm cursor-pointer"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    filterImpuesto === impuesto.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                {impuesto.nombre} ({impuesto.porcentaje}%)
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Regalo Tienda */}
                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: BRAND_SECONDARY }}>
                    Regalo Tienda
                  </label>
                  <Select
                    value={filterRegalotienda}
                    onValueChange={(value) => {
                      setFilterRegalotienda(value);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="text-xs sm:text-sm h-8 sm:h-9">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos" className="text-xs sm:text-sm">Todos</SelectItem>
                      <SelectItem value="si" className="text-xs sm:text-sm">Sí</SelectItem>
                      <SelectItem value="no" className="text-xs sm:text-sm">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Limpiar */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterMoneda("todos");
                      setFilterImpuesto("todos");
                      setFilterRegalotienda("todos");
                      setCurrentPage(1);
                    }}
                    className="w-full text-xs sm:text-sm h-8 sm:h-9"
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              {/* Resumen */}
              <div className="text-xs sm:text-sm" style={{ color: BRAND_SECONDARY }}>
                Mostrando <span className="font-semibold">{paginatedRegalos.length}</span> de{" "}
                <span className="font-semibold">{filteredRegalos.length}</span> regalos
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABLA */}
        <Card className="border-2" style={{ borderColor: `${BRAND_PRIMARY}30` }}>
          <CardContent className="p-0 sm:p-6">
            {paginatedRegalos.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-2 sm:mb-3">🎁</div>
                <p className="text-xs sm:text-base font-medium" style={{ color: BRAND_SECONDARY }}>
                  No hay regalos que coincidan con los filtros
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: `${BRAND_PRIMARY}08` }}>
                      <TableHead className="font-semibold text-xs sm:text-sm">ID</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm">Detalle</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm hidden sm:table-cell">Lote</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm">Precio Compra</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm hidden xl:table-cell">Precio Venta</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm hidden lg:table-cell">Tienda</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm hidden 2xl:table-cell">Impuesto</TableHead>
                      <TableHead className="font-semibold text-center text-xs sm:text-sm">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedRegalos.map((regalo, idx) => (
                      <TableRow
                        key={regalo.id}
                        className="hover:bg-blue-50 transition-colors"
                        style={{
                          backgroundColor: idx % 2 === 0 ? "white" : `${BRAND_PRIMARY}03`,
                        }}
                      >
                        <TableCell className="font-semibold text-xs sm:text-sm" style={{ color: BRAND_PRIMARY }}>
                          #{regalo.id}
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm max-w-[100px] sm:max-w-none truncate">
                          {regalo.detalle}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                          {regalo.lote}
                        </TableCell>
                        <TableCell className="font-semibold text-xs sm:text-sm text-green-600">
                          {regalo.simbolo} {parseFloat(regalo.precio_compra).toFixed(2)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <span className="text-xs sm:text-sm font-semibold text-blue-600">
                            {regalo.precio_venta 
                              ? `${regalo.simbolo} ${parseFloat(regalo.precio_venta).toFixed(2)}`
                              : "-"
                            }
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge 
                            className={`text-xs ${
                              regalo.regalo_tienda 
                                ? "bg-green-100 text-green-800 border border-green-300" 
                                : "bg-gray-100 text-gray-800 border border-gray-300"
                            }`}
                          >
                            {regalo.regalo_tienda ? "✓ Sí" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden 2xl:table-cell">
                          <span className="text-xs sm:text-sm text-gray-600">
                            {regalo.impuesto_nombre 
                              ? `${regalo.impuesto_nombre} (${regalo.impuesto_porcentaje}%)`
                              : "-"
                            }
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                                  onClick={() => openEditDialog(regalo)}
                                >
                                  <Pencil className="h-3 sm:h-4 w-3 sm:w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Editar
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                                  onClick={() => {
                                    setDeleteTarget(regalo);
                                    setDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-3 sm:h-4 w-3 sm:w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                Eliminar
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* PAGINACIÓN */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 mt-4 sm:mt-6 px-3 sm:px-0">
                <div className="text-xs sm:text-sm" style={{ color: BRAND_SECONDARY }}>
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="text-xs sm:text-sm"
                  >
                    ← Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage(Math.min(totalPages, currentPage + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="text-xs sm:text-sm"
                  >
                    Siguiente →
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DIALOG CREAR/EDITAR */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white rounded-lg flex flex-col">
          <DialogHeader className="pb-3 sm:pb-4 border-b flex-shrink-0" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                <Gift size={20} style={{ color: BRAND_PRIMARY }} />
              </div>
              <DialogTitle className="text-base sm:text-xl" style={{ color: BRAND_PRIMARY }}>
                {selectedRegalo ? "Editar Regalo" : "Nuevo Regalo"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-3 sm:space-y-4">
            <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>1</span>
                <span>Información</span>
              </h3>

              <div>
                <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Detalle *</label>
                <Input
                  value={form.detalle}
                  onChange={(e) =>
                    setForm({ ...form, detalle: e.target.value })
                  }
                  placeholder="Ej: Reloj de pulsera"
                  className="mt-1 text-xs sm:text-sm h-8 sm:h-9"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Lote *</label>
                <Input
                  value={form.lote}
                  onChange={(e) =>
                    setForm({ ...form, lote: e.target.value })
                  }
                  placeholder="Ej: REGALO-001"
                  className="mt-1 text-xs sm:text-sm h-8 sm:h-9"
                />
              </div>
            </div>

            <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>2</span>
                <span>Precios e Impuestos</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Precio Compra *</label>
                  <Input
                    type="number"
                    value={form.precio_compra}
                    onChange={(e) =>
                      setForm({ ...form, precio_compra: e.target.value })
                    }
                    placeholder="0.00"
                    step="0.01"
                    className="mt-1 text-xs sm:text-sm h-8 sm:h-9"
                  />
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Precio Venta</label>
                  <Input
                    type="number"
                    value={form.precio_venta}
                    onChange={(e) =>
                      setForm({ ...form, precio_venta: e.target.value })
                    }
                    placeholder="0.00"
                    step="0.01"
                    className="mt-1 text-xs sm:text-sm h-8 sm:h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Moneda *</label>
                  <Select
                    value={form.moneda_id}
                    onValueChange={(value) =>
                      setForm({ ...form, moneda_id: value })
                    }
                  >
                    <SelectTrigger className="mt-1 text-xs sm:text-sm h-8 sm:h-9">
                      <SelectValue placeholder="Selecciona moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {monedas.map((moneda) => (
                        <SelectItem key={moneda.id} value={moneda.id.toString()} className="text-xs sm:text-sm">
                          {moneda.nombre} ({moneda.simbolo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Impuesto</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between text-xs sm:text-sm h-8 sm:h-9 mt-1"
                      >
                        {getImpuestoLabel(form.impuesto_id)}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar impuesto..." className="text-xs" />
                        <CommandList>
                          <CommandEmpty>No encontrado</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="sin-impuesto"
                              onSelect={() => setForm({ ...form, impuesto_id: "" })}
                              className="text-xs sm:text-sm cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  !form.impuesto_id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              Sin impuesto
                            </CommandItem>
                            {impuestos.map((impuesto) => (
                              <CommandItem
                                key={impuesto.id}
                                value={impuesto.id.toString()}
                                onSelect={() =>
                                  setForm({ ...form, impuesto_id: impuesto.id.toString() })
                                }
                                className="text-xs sm:text-sm cursor-pointer"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    form.impuesto_id === impuesto.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                {impuesto.nombre} ({impuesto.porcentaje}%)
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>3</span>
                <span>Otros</span>
              </h3>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200">
                <input
                  type="checkbox"
                  id="regalo_tienda"
                  checked={form.regalo_tienda}
                  onChange={(e) =>
                    setForm({ ...form, regalo_tienda: e.target.checked })
                  }
                  className="w-4 h-4 cursor-pointer"
                  style={{ accentColor: BRAND_PRIMARY }}
                />
                <label htmlFor="regalo_tienda" className="text-xs sm:text-sm font-medium cursor-pointer" style={{ color: BRAND_PRIMARY }}>
                  ¿Es regalo de tienda?
                </label>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t flex-shrink-0 pt-3 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-4 flex flex-col-reverse sm:flex-row gap-2 justify-end" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="text-white text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto gap-1 sm:gap-2"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              {saving && <Loader2 className="h-3 sm:h-4 w-3 sm:w-4 animate-spin" />}
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG ELIMINAR */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-md w-full bg-white rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg" style={{ color: '#dc2626' }}>
              Eliminar Regalo
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs sm:text-sm" style={{ color: BRAND_SECONDARY }}>
            ¿Eliminar el regalo <span className="font-semibold" style={{ color: BRAND_PRIMARY }}>{deleteTarget?.detalle}</span>?
          </p>

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(false)}
              disabled={saving}
              className="text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
              className="text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto gap-1 sm:gap-2"
            >
              {saving && <Loader2 className="h-3 sm:h-4 w-3 sm:w-4 animate-spin" />}
              {saving ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}