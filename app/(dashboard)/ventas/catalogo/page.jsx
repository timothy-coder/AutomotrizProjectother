"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Car, Edit2, ExternalLink, Plus, Save, Tag, X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(value, moneda = "PEN") {
  if (value == null) return "-";
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0,
  }).format(value);
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {label}
    </button>
  );
}

function Badge({ text, color = "gray" }) {
  const colors = {
    gray: "bg-gray-100 text-gray-700",
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[color] || colors.gray}`}>
      {text}
    </span>
  );
}

const TIPOS_PROMO = ["descuento", "financiamiento_preferencial", "regalo", "otro"];

// ─── Modal de Versión ─────────────────────────────────────────────────────────

function VersionModal({ version, modelos, onClose, onSaved }) {
  const isNew = !version?.id;
  const [form, setForm] = useState({
    modelo_id: version?.modelo_id || (modelos[0]?.id ?? ""),
    nombre_version: version?.nombre_version || "",
    precio_lista: version?.precio_lista || "",
    moneda: version?.moneda || "PEN",
    descripcion_equipamiento: version?.descripcion_equipamiento || "",
    descuento_porcentaje: version?.descuento_porcentaje || "0",
    en_stock: version?.en_stock !== 0,
    tiempo_entrega_dias: version?.tiempo_entrega_dias || "0",
    colores_disponibles: Array.isArray(version?.colores_disponibles)
      ? version.colores_disponibles.join(", ")
      : "",
    is_active: version?.is_active !== 0,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.modelo_id || !form.nombre_version.trim()) {
      toast.error("Modelo y nombre de versión son requeridos");
      return;
    }

    setSaving(true);
    const payload = {
      modelo_id: Number(form.modelo_id),
      nombre_version: form.nombre_version.trim(),
      precio_lista: Number(form.precio_lista) || 0,
      moneda: form.moneda,
      descripcion_equipamiento: form.descripcion_equipamiento.trim() || null,
      descuento_porcentaje: Number(form.descuento_porcentaje) || 0,
      en_stock: form.en_stock,
      tiempo_entrega_dias: Number(form.tiempo_entrega_dias) || 0,
      colores_disponibles: form.colores_disponibles
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      is_active: form.is_active ? 1 : 0,
    };

    try {
      const url = isNew ? "/api/ventas/versiones" : `/api/ventas/versiones/${version.id}`;
      const method = isNew ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error al guardar");
      toast.success(isNew ? "Versión creada" : "Versión actualizada");
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Nueva versión" : "Editar versión"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Modelo *</label>
            <select
              value={form.modelo_id}
              onChange={(e) => set("modelo_id", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            >
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre_completo || m.nombre}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre de versión *</label>
            <Input
              value={form.nombre_version}
              onChange={(e) => set("nombre_version", e.target.value)}
              placeholder="Ej: Básico, Intermedio, Premium 4x4"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Precio de lista</label>
            <Input
              type="number"
              min={0}
              value={form.precio_lista}
              onChange={(e) => set("precio_lista", e.target.value)}
              placeholder="85000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Moneda</label>
            <select
              value={form.moneda}
              onChange={(e) => set("moneda", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="PEN">PEN (Soles)</option>
              <option value="USD">USD (Dólares)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Descuento (%)</label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.descuento_porcentaje}
              onChange={(e) => set("descuento_porcentaje", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">En stock</label>
            <select
              value={form.en_stock ? "1" : "0"}
              onChange={(e) => set("en_stock", e.target.value === "1")}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="1">Disponible</option>
              <option value="0">Bajo pedido</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Entrega (días hábiles)</label>
            <Input
              type="number"
              min={0}
              value={form.tiempo_entrega_dias}
              onChange={(e) => set("tiempo_entrega_dias", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select
              value={form.is_active ? "1" : "0"}
              onChange={(e) => set("is_active", e.target.value === "1")}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="1">Activo</option>
              <option value="0">Inactivo</option>
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Colores disponibles <span className="text-gray-400">(separados por coma)</span>
            </label>
            <Input
              value={form.colores_disponibles}
              onChange={(e) => set("colores_disponibles", e.target.value)}
              placeholder="Blanco, Negro, Rojo, Azul"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción de equipamiento</label>
            <Textarea
              value={form.descripcion_equipamiento}
              onChange={(e) => set("descripcion_equipamiento", e.target.value)}
              placeholder="Describe los accesorios y equipamiento incluidos en esta versión"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal de Promoción ───────────────────────────────────────────────────────

function PromoModal({ promo, modelos, onClose, onSaved }) {
  const isNew = !promo?.id;
  const [form, setForm] = useState({
    modelo_id: promo?.modelo_id || "",
    descripcion: promo?.descripcion || "",
    tipo: promo?.tipo || "descuento",
    valor: promo?.valor || "",
    fecha_inicio: promo?.fecha_inicio ? String(promo.fecha_inicio).slice(0, 10) : "",
    fecha_fin: promo?.fecha_fin ? String(promo.fecha_fin).slice(0, 10) : "",
    is_active: promo?.is_active !== 0,
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    if (!form.descripcion.trim()) {
      toast.error("La descripción es requerida");
      return;
    }

    setSaving(true);
    const payload = {
      modelo_id: form.modelo_id ? Number(form.modelo_id) : null,
      descripcion: form.descripcion.trim(),
      tipo: form.tipo,
      valor: form.valor.trim() || null,
      fecha_inicio: form.fecha_inicio || null,
      fecha_fin: form.fecha_fin || null,
      is_active: form.is_active ? 1 : 0,
    };

    try {
      if (isNew) {
        const res = await fetch("/api/ventas/promociones", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error al guardar");
      } else {
        const res = await fetch("/api/ventas/promociones", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: promo.id, ...payload }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Error al guardar");
      }
      toast.success(isNew ? "Promoción creada" : "Promoción actualizada");
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "Nueva promoción" : "Editar promoción"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Modelo <span className="text-gray-400">(vacío = aplica a todos)</span>
            </label>
            <select
              value={form.modelo_id}
              onChange={(e) => set("modelo_id", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="">— General (todos los modelos) —</option>
              {modelos.map((m) => (
                <option key={m.id} value={m.id}>{m.nombre_completo || m.nombre}</option>
              ))}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Descripción *</label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              placeholder="Ej: 5% de descuento en el precio de lista durante el mes de marzo"
              rows={2}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
            <select
              value={form.tipo}
              onChange={(e) => set("tipo", e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            >
              {TIPOS_PROMO.map((t) => (
                <option key={t} value={t}>
                  {t === "descuento" ? "Descuento"
                    : t === "financiamiento_preferencial" ? "Financiamiento preferencial"
                    : t === "regalo" ? "Regalo / Adicional"
                    : "Otro"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Valor</label>
            <Input
              value={form.valor}
              onChange={(e) => set("valor", e.target.value)}
              placeholder="Ej: 5%, S/ 2000"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Válido desde</label>
            <Input type="date" value={form.fecha_inicio} onChange={(e) => set("fecha_inicio", e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Válido hasta</label>
            <Input type="date" value={form.fecha_fin} onChange={(e) => set("fecha_fin", e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
            <select
              value={form.is_active ? "1" : "0"}
              onChange={(e) => set("is_active", e.target.value === "1")}
              className="w-full border rounded-md px-3 py-2 text-sm bg-white"
            >
              <option value="1">Activa</option>
              <option value="0">Inactiva</option>
            </select>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VentasCatalogoPage() {
  const [tab, setTab] = useState("modelos");
  const [modelos, setModelos] = useState([]);
  const [versiones, setVersiones] = useState([]);
  const [promociones, setPromociones] = useState([]);
  const [loading, setLoading] = useState(false);

  const [versionModal, setVersionModal] = useState(null);
  const [promoModal, setPromoModal] = useState(null);

  const fetchModelos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ventas/modelos?activos=0");
      const data = await res.json();
      setModelos(data.modelos || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchVersiones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ventas/versiones?activos=0");
      const data = await res.json();
      setVersiones(data.versiones || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPromociones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ventas/promociones?activas=0");
      const data = await res.json();
      setPromociones(data.promociones || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "modelos") fetchModelos();
    else if (tab === "versiones") { fetchModelos(); fetchVersiones(); }
    else if (tab === "promociones") { fetchModelos(); fetchPromociones(); }
  }, [tab, fetchModelos, fetchVersiones, fetchPromociones]);

  // ─── Tab: Modelos ─────────────────────────────────────────────────────────

  function renderModelos() {
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Los modelos se gestionan en{" "}
            <a href="/marcas" className="text-blue-600 hover:underline inline-flex items-center gap-1">
              Administración → Marcas <ExternalLink className="w-3 h-3" />
            </a>. Aquí se muestran solo como referencia.
          </p>
        </div>

        {loading && <p className="text-sm text-gray-500">Cargando…</p>}

        <div className="space-y-2">
          {modelos.map((m) => (
            <div key={m.id} className="border rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-white">
                <div className="flex items-center gap-3">
                  <Car className="w-5 h-5 text-gray-400 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">{m.nombre_completo || m.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {m.clase_nombre || "—"} · Años: {m.anios || "—"}
                    </p>
                  </div>
                </div>
                <Badge text={m.marca_nombre} color="blue" />
              </div>
            </div>
          ))}

          {!loading && modelos.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Car className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">No hay modelos en el sistema</p>
              <p className="text-xs mt-1">Ve a Administración → Marcas para agregar marcas y modelos</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Tab: Versiones ───────────────────────────────────────────────────────

  function renderVersiones() {
    const modelosActivos = modelos;
    const byModelo = {};
    for (const v of versiones) {
      if (!byModelo[v.modelo_id]) byModelo[v.modelo_id] = [];
      byModelo[v.modelo_id].push(v);
    }

    return (
      <div>
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={() => setVersionModal({})}>
            <Plus className="w-4 h-4 mr-2" /> Nueva versión
          </Button>
        </div>

        {loading && <p className="text-sm text-gray-500">Cargando…</p>}

        <div className="space-y-4">
          {modelosActivos.map((m) => (
            <div key={m.id} className="border rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-2">
                <Car className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-sm">{m.nombre}</span>
                <Badge text={m.tipo} color="blue" />
              </div>

              {(byModelo[m.id] || []).length === 0 ? (
                <div className="px-4 py-4 text-xs text-gray-400 italic">Sin versiones registradas</div>
              ) : (
                <div className="divide-y">
                  {(byModelo[m.id] || []).map((v) => (
                    <div key={v.id} className="px-4 py-3 flex items-center justify-between bg-white">
                      <div>
                        <p className="text-sm font-medium">{v.nombre_version}</p>
                        <p className="text-xs text-gray-500">
                          {formatPrice(v.precio_lista, v.moneda)}
                          {v.descuento_porcentaje > 0 && ` · ${v.descuento_porcentaje}% dto`}
                          {" · "}
                          {v.en_stock ? "En stock" : `Bajo pedido (${v.tiempo_entrega_dias} días)`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge text={v.is_active ? "Activa" : "Inactiva"} color={v.is_active ? "green" : "gray"} />
                        <button
                          onClick={() => setVersionModal(v)}
                          className="p-1 text-blue-500 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {!loading && modelosActivos.length === 0 && (
            <p className="text-center py-8 text-sm text-gray-400">
              Primero crea al menos un modelo en la pestaña &quot;Modelos&quot;
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Tab: Promociones ─────────────────────────────────────────────────────

  function renderPromociones() {
    const hoy = new Date().toISOString().slice(0, 10);

    return (
      <div>
        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={() => setPromoModal({})}>
            <Plus className="w-4 h-4 mr-2" /> Nueva promoción
          </Button>
        </div>

        {loading && <p className="text-sm text-gray-500">Cargando…</p>}

        <div className="space-y-2">
          {promociones.map((p) => {
            const expirada = p.fecha_fin && p.fecha_fin < hoy;
            return (
              <div
                key={p.id}
                className={`border rounded-lg p-4 flex items-start justify-between bg-white ${expirada ? "opacity-60" : ""}`}
              >
                <div className="flex gap-3 items-start">
                  <Tag className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      <Badge
                        text={
                          p.tipo === "descuento" ? "Descuento"
                          : p.tipo === "financiamiento_preferencial" ? "Financiamiento"
                          : p.tipo === "regalo" ? "Regalo"
                          : "Otro"
                        }
                        color={p.tipo === "descuento" ? "amber" : p.tipo === "regalo" ? "blue" : "gray"}
                      />
                      {p.modelo_nombre
                        ? <Badge text={p.modelo_nombre} color="blue" />
                        : <Badge text="Todos los modelos" color="gray" />}
                      {!p.is_active && <Badge text="Inactiva" color="red" />}
                      {expirada && <Badge text="Expirada" color="red" />}
                    </div>
                    <p className="text-sm">{p.descripcion}</p>
                    {p.valor && <p className="text-xs font-medium text-green-700 mt-0.5">{p.valor}</p>}
                    {(p.fecha_inicio || p.fecha_fin) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.fecha_inicio ? `Desde ${p.fecha_inicio}` : ""}
                        {p.fecha_inicio && p.fecha_fin ? " — " : ""}
                        {p.fecha_fin ? `Hasta ${p.fecha_fin}` : ""}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setPromoModal(p)}
                  className="p-1 text-blue-500 hover:text-blue-700 shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}

          {!loading && promociones.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <Tag className="w-10 h-10 mx-auto mb-2" />
              <p className="text-sm">No hay promociones registradas</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Catálogo de ventas</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gestiona los modelos, versiones y promociones que el agente de IA usa para cotizar.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b mb-6">
        <TabButton label="Modelos" active={tab === "modelos"} onClick={() => setTab("modelos")} />
        <TabButton label="Versiones" active={tab === "versiones"} onClick={() => setTab("versiones")} />
        <TabButton label="Promociones" active={tab === "promociones"} onClick={() => setTab("promociones")} />
      </div>

      {tab === "modelos" && renderModelos()}
      {tab === "versiones" && renderVersiones()}
      {tab === "promociones" && renderPromociones()}

      {/* Modals */}
      {versionModal !== null && (
        <VersionModal
          version={versionModal}
          modelos={modelos}
          onClose={() => setVersionModal(null)}
          onSaved={() => { setVersionModal(null); fetchVersiones(); fetchModelos(); }}
        />
      )}
      {promoModal !== null && (
        <PromoModal
          promo={promoModal}
          modelos={modelos}
          onClose={() => setPromoModal(null)}
          onSaved={() => { setPromoModal(null); fetchPromociones(); }}
        />
      )}
    </div>
  );
}
