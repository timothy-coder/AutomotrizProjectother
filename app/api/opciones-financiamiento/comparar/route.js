// ============================================
// API DE COMPARACIÓN DE OPCIONES DE FINANCIAMIENTO
// archivo: app/api/opciones-financiamiento/comparar/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// POST: Comparar múltiples opciones de financiamiento
// ============================================
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      opciones_ids,
      precio_total,
      cuota_inicial_porcentaje,
      plazo_meses,
    } = body;

    // Validaciones
    if (!Array.isArray(opciones_ids) || opciones_ids.length === 0) {
      return NextResponse.json(
        { message: "Debe proporcionar al menos una opción de financiamiento" },
        { status: 400 }
      );
    }

    if (!precio_total || isNaN(precio_total) || precio_total <= 0) {
      return NextResponse.json(
        { message: "Precio total inválido" },
        { status: 400 }
      );
    }

    if (!plazo_meses || isNaN(plazo_meses) || plazo_meses <= 0) {
      return NextResponse.json(
        { message: "Plazo en meses inválido" },
        { status: 400 }
      );
    }

    // Obtener todas las opciones
    const placeholders = opciones_ids.map(() => "?").join(",");
    const [opciones] = await db.query(
      `SELECT * FROM opciones_financiamiento WHERE id IN (${placeholders}) AND es_activo = true`,
      opciones_ids
    );

    if (opciones.length === 0) {
      return NextResponse.json(
        { message: "No se encontraron opciones de financiamiento activas" },
        { status: 404 }
      );
    }

    const comparaciones = opciones.map((opcion) => {
      // Validar plazo
      if (plazo_meses < opcion.plazo_minimo_meses || plazo_meses > opcion.plazo_maximo_meses) {
        return {
          opcion_id: opcion.id,
          opcion_nombre: opcion.nombre,
          error: `Plazo no disponible. Debe estar entre ${opcion.plazo_minimo_meses} y ${opcion.plazo_maximo_meses} meses`,
        };
      }

      // Calcular cuota inicial
      const cuotaInicial = precio_total * (cuota_inicial_porcentaje / 100);

      // Validar cuota inicial mínima
      if (cuotaInicial < opcion.cuota_inicial_monto_minimo) {
        return {
          opcion_id: opcion.id,
          opcion_nombre: opcion.nombre,
          error: `Cuota inicial mínima es ${opcion.cuota_inicial_monto_minimo}`,
        };
      }

      // Calcular monto a financiar
      const montoFinanciar = precio_total - cuotaInicial;

      // Calcular tasa mensual
      const tasaMensual = opcion.tasa_interes_anual / 12 / 100;

      // Calcular cuota mensual
      const cuotaMensual =
        montoFinanciar *
        (tasaMensual * Math.pow(1 + tasaMensual, plazo_meses)) /
        (Math.pow(1 + tasaMensual, plazo_meses) - 1);

      // Calcular totales
      const totalCuotas = cuotaMensual * plazo_meses;
      const interesTotalPagado = totalCuotas - montoFinanciar;
      const costoComisiones = opcion.comisiones_adicionales || 0;
      const costoSeguro = opcion.seguro_obligatorio ? (montoFinanciar * 0.015) : 0;
      const totalAPagar = precio_total + interesTotalPagado + costoComisiones + costoSeguro;

      return {
        opcion_id: opcion.id,
        opcion_nombre: opcion.nombre,
        proveedor: opcion.proveedor,
        tasa_interes_anual: opcion.tasa_interes_anual,
        cuota_inicial: cuotaInicial.toFixed(2),
        cuota_mensual: cuotaMensual.toFixed(2),
        interes_total: interesTotalPagado.toFixed(2),
        comisiones: costoComisiones.toFixed(2),
        seguro: costoSeguro.toFixed(2),
        total_a_pagar: totalAPagar.toFixed(2),
        tiempo_aprobacion_dias: opcion.tiempo_aprobacion_dias,
      };
    });

    // Ordenar por total a pagar (menor es mejor)
    comparaciones.sort((a, b) => {
      if (a.error) return 1;
      if (b.error) return -1;
      return parseFloat(a.total_a_pagar) - parseFloat(b.total_a_pagar);
    });

    return NextResponse.json({
      parametros: {
        precio_total,
        cuota_inicial_porcentaje,
        plazo_meses,
      },
      comparaciones,
      mejor_opcion: comparaciones[0].error ? null : comparaciones[0],
    });
  } catch (error) {
    console.error("POST /api/opciones-financiamiento/comparar error:", error);
    return NextResponse.json(
      { message: "Error al comparar opciones", error: error.message },
      { status: 500 }
    );
  }
}