"use client";

import { useCallback } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Input de búsqueda con icono, botón de limpiar y soporte para debounce externo.
 *
 * @param {Object} props
 * @param {string} props.value - Valor actual del campo
 * @param {Function} props.onChange - Handler de cambio
 * @param {string} [props.placeholder="Buscar..."] - Placeholder del input
 * @param {string} [props.className] - Clases adicionales para el contenedor
 * @param {boolean} [props.disabled=false] - Si el input está deshabilitado
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
  className,
  disabled = false,
}) {
  const handleClear = useCallback(() => {
    onChange("");
  }, [onChange]);

  return (
    <div className={cn("relative max-w-sm", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pl-9 pr-8"
      />

      {value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
