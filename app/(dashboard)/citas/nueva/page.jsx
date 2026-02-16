"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import ClienteSelectCard from "@/app/components/citas/ClienteSelectCard";

import Paso3Horario from "@/app/components/citas/Paso3Horario";
import CitaDatosCard from "@/app/components/citas/CitaDatosCard";

import { Button } from "@/components/ui/button";
import MotivosVisitaCard from "@/app/components/citas/MotivosVisitaCard";

export default function NuevaCitaPage() {

  const router = useRouter();

  const [clienteId, setClienteId] = useState(null);
  const [vehiculoId, setVehiculoId] = useState(null);

  const [motivos, setMotivos] = useState([
  { motivo_id: null, submotivo_id: null, submotivos: [] }
]);
  const [horario, setHorario] = useState(null);
  const [datos, setDatos] = useState({});

  const [saving, setSaving] = useState(false);

  // ================= GUARDAR =================
  async function handleSave() {

    if (!clienteId) return toast.warning("Seleccione cliente");
    if (!horario) return toast.warning("Seleccione horario");
    if (motivos.length === 0) return toast.warning("Seleccione motivo");

    try {
      setSaving(true);

      // 1️⃣ crear cita
      const citaRes = await fetch("/api/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cliente_id: clienteId,
          vehiculo_id: vehiculoId,
          centro_id: horario.centro_id,
          taller_id: horario.taller_id,
          asesor_id: horario.asesor_id,
          start_at: horario.start,
          end_at: horario.end,
          origen_id: datos.origen_id,
          tipo_servicio: datos.tipo_servicio,
          servicio_valet: datos.servicio_valet,
          fecha_promesa: datos.fecha_promesa,
          hora_promesa: datos.hora_promesa,
          nota_cliente: datos.nota_cliente,
          nota_interna: datos.nota_interna,
          created_by: 1 // ← usuario logueado
        })
      });

      const { id: citaId } = await citaRes.json();

      // 2️⃣ guardar motivos
      await Promise.all(
        motivos.map(m =>
          fetch(`/api/citas/${citaId}/motivos`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              motivo_id: m.motivo_id,
              submotivo_id: m.submotivo_id
            })
          })
        )
      );

      // 3️⃣ subir archivos
      if (datos.files?.length) {
        for (const file of datos.files) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("user_id", 1);

          await fetch(`/api/citas/${citaId}/archivos`, {
            method: "POST",
            body: formData
          });
        }
      }

      toast.success("Cita creada correctamente");
      router.push("/citas");

    } catch {
      toast.error("Error creando cita");
    } finally {
      setSaving(false);
    }
  }
function handleClienteSelect(data){
  setClienteId(data.cliente?.id || null);
  setVehiculoId(data.vehiculo?.id || null);
}
  return (
    <div className="p-6 h-full flex flex-col">

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Nueva cita</h1>
        <p className="text-sm text-muted-foreground">
          Complete la información de la cita
        </p>
      </div>

      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">

          {/* IZQUIERDA */}
          <div className="space-y-6">

           <ClienteSelectCard onSelect={handleClienteSelect} />

            <MotivosVisitaCard
              value={motivos}
              onChange={setMotivos}
            />

            <Paso3Horario onChange={setHorario} />

          </div>

          {/* ASIDE */}
          <aside className="border rounded-xl p-4 bg-gray-50 h-fit sticky top-4">
            <CitaDatosCard
              value={datos}
              onChange={setDatos}
            />
          </aside>

        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3 border-t mt-4">
        <Button
          variant="outline"
          onClick={() => router.push("/citas")}
          disabled={saving}
        >
          Cancelar
        </Button>

        <Button
          onClick={handleSave}
          disabled={!clienteId || !horario || saving}
        >
          {saving ? "Guardando..." : "Guardar cita"}
        </Button>
      </div>
    </div>
  );
}
