"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Loader2,
  Plus,
  Search,
  X,
  User,
  Wallet,
  BadgePercent,
} from "lucide-react";

export default function CotizacionForm({
  tipo: tipoProp = "taller",
  editId = null,
  backUrl = "/cotizacion/taller",
  showTipoSelector = false,
}) {
  const router = useRouter();
  const [tipoState, setTipoState] = useState(tipoProp);
  const tipo = tipoState;
  const tipoLabel = tipo === "pyp" ? "Planchado y Pintura" : tipo === "otros" ? "Otros" : "Taller";
  const manoObraLabel = tipo === "pyp" ? "Paños" : "Mano de obra";

  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);

  const [clienteId, setClienteId] = useState(null);
  const [clienteLabel, setClienteLabel] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);
  const [clienteSearch, setClienteSearch] = useState("");
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [descripcion, setDescripcion] = useState("");

  const [centros, setCentros] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [mostradores, setMostradores] = useState([]);
  const [centroId, setCentroId] = useState("");
  const [ubicacionTipo, setUbicacionTipo] = useState("");
  const [tallerId, setTallerId] = useState("");
  const [mostradorId, setMostradorId] = useState("");

  const [locationProducts, setLocationProducts] = useState([]);
  const [loadingLocationProducts, setLoadingLocationProducts] = useState(false);
  const [prodSearch, setProdSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState([]);

  const [tarifas, setTarifas] = useState([]);
  const [tarifaId, setTarifaId] = useState("");
  const [tarifaHora, setTarifaHora] = useState(0);
  const [horasTrabajo, setHorasTrabajo] = useState(0);

  const [adicionales, setAdicionales] = useState([]);
  const [newAdicionalDesc, setNewAdicionalDesc] = useState("");
  const [newAdicionalMonto, setNewAdicionalMonto] = useState("");

  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
  const [descuentoMonto, setDescuentoMonto] = useState(0);

  const [monedas, setMonedas] = useState([]);
  const [impuestos, setImpuestos] = useState([]);
  const [monedaId, setMonedaId] = useState("");
  const [impuestoId, setImpuestoId] = useState("");
  const [incluirIgv, setIncluirIgv] = useState(false);

  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("user") || "null");
    setUser(u);
    loadClientes();
    loadInventoryProducts();
    loadCentros();
    loadTalleres();
    loadMostradores();
    loadMonedasEImpuestos();
    if (editId) loadEditData();
  }, []);

  useEffect(() => {
    loadTarifas();
  }, [tipo]);
  async function loadClientes() {
    setLoadingClientes(true);
    try {
      const r = await fetch("/api/clientes", { cache: "no-store" });
      if (r.ok) setClientes(await r.json());
    } catch {
      setClientes([]);
    } finally {
      setLoadingClientes(false);
    }
  }


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

  async function loadTarifas() {
    try {
      const tarifaTipo = tipo === "pyp" ? "panos" : "mano_obra";
      const r = await fetch(`/api/cotizacion-tarifas?tipo=${tarifaTipo}`);
      if (!r.ok) return;
      const data = await r.json();
      const activas = (Array.isArray(data) ? data : []).filter((t) => Number(t.activo) === 1);
      setTarifas(activas);
      if (!editId && activas.length > 0) {
        setTarifaId(String(activas[0].id));
        setTarifaHora(Number(activas[0].precio_hora || 0));
      }
    } catch {}
  }

  async function loadMonedasEImpuestos() {
    try {
      const [mr, ir] = await Promise.all([
        fetch("/api/monedas", { cache: "no-store" }),
        fetch("/api/impuestos", { cache: "no-store" }),
      ]);
      const monedasData = mr.ok ? await mr.json() : [];
      const impuestosData = ir.ok ? await ir.json() : [];

      const monedasActivas = (Array.isArray(monedasData) ? monedasData : []).filter((m) => Number(m.is_active) === 1);
      const impuestosActivos = (Array.isArray(impuestosData) ? impuestosData : []).filter((i) => Number(i.is_active) === 1);

      setMonedas(monedasActivas);
      setImpuestos(impuestosActivos);

      if (!editId) {
        if (monedasActivas.length > 0) setMonedaId(String(monedasActivas[0].id));
        if (impuestosActivos.length > 0) setImpuestoId(String(impuestosActivos[0].id));
      }
    } catch {}
  }

  async function loadInventoryProducts() {
    setLoadingLocationProducts(true);
    try {
      const r = await fetch("/api/productos", { cache: "no-store" });
      if (!r.ok) return;
      const all = await r.json();
      setLocationProducts(
        (Array.isArray(all) ? all : []).map((p) => ({
          ...p,
          stock_ubicacion: Number(p.stock_disponible ?? p.stock_total ?? 0),
        }))
      );
    } catch {} finally {
      setLoadingLocationProducts(false);
    }
  }

  async function searchClientes(q) {
    setClienteSearch(q);
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
      if (!r.ok) {
        toast.error("Error cargando cotización");
        return;
      }
      const d = await r.json();
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

      if (d.moneda_id) setMonedaId(String(d.moneda_id));
      if (d.impuesto_id) setImpuestoId(String(d.impuesto_id));
      setIncluirIgv(Boolean(Number(d.incluir_igv || 0)));

      setSelectedProducts(
        (d.productos || []).map((p) => ({
          producto_id: p.producto_id,
          numero_parte: p.numero_parte,
          descripcion: p.producto_nombre,
          cantidad: Number(p.cantidad || 1),
          precio_unitario: Number(p.precio_unitario || 0),
          stock_ubicacion: Number(p.stock_ubicacion || 0),
        }))
      );

      setAdicionales(
        (d.extras || []).map((e) => ({
          descripcion: e.descripcion,
          monto: Number(e.monto || 0),
        }))
      );
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoadingEdit(false);
    }
  }

  const filteredTalleres = useMemo(() => {
    if (!centroId) return [];
    return talleres.filter((t) => String(t.centro_id) === centroId);
  }, [centroId, talleres]);

  const filteredMostradores = useMemo(() => {
    if (!centroId) return [];
    return mostradores.filter((m) => String(m.centro_id) === centroId);
  }, [centroId, mostradores]);

  const filteredProducts = useMemo(() => {
    if (!prodSearch.trim()) return locationProducts.slice(0, 80);
    const q = prodSearch.toLowerCase();
    return locationProducts
      .filter(
        (p) =>
          (p.numero_parte || "").toLowerCase().includes(q) ||
          (p.descripcion || "").toLowerCase().includes(q)
      )
      .slice(0, 80);
  }, [prodSearch, locationProducts]);

  const selectedMoneda = useMemo(
    () => monedas.find((m) => String(m.id) === String(monedaId)) || monedas[0] || null,
    [monedas, monedaId]
  );

  const selectedImpuesto = useMemo(
    () => impuestos.find((i) => String(i.id) === String(impuestoId)) || impuestos[0] || null,
    [impuestos, impuestoId]
  );

  const igvPorcentaje = Number(selectedImpuesto?.porcentaje || 0);

  const fmt = (n) => {
    const code = String(selectedMoneda?.codigo || "PEN").toUpperCase();
    try {
      return Number(n || 0).toLocaleString("es-PE", {
        style: "currency",
        currency: code,
      });
    } catch {
      return Number(n || 0).toLocaleString("es-PE", {
        style: "currency",
        currency: "PEN",
      });
    }
  };

  function addProduct(p) {
    if (selectedProducts.find((sp) => sp.producto_id === p.id)) return;
    setSelectedProducts((prev) => [
      ...prev,
      {
        producto_id: p.id,
        numero_parte: p.numero_parte,
        descripcion: p.descripcion,
        cantidad: 1,
        precio_unitario: Number(p.precio_venta || 0),
        stock_ubicacion: Number(p.stock_ubicacion || 0),
      },
    ]);
    setProdSearch("");
  }

  function updateProduct(idx, patch) {
    setSelectedProducts((prev) => prev.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  }

  function removeProduct(idx) {
    setSelectedProducts((prev) => prev.filter((_, i) => i !== idx));
  }

  function getStockError(p) {
    if (p.stock_ubicacion > 0 && Number(p.cantidad) > Number(p.stock_ubicacion)) {
      return `Máx. inventario: ${p.stock_ubicacion}`;
    }
    return null;
  }

  function handleTarifaChange(val) {
    setTarifaId(val);
    const found = tarifas.find((t) => String(t.id) === val);
    if (found) setTarifaHora(Number(found.precio_hora || 0));
    else setTarifaHora(0);
  }

  function addAdicional() {
    if (!newAdicionalDesc.trim() || newAdicionalMonto === "") return;
    setAdicionales((prev) => [
      ...prev,
      {
        descripcion: newAdicionalDesc.trim(),
        monto: Number(newAdicionalMonto || 0),
      },
    ]);
    setNewAdicionalDesc("");
    setNewAdicionalMonto("");
  }

  function removeAdicional(idx) {
    setAdicionales((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotalProductos = useMemo(() => {
    return selectedProducts.reduce((sum, p) => {
      return sum + Number(p.cantidad || 0) * Number(p.precio_unitario || 0);
    }, 0);
  }, [selectedProducts]);

  const subtotalManoObra = Number(horasTrabajo || 0) * Number(tarifaHora || 0);
  const subtotalAdicionales = adicionales.reduce((s, e) => s + Number(e.monto || 0), 0);
  const bruto = subtotalProductos + subtotalManoObra + subtotalAdicionales;
  const descuentoFijoAplicado = Math.min(Number(descuentoMonto || 0), bruto);
  const totalDescuento = bruto * (Number(descuentoPorcentaje || 0) / 100) + descuentoFijoAplicado;
  const factorReparto = bruto > 0 ? descuentoFijoAplicado / bruto : 0;
  const descuentoProductos = subtotalProductos * (Number(descuentoPorcentaje || 0) / 100 + factorReparto);
  const descuentoManoObra = subtotalManoObra * (Number(descuentoPorcentaje || 0) / 100 + factorReparto);
  const descuentoAdicionales = subtotalAdicionales * (Number(descuentoPorcentaje || 0) / 100 + factorReparto);
  const netoProductos = Math.max(0, subtotalProductos - descuentoProductos);
  const netoManoObra = Math.max(0, subtotalManoObra - descuentoManoObra);
  const netoAdicionales = Math.max(0, subtotalAdicionales - descuentoAdicionales);
  const netoSinIgv = Math.max(0, bruto - totalDescuento);
  const montoIgv = incluirIgv ? netoSinIgv * (igvPorcentaje / 100) : 0;
  const montoTotal = netoSinIgv + montoIgv;

  async function handleSave() {
    if (!user) {
      toast.error("Sesión no encontrada");
      return;
    }

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
        horas_trabajo: Number(horasTrabajo || 0),
        tarifa_id: tarifaId ? Number(tarifaId) : null,
        tarifa_hora: Number(tarifaHora || 0),
        descuento_porcentaje: Number(descuentoPorcentaje || 0),
        descuento_monto: Number(descuentoMonto || 0),
        moneda_id: monedaId ? Number(monedaId) : null,
        impuesto_id: impuestoId ? Number(impuestoId) : null,
        incluir_igv: incluirIgv ? 1 : 0,
        impuesto_porcentaje: Number(igvPorcentaje || 0),
        productos: selectedProducts.map((p) => {
          const base = Number(p.cantidad || 0) * Number(p.precio_unitario || 0);
          return {
            producto_id: p.producto_id,
            cantidad: Number(p.cantidad || 0),
            precio_unitario: Number(p.precio_unitario || 0),
            subtotal: base,
            descuento_porcentaje: 0,
          };
        }),
        extras: adicionales,
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

  if (loadingEdit) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">{editId ? "Editar Cotización" : "Nueva Cotización"}</h1>
          <p className="text-sm text-muted-foreground">Complete la información de la cotización ({tipoLabel})</p>
          {showTipoSelector && (
            <div className="mt-3 w-72">
              <Select value={tipo} onValueChange={setTipoState}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de cotización" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="taller">Taller</SelectItem>
                  <SelectItem value="pyp">Planchado y Pintura</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>PASO 1 — Cliente y Ubicación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                    <PopoverContent className="w-125 p-0" align="start">
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
                            No se encontraron clientes.
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
                                  {clienteId === c.id && <Check className="ml-auto h-4 w-4" />}
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

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

            <Card>
              <CardHeader>
                <CardTitle>PASO 2 — Productos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar producto por número de parte o descripción..."
                    value={prodSearch}
                    onChange={(e) => setProdSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {loadingLocationProducts && (
                  <p className="text-sm text-muted-foreground py-2">Cargando inventario...</p>
                )}

                {!loadingLocationProducts && filteredProducts.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">No hay productos registrados en inventario.</p>
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
                          <Badge variant="secondary" className="text-xs">Stock: {p.stock_ubicacion ?? 0}</Badge>
                          <span className="text-muted-foreground">{fmt(p.precio_venta)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedProducts.length > 0 ? (
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nro. Parte</TableHead>
                          <TableHead>Producto</TableHead>
                          <TableHead className="w-20 text-center">Stock</TableHead>
                          <TableHead className="w-20 text-center">Cant.</TableHead>
                          <TableHead className="w-28 text-right">P. Unit.</TableHead>
                          <TableHead className="w-32 text-right">Subtotal</TableHead>
                          <TableHead className="w-10"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedProducts.map((p, idx) => {
                          const base = Number(p.cantidad || 0) * Number(p.precio_unitario || 0);
                          return (
                            <TableRow key={`${p.producto_id}-${idx}`}>
                              <TableCell className="font-mono text-sm">{p.numero_parte}</TableCell>
                              <TableCell className="text-sm">{p.descripcion}</TableCell>
                              <TableCell className="text-center text-sm">{p.stock_ubicacion ?? "—"}</TableCell>
                              <TableCell>
                                <div className="flex flex-col items-center gap-1">
                                  <Input
                                    type="number"
                                    min={1}
                                    max={p.stock_ubicacion || undefined}
                                    value={p.cantidad}
                                    onChange={(e) =>
                                      updateProduct(idx, { cantidad: Math.max(1, Number(e.target.value) || 1) })
                                    }
                                    className={`w-16 text-center h-8 ${getStockError(p) ? "border-red-500" : ""}`}
                                  />
                                  {getStockError(p) && (
                                    <span className="text-[11px] text-red-500 whitespace-nowrap">{getStockError(p)}</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm">{fmt(p.precio_unitario)}</TableCell>
                              <TableCell className="text-right font-medium">{fmt(base)}</TableCell>
                              <TableCell>
                                <button
                                  onClick={() => removeProduct(idx)}
                                  className="text-red-500 hover:text-red-700"
                                  title="Quitar producto"
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
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No hay productos seleccionados. Usa el buscador para agregar.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>PASO 3 — {manoObraLabel} y Adicionales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{manoObraLabel}</Label>
                    <Select value={tarifaId} onValueChange={handleTarifaChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar tarifa..." />
                      </SelectTrigger>
                      <SelectContent>
                        {tarifas.map((t) => (
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
                    />
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 text-sm flex justify-between">
                  <span>Subtotal {manoObraLabel.toLowerCase()}:</span>
                  <span className="font-medium">{fmt(subtotalManoObra)}</span>
                </div>

                <div className="space-y-4">
                  <Label>Adicionales</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Descripción del adicional..."
                      value={newAdicionalDesc}
                      onChange={(e) => setNewAdicionalDesc(e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      placeholder="Monto"
                      value={newAdicionalMonto}
                      onChange={(e) => setNewAdicionalMonto(e.target.value)}
                      className="w-32"
                      min={0}
                    />
                    <Button size="icon" variant="outline" onClick={addAdicional}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {adicionales.length > 0 && (
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Descripción</TableHead>
                            <TableHead className="text-right w-32">Precio</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {adicionales.map((e, idx) => (
                            <TableRow key={`${e.descripcion}-${idx}`}>
                              <TableCell>{e.descripcion}</TableCell>
                              <TableCell className="text-right">{fmt(Number(e.monto || 0))}</TableCell>
                              <TableCell>
                                <button
                                  onClick={() => removeAdicional(idx)}
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
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="border rounded-xl p-4 bg-gray-50 h-fit sticky top-4">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">Resumen</h3>
                <p className="text-xs text-muted-foreground">Vista rápida de la cotización</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <p className="text-muted-foreground">Creado por</p>
                    <p className="font-medium">{user?.fullname || user?.name || "Administrador"}</p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground">Cliente</p>
                  <p className="font-medium">{clienteLabel || "Sin cliente"}</p>
                </div>

                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  <Badge variant="outline">{tipoLabel}</Badge>
                </div>
              </div>

              <div className="space-y-3 border rounded-md p-3 bg-white">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="w-4 h-4" /> Moneda e Impuesto
                </div>

                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select value={monedaId} onValueChange={setMonedaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {monedas.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.codigo} — {m.nombre} ({m.simbolo})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Impuesto</Label>
                  <Select value={impuestoId} onValueChange={setImpuestoId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione impuesto" />
                    </SelectTrigger>
                    <SelectContent>
                      {impuestos.map((i) => (
                        <SelectItem key={i.id} value={String(i.id)}>
                          {i.nombre} ({Number(i.porcentaje || 0)}%)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label>Aplicar IGV</Label>
                  <Switch checked={incluirIgv} onCheckedChange={setIncluirIgv} />
                </div>
              </div>

              <div className="space-y-3 border rounded-md p-3 bg-white">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BadgePercent className="w-4 h-4" /> Descuento global
                </div>
                <div className="space-y-2">
                  <Label>Porcentaje (%)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={descuentoPorcentaje || ""}
                    onChange={(e) =>
                      setDescuentoPorcentaje(Math.min(100, Math.max(0, Number(e.target.value) || 0)))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monto fijo</Label>
                  <Input
                    type="number"
                    min={0}
                    value={descuentoMonto || ""}
                    onChange={(e) => setDescuentoMonto(Math.max(0, Number(e.target.value) || 0))}
                  />
                </div>
              </div>

              <div className="space-y-2 border rounded-md p-3 bg-white text-sm">
                <div className="flex justify-between">
                  <span>Subtotal productos</span>
                  <span>{fmt(netoProductos)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Subtotal {manoObraLabel.toLowerCase()}</span>
                  <span>{fmt(netoManoObra)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Subtotal adicionales</span>
                  <span>{fmt(netoAdicionales)}</span>
                </div>

                {totalDescuento > 0 && (
                  <>
                    <div className="flex justify-between text-xs text-red-500">
                      <span>Desc. productos</span>
                      <span>-{fmt(descuentoProductos)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-red-500">
                      <span>Desc. {manoObraLabel.toLowerCase()}</span>
                      <span>-{fmt(descuentoManoObra)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-red-500">
                      <span>Desc. adicionales</span>
                      <span>-{fmt(descuentoAdicionales)}</span>
                    </div>
                  <div className="flex justify-between text-red-600 font-medium">
                    <span>Descuento total aplicado</span>
                    <span>-{fmt(totalDescuento)}</span>
                  </div>
                  </>
                )}

                {incluirIgv && (
                  <div className="flex justify-between">
                    <span>IGV ({igvPorcentaje}%)</span>
                    <span>{fmt(montoIgv)}</span>
                  </div>
                )}

                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>TOTAL</span>
                  <span className="text-green-600">{fmt(montoTotal)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3 border-t mt-4">
        <Button variant="outline" onClick={() => router.push(backUrl)} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {editId ? "Actualizar cotización" : "Guardar cotización"}
        </Button>
      </div>
    </div>
  );
}
