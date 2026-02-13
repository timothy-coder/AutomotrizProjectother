"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_TREE, HOME_ITEM } from "@/config/navTree";
import { filterNavTree } from "@/lib/navFilter";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function SidebarContent({ onNavigate }) {
  const pathname = usePathname();
  const { permissions } = useAuth();

  // ✅ Home visible solo si tiene permiso
  const canHome = hasPermission(permissions, HOME_ITEM.perm[0], HOME_ITEM.perm[1]);

  // ✅ Menú filtrado por permisos
  const menu = filterNavTree(NAV_TREE, permissions);

  // ✅ abre automáticamente el/los acordeones según la ruta actual
  const openGroups = menu
    .filter((section) => section.items.some((item) => pathname.startsWith(item.to)))
    .map((section) => section.key);

  return (
    <aside className="h-full w-72 bg-slate-900 text-slate-100">
      <div className="p-5 border-b border-white/10">
        <h2 className="font-bold text-lg">Dashboard</h2>
        <p className="text-xs text-slate-400">Menú por permisos</p>
      </div>

      {/* ✅ HOME fuera del acordeón */}
      <div className="p-3">
        {canHome && (
          <Link
            href={HOME_ITEM.to}
            onClick={onNavigate}
            className={[
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
              pathname === HOME_ITEM.to || pathname.startsWith(HOME_ITEM.to + "/")
                ? "bg-indigo-600/20 border border-indigo-500/30 text-white"
                : "hover:bg-white/5 text-slate-200",
            ].join(" ")}
          >
            {HOME_ITEM.icon ? <HOME_ITEM.icon className="w-4 h-4" /> : null}
            <span>{HOME_ITEM.label}</span>
          </Link>
        )}
      </div>

      {/* ✅ Resto en acordeón */}
      <Accordion type="multiple" defaultValue={openGroups} className="px-2 pb-4">
        {menu.map((section) => (
          <AccordionItem key={section.key} value={section.key} className="border-white/10">
            <AccordionTrigger className="px-3 py-2 text-slate-300 hover:text-white">
              {section.label}
            </AccordionTrigger>

            <AccordionContent className="space-y-1 px-1 pb-2">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.to || pathname.startsWith(item.to + "/");

                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    onClick={onNavigate}
                    className={[
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition",
                      active
                        ? "bg-indigo-600/20 border border-indigo-500/30 text-white"
                        : "hover:bg-white/5 text-slate-200",
                    ].join(" ")}
                  >
                    {Icon ? <Icon className="w-4 h-4" /> : null}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </aside>
  );
}
