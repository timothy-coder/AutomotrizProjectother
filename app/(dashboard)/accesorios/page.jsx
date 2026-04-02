"use client";

import { useEffect, useState } from "react";
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
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Filter,
  Eye,
  Package,
  AlertCircle,
} from "lucide-react";

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

      // Validar respuestas
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
  const filteredAccesorios = accesorios.filter((acc) => {
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
        // Actualizar
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
        // Crear
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 py-8 px-4 max-w-7xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-900">Error al cargar datos</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <Button
              onClick={loadData}
              className="mt-4 bg-red-600 hover:bg-red-700"
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
      <div className="space-y-6 py-8 px-4 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="border-b pb-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-8 w-8 text-blue-600" />
                Accesorios
              </h1>
              <p className="text-gray-600 mt-1">
                Gestiona todos los accesorios disponibles
              </p>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openCreateDialog}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Nuevo Accesorio
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                Crear nuevo accesorio
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total</p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {accesorios.length}
                      </p>
                    </div>
                    <span className="text-4xl">📦</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Total de accesorios disponibles
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">Marcas</p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">
                        {marcas.length}
                      </p>
                    </div>
                    <span className="text-4xl">🏷️</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Marcas con accesorios
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">Modelos</p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {modelos.length}
                      </p>
                    </div>
                    <span className="text-4xl">🚗</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Modelos disponibles
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-help">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">Monedas</p>
                      <p className="text-3xl font-bold text-orange-900 mt-2">
                        {monedas.length}
                      </p>
                    </div>
                    <span className="text-4xl">💱</span>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Monedas configuradas
            </TooltipContent>
          </Tooltip>
        </div>

        {/* FILTROS */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center gap-2">
              <Filter size={18} />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Detalle, número de parte..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Marca
                </label>
                <Select
                  value={filterMarca}
                  onValueChange={(value) => {
                    setFilterMarca(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {marcas.map((marca) => (
                      <SelectItem key={marca.id} value={marca.id.toString()}>
                        {marca.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Modelo
                </label>
                <Select
                  value={filterModelo}
                  onValueChange={(value) => {
                    setFilterModelo(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {modelos.map((modelo) => (
                      <SelectItem key={modelo.id} value={modelo.id.toString()}>
                        {modelo.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Moneda
                </label>
                <Select
                  value={filterMoneda}
                  onValueChange={(value) => {
                    setFilterMoneda(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas</SelectItem>
                    {monedas.map((moneda) => (
                      <SelectItem key={moneda.id} value={moneda.id.toString()}>
                        {moneda.nombre} ({moneda.simbolo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                  className="w-full"
                >
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="mt-3 text-sm text-gray-600">
              Mostrando <span className="font-semibold">{paginatedAccesorios.length}</span> de{" "}
              <span className="font-semibold">{filteredAccesorios.length}</span> accesorios
            </div>
          </CardContent>
        </Card>

        {/* TABLA */}
        <Card>
          <CardContent className="pt-6">
            {paginatedAccesorios.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-3">📦</div>
                <p className="text-gray-600 font-medium">
                  No hay accesorios que coincidan con los filtros
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">ID</TableHead>
                      <TableHead className="font-semibold">Detalle</TableHead>
                      <TableHead className="font-semibold">Número Parte</TableHead>
                      <TableHead className="font-semibold">Marca</TableHead>
                      <TableHead className="font-semibold">Modelo</TableHead>
                      <TableHead className="font-semibold">Precio</TableHead>
                      <TableHead className="font-semibold text-center">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAccesorios.map((acc, idx) => (
                      <TableRow
                        key={acc.id}
                        className={`hover:bg-blue-50 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <TableCell className="font-semibold text-blue-600">
                          #{acc.id}
                        </TableCell>
                        <TableCell className="font-medium">
                          {acc.detalle}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {acc.numero_parte}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {acc.marca_name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {acc.modelo_name}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-green-600">
                          {acc.simbolo} {parseFloat(acc.precio).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditDialog(acc)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Editar accesorio
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setDeleteTarget(acc);
                                    setDeleteDialog(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Eliminar accesorio
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
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-600">
                  Página {currentPage} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedAccesorio ? "Editar Accesorio" : "Nuevo Accesorio"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Marca
              </label>
              <Select
                value={form.marca_id}
                onValueChange={(value) =>
                  setForm({ ...form, marca_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona marca" />
                </SelectTrigger>
                <SelectContent>
                  {marcas.map((marca) => (
                    <SelectItem key={marca.id} value={marca.id.toString()}>
                      {marca.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Modelo
              </label>
              <Select
                value={form.modelo_id}
                onValueChange={(value) =>
                  setForm({ ...form, modelo_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona modelo" />
                </SelectTrigger>
                <SelectContent>
                  {modelos.map((modelo) => (
                    <SelectItem key={modelo.id} value={modelo.id.toString()}>
                      {modelo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Detalle
              </label>
              <Input
                value={form.detalle}
                onChange={(e) =>
                  setForm({ ...form, detalle: e.target.value })
                }
                placeholder="Ej: Tapete de alfombra"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Número de Parte
              </label>
              <Input
                value={form.numero_parte}
                onChange={(e) =>
                  setForm({ ...form, numero_parte: e.target.value })
                }
                placeholder="Ej: ACC-001"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Precio
              </label>
              <Input
                type="number"
                value={form.precio}
                onChange={(e) =>
                  setForm({ ...form, precio: e.target.value })
                }
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Moneda
              </label>
              <Select
                value={form.moneda_id}
                onValueChange={(value) =>
                  setForm({ ...form, moneda_id: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona moneda" />
                </SelectTrigger>
                <SelectContent>
                  {monedas.map((moneda) => (
                    <SelectItem key={moneda.id} value={moneda.id.toString()}>
                      {moneda.nombre} ({moneda.simbolo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG ELIMINAR */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Eliminar Accesorio</DialogTitle>
          </DialogHeader>

          <p className="text-gray-700">
            ¿Eliminar el accesorio <span className="font-semibold">{deleteTarget?.detalle}</span>?
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}