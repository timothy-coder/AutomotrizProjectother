"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

/**
 * Hook para manejar peticiones HTTP con estados de carga, error y datos.
 * Soporta cancelación de requests y retry automático.
 *
 * @param {Object} options - Opciones de configuración
 * @param {number} [options.maxRetries=0] - Número máximo de reintentos
 * @param {number} [options.retryDelay=1000] - Tiempo en ms entre reintentos
 * @param {boolean} [options.showErrorToast=true] - Mostrar toast en caso de error
 */
export function useApiRequest({
  maxRetries = 0,
  retryDelay = 1000,
  showErrorToast = true,
} = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const execute = useCallback(
    async (url, options = {}) => {
      cancel();

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          const res = await fetch(url, {
            ...options,
            signal: controller.signal,
          });

          let json;
          try {
            json = await res.json();
          } catch {
            json = null;
          }

          if (!res.ok) {
            throw new Error(json?.message || `Error ${res.status}`);
          }

          setData(json);
          setLoading(false);
          return json;
        } catch (err) {
          if (err.name === "AbortError") {
            setLoading(false);
            return null;
          }

          attempt++;

          if (attempt > maxRetries) {
            const message = err.message || "Error en la petición";
            setError(message);
            setLoading(false);

            if (showErrorToast) {
              toast.error(message);
            }

            return null;
          }

          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    },
    [cancel, maxRetries, retryDelay, showErrorToast]
  );

  const reset = useCallback(() => {
    cancel();
    setData(null);
    setLoading(false);
    setError(null);
  }, [cancel]);

  return { data, loading, error, execute, cancel, reset };
}
