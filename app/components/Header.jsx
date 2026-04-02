"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle
} from "@/components/ui/sheet";

import SidebarContent from "./SidebarContent";

export default function Header({ user }) {

  return (
    <header className="sticky top-0 z-40 border-b bg-[#13223F] text-white">
      <div className="w-full px-4 py-3 flex items-center gap-3">

        {/* ===== MOBILE SIDEBAR ===== */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"
                className="text-white hover:bg-white/10 active:bg-white/20 hover:text-white active:text-white transition-colors"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>

            <SheetContent side="left" className="p-0 w-72">
              <SheetTitle className="sr-only">
                Menú navegación
              </SheetTitle>

              <SidebarContent onNavigate={() => {}} />
            </SheetContent>
          </Sheet>
        </div>

        {/* ===== LOGO + TITULO ===== */}
        <div className="flex items-center gap-2">
          <img src="/Logopreview.png" className="h-10 w-25" />

          <div className="leading-tight">
            <p className="text-sm font-semibold">Dashboard</p>
            <p className="text-xs text-muted-foreground">
              Panel administrativo
            </p>
          </div>
        </div>

        <div className="flex-1" />

      </div>
    </header>
  );
}