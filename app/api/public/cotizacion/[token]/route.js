import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { token } = await params;

    console.log("=== Accediendo a cotización pública ===");
    console.log("Token recibido:", token);

    if (!token) {
      console.error("Token no proporcionado");
      return NextResponse.json(
        { message: "Token no proporcionado" },
        { status: 400 }
      );
    }

    // Obtener enlace público
    const [enlaces] = await db.query(
      "SELECT * FROM cotizacion_enlaces_publicos WHERE token = ?",
      [token]
    );

    console.log("Enlaces encontrados:", enlaces.length);

    if (enlaces.length === 0) {
      console.error("Enlace no encontrado para token:", token);
      return NextResponse.json(
        { message: "Enlace no encontrado" },
        { status: 404 }
      );
    }

    const enlace = enlaces[0];

    console.log("Enlace encontrado, cotización_id:", enlace.cotizacion_id);

    // Registrar vista
    const ipAddress =
      req.headers.get("x-forwarded-for") ||
      req.headers.get("x-real-ip") ||
      "desconocida";

    const userAgent = req.headers.get("user-agent") || "desconocida";

    console.log("Registrando vista - IP:", ipAddress);

    try {
      await db.query(
        "INSERT INTO cotizacion_vistas_historial (enlace_id, ip_address, user_agent) VALUES (?, ?, ?)",
        [enlace.id, ipAddress, userAgent]
      );

      // Actualizar contador
      await db.query(
        "UPDATE cotizacion_enlaces_publicos SET vistas_totales = vistas_totales + 1 WHERE id = ?",
        [enlace.id]
      );

      console.log("Vista registrada exitosamente");
    } catch (historialError) {
      console.warn("Error registrando vista:", historialError);
    }

    // Obtener datos de la cotización
    const [cotizaciones] = await db.query(
      `SELECT 
        c.*,
        m.name as marca_nombre,
        mo.name as modelo_nombre,
        v.nombre as version_nombre
      FROM cotizacionesagenda c
      LEFT JOIN marcas m ON c.marca_id = m.id
      LEFT JOIN modelos mo ON c.modelo_id = mo.id
      LEFT JOIN versiones v ON c.version_id = v.id
      WHERE c.id = ?`,
      [enlace.cotizacion_id]
    );

    console.log("Cotizaciones encontradas:", cotizaciones.length);

    if (cotizaciones.length === 0) {
      console.error(
        "Cotización no encontrada para ID:",
        enlace.cotizacion_id
      );
      return NextResponse.json(
        { message: "Cotización no encontrada" },
        { status: 404 }
      );
    }

    const cotizacion = cotizaciones[0];

    console.log("Datos de cotización:", {
      id: cotizacion.id,
      marca: cotizacion.marca_nombre,
      modelo: cotizacion.modelo_nombre,
    });

    return NextResponse.json(cotizacion);
  } catch (error) {
    console.error("Error obteniendo cotización pública:", error);
    return NextResponse.json(
      { message: "Error obteniendo cotización", error: error.message },
      { status: 500 }
    );
  }
}