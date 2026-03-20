"use client";

import { Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle
} from "@/components/ui/sheet";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import SidebarContent from "./SidebarContent";

export default function Header({
  user,
  sidebarOpen,
  setSidebarOpen,
  logout
}) {

  const initials = user?.fullname
    ?.split(" ")
    ?.map(n => n[0])
    ?.join("")
    ?.slice(0, 2)
    ?.toUpperCase();

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

              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>

        {/* ===== TOGGLE PC ===== */}
        <div className="hidden md:block">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/10 active:bg-white/20 hover:text-white active:text-white transition-colors"
            onClick={() => setSidebarOpen(v => !v)}
          >
            <Menu className="h-6 w-6" />
          </Button>
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

        {/* ===== USER MENU ===== */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" 
                    className="gap-2 text-white hover:bg-white/10 active:bg-white/20 hover:text-white active:text-white transition-colors">

              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {initials}
                </AvatarFallback>
              </Avatar>

              <span className="hidden sm:inline text-sm">
                {user?.fullname}
              </span>

            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
  align="end"
  className="z-[999]  text-[var(--brand)]"
>

            <DropdownMenuLabel>
              {user?.fullname}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem>
              Perfil
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={logout}>
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </header>
  );
}
