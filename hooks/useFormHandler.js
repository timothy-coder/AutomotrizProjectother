"use client";

import { useState, useCallback } from "react";

/**
 * Hook para gestionar el estado y la lógica de formularios.
 *
 * @param {Object} initialValues - Valores iniciales del formulario
 * @param {Function} [validate] - Función de validación que recibe los valores
 *   y retorna un objeto con los errores { campo: "mensaje" }
 */
export function useFormHandler(initialValues = {}, validate = null) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const setFieldValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const runValidation = useCallback(() => {
    if (!validate) return true;
    const validationErrors = validate(values);
    if (validationErrors && Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return false;
    }
    setErrors({});
    return true;
  }, [validate, values]);

  const handleSubmit = useCallback(
    (onSubmit) => async (e) => {
      if (e && e.preventDefault) e.preventDefault();

      if (!runValidation()) return;

      setSubmitting(true);
      try {
        await onSubmit(values);
      } finally {
        setSubmitting(false);
      }
    },
    [runValidation, values]
  );

  const reset = useCallback(
    (overrides = {}) => {
      setValues({ ...initialValues, ...overrides });
      setErrors({});
      setSubmitting(false);
    },
    [initialValues]
  );

  return {
    values,
    errors,
    submitting,
    handleChange,
    setFieldValue,
    handleSubmit,
    reset,
  };
}
