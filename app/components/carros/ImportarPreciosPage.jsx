// ============================================
// COMPONENTE DE CARGA MASIVA
// archivo: components/ImportarPreciosPage.jsx
// ============================================

"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Upload,
  Loader2,
} from "lucide-react";

export default function ImportarPreciosPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  // Descargar plantilla
  async function handleDownloadTemplate() {
    try {
      const response = await fetch(
        "/api/precios-region-version/import?action=template"
      );
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla-precios.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Plantilla descargada");
    } catch (e) {
      console.error(e);
      toast.error("Error descargando plantilla");
    }
  }

  // Manejar cambio de archivo
  function handleFileChange(e) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (
        !selectedFile.name.endsWith(".xlsx") &&
        !selectedFile.name.endsWith(".xls")
      ) {
        toast.error("Solo se aceptan archivos Excel (.xlsx, .xls)");
        return;
      }
      setFile(selectedFile);
      setResult(null);
    }
  }

  // Importar precios
  async function handleImport() {
    if (!file) {
      toast.error("Selecciona un archivo");
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/precios-region-version/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        toast.success(
          `${data.success} precios importados correctamente`
        );
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error importando archivo");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Importar Precios Masivamente</h1>
        <p className="text-sm text-muted-foreground">
          Carga múltiples precios de una sola vez usando un archivo Excel
        </p>
      </div>

      {/* Instrucciones */}
      <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
        <h2 className="font-semibold text-blue-900 mb-3">Instrucciones:</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>
            Descarga la plantilla de Excel usando el botón de abajo
          </li>
          <li>
            Completa los datos con:
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>
                <strong>marca:</strong> Nombre de la marca (ej: Toyota)
              </li>
              <li>
                <strong>modelo:</strong> Nombre del modelo (ej: Hilux)
              </li>
              <li>
                <strong>version:</strong> Versión del modelo (ej: Base)
              </li>
              <li>
                <strong>departamento:</strong> Departamento (ej: Lima)
              </li>
              <li>
                <strong>provincia:</strong> Provincia (ej: Lima)
              </li>
              <li>
                <strong>distrito:</strong> Distrito (ej: San Isidro)
              </li>
              <li>
                <strong>forma_pago:</strong> Forma de pago (ej: Contado)
              </li>
              <li>
                <strong>precio:</strong> Precio en números (ej: 145000)
              </li>
            </ul>
          </li>
          <li>
            Guarda el archivo en formato Excel (.xlsx)
          </li>
          <li>
            Carga el archivo aquí y espera a que termine el proceso
          </li>
        </ol>
      </div>

      {/* Descargar Plantilla */}
      <Button
        onClick={handleDownloadTemplate}
        variant="outline"
        className="w-full"
      >
        <Download className="w-4 h-4 mr-2" />
        Descargar Plantilla de Excel
      </Button>

      {/* Cargar Archivo */}
      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
      >
        <Input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />

        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="font-semibold mb-1">
          {file ? file.name : "Arrastra un archivo aquí o haz clic"}
        </p>
        <p className="text-xs text-muted-foreground">
          Solo archivos Excel (.xlsx, .xls)
        </p>
      </div>

      {/* Botón Importar */}
      <Button
        onClick={handleImport}
        disabled={!file || loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Importando...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 mr-2" />
            Importar Precios
          </>
        )}
      </Button>

      {/* Resultados */}
      {result && (
        <div className="space-y-3">
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="border rounded-lg p-4 bg-green-50 border-green-200">
              <p className="text-sm text-green-700">Exitosos</p>
              <p className="text-2xl font-bold text-green-900">
                {result.success}
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-red-50 border-red-200">
              <p className="text-sm text-red-700">Errores</p>
              <p className="text-2xl font-bold text-red-900">
                {result.errors}
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-700">Total</p>
              <p className="text-2xl font-bold text-blue-900">
                {result.success + result.errors}
              </p>
            </div>
          </div>

          {/* Detalle de Errores */}
          {result.details && result.details.length > 0 && (
            <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
              <div className="flex items-start gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900">
                    Se encontraron {result.totalErrors} error(es)
                  </p>
                  <p className="text-xs text-yellow-700">
                    Se muestran los primeros 20 errores
                  </p>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.details.map((error, index) => (
                  <div
                    key={index}
                    className="text-sm text-yellow-800 bg-white rounded p-2 border border-yellow-100"
                  >
                    {error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Éxito */}
          {result.success > 0 && (
            <div className="border rounded-lg p-4 bg-green-50 border-green-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">¡Importación exitosa!</p>
                <p className="text-sm text-green-700">
                  Se importaron {result.success} precio(s) correctamente
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ejemplos */}
      <div className="border rounded-lg p-4">
        <h3 className="font-semibold mb-3">Formato de ejemplo:</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-muted">
                <th className="border p-2 text-left">marca</th>
                <th className="border p-2 text-left">modelo</th>
                <th className="border p-2 text-left">version</th>
                <th className="border p-2 text-left">departamento</th>
                <th className="border p-2 text-left">provincia</th>
                <th className="border p-2 text-left">distrito</th>
                <th className="border p-2 text-left">forma_pago</th>
                <th className="border p-2 text-right">precio</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border p-2">Toyota</td>
                <td className="border p-2">Hilux</td>
                <td className="border p-2">Base</td>
                <td className="border p-2">Lima</td>
                <td className="border p-2">Lima</td>
                <td className="border p-2">San Isidro</td>
                <td className="border p-2">Contado</td>
                <td className="border p-2 text-right">145000</td>
              </tr>
              <tr className="bg-muted/50">
                <td className="border p-2">Toyota</td>
                <td className="border p-2">Hilux</td>
                <td className="border p-2">Base</td>
                <td className="border p-2">Lima</td>
                <td className="border p-2">Lima</td>
                <td className="border p-2">San Isidro</td>
                <td className="border p-2">Financiamiento 12</td>
                <td className="border p-2 text-right">148500</td>
              </tr>
              <tr>
                <td className="border p-2">Ford</td>
                <td className="border p-2">Ranger</td>
                <td className="border p-2">Premium</td>
                <td className="border p-2">Arequipa</td>
                <td className="border p-2">Arequipa</td>
                <td className="border p-2">Arequipa</td>
                <td className="border p-2">Contado</td>
                <td className="border p-2 text-right">205000</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}