"use client";

import { useState, useEffect } from "react";

/**
 * Hook para retrasar la actualización de un valor (debounce).
 * Útil para búsquedas en tiempo real sin saturar el servidor.
 *
 * @param {any} value - Valor a retrasar
 * @param {number} [delay=400] - Tiempo de retraso en milisegundos
 * @returns {any} Valor con el retraso aplicado
 */
export function useDebounce(value, delay = 400) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
