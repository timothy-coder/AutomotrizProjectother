"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

const cache = new Map();

/**
 * Hook para cargar datos desde una URL con caché, manejo de errores y refetch manual.
 *
 * @param {string|null} url - URL a consultar. Si es null/undefined no realiza fetch.
 * @param {Object} [options]
 * @param {boolean} [options.useCache=false] - Usar caché para la URL
 * @param {boolean} [options.showErrorToast=true] - Mostrar toast en error
 * @param {any[]} [options.deps=[]] - Dependencias adicionales para re-fetch
 */
export function useDataFetching(url, { useCache = false, showErrorToast = true, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  const fetchData = useCallback(
    async (skipCache = false) => {
      if (!url) return;

      if (useCache && !skipCache && cache.has(url)) {
        setData(cache.get(url));
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const res = await fetch(url, { signal: controller.signal });

        let json;
        try {
          json = await res.json();
        } catch {
          json = null;
        }

        if (!res.ok) {
          throw new Error(json?.message || `Error ${res.status}`);
        }

        if (useCache) {
          cache.set(url, json);
        }

        setData(json);
      } catch (err) {
        if (err.name === "AbortError") return;

        const message = err.message || "Error cargando datos";
        setError(message);

        if (showErrorToast) {
          toast.error(message);
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [url, useCache, showErrorToast, ...deps]
  );

  useEffect(() => {
    fetchData();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);

  const clearCache = useCallback(() => {
    if (url) cache.delete(url);
  }, [url]);

  return { data, loading, error, refetch, clearCache };
}
