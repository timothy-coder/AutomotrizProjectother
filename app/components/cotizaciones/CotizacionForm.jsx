"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem,
} from "@/components/ui/command";
import {
  ArrowLeft, Check, ChevronRight, ChevronsUpDown,
  Loader2, Plus, Search, Trash2, X, Percent, Tag,
} from "lucide-react";

const STEPS = [
  "Cliente y Ubicación",
  "Productos",
  "Mano de obra y Extras",
  "Resumen",
];

export default function CotizacionForm({
  tipo: tipoProp = "taller",
  editId = null,
  backUrl = "/cotizacion/taller",
}) {
  const router = useRouter();
  const [tipoState, setTipoState] = useState(tipoProp);
  const tipo = tipoState;
  const tipoLabel = tipo === "pyp" ? "Planchado y Pintura" : tipo === "otros" ? "Otros" : "Taller";
  const label = tipo === "pyp" ? "Paños" : "Mano de obra";

  // Steps
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  // Step 1 - Client & Location
  const [clienteId, setClienteId] = useState(null);
  const [clienteLabel, setClienteLabel] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [descripcion, setDescripcion] = useState("");

  // Location selectors
  const [centros, setCentros] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [mostradores, setMostradores] = useState([]);
  const [centroId, setCentroId] = useState("");
  const [ubicacionTipo, setUbicacionTipo] = useState(""); // "taller" | "mostrador"
  const [tallerId, setTallerId] = useState("");
  const [mostradorId, setMostradorId] = useState("");

  // Step 2 - Products
  const [locationProducts, setLocationProducts] = useState([]);
  const [loadingLocationProducts, setLoadingLocationProducts] = useState(false);
  const [prodSearch, setProdSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);

  // Step 3 - Mano de obra / Paños
  const [tarifas, setTarifas] = useState([]);
  const [tarifaId, setTarifaId] = useState("");
  const [tarifaHora, setTarifaHora] = useState(0);
  const [horasTrabajo, setHorasTrabajo] = useState(0);

  // Extras
  const [extras, setExtras] = useState([]);
  const [newExtraDesc, setNewExtraDesc] = useState("");
  const [newExtraMonto, setNewExtraMonto] = useState("");

  // Discount
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
  const [descuentoMonto, setDescuentoMonto] = useState(0);

  // User
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    setUser(u);
    loadCentros();
    loadTalleres();
    loadMostradores();
    loadTarifas();
    if (editId) loadEditData();
  }, []);

  // --- Data loaders ---

  async function loadCentros() {
    try {
      const r = await fetch("/api/centros");
      if (r.ok) setCentros(await r.json());
    } catch {}
  }

  async function loadTalleres() {
    try {
      const r = await fetch("/api/talleres");
      if (r.ok) setTalleres(await r.json());
    } catch {}
  }

  async function loadMostradores() {
    try {
      const r = await fetch("/api/mostradores");
      if (r.ok) setMostradores(await r.json());
    } catch {}
  }

  // Load products with stock for the selected location
  async function loadLocationProducts() {
    if (!centroId) { setLocationProducts([]); return; }
    const params = new URLSearchParams({ centro_id: centroId });
    if (ubicacionTipo === "taller" && tallerId) params.set("taller_id", tallerId);
    if (ubicacionTipo === "mostrador" && mostradorId) params.set("mostrador_id", mostradorId);
    setLoadingLocationProducts(true);
    try {
      const r = await fetch(`/api/stock_parcial/por-ubicacion?${params}`);
      if (r.ok) setLocationProducts(await r.json());
    } catch {} finally {
      setLoadingLocationProducts(false);
    }
  }

  // Reload products when location changes
  useEffect(() => {
    loadLocationProducts();
    // Clear selected products when location changes
    if (!editId) setSelectedProducts([]);
  }, [centroId, tallerId, mostradorId, ubicacionTipo]);

  async function loadTarifas() {
    try {
      const tarifaTipo = tipo === "pyp" ? "panos" : "mano_obra";
      const r = await fetch(`/api/cotizacion-tarifas?tipo=${tarifaTipo}`);
      if (r.ok) setTarifas(await r.json());
    } catch {}
  }

  async function searchClientes(q) {
    setClienteSearch(q);
    if (q.length < 2) { setClientes([]); return; }
    setLoadingClientes(true);
    try {
      const r = await fetch(`/api/clientes?q=${encodeURIComponent(q)}`);
      if (r.ok) setClientes(await r.json());
    } catch {} finally {
      setLoadingClientes(false);
    }
  }

  async function loadEditData() {
    setLoadingEdit(true);
    try {
      const r = await fetch(`/api/cotizaciones/${editId}`);
      if (!r.ok) { toast.error("Error cargando cotización"); return; }
      const d = await r.json();

      // Set tipo from API data (useful when editing from general view)
      if (d.tipo) setTipoState(d.tipo);

      setClienteId(d.cliente_id);
      setClienteLabel(d.cliente_nombre || "");
      setDescripcion(d.descripcion || "");
      setCentroId(d.centro_id ? String(d.centro_id) : "");
      if (d.taller_id) {
        setUbicacionTipo("taller");
        setTallerId(String(d.taller_id));
      } else if (d.mostrador_id) {
        setUbicacionTipo("mostrador");
        setMostradorId(String(d.mostrador_id));
      }
      setTarifaId(d.tarifa_id ? String(d.tarifa_id) : "");
      setTarifaHora(Number(d.tarifa_hora || 0));
      setHorasTrabajo(Number(d.horas_trabajo || 0));
      setDescuentoPorcentaje(Number(d.descuento_porcentaje || 0));
      setDescuentoMonto(Number(d.descuento_monto || 0));

      setSelectedProducts(
        (d.productos || []).map((p) => ({
          producto_id: p.producto_id,
          numero_parte: p.numero_parte,
          descripcion: p.producto_nombre,
          precio_venta: Number(p.precio_unitario),
          cantidad: p.cantidad,
          precio_unitario: Number(p.precio_unitario),
          descuento_porcentaje: Number(p.descuento_porcentaje || 0),
        }))
      );

      setExtras(
        (d.extras || []).map((e) => ({
          descripcion: e.descripcion,
          monto: Number(e.monto),
        }))
      );
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoadingEdit(false);
    }
  }

  // --- Filtered data ---

  const filteredTalleres = useMemo(() => {
    if (!centroId) return [];
    return talleres.filter((t) => String(t.centro_id) === centroId);
  }, [centroId, talleres]);

  const filteredMostradores = useMemo(() => {
    if (!centroId) return [];
    return mostradores.filter((m) => String(m.centro_id) === centroId);
  }, [centroId, mostradores]);

  const filteredProducts = useMemo(() => {
    if (!prodSearch.trim()) return [];
    const q = prodSearch.toLowerCase();
    return locationProducts
      .filter(
        (p) =>
          (p.numero_parte || "").toLowerCase().includes(q) ||
          (p.descripcion || "").toLowerCase().includes(q)
      )
      .slice(0, 20);
  }, [prodSearch, locationProducts]);

  // --- Product helpers ---

  function addProduct(p) {
    if (selectedProducts.find((sp) => sp.producto_id === p.id)) return;
    setSelectedProducts((prev) => [
      ...prev,
      {
        producto_id: p.id,
        numero_parte: p.numero_parte,
        descripcion: p.descripcion,
        precio_venta: Number(p.precio_venta || 0),
        cantidad: 1,
        precio_unitario: Number(p.precio_venta || 0),
        descuento_porcentaje: 0,
        stock_ubicacion: Number(p.stock_ubicacion || 0),
      },
    ]);
    setProdSearch("");
  }

  function getStockError(p) {
    if (p.stock_ubicacion > 0 && p.cantidad > p.stock_ubicacion) {
      return `Máx. disponible: ${p.stock_ubicacion}`;
    }
    return null;
  }

  function updateProduct(idx, field, value) {
    setSelectedProducts((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  }

  function removeProduct(idx) {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== idx));
  }

  // --- Tariff helpers ---

  function handleTarifaChange(val) {
    setTarifaId(val);
    const found = tarifas.find((t) => String(t.id) === val);
    if (found) setTarifaHora(Number(found.precio_hora));
    else setTarifaHora(0);
  }

  // --- Extra helpers ---

  function addExtra() {
    if (!newExtraDesc.trim() || !newExtraMonto) return;
    setExtras((prev) => [
      ...prev,
      { descripcion: newExtraDesc.trim(), monto: Number(newExtraMonto) },
    ]);
    setNewExtraDesc("");
    setNewExtraMonto("");
  }

  function removeExtra(idx) {
    setExtras((prev) => prev.filter((_, i) => i !== idx));
  }

  // --- Totals ---

  const subtotalProductos = useMemo(() => {
    return selectedProducts.reduce((sum, p) => {
      const base = p.cantidad * p.precio_unitario;
      const desc = Number(p.descuento_porcentaje || 0);
      return sum + (base - base * desc / 100);
    }, 0);
  }, [selectedProducts]);

  const subtotalManoObra = horasTrabajo * tarifaHora;
  const subtotalExtras = extras.reduce((s, e) => s + Number(e.monto), 0);
  const bruto = subtotalProductos + subtotalManoObra + subtotalExtras;
  const totalDescuento =
    bruto * (Number(descuentoPorcentaje) / 100) + Number(descuentoMonto);
  const montoTotal = bruto - totalDescuento;

  // --- Save ---

  async function handleSave() {
    if (!user) { toast.error("Sesión no encontrada"); return; }

    // Validate stock limits
    const overStock = selectedProducts.filter((p) => getStockError(p));
    if (overStock.length > 0) {
      toast.error("Hay productos que exceden el stock disponible en la ubicación seleccionada.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tipo,
        cliente_id: clienteId,
        usuario_id: user.id,
        descripcion,
        centro_id: centroId ? Number(centroId) : null,
        taller_id: tallerId ? Number(tallerId) : null,
        mostrador_id: mostradorId ? Number(mostradorId) : null,
        horas_trabajo: horasTrabajo,
        tarifa_id: tarifaId ? Number(tarifaId) : null,
        tarifa_hora: tarifaHora,
        descuento_porcentaje: Number(descuentoPorcentaje),
        descuento_monto: Number(descuentoMonto),
        productos: selectedProducts.map((p) => ({
          producto_id: p.producto_id,
          cantidad: p.cantidad,
          precio_unitario: p.precio_unitario,
          subtotal: p.cantidad * p.precio_unitario,
          descuento_porcentaje: Number(p.descuento_porcentaje || 0),
        })),
        extras,
      };

      const url = editId ? `/api/cotizaciones/${editId}` : "/api/cotizaciones";
      const method = editId ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (r.ok) {
        toast.success(editId ? "Cotización actualizada" : "Cotización creada");
        router.push(backUrl);
      } else {
        const d = await r.json();
        toast.error(d.message || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  // --- Format helpers ---

  const fmt = (n) =>
    Number(n).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
    });

  // --- Loading state ---

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ====================== RENDER ======================

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {editId ? "Editar Cotización" : "Nueva Cotización"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {tipoLabel}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => setStep(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                  ? "bg-green-100 text-green-700"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/20 text-xs">
                  {i + 1}
                </span>
              )}
              {s}
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* ======================== STEP 0: Cliente y Ubicación ======================== */}
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cliente y Ubicación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Client Combobox */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={clienteOpen}
                    className="w-full justify-between font-normal"
                  >
                    {clienteId ? clienteLabel : "Seleccionar cliente..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar por nombre, email, celular..."
                      value={clienteSearch}
                      onValueChange={searchClientes}
                    />
                    <CommandList>
                      {loadingClientes && (
                        <div className="flex justify-center py-4">
                          <Loader2 className="w-4 h-4 animate-spin" />
                        </div>
                      )}
                      <CommandEmpty>
                        {clienteSearch.length < 2
                          ? "Escribe al menos 2 caracteres..."
                          : "No se encontraron clientes."}
                      </CommandEmpty>
                      <CommandGroup>
                        {clientes.map((c) => {
                          const fullName = `${c.nombre} ${c.apellido || ""}`.trim();
                          return (
                            <CommandItem
                              key={c.id}
                              onSelect={() => {
                                setClienteId(c.id);
                                setClienteLabel(fullName);
                                setClienteOpen(false);
                                setClienteSearch("");
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{fullName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {[c.email, c.celular].filter(Boolean).join(" • ")}
                                </span>
                              </div>
                              {clienteId === c.id && (
                                <Check className="ml-auto h-4 w-4" />
                              )}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {clienteId && (
                <button
                  className="text-xs text-red-500 hover:underline"
                  onClick={() => {
                    setClienteId(null);
                    setClienteLabel("");
                  }}
                >
                  Quitar cliente
                </button>
              )}
            </div>

            {/* Location selectors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Centro</Label>
                <Select
                  value={centroId}
                  onValueChange={(v) => {
                    setCentroId(v);
                    setUbicacionTipo("");
                    setTallerId("");
                    setMostradorId("");
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar centro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {centros.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tipo de ubicación</Label>
                <Select
                  value={ubicacionTipo}
                  onValueChange={(v) => {
                    setUbicacionTipo(v);
                    setTallerId("");
                    setMostradorId("");
                  }}
                  disabled={!centroId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={centroId ? "Taller o Mostrador..." : "Primero seleccione centro"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="taller">Taller</SelectItem>
                    <SelectItem value="mostrador">Mostrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ubicacionTipo === "taller" && (
                <div className="space-y-2">
                  <Label>Taller</Label>
                  <Select value={tallerId} onValueChange={setTallerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar taller..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTalleres.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {ubicacionTipo === "mostrador" && (
                <div className="space-y-2">
                  <Label>Mostrador</Label>
                  <Select value={mostradorId} onValueChange={setMostradorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar mostrador..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredMostradores.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Notas o descripción de la cotización..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======================== STEP 1: Productos ======================== */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto por número de parte o descripción..."
                value={prodSearch}
                onChange={(e) => setProdSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Search results */}
            {loadingLocationProducts && (
              <p className="text-sm text-muted-foreground py-2">Cargando productos de la ubicación...</p>
            )}

            {!loadingLocationProducts && !centroId && (
              <p className="text-sm text-muted-foreground py-2">Seleccione un centro y ubicación para ver los productos disponibles.</p>
            )}

            {!loadingLocationProducts && centroId && !(tallerId || mostradorId) && (
              <p className="text-sm text-muted-foreground py-2">Seleccione un taller o mostrador para ver los productos disponibles.</p>
            )}

            {!loadingLocationProducts && (tallerId || mostradorId) && filteredProducts.length === 0 && prodSearch.length >= 2 && (
              <p className="text-sm text-muted-foreground py-2">No se encontraron productos con stock en esta ubicación.</p>
            )}

            {filteredProducts.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    className="flex items-center justify-between w-full px-3 py-2 hover:bg-muted text-sm text-left"
                    onClick={() => addProduct(p)}
                  >
                    <div>
                      <span className="font-mono mr-2">{p.numero_parte}</span>
                      <span>{p.descripcion}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="text-xs">
                        Stock: {p.stock_ubicacion}
                      </Badge>
                      <span className="text-muted-foreground">
                        {fmt(p.precio_venta)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Selected products table */}
            {selectedProducts.length > 0 && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nro. Parte</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="w-20 text-center">Stock</TableHead>
                      <TableHead className="w-20 text-center">Cant.</TableHead>
                      <TableHead className="w-28 text-right">P. Unit.</TableHead>
                      <TableHead className="w-24 text-center">Desc. %</TableHead>
                      <TableHead className="w-28 text-right">Subtotal</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedProducts.map((p, idx) => {
                      const base = p.cantidad * p.precio_unitario;
                      const descProd = Number(p.descuento_porcentaje || 0);
                      const subtotalProd = base - base * descProd / 100;
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-sm">
                            {p.numero_parte}
                          </TableCell>
                          <TableCell className="text-sm">{p.descripcion}</TableCell>
                          <TableCell className="text-center text-sm">
                            {p.stock_ubicacion ?? "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-center gap-1">
                              <Input
                                type="number"
                                min={1}
                                max={p.stock_ubicacion || undefined}
                                value={p.cantidad}
                                onChange={(e) =>
                                  updateProduct(idx, "cantidad", Number(e.target.value) || 1)
                                }
                                className={`w-16 text-center h-8 ${getStockError(p) ? "border-red-500" : ""}`}
                              />
                              {getStockError(p) && (
                                <span className="text-[11px] text-red-500 whitespace-nowrap">
                                  {getStockError(p)}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {fmt(p.precio_unitario)}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={p.descuento_porcentaje || ""}
                              onChange={(e) =>
                                updateProduct(
                                  idx,
                                  "descuento_porcentaje",
                                  Math.min(100, Math.max(0, Number(e.target.value) || 0))
                                )
                              }
                              className="w-16 text-center h-8"
                              placeholder="0"
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {fmt(subtotalProd)}
                          </TableCell>
                          <TableCell>
                            <button
                              onClick={() => removeProduct(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {selectedProducts.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No hay productos seleccionados. Usa el buscador para agregar.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ======================== STEP 2: Mano de obra + Extras ======================== */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tarifa</Label>
                  <Select value={tarifaId} onValueChange={handleTarifaChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tarifa..." />
                    </SelectTrigger>
                    <SelectContent>
                      {tarifas
                        .filter((t) => t.activo)
                        .map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.nombre} — {fmt(t.precio_hora)}/hr
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Horas de trabajo</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.5}
                    value={horasTrabajo}
                    onChange={(e) => setHorasTrabajo(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>

              {tarifaId && horasTrabajo > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal {label.toLowerCase()}:</span>
                    <span className="font-medium">{fmt(subtotalManoObra)}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gastos extras</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Descripción del gasto..."
                  value={newExtraDesc}
                  onChange={(e) => setNewExtraDesc(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="number"
                  placeholder="Monto"
                  value={newExtraMonto}
                  onChange={(e) => setNewExtraMonto(e.target.value)}
                  className="w-32"
                  min={0}
                />
                <Button size="icon" variant="outline" onClick={addExtra}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {extras.length > 0 && (
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right w-32">Monto</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {extras.map((e, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{e.descripcion}</TableCell>
                          <TableCell className="text-right">{fmt(e.monto)}</TableCell>
                          <TableCell>
                            <button
                              onClick={() => removeExtra(idx)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================== STEP 3: Resumen ======================== */}
      {step === 3 && (
        <div className="space-y-6">
          {/* Summary info */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen de cotización</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Cliente:</span>
                  <span className="ml-2 font-medium">
                    {clienteLabel || "Sin cliente"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <Badge variant="outline" className="ml-2">
                    {tipoLabel}
                  </Badge>
                </div>
                {centroId && (
                  <div>
                    <span className="text-muted-foreground">Centro:</span>
                    <span className="ml-2 font-medium">
                      {centros.find((c) => String(c.id) === centroId)?.nombre || "—"}
                    </span>
                  </div>
                )}
                {tallerId && (
                  <div>
                    <span className="text-muted-foreground">Taller:</span>
                    <span className="ml-2 font-medium">
                      {talleres.find((t) => String(t.id) === tallerId)?.nombre || "—"}
                    </span>
                  </div>
                )}
                {mostradorId && (
                  <div>
                    <span className="text-muted-foreground">Mostrador:</span>
                    <span className="ml-2 font-medium">
                      {mostradores.find((m) => String(m.id) === mostradorId)?.nombre || "—"}
                    </span>
                  </div>
                )}
                {descripcion && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Descripción:</span>
                    <span className="ml-2">{descripcion}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Products summary */}
          {selectedProducts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Productos ({selectedProducts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cant.</TableHead>
                        <TableHead className="text-right">P. Unit.</TableHead>
                        <TableHead className="text-center">Desc.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedProducts.map((p, idx) => {
                        const base = p.cantidad * p.precio_unitario;
                        const d = Number(p.descuento_porcentaje || 0);
                        const sub = base - base * d / 100;
                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <span className="font-mono mr-2 text-xs">
                                {p.numero_parte}
                              </span>
                              {p.descripcion}
                            </TableCell>
                            <TableCell className="text-right">{p.cantidad}</TableCell>
                            <TableCell className="text-right">
                              {fmt(p.precio_unitario)}
                            </TableCell>
                            <TableCell className="text-center">
                              {d > 0 ? (
                                <Badge variant="secondary">{d}%</Badge>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {fmt(sub)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Discount Coupon */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Cupón de descuento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Descuento porcentaje
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={descuentoPorcentaje || ""}
                    onChange={(e) =>
                      setDescuentoPorcentaje(
                        Math.min(100, Math.max(0, Number(e.target.value) || 0))
                      )
                    }
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descuento monto fijo</Label>
                  <Input
                    type="number"
                    min={0}
                    value={descuentoMonto || ""}
                    onChange={(e) =>
                      setDescuentoMonto(Math.max(0, Number(e.target.value) || 0))
                    }
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span>Subtotal productos:</span>
                <span>{fmt(subtotalProductos)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal {label.toLowerCase()}:</span>
                <span>{fmt(subtotalManoObra)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal extras:</span>
                <span>{fmt(subtotalExtras)}</span>
              </div>
              {totalDescuento > 0 && (
                <>
                  <hr />
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Descuento:</span>
                    <span>-{fmt(totalDescuento)}</span>
                  </div>
                </>
              )}
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span className="text-green-600">{fmt(Math.max(0, montoTotal))}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================== NAVIGATION BUTTONS ======================== */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <Button
          variant="outline"
          onClick={() => (step === 0 ? router.push(backUrl) : setStep(step - 1))}
          disabled={saving}
        >
          {step === 0 ? "Cancelar" : "Anterior"}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep(step + 1)}>
            Siguiente
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {editId ? "Actualizar cotización" : "Guardar cotización"}
          </Button>
        )}
      </div>
    </div>
  );
}
