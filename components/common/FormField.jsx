import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/**
 * Campo de formulario reutilizable con label, input/textarea y mensaje de error.
 *
 * @param {Object} props
 * @param {string} props.name - Nombre del campo (usado para id y name)
 * @param {string} props.label - Texto del label
 * @param {string} [props.type="text"] - Tipo de input: "text" | "email" | "password" | "number" | "textarea"
 * @param {string} [props.value] - Valor actual
 * @param {Function} [props.onChange] - Handler de cambio
 * @param {string} [props.placeholder] - Placeholder del input
 * @param {string} [props.error] - Mensaje de error a mostrar
 * @param {boolean} [props.required=false] - Si el campo es requerido
 * @param {boolean} [props.disabled=false] - Si el campo está deshabilitado
 * @param {string} [props.className] - Clases adicionales para el contenedor
 */
export function FormField({
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
  required = false,
  disabled = false,
  className,
  ...rest
}) {
  const inputId = `field-${name}`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={inputId}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>

      {type === "textarea" ? (
        <Textarea
          id={inputId}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
          {...rest}
        />
      ) : (
        <Input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(error && "border-destructive focus-visible:ring-destructive")}
          {...rest}
        />
      )}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}
