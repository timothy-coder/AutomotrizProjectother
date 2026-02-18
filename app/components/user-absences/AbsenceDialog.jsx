"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function UserAbsenceDialog({
  open,
  onOpenChange,
  fullname,
  absence,   // 👈 si existe → EDIT
  onSaved,
}) {
  const editing = Boolean(absence);

  const [users, setUsers] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    user_id: "",
    reason: "",
    will_be_absent: true,
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    notes: "",
  });

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // ================= LOAD USERS =================

  useEffect(() => {
    if (!open) return;

    fetch("/api/usuarios")
      .then(r => r.json())
      .then(data => setUsers(data.filter(u => u.is_active)));
  }, [open]);

  // ================= LOAD DATA (EDIT) =================

  useEffect(() => {
    if (!open) return;

    if (absence) {
      const toYMD = (v) => v ? v.slice(0,10) : "";

      setForm({
        user_id: String(absence.user_id),
        reason: absence.reason || "",
        will_be_absent: Boolean(absence.will_be_absent),
        start_date: toYMD(absence.start_date),
        end_date: toYMD(absence.end_date),
        start_time: absence.start_time?.slice(0,5) || "",
        end_time: absence.end_time?.slice(0,5) || "",
        notes: absence.notes || "",
      });

    } else {
      // reset create
      setForm({
        user_id: "",
        reason: "",
        will_be_absent: true,
        start_date: "",
        end_date: "",
        start_time: "",
        end_time: "",
        notes: "",
      });
    }
  }, [absence, open]);

  // ================= SAVE =================

  async function handleSave() {
    if (!form.user_id) return toast.warning("Seleccione usuario");
    if (!form.reason) return toast.warning("Ingrese motivo");
    if (!form.start_date) return toast.warning("Seleccione fecha");

    try {
      setSaving(true);

      const payload = {
        user_id: Number(form.user_id),
        reason: form.reason,
        will_be_absent: form.will_be_absent,
        start_date: form.start_date,
        end_date: form.will_be_absent
          ? form.end_date || form.start_date
          : null,
        start_time: form.will_be_absent ? null : form.start_time,
        end_time: form.will_be_absent ? null : form.end_time,
        notes: form.notes,
      };

      const res = await fetch(
        editing
          ? `/api/user-absences/${absence.id}`
          : `/api/user-absences`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error();

      toast.success(
        editing
          ? "Ausencia actualizada"
          : "Ausencia registrada"
      );

      onSaved?.();
      onOpenChange(false);

    } catch {
      toast.error("Error guardando ausencia");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Editar ausencia" : "Nueva ausencia"}
          </DialogTitle>

          <p className="text-sm text-gray-500">
            Persona que agenda:{" "}
            <span className="font-semibold">{fullname}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">

          {/* USER */}
          <div>
            <Label>Miembro *</Label>
            <Select
              value={form.user_id}
              onValueChange={(v) => setField("user_id", v)}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.fullname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* MOTIVO */}
          <div>
            <Label>Motivo *</Label>
            <Input
              value={form.reason}
              onChange={(e)=>setField("reason", e.target.value)}
            />
          </div>

          {/* TODO EL DIA */}
          <div className="flex items-center gap-3">
            <Switch
              checked={form.will_be_absent}
              onCheckedChange={(v)=>setField("will_be_absent", v)}
            />
            <span className="text-sm">Todo el día</span>
          </div>

          {/* FECHAS */}
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Fecha inicio *</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e)=>setField("start_date", e.target.value)}
              />
            </div>

            <div>
              <Label>Fecha fin</Label>
              <Input
                type="date"
                disabled={!form.will_be_absent}
                value={form.end_date}
                onChange={(e)=>setField("end_date", e.target.value)}
              />
            </div>
          </div>

          {/* HORAS */}
          {!form.will_be_absent && (
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Hora inicio</Label>
                <Input
                  type="time"
                  value={form.start_time}
                  onChange={(e)=>setField("start_time", e.target.value)}
                />
              </div>
              <div>
                <Label>Hora fin</Label>
                <Input
                  type="time"
                  value={form.end_time}
                  onChange={(e)=>setField("end_time", e.target.value)}
                />
              </div>
            </div>
          )}

          {/* NOTAS */}
          <div>
            <Label>Notas</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e)=>setField("notes", e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" onClick={()=>onOpenChange(false)}>
              Cancelar
            </Button>

            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? "Guardando..."
                : editing
                ? "Actualizar"
                : "Crear ausencia"}
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
