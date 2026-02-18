export const ACTIONS = [
  { key: "view", label: "Ver" },
  { key: "create", label: "Crear" },
  { key: "edit", label: "Editar" },
  { key: "delete", label: "Eliminar" },
  { key: "viewall", label: "Ver todas" },
];

export const SECTIONS = [
  { key: "home", label: "Home", actions: ["view"] },
  { key: "citas", label: "Citas", actions: ["view", "create", "edit", "viewall"] },
  { key: "etapas", label: "Etapas", actions: ["view", "create", "edit", "delete"] },
  { key: "marcas", label: "Marcas", actions: ["view", "create", "edit", "delete"] },
  { key: "modelos", label: "Modelos", actions: ["view", "create", "edit", "delete"] },
  { key: "clientes", label: "Clientes", actions: ["view", "create", "edit", "delete"] },
  { key: "inventario", label: "Inventario", actions: ["view", "create", "edit", "delete"] },
  { key: "ordenes", label: "Órdenes", actions: ["view", "create", "edit", "delete"] },
  { key: "cotizacion", label: "Cotización", actions: ["view", "create", "edit", "delete"] },
  { key: "picaje", label: "Picaje", actions: ["view", "create", "edit", "delete"] },
  { key: "tiposactividades", label: "Actividades", actions: ["view", "create", "edit", "delete"] },
  { key: "configuracion", label: "Configuración", actions: ["view", "create", "edit", "delete"] },
  { key: "reportes", label: "Reportes", actions: ["view", "create", "edit", "delete"] },
  { key: "usuarios", label: "Usuarios", actions: ["view", "create", "edit", "delete"] },
  { key: "combomantenimiento", label: "Combo Mantenimiento", actions: ["view", "create", "edit", "delete"] },
  { key: "carrosparamantenimiento", label: "Gestion de Carroceria", actions: ["view", "create", "edit", "delete"] },
  { key: "precios", label: "Precios", actions: ["view", "create", "edit", "delete"] },
  { key: "mensajes", label: "Mensajes", actions: ["view", "create", "edit", "delete"] },



];
