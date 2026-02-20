import {
  Users, Milestone, ListChecks, UserRound, Blinds, Boxes, Settings,
  CalendarCheck, ClipboardList, Receipt, SquareDashedMousePointer, FileText,Home,CarFront,Columns2,Columns3,Coins,Calendar,MessageCircle
} from "lucide-react";
export const HOME_ITEM = { to: "/home", label: "Home", icon: Home, perm: ["home", "view"] };
export const NAV_TREE = [
  {
    key: "admin",
    label: "Administración",
    items: [
      { to: "/usuarios", label: "Usuarios", icon: Users, perm: ["usuarios", "view"] },
      { to: "/etapas", label: "Etapas", icon: Milestone, perm: ["etapas", "view"] },
      { to: "/tiposactividades", label: "Actividades", icon: ListChecks, perm: ["tiposactividades", "view"] },
      { to: "/clientes", label: "Clientes", icon: UserRound, perm: ["clientes", "view"] },
      { to: "/marcas", label: "Marcas", icon: Blinds, perm: ["marcas", "view"] },
      { to: "/inventario", label: "Inventario", icon: Boxes, perm: ["inventario", "view"] },
      { to: "/combomantenimiento", label: "Mantenimiento", icon: Columns3, perm: ["combomantenimiento", "view"] },
      { to: "/carrosparamantenimiento", label: "Gestion de Carroceria", icon: CarFront, perm: ["carrosparamantenimiento", "view"] },
      { to: "/precios", label: "Precios", icon: Coins, perm: ["precios", "view"] },
      { to: "/configuracion", label: "Configuración del sistema", icon: Settings, perm: ["configuracion", "view"] },
      
    ],
  },
  {
    key: "citas",
    label: "Citas",
    items: [
      { to: "/citas", label: "Citas", icon: Calendar, perm: ["citas", "view"] },
       { to: "/recepcion", label: "Recepción", icon: CalendarCheck, perm: ["recepcion", "view"] },
    ],
  },
   {
    key: "cotizacion",
    label: "Cotizacion",
    items: [{ to: "/cotizacion", label: "Cotizacion", icon: Receipt, perm: ["cotizacion", "view"] }],
  },
  {
    key: "mensajes",
    label: "Mensajes",
    items: [{ to: "/mensajes", label: "Mensajes", icon: MessageCircle, perm: ["mensajes", "view"] }],
  },
  {
    key: "pyp",
    label: "Planchado y Pintura",
    items: [
      { to: "/ordenes/pyp", label: "OT´s", icon: ClipboardList, perm: ["ordenes", "view"] },
      { to: "/cotizacion/pyp", label: "Cotización", icon: Receipt, perm: ["cotizacion", "view"] },
      { to: "/picaje/pyp", label: "Picaje", icon: SquareDashedMousePointer, perm: ["picaje", "view"] },
    ],
  },
  {
    key: "general",
    label: "Taller",
    items: [
      { to: "/ordenes/taller", label: "OT´s", icon: ClipboardList, perm: ["ordenes", "view"] },
      { to: "/cotizacion/taller", label: "Cotización", icon: Receipt, perm: ["cotizacion", "view"] },
      { to: "/picaje/taller", label: "Picaje", icon: SquareDashedMousePointer, perm: ["picaje", "view"] },
    ],
  },
  {
    key: "comercial",
    label: "Reportes",
    items: [{ to: "/reportes", label: "Reportes", icon: FileText, perm: ["reportes", "view"] }],
  },
];
