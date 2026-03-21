import { cn } from "@/lib/utils";

/**
 * Componente para representar un estado vacío (sin datos).
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.icon] - Icono a mostrar
 * @param {string} [props.title="Sin resultados"] - Título principal
 * @param {string} [props.description] - Descripción adicional
 * @param {React.ReactNode} [props.action] - Botón u acción opcional
 * @param {string} [props.className] - Clases adicionales
 */
export function EmptyState({
  icon,
  title = "Sin resultados",
  description,
  action,
  className,
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground",
        className
      )}
    >
      {icon && <div className="text-4xl">{icon}</div>}
      <p className="text-base font-medium">{title}</p>
      {description && <p className="max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
