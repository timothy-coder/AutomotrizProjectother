import { cn } from "@/lib/utils";

/**
 * Indicador de carga genérico.
 *
 * @param {Object} props
 * @param {string} [props.size="md"] - Tamaño: "sm" | "md" | "lg"
 * @param {string} [props.className] - Clases adicionales
 * @param {string} [props.label] - Texto accesible para lectores de pantalla
 */
export function LoadingSpinner({ size = "md", className, label = "Cargando..." }) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-2",
    lg: "h-12 w-12 border-4",
  };

  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex items-center justify-center", className)}
    >
      <div
        className={cn(
          "animate-spin rounded-full border-current border-t-transparent",
          sizeClasses[size] ?? sizeClasses.md
        )}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}
