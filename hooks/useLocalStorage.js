"use client";

import { useState, useCallback, useEffect } from "react";

/**
 * Hook para persistir y sincronizar estado en localStorage.
 *
 * @param {string} key - Clave en localStorage
 * @param {any} initialValue - Valor por defecto si la clave no existe
 * @returns {[any, Function, Function]} [value, setValue, removeValue]
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === "undefined") return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (typeof window !== "undefined") {
          const newValue = JSON.stringify(valueToStore);
          window.localStorage.setItem(key, newValue);
          window.dispatchEvent(
            new StorageEvent("storage", {
              key,
              newValue,
              oldValue: window.localStorage.getItem(key),
              storageArea: window.localStorage,
              url: window.location.href,
            })
          );
        }
      } catch {
        // Ignorar errores de escritura en localStorage
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== "undefined") {
        const oldValue = window.localStorage.getItem(key);
        window.localStorage.removeItem(key);
        window.dispatchEvent(
          new StorageEvent("storage", {
            key,
            newValue: null,
            oldValue,
            storageArea: window.localStorage,
            url: window.location.href,
          })
        );
      }
    } catch {
      // Ignorar errores de eliminación en localStorage
    }
  }, [key, initialValue]);

  // Sincronización entre tabs/ventanas
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (e) => {
      if (e.key !== key) return;
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item !== null ? JSON.parse(item) : initialValue);
      } catch {
        // Ignorar errores de lectura
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
