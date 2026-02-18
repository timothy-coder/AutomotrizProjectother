import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Car, Calendar, Users, Wrench, MessageSquareText } from "lucide-react";

const BRAND = "#5e17eb";
const GRAY = "#83919c";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* glow sutil */}
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background: `radial-gradient(900px 500px at 15% 10%, ${BRAND}33, transparent 60%),
                       radial-gradient(700px 400px at 85% 20%, ${BRAND}22, transparent 55%)`,
        }}
      />

      {/* TOP BAR */}
      <header className="relative mx-auto max-w-6xl px-4 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-2xl grid place-items-center border"
            style={{
              borderColor: `${BRAND}55`,
              background: `${BRAND}14`,
            }}
          >
            <img src="/Logoarribasin.png" alt="Logo"  />

          </div>

          <div className="leading-tight">
            <p className="font-semibold tracking-wide">Post Venta Automotriz</p>
            <p className="text-xs" style={{ color: GRAY }}>
              Sistema administrativo
            </p>
          </div>
        </div>

      </header>

      {/* HERO */}
      <section className="relative mx-auto max-w-6xl px-4 pt-10 pb-10">
        <div className="grid gap-6 md:grid-cols-2 items-center">
          <div className="space-y-5">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Gestiona citas, clientes, vehículos y ausencias{" "}
              <span style={{ color: BRAND }}>en un solo lugar.</span>
            </h1>

            <p className="text-base md:text-lg" style={{ color: GRAY }}>
              Agenda semanal por centro, filtros por asesor/estado, control de
              ausencias y registro de clientes con sus vehículos.
            </p>

            <div className="flex flex-wrap gap-2 pt-2">
              <Link href="/login">
                <Button
                  className="text-white"
                  style={{
                    background: BRAND,
                  }}
                >
                  Ver demo
                </Button>
              </Link>

              <Link href="/login">
                <Button
                  variant="outline"
                  className="text-white hover:text-white"
                  style={{
                    borderColor: `${BRAND}55`,
                    background: "transparent",
                  }}
                >
                  Ver panel
                </Button>
              </Link>
            </div>
          </div>

          {/* CARD */}
          <Card
            className="rounded-2xl border bg-white/5 text-white"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Resumen rápido</span>

                <span
                  className="text-xs rounded-full border px-2 py-1"
                  style={{
                    borderColor: `${BRAND}55`,
                    color: GRAY,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  Demo
                </span>
              </CardTitle>
            </CardHeader>

            <CardContent className="grid gap-3">
              <MiniStat
                icon={<Calendar className="h-4 w-4" style={{ color: BRAND }} />}
                title="Calendario semanal"
                desc="Configura tu calendario semanal de acuerdo a tu centros."
              />
              <MiniStat
                icon={<Users className="h-4 w-4" style={{ color: BRAND }} />}
                title="Clientes y vehículos"
                desc="Creación de clientes y vehiculos relacionados."
              />
              <MiniStat
                icon={<Wrench className="h-4 w-4" style={{ color: BRAND }} />}
                title="Talleres y mostradores"
                desc="CRUD por centro con permisos."
              />
              <MiniStat
                icon={
                  <MessageSquareText
                    className="h-4 w-4"
                    style={{ color: BRAND }}
                  />
                }
                title="Conversaciones"
                desc="Sesiones tipo WhatsApp + timeline."
              />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative mx-auto max-w-6xl px-4 pb-14">
        <div className="grid gap-4 md:grid-cols-3">
          <Feature
            title="Permisos por módulo"
            desc="Permisos para cada usuario."
          />
          <Feature
            title="Calendario inteligente"
            desc="Bloquea horas pasadas y días inactivos."
          />
          <Feature title="UI premium" desc="UI moderna." />
        </div>
      </section>

      {/* FOOTER */}
      <footer
        className="relative mx-auto max-w-6xl px-4 pb-10 text-xs"
        style={{ color: GRAY }}
      >
        {new Date().getFullYear()} © Post Venta Automotriz
      </footer>
    </main>
  );
}

function MiniStat({ icon, title, desc }) {
  return (
    <div
      className="flex gap-3 rounded-xl border p-3"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <div
        className="h-9 w-9 rounded-xl grid place-items-center border"
        style={{
          borderColor: "rgba(255,255,255,0.10)",
          background: "rgba(255,255,255,0.03)",
        }}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground" style={{ color: "#83919c" }}>
          {desc}
        </p>
      </div>
    </div>
  );
}

function Feature({ title, desc }) {
  return (
    <Card
      className="rounded-2xl border bg-white/5 text-white"
      style={{ borderColor: "rgba(255,255,255,0.08)" }}
    >
      <CardContent className="p-5 space-y-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm" style={{ color: "#83919c" }}>
          {desc}
        </p>
      </CardContent>
    </Card>
  );
}
