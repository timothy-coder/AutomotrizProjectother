export const ACTIONS = [
  { key: "view", label: "Ver" },
  { key: "create", label: "Crear" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Eliminar" },
  { key: "viewall", label: "Ver todas" },
  { key: "asignar", label: "Asignar" },
];

export const SECTIONS = [
  { key: "home", label: "Home", actions: ["view"] },
  
  { key: "usuarios", label: "Usuarios", actions: ["view", "create", "edit", "delete"] },
  { key: "etapas", label: "Etapas", actions: ["view", "create", "edit", "delete"] },
  { key: "tiposactividades", label: "Actividades", actions: ["view", "create", "edit", "delete"] },
  { key: "clientes", label: "Clientes", actions: ["view", "create", "edit", "delete"] },
  { key: "marcas", label: "Marcas", actions: ["view", "create", "edit", "delete"] },
  { key: "modelos", label: "Modelos", actions: ["view", "create", "edit", "delete"] },
  { key: "inventario", label: "Inventario", actions: ["view", "create", "edit", "delete"] },
  { key: "combomantenimiento", label: "Combo Mantenimiento", actions: ["view", "create", "edit", "delete"] },
  { key: "precios", label: "Precios", actions: ["view", "create", "edit", "delete"] },
  { key: "configuracion", label: "Configuración", actions: ["view", "create", "edit", "delete"] },

  
  { key: "citas", label: "Citas", actions: ["view", "create", "edit", "viewall"] },
  { key: "recepcion", label: "Recepcion", actions: ["view", "create", "edit", "delete"] },

  { key: "agenda", label: "Agenda", actions: ["view", "create", "edit", "viewall"] },
  { key: "picaje", label: "Picaje", actions: ["view", "create", "edit", "delete"] },
 
  { key: "mensajes", label: "Mensajes", actions: ["view", "create", "edit", "delete"] },
  
  { key: "reportes", label: "Reportes", actions: ["view", "create", "edit", "delete"] },
  { key: "ordenes", label: "Órdenes", actions: ["view", "create", "edit", "delete"] },
  { key: "cotizacion", label: "Cotización", actions: ["view", "create", "edit", "delete"] },
  { key: "prospeccion", label: "Configuracion de Prospecciones", actions: ["view", "create", "edit", "delete"] },
  { key: "configagenda", label: "Configuración de Agenda", actions: ["view", "create", "edit", "delete"] },
  { key: "leads", label: "Leads", actions: ["view", "create", "edit","asignar","asignar"] },
  { key: "oportunidades", label: "Oportunidades", actions: ["view", "create", "edit","asignar"] },
  { key: "configpicaje", label: "Configuración de Picaje", actions: ["view", "create", "edit", "delete"] },
  { key: "configinventario", label: "Configuración de Inventario", actions: ["view", "create", "edit", "delete"] },
  { key: "configcotizacion", label: "Configuración de Cotización", actions: ["view", "create", "edit", "delete"] }
];
