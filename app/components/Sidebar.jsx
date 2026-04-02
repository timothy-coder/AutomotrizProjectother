"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import SidebarContent from "./SidebarContent";

export default function Sidebar({ user, logout }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed top-4 left-4 z-50">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="secondary" size="icon" className="shadow">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>

        <SheetContent side="left" className="p-0 w-72 flex flex-col">
          {/* ✅ Title requerido por accesibilidad (oculto visualmente) */}
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>

          {/* ✅ Pasa user y logout a SidebarContent */}
          <SidebarContent 
            onNavigate={() => setOpen(false)}
            user={user}
            logout={logout}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}