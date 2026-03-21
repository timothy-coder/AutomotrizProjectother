"use client";

import { Component } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Componente que captura errores de renderizado en el árbol de hijos.
 * Muestra un mensaje de error amigable en lugar de crashear la app.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Árbol de componentes a proteger
 * @param {React.ReactNode} [props.fallback] - UI personalizada para mostrar en error
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-10 w-10 text-destructive" />
          <div>
            <p className="font-semibold text-destructive">Ocurrió un error inesperado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {this.state.error?.message || "Error desconocido"}
            </p>
          </div>
          <Button variant="outline" onClick={this.handleReset}>
            Reintentar
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
