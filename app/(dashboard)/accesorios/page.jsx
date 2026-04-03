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
  Container,
  AlertCircle,
  Check,
  ChevronsUpDown,
} from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function AccesoriosPage() {
  const router = useRouter();
  const [accesorios, setAccesorios] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMarca, setFilterMarca] = useState("todos");
  const [filterModelo, setFilterModelo] = useState("todos");
  const [filterMoneda, setFilterMoneda] = useState("todos");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAccesorio, setSelectedAccesorio] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Popovers
  const [openMarca, setOpenMarca] = useState(false);
  const [openModelo, setOpenModelo] = useState(false);
  const [openMoneda, setOpenMoneda] = useState(false);

  // Form
  const [form, setForm] = useState({
    marca_id: "",
    modelo_id: "",
    detalle: "",
    numero_parte: "",
    precio: "",
    moneda_id: "",
  });

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const [accesoriosRes, marcasRes, modelosRes, monedasRes] =
        await Promise.all([
          fetch("/api/accesorios-disponibles", { cache: "no-store" }),
          fetch("/api/marcas", { cache: "no-store" }),
          fetch("/api/modelos", { cache: "no-store" }),
          fetch("/api/monedas", { cache: "no-store" }),
        ]);

      if (!accesoriosRes.ok) {
        throw new Error(`Error al cargar accesorios: ${accesoriosRes.status}`);
      }
      if (!marcasRes.ok) {
        throw new Error(`Error al cargar marcas: ${marcasRes.status}`);
      }
      if (!modelosRes.ok) {
        throw new Error(`Error al cargar modelos: ${modelosRes.status}`);
      }
      if (!monedasRes.ok) {
        throw new Error(`Error al cargar monedas: ${monedasRes.status}`);
      }

      const accesoriosData = await accesoriosRes.json();
      const marcasData = await marcasRes.json();
      const modelosData = await modelosRes.json();
      const monedasData = await monedasRes.json();

      setAccesorios(Array.isArray(accesoriosData) ? accesoriosData : []);
      setMarcas(Array.isArray(marcasData) ? marcasData : []);
      setModelos(Array.isArray(modelosData) ? modelosData : []);
      setMonedas(Array.isArray(monedasData) ? monedasData : []);
    } catch (error) {
      console.error("Error completo:", error);
      setError(error.message);
      toast.error(`Error: ${error.message}`);
      setAccesorios([]);
      setMarcas([]);
      setModelos([]);
      setMonedas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filtrar accesorios
  const filteredAccesorios = useMemo(() => {
    return accesorios.filter((acc) => {
      const matchSearch =
        !searchTerm ||
        acc.detalle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        acc.numero_parte?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMarca =
        filterMarca === "todos" || acc.marca_id.toString() === filterMarca;

      const matchModelo =
        filterModelo === "todos" || acc.modelo_id.toString() === filterModelo;

      const matchMoneda =
        filterMoneda === "todos" || acc.moneda_id.toString() === filterMoneda;

      return matchSearch && matchMarca && matchModelo && matchMoneda;
    });
  }, [accesorios, searchTerm, filterMarca, filterModelo, filterMoneda]);

  // Paginación
  const totalPages = Math.ceil(filteredAccesorios.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedAccesorios = filteredAccesorios.slice(
    startIdx,
    startIdx + itemsPerPage
  );

  async function handleSave() {
    try {
      if (
        !form.marca_id ||
        !form.modelo_id ||
        !form.detalle ||
        !form.numero_parte ||
        !form.precio ||
        !form.moneda_id
      ) {
        toast.warning("Completa todos los campos");
        return;
      }

      setSaving(true);

      if (selectedAccesorio) {
        const res = await fetch(`/api/accesorios/${selectedAccesorio.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await res.json();

        if (res.ok) {
          toast.success("Accesorio actualizado");
          setDialogOpen(false);
          loadData();
        } else {
          toast.error(data.message || "Error actualizando accesorio");
        }
      } else {
        const res = await fetch("/api/accesorios-disponibles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });

        const data = await res.json();

        if (res.ok) {
          toast.success("Accesorio creado");
          setDialogOpen(false);
          setForm({
            marca_id: "",
            modelo_id: "",
            detalle: "",
            numero_parte: "",
            precio: "",
            moneda_id: "",
          });
          loadData();
        } else {
          toast.error(data.message || "Error creando accesorio");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Error guardando accesorio");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      setSaving(true);

      const res = await fetch(`/api/accesorios-disponibles/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Accesorio eliminado");
        setDeleteDialog(false);
        loadData();
      } else {
        toast.error(data.message || "Error eliminando accesorio");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando accesorio");
    } finally {
      setSaving(false);
    }
  }

  function openCreateDialog() {
    setSelectedAccesorio(null);
    setForm({
      marca_id: "",
      modelo_id: "",
      detalle: "",
      numero_parte: "",
      precio: "",
      moneda_id: "",
    });
    setDialogOpen(true);
  }

  function openEditDialog(accesorio) {
    setSelectedAccesorio(accesorio);
    setForm({
      marca_id: accesorio.marca_id.toString(),
      modelo_id: accesorio.modelo_id.toString(),
      detalle: accesorio.detalle,
      numero_parte: accesorio.numero_parte,
      precio: accesorio.precio.toString(),
      moneda_id: accesorio.moneda_id.toString(),
    });
    setDialogOpen(true);
  }

  const getMarcaName = (id) => marcas.find(m => m.id.toString() === id)?.name;
  const getModeloName = (id) => modelos.find(m => m.id.toString() === id)?.name;
  const getMonedaLabel = (id) => {
    const m = monedas.find(mo => mo.id.toString() === id);
    return m ? `${m.nombre} (${m.simbolo})` : "Todas";
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
                <Container className="h-6 sm:h-8 w-6 sm:w-8 flex-shrink-0" />
                <span>Accesorios</span>
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: BRAND_SECONDARY }}>
                Gestiona todos los accesorios disponibles
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
                  <span>Nuevo Accesorio</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                Crear nuevo accesorio
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
                        {accesorios.length}
                      </p>
                    </div>
                    <span className="text-2xl sm:text-4xl flex-shrink-0">📦</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Total de accesorios disponibles
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help border-2" style={{ borderColor: '#e9d5ff40', backgroundColor: '#f3e8ff60' }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-purple-600">Marcas</p>
                      <p className="text-lg sm:text-3xl font-bold mt-1 text-purple-900">
                        {marcas.length}
                      </p>
                    </div>
                    <span className="text-2xl sm:text-4xl flex-shrink-0">🏷️</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Marcas con accesorios
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help border-2" style={{ borderColor: '#dcfce740', backgroundColor: '#dcfce710' }}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm font-medium text-green-600">Modelos</p>
                      <p className="text-lg sm:text-3xl font-bold mt-1 text-green-900">
                        {modelos.length}
                      </p>
                    </div>
                    <span className="text-2xl sm:text-4xl flex-shrink-0">🚗</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Modelos disponibles
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="cursor-help border-2 col-span-2 sm:col-span-1" style={{ borderColor: '#fed7aa40', backgroundColor: '#fef3c710' }}>
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
              {/* Fila 1: Búsqueda */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: BRAND_SECONDARY }}>
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4" style={{ color: BRAND_SECONDARY }} />
                  <Input
                    placeholder="Detalle, número de parte..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 text-xs sm:text-sm h-8 sm:h-9 border-gray-300"
                  />
                </div>
              </div>

              {/* Fila 2: Selects con Command */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                {/* Marca */}
                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: BRAND_SECONDARY }}>
                    Marca
                  </label>
                  <Popover open={openMarca} onOpenChange={setOpenMarca}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openMarca}
                        className="w-full justify-between text-xs sm:text-sm h-8 sm:h-9"
                      >
                        {getMarcaName(filterMarca) || "Todas"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar marca..." className="text-xs" />
                        <CommandList>
                          <CommandEmpty>No encontrado</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="todos"
                              onSelect={() => {
                                setFilterMarca("todos");
                                setCurrentPage(1);
                                setOpenMarca(false);
                              }}
                              className="text-xs sm:text-sm cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  filterMarca === "todos" ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              Todas
                            </CommandItem>
                            {marcas.map((marca) => (
                              <CommandItem
                                key={marca.id}
                                value={marca.id.toString()}
                                onSelect={() => {
                                  setFilterMarca(marca.id.toString());
                                  setCurrentPage(1);
                                  setOpenMarca(false);
                                }}
                                className="text-xs sm:text-sm cursor-pointer"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    filterMarca === marca.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                {marca.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Modelo */}
                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: BRAND_SECONDARY }}>
                    Modelo
                  </label>
                  <Popover open={openModelo} onOpenChange={setOpenModelo}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openModelo}
                        className="w-full justify-between text-xs sm:text-sm h-8 sm:h-9"
                      >
                        {getModeloName(filterModelo) || "Todos"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar modelo..." className="text-xs" />
                        <CommandList>
                          <CommandEmpty>No encontrado</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              value="todos"
                              onSelect={() => {
                                setFilterModelo("todos");
                                setCurrentPage(1);
                                setOpenModelo(false);
                              }}
                              className="text-xs sm:text-sm cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  filterModelo === "todos" ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              Todos
                            </CommandItem>
                            {modelos.map((modelo) => (
                              <CommandItem
                                key={modelo.id}
                                value={modelo.id.toString()}
                                onSelect={() => {
                                  setFilterModelo(modelo.id.toString());
                                  setCurrentPage(1);
                                  setOpenModelo(false);
                                }}
                                className="text-xs sm:text-sm cursor-pointer"
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    filterModelo === modelo.id.toString()
                                      ? "opacity-100"
                                      : "opacity-0"
                                  }`}
                                />
                                {modelo.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Moneda */}
                <div>
                  <label className="text-xs font-medium block mb-2" style={{ color: BRAND_SECONDARY }} >
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

                {/* Limpiar */}
                <div className="flex items-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("");
                      setFilterMarca("todos");
                      setFilterModelo("todos");
                      setFilterMoneda("todos");
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
                Mostrando <span className="font-semibold">{paginatedAccesorios.length}</span> de{" "}
                <span className="font-semibold">{filteredAccesorios.length}</span> accesorios
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TABLA */}
        <Card className="border-2" style={{ borderColor: `${BRAND_PRIMARY}30` }}>
          <CardContent className="p-0 sm:p-6">
            {paginatedAccesorios.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-2 sm:mb-3">📦</div>
                <p className="text-xs sm:text-base font-medium" style={{ color: BRAND_SECONDARY }}>
                  No hay accesorios que coincidan con los filtros
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: `${BRAND_PRIMARY}08` }}>
                      <TableHead className="font-semibold text-xs sm:text-sm">ID</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm">Detalle</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm hidden sm:table-cell">N° Parte</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm hidden md:table-cell">Marca</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm hidden lg:table-cell">Modelo</TableHead>
                      <TableHead className="font-semibold text-xs sm:text-sm">Precio</TableHead>
                      <TableHead className="font-semibold text-center text-xs sm:text-sm">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAccesorios.map((acc, idx) => (
                      <TableRow
                        key={acc.id}
                        className="hover:bg-blue-50 transition-colors"
                        style={{
                          backgroundColor: idx % 2 === 0 ? "white" : `${BRAND_PRIMARY}03`,
                        }}
                      >
                        <TableCell className="font-semibold text-xs sm:text-sm" style={{ color: BRAND_PRIMARY }}>
                          #{acc.id}
                        </TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm max-w-[100px] sm:max-w-none truncate">
                          {acc.detalle}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm text-gray-600 hidden sm:table-cell">
                          {acc.numero_parte}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {acc.marca_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="secondary" className="text-xs">
                            {acc.modelo_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-xs sm:text-sm text-green-600">
                          {acc.simbolo} {parseFloat(acc.precio).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1 sm:gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 sm:h-8 w-7 sm:w-8 p-0"
                                  onClick={() => openEditDialog(acc)}
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
                                    setDeleteTarget(acc);
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
                <Container size={20} style={{ color: BRAND_PRIMARY }} />
              </div>
              <DialogTitle className="text-base sm:text-xl" style={{ color: BRAND_PRIMARY }}>
                {selectedAccesorio ? "Editar Accesorio" : "Nuevo Accesorio"}
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
                <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Marca</label>
                <Select
                  value={form.marca_id}
                  onValueChange={(value) =>
                    setForm({ ...form, marca_id: value })
                  }
                >
                  <SelectTrigger className="mt-1 text-xs sm:text-sm h-8 sm:h-9">
                    <SelectValue placeholder="Selecciona marca" />
                  </SelectTrigger>
                  <SelectContent>
                    {marcas.map((marca) => (
                      <SelectItem key={marca.id} value={marca.id.toString()} className="text-xs sm:text-sm">
                        {marca.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Modelo</label>
                <Select
                  value={form.modelo_id}
                  onValueChange={(value) =>
                    setForm({ ...form, modelo_id: value })
                  }
                >
                  <SelectTrigger className="mt-1 text-xs sm:text-sm h-8 sm:h-9">
                    <SelectValue placeholder="Selecciona modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelos.map((modelo) => (
                      <SelectItem key={modelo.id} value={modelo.id.toString()} className="text-xs sm:text-sm">
                        {modelo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Detalle</label>
                <Input
                  value={form.detalle}
                  onChange={(e) =>
                    setForm({ ...form, detalle: e.target.value })
                  }
                  placeholder="Ej: Tapete de alfombra"
                  className="mt-1 text-xs sm:text-sm h-8 sm:h-9"
                />
              </div>

              <div>
                <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Número de Parte</label>
                <Input
                  value={form.numero_parte}
                  onChange={(e) =>
                    setForm({ ...form, numero_parte: e.target.value })
                  }
                  placeholder="Ej: ACC-001"
                  className="mt-1 text-xs sm:text-sm h-8 sm:h-9"
                />
              </div>
            </div>

            <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>2</span>
                <span>Precio</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Precio</label>
                  <Input
                    type="number"
                    value={form.precio}
                    onChange={(e) =>
                      setForm({ ...form, precio: e.target.value })
                    }
                    placeholder="0.00"
                    step="0.01"
                    className="mt-1 text-xs sm:text-sm h-8 sm:h-9"
                  />
                </div>

                <div>
                  <label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Moneda</label>
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
              Eliminar Accesorio
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs sm:text-sm" style={{ color: BRAND_SECONDARY }}>
            ¿Eliminar el accesorio <span className="font-semibold" style={{ color: BRAND_PRIMARY }}>{deleteTarget?.detalle}</span>?
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