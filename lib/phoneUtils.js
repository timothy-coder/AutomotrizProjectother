/**
 * Normalización centralizada de números de teléfono.
 *
 * Devuelve SOLO dígitos, sin +, sin espacios, sin guiones.
 * Ejemplo: "+51 912-528 990" → "51912528990"
 *
 * Usar esta función en TODOS los endpoints que reciban un teléfono como input.
 * Evita sesiones duplicadas por inconsistencia de formato.
 */
export function normalizePhone(raw) {
  return String(raw ?? "").replace(/\D/g, "").trim();
}
