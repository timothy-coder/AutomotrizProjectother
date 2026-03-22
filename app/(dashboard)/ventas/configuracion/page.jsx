"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, ChevronDown, ChevronUp, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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

// ─── Financiamiento ───────────────────────────────────────────────────────────

function FinanciamientoForm({ data, onSave }) {
  const [form, setForm] = useState({
    entidades: (data?.entidades || []).join(", "),
    tasa_interes_anual_min: data?.tasa_interes_anual_min ?? "",
    tasa_interes_anual_max: data?.tasa_interes_anual_max ?? "",
    plazo_max_meses: data?.plazo_max_meses ?? "",
    cuota_inicial_min_porcentaje: data?.cuota_inicial_min_porcentaje ?? "",
    acepta_historial_limitado: data?.acepta_historial_limitado ?? false,
    notas: data?.notas ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    const contenido = {
      entidades: form.entidades.split(",").map((s) => s.trim()).filter(Boolean),
      tasa_interes_anual_min: Number(form.tasa_interes_anual_min) || 0,
      tasa_interes_anual_max: Number(form.tasa_interes_anual_max) || 0,
      plazo_max_meses: Number(form.plazo_max_meses) || 0,
      cuota_inicial_min_porcentaje: Number(form.cuota_inicial_min_porcentaje) || 0,
      acepta_historial_limitado: form.acepta_historial_limitado,
      notas: form.notas.trim(),
    };

    try {
      const res = await fetch("/api/ventas/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion: "financiamiento", contenido }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Configuración de financiamiento guardada");
      onSave(contenido);
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Entidades de financiamiento <span className="text-gray-400">(separadas por coma)</span>
        </label>
        <Input
          value={form.entidades}
          onChange={(e) => set("entidades", e.target.value)}
          placeholder="Casa automotriz, Banco Asociado"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tasa mínima (% anual)</label>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={form.tasa_interes_anual_min}
            onChange={(e) => set("tasa_interes_anual_min", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tasa máxima (% anual)</label>
          <Input
            type="number"
            min={0}
            step={0.1}
            value={form.tasa_interes_anual_max}
            onChange={(e) => set("tasa_interes_anual_max", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Plazo máximo (meses)</label>
          <Input
            type="number"
            min={1}
            value={form.plazo_max_meses}
            onChange={(e) => set("plazo_max_meses", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Cuota inicial mínima (%)</label>
          <Input
            type="number"
            min={0}
            max={100}
            step={1}
            value={form.cuota_inicial_min_porcentaje}
            onChange={(e) => set("cuota_inicial_min_porcentaje", e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="historial-limitado"
          checked={form.acepta_historial_limitado}
          onChange={(e) => set("acepta_historial_limitado", e.target.checked)}
          className="rounded"
        />
        <label htmlFor="historial-limitado" className="text-sm text-gray-700">
          Acepta clientes con historial crediticio limitado
        </label>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notas adicionales</label>
        <Textarea
          value={form.notas}
          onChange={(e) => set("notas", e.target.value)}
          placeholder="Información adicional que el agente debe comunicar sobre financiamiento"
          rows={3}
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}

// ─── Documentación ────────────────────────────────────────────────────────────

function DocumentacionForm({ seccion, label, data, onSave }) {
  const [docs, setDocs] = useState(data?.documentos || []);
  const [notas, setNotas] = useState(data?.notas || "");
  const [nuevoDoc, setNuevoDoc] = useState("");
  const [saving, setSaving] = useState(false);

  function addDoc() {
    const doc = nuevoDoc.trim();
    if (!doc || docs.includes(doc)) return;
    setDocs((prev) => [...prev, doc]);
    setNuevoDoc("");
  }

  function removeDoc(i) {
    setDocs((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setSaving(true);
    const contenido = { documentos: docs, notas: notas.trim() };
    try {
      const res = await fetch("/api/ventas/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion, contenido }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success(`Documentación para ${label} guardada`);
      onSave(contenido);
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <p className="text-sm text-gray-600">
        Documentos requeridos para <strong>{label}</strong>:
      </p>

      <div className="space-y-2">
        {docs.map((doc, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2">
            <span className="text-sm flex-1">{doc}</span>
            <button onClick={() => removeDoc(i)} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}

        <div className="flex gap-2">
          <Input
            value={nuevoDoc}
            onChange={(e) => setNuevoDoc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addDoc()}
            placeholder="Ej: DNI vigente"
          />
          <Button variant="outline" size="sm" onClick={addDoc}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notas adicionales</label>
        <Textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Información adicional sobre documentación"
          rows={2}
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}

// ─── Garantías ────────────────────────────────────────────────────────────────

function GarantiasForm({ data, onSave }) {
  const [form, setForm] = useState({
    garantia_general_anios: data?.garantia_general_anios ?? "",
    garantia_motor_anios: data?.garantia_motor_anios ?? "",
    cobertura: data?.cobertura ?? "",
    notas: data?.notas ?? "",
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSave() {
    setSaving(true);
    const contenido = {
      garantia_general_anios: Number(form.garantia_general_anios) || 0,
      garantia_motor_anios: Number(form.garantia_motor_anios) || 0,
      cobertura: form.cobertura.trim(),
      notas: form.notas.trim(),
    };
    try {
      const res = await fetch("/api/ventas/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion: "garantias", contenido }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Configuración de garantías guardada");
      onSave(contenido);
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Garantía general (años)</label>
          <Input
            type="number"
            min={0}
            value={form.garantia_general_anios}
            onChange={(e) => set("garantia_general_anios", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Garantía motor (años)</label>
          <Input
            type="number"
            min={0}
            value={form.garantia_motor_anios}
            onChange={(e) => set("garantia_motor_anios", e.target.value)}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Cobertura</label>
        <Textarea
          value={form.cobertura}
          onChange={(e) => set("cobertura", e.target.value)}
          placeholder="Ej: Defectos de fábrica en motor, transmisión y sistema eléctrico"
          rows={2}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notas adicionales</label>
        <Textarea
          value={form.notas}
          onChange={(e) => set("notas", e.target.value)}
          placeholder="Condiciones, exclusiones, etc."
          rows={2}
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}

// ─── Servicios adicionales ────────────────────────────────────────────────────

function ServiciosForm({ data, onSave }) {
  const [items, setItems] = useState(data?.items || []);
  const [notas, setNotas] = useState(data?.notas || "");
  const [saving, setSaving] = useState(false);
  const [nuevoItem, setNuevoItem] = useState({ nombre: "", precio: "", incluido: false });

  function addItem() {
    if (!nuevoItem.nombre.trim()) return;
    setItems((prev) => [
      ...prev,
      { nombre: nuevoItem.nombre.trim(), precio: Number(nuevoItem.precio) || 0, incluido: nuevoItem.incluido },
    ]);
    setNuevoItem({ nombre: "", precio: "", incluido: false });
  }

  function removeItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i, key, val) {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [key]: val } : item)));
  }

  async function handleSave() {
    setSaving(true);
    const contenido = { items, notas: notas.trim() };
    try {
      const res = await fetch("/api/ventas/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seccion: "servicios_adicionales", contenido }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success("Servicios adicionales guardados");
      onSave(contenido);
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-xs text-gray-500">
        Define los servicios y accesorios adicionales que el agente puede ofrecer al cliente.
      </p>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 bg-gray-50 border rounded px-3 py-2">
            <input
              type="checkbox"
              checked={item.incluido}
              onChange={(e) => updateItem(i, "incluido", e.target.checked)}
              title="Incluido en el precio"
            />
            <span className="text-sm flex-1">{item.nombre}</span>
            <Input
              type="number"
              min={0}
              value={item.precio}
              onChange={(e) => updateItem(i, "precio", Number(e.target.value))}
              className="w-24 h-7 text-xs"
            />
            <span className="text-xs text-gray-400">PEN</span>
            <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="border rounded-lg p-3 bg-blue-50 space-y-2">
        <p className="text-xs font-medium text-blue-700">Agregar servicio</p>
        <div className="flex gap-2">
          <Input
            value={nuevoItem.nombre}
            onChange={(e) => setNuevoItem((n) => ({ ...n, nombre: e.target.value }))}
            placeholder="Nombre del servicio"
            className="flex-1"
          />
          <Input
            type="number"
            min={0}
            value={nuevoItem.precio}
            onChange={(e) => setNuevoItem((n) => ({ ...n, precio: e.target.value }))}
            placeholder="Precio"
            className="w-24"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="nuevo-incluido"
            checked={nuevoItem.incluido}
            onChange={(e) => setNuevoItem((n) => ({ ...n, incluido: e.target.checked }))}
          />
          <label htmlFor="nuevo-incluido" className="text-xs text-gray-600">Incluido en precio base</label>
          <Button size="sm" variant="outline" onClick={addItem} className="ml-auto">
            <Plus className="w-4 h-4 mr-1" /> Agregar
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notas adicionales</label>
        <Textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          placeholder="Información adicional sobre servicios"
          rows={2}
        />
      </div>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Guardando…" : "Guardar cambios"}
      </Button>
    </div>
  );
}

// ─── Agentes IA ───────────────────────────────────────────────────────────────

const PROMPTS_BASE = {
  taller: `Eres Carlos, asistente del Taller Automotriz. Responde SIEMPRE en español formal (USTED).

=== DATOS DEL CLIENTE ===
[Teléfono, nombre, ID y email se inyectan dinámicamente]

=== VEHÍCULOS DEL CLIENTE ===
[Vehículos registrados se inyectan dinámicamente]

=== CATÁLOGO DE SERVICIOS Y PRECIOS ===
[Precios del catálogo se inyectan dinámicamente]

=== 6 NIVELES DE MANTENIMIENTO ===
A.BÁSICO (1.5h): Filtro aceite+aceite motor+arandela | MO+lavado ext+escaneo | 30% repuestos/70% MO | SIN garantía de marca.
B.REVISIÓN EXPRESS (1h): Inspección iluminación(del/post), fluidos, motor, frenos, suspensión, ejes, escaneo.
C.PREVENTIVO (5h): Todo Express + aceite caja/transmisión, bujías, cadena distribución, faja accesorios, filtros(aire/AC/comb.), fluidos(caja/diferencial), liq.frenos, refrigerante, shampoo.
D.PREMIUM (6h): Todo Preventivo + alineamiento, balanceo, aditivos(motor y comb.), sanitización ductos.
E.EXCLUSIVO (5d): Todo Premium + lavado salón(interiores), pintado aros, seguro aros, pulido faros, recojo/entrega domicilio.
F.ALTO RENDIMIENTO (9d): Todo Exclusivo + undercoating(chasis), zincado, pulido general, 2 paños pintura, laminado.

=== BENEFICIOS PPM ===
1 rev.primeros 1,000km | 2 revisiones gratuitas | 1 lavado+sanitización ductos | 1 alineamiento+balanceo electrónico | 1 rectificado discos freno | 1 paño pintura.

=== INDICACIONES TALLER ===
- PRIORIDAD: N400, Sail, Gol, Ranger, Amarok, Colorado y vehículos +50,000km.
- OT: Registrar tipo mantenimiento+kilometraje (ej: Mantenimiento Premium 50,000km).
- BÁSICO: Facturar 1h; picaje 20min.
- ESCANEO: Obligatorio en todo vehículo sin excepción.
- GARANTÍA BÁSICO: No tiene garantía de marca salvo comunicación interna.

=== REGLAS ===
- SALUDO: Saluda con "Buenos días/tardes/noches, [nombre] 👋". Si es el primer mensaje preséntate: "Soy Carlos del Taller Automotriz 🔧".
- FORMATO WhatsApp: Para *negritas* usa UN solo asterisco (*texto*). NUNCA uses doble asterisco (**texto**).
- PRECIOS: Solo del catálogo. NO inventes precios. Decir siempre "precio aproximado de S/ X.XX". TODOS los precios NO incluyen IGV.
- FLUJO COTIZACIÓN 2 PASOS:
  PASO 1: Listar SOLO los 6 tipos de mantenimiento. PROHIBIDO mostrar sub-items o precios en PASO 1.
  PASO 2: Cuando el cliente seleccione uno, mostrar sus submantenimientos con precio aproximado.
- PREVENTIVO (EXCEPCIÓN): Cuando el cliente seleccione Preventivo, calcular nivel por km: CEIL(km/5000) max 10.
- REDIRIGIR A VENTAS: Si el cliente quiere COMPRAR un vehículo NUEVO, responde con JSON: {"action":"redirect_ventas",...}

=== CONSIDERACIONES ADICIONALES (PRIORITARIAS) ===
[Se inyectan desde el CRM en cada conversación]`,

  ventas: `Eres un asesor de ventas IA de una concesionaria automotriz. Atiendes por WhatsApp con calidez, profesionalismo y emojis amigables. Tu objetivo es guiar al cliente hasta generar una cotización completa.

=== REGLA ABSOLUTA ===
NUNCA inventes marcas, modelos, especificaciones ni precios.
Solo menciona vehículos de la sección VEHÍCULOS DISPONIBLES.
Si piden una marca/modelo que NO está en el catálogo: di que no lo manejas y muestra los disponibles.
Precios SOLO del catálogo, exactos, sin redondear ni estimar.

=== DATOS DEL CLIENTE ===
[Nombre, teléfono y vehículos actuales se inyectan dinámicamente]

=== VEHÍCULOS DISPONIBLES ===
[Catálogo completo con precios, colores y disponibilidad se inyecta dinámicamente]

=== RESPUESTA: SIEMPRE JSON ESTRICTO ===
{ "action": "continue"|"save_lead"|"escalate"|"redirect_taller", "paso_actual": 1-7, "message": "...", "lead_data": {...} }

=== FLUJO DE COTIZACIÓN (7 pasos) ===
PASO 1 - SALUDO Y DATOS: Saluda, preséntate, pide nombre y correo.
PASO 2 - NECESIDADES: Pregunta uso, personas, tipo de vehículo, qué valora más.
PASO 3 - OPCIONES: Presenta MÁXIMO 3 modelos relevantes con precio y disponibilidad.
PASO 4 - DETALLE: Profundiza en el modelo elegido. Equipamiento, colores, garantía.
PASO 5 - PRESUPUESTO Y PAGO: Pregunta rango, contado o financiamiento, plazo, cuota inicial.
PASO 6 - ENTREGA Y DOCUMENTACIÓN: Informa tiempo según stock. Docs necesarios.
PASO 7A - RESUMEN: Cotización completa. Pregunta si confirma.
PASO 7B - GUARDAR: Cliente confirma → action: save_lead con lead_data completo.

=== ENRUTAMIENTO ===
Mantenimiento/taller/servicio → action: redirect_taller
Asesor/humano → action: escalate

=== REGLAS GENERALES ===
- Español, amigable, máximo 280 palabras por mensaje.
- Usa emojis: autos, check, estrella, dinero.
- NUNCA inventes precios fuera del catálogo.

=== CONSIDERACIONES ADICIONALES (PRIORITARIAS) ===
[Se inyectan desde el CRM en cada conversación]`,
};

function AgentPromptForm({ agente, onSave }) {
  const [consideraciones, setConsideraciones] = useState(agente?.consideraciones || "");
  const [saving, setSaving] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/agentes/prompt-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_key: agente.agent_key, consideraciones }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      toast.success(`Consideraciones de "${agente.display_name}" guardadas`);
      onSave(agente.agent_key, consideraciones);
    } catch {
      toast.error("No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  const updatedAt = agente?.updated_at
    ? new Date(agente.updated_at).toLocaleString("es-PE")
    : null;

  const promptBase = PROMPTS_BASE[agente?.agent_key] || "(Prompt no disponible)";

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-blue-600" />
        <span className="font-medium text-sm text-gray-800">{agente?.display_name}</span>
      </div>

      {/* Prompt base colapsable */}
      <div className="border rounded-md overflow-hidden">
        <button
          onClick={() => setShowPrompt((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 text-xs font-medium text-gray-600 transition-colors"
        >
          <span>Ver prompt base del agente (solo lectura)</span>
          {showPrompt ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {showPrompt && (
          <textarea
            readOnly
            value={promptBase}
            rows={18}
            className="w-full px-3 py-2 text-xs font-mono text-gray-600 bg-gray-50 border-t resize-none focus:outline-none"
          />
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Consideraciones adicionales
        </label>
        <Textarea
          value={consideraciones}
          onChange={(e) => setConsideraciones(e.target.value)}
          placeholder={`Ej: Esta semana hay 20% de descuento en cambio de aceite. Informar a todos los clientes que lo consulten.`}
          rows={5}
        />
        <p className="text-xs text-gray-400 mt-1">
          Este texto se agrega al final del prompt base del agente. No reemplaza sus reglas existentes.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Guardando…" : "Guardar"}
        </Button>
        {updatedAt && agente?.updated_by && (
          <span className="text-xs text-gray-400">
            Actualizado: {updatedAt} por {agente.updated_by}
          </span>
        )}
      </div>
    </div>
  );
}

function AgentesIAForm({ agentes, onSave }) {
  if (!agentes || agentes.length === 0) {
    return <p className="text-sm text-gray-500">No hay agentes configurados.</p>;
  }

  return (
    <div className="max-w-2xl space-y-4">
      <p className="text-sm text-gray-600">
        Agrega consideraciones que los agentes IA tendrán en cuenta en sus respuestas.
        Se inyectan dinámicamente en cada conversación sin modificar la lógica base.
      </p>
      {agentes.map((agente) => (
        <AgentPromptForm key={agente.agent_key} agente={agente} onSave={onSave} />
      ))}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function VentasConfiguracionPage() {
  const [tab, setTab] = useState("financiamiento");
  const [config, setConfig] = useState({});
  const [agentes, setAgentes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    try {
      const [resConfig, resAgentes] = await Promise.all([
        fetch("/api/ventas/configuracion"),
        fetch("/api/agentes/prompt-config"),
      ]);
      const dataConfig = await resConfig.json();
      const dataAgentes = await resAgentes.json();
      setConfig(dataConfig.configuracion || {});
      setAgentes(dataAgentes.agentes || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  function updateSection(seccion, contenido) {
    setConfig((c) => ({ ...c, [seccion]: contenido }));
  }

  function updateAgente(agentKey, consideraciones) {
    setAgentes((prev) =>
      prev.map((a) => (a.agent_key === agentKey ? { ...a, consideraciones } : a))
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración del agente</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define la información que el agente de IA usa durante las cotizaciones.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Cargando configuración…</p>
      ) : (
        <>
          <div className="flex gap-1 border-b mb-6 flex-wrap">
            <TabButton label="Financiamiento" active={tab === "financiamiento"} onClick={() => setTab("financiamiento")} />
            <TabButton label="Docs. Persona Natural" active={tab === "doc_natural"} onClick={() => setTab("doc_natural")} />
            <TabButton label="Docs. Persona Jurídica" active={tab === "doc_juridico"} onClick={() => setTab("doc_juridico")} />
            <TabButton label="Garantías" active={tab === "garantias"} onClick={() => setTab("garantias")} />
            <TabButton label="Servicios adicionales" active={tab === "servicios"} onClick={() => setTab("servicios")} />
            <TabButton label="Agentes IA" active={tab === "agentes"} onClick={() => setTab("agentes")} />
          </div>

          {tab === "financiamiento" && (
            <FinanciamientoForm
              data={config.financiamiento}
              onSave={(c) => updateSection("financiamiento", c)}
            />
          )}
          {tab === "doc_natural" && (
            <DocumentacionForm
              seccion="documentacion_natural"
              label="persona natural"
              data={config.documentacion_natural}
              onSave={(c) => updateSection("documentacion_natural", c)}
            />
          )}
          {tab === "doc_juridico" && (
            <DocumentacionForm
              seccion="documentacion_juridico"
              label="persona jurídica"
              data={config.documentacion_juridico}
              onSave={(c) => updateSection("documentacion_juridico", c)}
            />
          )}
          {tab === "garantias" && (
            <GarantiasForm
              data={config.garantias}
              onSave={(c) => updateSection("garantias", c)}
            />
          )}
          {tab === "servicios" && (
            <ServiciosForm
              data={config.servicios_adicionales}
              onSave={(c) => updateSection("servicios_adicionales", c)}
            />
          )}
          {tab === "agentes" && (
            <AgentesIAForm agentes={agentes} onSave={updateAgente} />
          )}
        </>
      )}
    </div>
  );
}
