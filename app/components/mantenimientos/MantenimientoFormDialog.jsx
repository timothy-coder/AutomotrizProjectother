"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Wrench } from "lucide-react";

import MultiMantenimientoSelector from "./MultiMantenimientoSelector";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function MantenimientoFormDialog({
  dialog,
  setDialog,
  form,
  setForm,
  mantenimientos,
  onSave,
}) {
  return (
    <Dialog open={dialog.open} onOpenChange={(v) => setDialog((p) => ({ ...p, open: v }))}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col">
        <DialogHeader
          className="pb-3 sm:pb-4 border-b flex-shrink-0"
          style={{ borderColor: `${BRAND_PRIMARY}20` }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="p-1.5 sm:p-2 rounded-lg flex-shrink-0"
              style={{ backgroundColor: `${BRAND_PRIMARY}15` }}
            >
              <Wrench size={20} style={{ color: BRAND_PRIMARY }} />
            </div>
            <DialogTitle className="text-base sm:text-xl" style={{ color: BRAND_PRIMARY }}>
              {dialog.mode === "create-mant"
                ? "Nuevo mantenimiento"
                : dialog.mode === "edit-mant"
                ? "Editar mantenimiento"
                : dialog.mode === "create-sub"
                ? "Nuevo submantenimiento"
                : "Editar submantenimiento"}
            </DialogTitle>
          </div>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSave();
          }}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="space-y-3 sm:space-y-4 py-3 sm:py-4 px-3 sm:px-6 overflow-y-auto flex-1">
            <div
              className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all"
              style={{
                backgroundColor: `${BRAND_PRIMARY}08`,
                borderColor: `${BRAND_PRIMARY}30`,
              }}
            >
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span
                  className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                >
                  1
                </span>
                <span>Información</span>
              </h3>

              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  Nombre
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ej: Cambio de aceite"
                  className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                  Descripción
                </Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descripción detallada..."
                  className="min-h-20 sm:min-h-24 resize-none text-xs sm:text-sm border-gray-300"
                />
              </div>
            </div>

            {(dialog.mode === "create-sub" || dialog.mode === "edit-sub") && (
              <div
                className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all"
                style={{
                  backgroundColor: `${BRAND_PRIMARY}08`,
                  borderColor: `${BRAND_PRIMARY}30`,
                }}
              >
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                  <span
                    className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0"
                    style={{ backgroundColor: BRAND_PRIMARY }}
                  >
                    2
                  </span>
                  <span>Relación</span>
                </h3>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                    Mantenimiento padre
                    <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={String(form.type_id || "")}
                    onValueChange={(v) => setForm((p) => ({ ...p, type_id: v }))}
                  >
                    <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300">
                      <SelectValue placeholder="Seleccione mantenimiento" />
                    </SelectTrigger>
                    <SelectContent>
                      {mantenimientos.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)} className="text-xs sm:text-sm">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div
              className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all"
              style={{
                backgroundColor: `${BRAND_PRIMARY}08`,
                borderColor: `${BRAND_PRIMARY}30`,
              }}
            >
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span
                  className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                >
                  3
                </span>
                <span>Opciones</span>
              </h3>

              <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg border-2" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
                />
                <div>
                  <p className="font-medium text-xs sm:text-sm" style={{ color: BRAND_PRIMARY }}>
                    Activo
                  </p>
                  <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                    {form.is_active ? "Visible en el sistema" : "Oculto"}
                  </p>
                </div>
              </div>

              {(dialog.mode === "create-mant" || dialog.mode === "edit-mant") && (
                <>
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-white rounded-lg border-2" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
                    <Switch
                      checked={form.resumen}
                      onCheckedChange={(v) =>
                        setForm((p) => ({
                          ...p,
                          resumen: v,
                          mantenimiento_ids: v ? p.mantenimiento_ids : [],
                        }))
                      }
                    />
                    <div className="flex-1">
                      <p className="font-medium text-xs sm:text-sm flex items-center gap-1" style={{ color: BRAND_PRIMARY }}>
                        Mantenimiento base
                        <AlertCircle size={14} className="cursor-help opacity-60 flex-shrink-0" />
                      </p>
                      <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                        {form.resumen ? "Activo" : "Inactivo"}
                      </p>
                    </div>
                  </div>

                  {form.resumen && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                        Mantenimientos que suma
                      </Label>
                      <MultiMantenimientoSelector
                        allItems={mantenimientos}
                        selectedIds={form.mantenimiento_ids}
                        excludeId={dialog.item?.id}
                        onChange={(ids) => setForm((p) => ({ ...p, mantenimiento_ids: ids }))}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <DialogFooter
            className="border-t flex-shrink-0 pt-3 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-4 flex flex-col-reverse sm:flex-row gap-2 justify-end"
            style={{ borderColor: `${BRAND_PRIMARY}20` }}
          >
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialog({ open: false, mode: "create-mant", item: null })}
              className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="h-8 sm:h-9 text-xs sm:text-sm text-white w-full sm:w-auto"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}