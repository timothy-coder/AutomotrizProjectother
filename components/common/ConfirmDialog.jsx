"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Diálogo de confirmación reutilizable basado en AlertDialog de shadcn/ui.
 *
 * @param {Object} props
 * @param {boolean} props.open - Controla la visibilidad del diálogo
 * @param {Function} props.onConfirm - Callback al confirmar
 * @param {Function} props.onCancel - Callback al cancelar
 * @param {string} [props.title="¿Estás seguro?"] - Título del diálogo
 * @param {string} [props.description] - Descripción/mensaje del diálogo
 * @param {string} [props.confirmLabel="Confirmar"] - Texto del botón de confirmación
 * @param {string} [props.cancelLabel="Cancelar"] - Texto del botón de cancelación
 * @param {boolean} [props.loading=false] - Estado de carga al confirmar
 */
export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title = "¿Estás seguro?",
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
}) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={loading}>
            {loading ? "Procesando..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
