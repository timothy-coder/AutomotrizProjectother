"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUserScope } from "@/hooks/useUserScope";

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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  AlertCircle,
  Calendar,
  Clock,
  FileText,
  Info,
  User,
  CheckCircle,
  Loader
} from "lucide-react";

export default function UserAbsenceDialog({
  open,
  onOpenChange,
  absence,   // 👈 si existe → EDIT
  onSaved,
}) {
  const { userId, loading: scopeLoading } = useUserScope();

  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const editing = Boolean(absence);

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

  // ================= CARGAR USUARIO AUTENTICADO =================

  useEffect(() => {
    if (!open || !userId || scopeLoading) return;

    setLoadingUsers(true);

    fetch(`/api/usuarios/${userId}`, { cache: "no-store" })
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(data => {
        setCurrentUser({
          id: data.id,
          fullname: data.fullname,
          nombre: data.nombre,
          apellido: data.apellido,
        });
      })
      .catch(e => {
        console.error("Error cargando usuario autenticado:", e);
        setCurrentUser(null);
      })
      .finally(() => setLoadingUsers(false));
  }, [open, userId, scopeLoading]);

  // ================= LOAD USERS =================

  useEffect(() => {
    if (!open) return;

    setLoadingUsers(true);

    fetch("/api/usuarios", { cache: "no-store" })
      .then(r => r.json())
      .then(data => {
        const activos = Array.isArray(data) 
          ? data.filter(u => u.is_active) 
          : [];
        setUsers(activos);
      })
      .catch(e => {
        console.error("Error cargando usuarios:", e);
        setUsers([]);
      })
      .finally(() => setLoadingUsers(false));
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
    if (!form.start_date) return toast.warning("Seleccione fecha inicio");

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

  const selectedUser = users.find(u => u.id === Number(form.user_id));

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          
          {/* HEADER */}
          <DialogHeader className="pb-4 border-b">
            <div>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <AlertCircle size={24} className="text-blue-600" />
                {editing ? "Editar ausencia" : "Agendar ausencia"}
              </DialogTitle>

              {/* USUARIO QUE AGENDA */}
              {scopeLoading || loadingUsers ? (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <Loader size={16} className="text-blue-600 flex-shrink-0 animate-spin" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cargando información...</p>
                  </div>
                </div>
              ) : currentUser ? (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                  <User size={16} className="text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Persona que agenda:</p>
                    <p className="font-semibold text-slate-900">{currentUser.fullname}</p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700">No se pudo cargar la información del usuario</p>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* CONTENIDO */}
          <div className="space-y-5">

            {/* SECCIÓN 1: USUARIO Y MOTIVO */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                Información general
              </h3>

              {/* USUARIO */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label className="font-semibold">Miembro ausente *</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Selecciona el miembro del equipo que estará ausente
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={form.user_id}
                  onValueChange={(v) => setField("user_id", v)}
                  disabled={loadingUsers || users.length === 0}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue 
                      placeholder={loadingUsers ? "Cargando usuarios..." : "Seleccionar miembro"} 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {users.length > 0 ? (
                      users.map(u => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.fullname}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__sin_usuarios" disabled>
                        {loadingUsers ? "Cargando..." : "No hay usuarios disponibles"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* MOTIVO */}
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Label className="font-semibold">Motivo de ausencia *</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Especifica la razón de la ausencia (vacaciones, enfermedad, etc.)
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  placeholder="Ej: Vacaciones, Enfermedad, Permiso, etc."
                  value={form.reason}
                  onChange={(e)=>setField("reason", e.target.value)}
                  className="h-9"
                />
              </div>
            </div>

            {/* SECCIÓN 2: DURACIÓN */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Duración
              </h3>

              {/* TODO EL DÍA */}
              <div className="flex items-center justify-between p-3 bg-white rounded border border-slate-200">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-purple-600" />
                  <div>
                    <p className="font-medium text-slate-900">Ausencia de día completo</p>
                    <p className="text-xs text-muted-foreground">
                      {form.will_be_absent ? "La persona estará ausente todo el día" : "Ausencia parcial (con horario específico)"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={form.will_be_absent}
                  onCheckedChange={(v)=>setField("will_be_absent", v)}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>

              {/* FECHAS */}
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <Calendar size={14} className="text-purple-600" />
                    <Label className="font-semibold">Fecha inicio *</Label>
                  </div>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e)=>setField("start_date", e.target.value)}
                    className="h-9"
                  />
                </div>

                <div>
                  <div className="flex items-center gap-1 mb-2">
                    <Calendar size={14} className="text-purple-600" />
                    <Label className="font-semibold">
                      Fecha fin
                      {form.will_be_absent && <span className="text-red-500">*</span>}
                    </Label>
                  </div>
                  <Input
                    type="date"
                    disabled={!form.will_be_absent}
                    value={form.end_date}
                    onChange={(e)=>setField("end_date", e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>

              {/* HORAS - SOLO SI NO ES TODO EL DÍA */}
              {!form.will_be_absent && (
                <div className="space-y-3 pt-3 border-t">
                  <p className="text-sm font-medium text-slate-900">Horario específico</p>
                  <div className="grid md:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Clock size={14} className="text-purple-600" />
                        <Label className="font-semibold">Hora inicio</Label>
                      </div>
                      <Input
                        type="time"
                        value={form.start_time}
                        onChange={(e)=>setField("start_time", e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1 mb-2">
                        <Clock size={14} className="text-purple-600" />
                        <Label className="font-semibold">Hora fin</Label>
                      </div>
                      <Input
                        type="time"
                        value={form.end_time}
                        onChange={(e)=>setField("end_time", e.target.value)}
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SECCIÓN 3: NOTAS */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                Notas adicionales
              </h3>

              <div>
                <div className="flex items-center gap-1 mb-2">
                  <FileText size={14} className="text-green-600" />
                  <Label className="font-semibold">Notas (opcional)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Agrega información adicional relevante sobre la ausencia
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  rows={3}
                  placeholder="Ej: Contacto alternativo, observaciones especiales, etc."
                  value={form.notes}
                  onChange={(e)=>setField("notes", e.target.value)}
                  className="resize-none"
                />
              </div>
            </div>

            {/* RESUMEN */}
            {form.user_id && form.reason && form.start_date && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-3">
                <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-green-900">Información completa</p>
                  {currentUser && (
                    <p className="text-xs text-green-700 mt-1">
                      Agendado por: <span className="font-semibold">{currentUser.fullname}</span>
                    </p>
                  )}
                  <p className="text-xs text-green-700">
                    {selectedUser?.fullname} estará ausente por: {form.reason}
                    {form.will_be_absent && form.end_date && form.end_date !== form.start_date
                      ? ` (${form.start_date} al ${form.end_date})`
                      : ` (${form.start_date})`
                    }
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* ACCIONES */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={()=>onOpenChange(false)}
                >
                  Cancelar
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Descartar cambios</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  {saving && <Loader size={16} className="animate-spin" />}
                  {saving
                    ? "Guardando..."
                    : editing
                    ? "Actualizar ausencia"
                    : "Crear ausencia"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {editing ? "Guarda los cambios" : "Registra la nueva ausencia"}
              </TooltipContent>
            </Tooltip>
          </div>

        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}