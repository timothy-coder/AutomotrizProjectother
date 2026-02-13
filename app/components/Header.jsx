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
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">

      <div className="w-full px-4 py-3 flex items-center gap-3">

        {/* ===== MOBILE SIDEBAR ===== */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
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
            variant="outline"
            size="icon"
            onClick={() => setSidebarOpen(v => !v)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* ===== LOGO + TITULO ===== */}
        <div className="flex items-center gap-2">
          <img src="/Logoarriba.png" className="h-7 w-7" />

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
            <Button variant="ghost" className="gap-2">

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
