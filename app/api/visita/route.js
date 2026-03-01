import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================
// GET → LISTAR VISITAS
// ============================
export async function GET(request) {
  try {
    // Usamos `nextUrl` para acceder a los parámetros
    const { searchParams } = request.nextUrl;
    
    const cliente_id = searchParams.get("cliente_id");
    const vehiculo_id = searchParams.get("vehiculo_id");
    const km_actual = searchParams.get("km_actual");

    // Validar los parámetros
    if (!cliente_id || !vehiculo_id || !km_actual) {
      return NextResponse.json(
        { message: "Faltan parámetros requeridos." },
        { status: 400 }
      );
    }

    // Consulta SQL para obtener los datos
    const [rows] = await db.query(`
      SELECT 
        c.nombre,
        v.kilometraje,
        v.fecha_ultima_visita,
        v.anio,
        ma.name AS marca,
        m.name AS modelo,
        av.kilometraje AS av_kilometraje,
        av.meses AS av_meses,
        av.años AS av_años
      FROM clientes c
      JOIN vehiculos v ON v.cliente_id = c.id
      JOIN marcas ma ON ma.id = v.marca_id
      JOIN modelos m ON m.id = v.modelo_id
      LEFT JOIN algoritmo_visita av ON av.modelo_id = m.id AND av.marca_id = ma.id
      WHERE c.id = ? AND v.id = ?
    `, [cliente_id, vehiculo_id]);

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "No se encontró el vehículo o cliente." },
        { status: 404 }
      );
    }

    const data = rows[0];

    // Validar que el año del vehículo esté dentro del rango de visitas
    const av_años = JSON.parse(data.av_años); // Parseamos el rango de años

    // Extraemos el rango de años del campo "años" (asumimos que tiene formato ["inicio-fin"])
    const [startYear, endYear] = av_años[0].split('-').map(Number);

    if (data.anio < startYear || data.anio > endYear) {
      return NextResponse.json(
        { message: "El año del vehículo no está dentro del rango de visitas." },
        { status: 400 }
      );
    }

    // Cálculos
    const fechaUltimaVisita = new Date(data.fecha_ultima_visita);
    const hoy = new Date();
    const diasTranscurridos = (hoy - fechaUltimaVisita) / (1000 * 3600 * 24);

    // Calcular kmpromedio
    const kmpromedio = (km_actual - data.kilometraje) / diasTranscurridos;

    // Calcular diasaprox
    const diasaprox = Math.round(data.av_kilometraje / kmpromedio);

    // Calcular proxvisitaporkm
    const proxvisitaporkm = new Date(fechaUltimaVisita);
    proxvisitaporkm.setDate(proxvisitaporkm.getDate() + diasaprox);

    // Calcular proxvisitaportiempo
    const proxvisitaportiempo = new Date(fechaUltimaVisita);
    proxvisitaportiempo.setMonth(proxvisitaportiempo.getMonth() + data.av_meses);

    // Comparar las fechas y obtener la más cercana
    const resultado = {
      proxvisitaporkm: proxvisitaporkm.toISOString().split("T")[0], // Fecha en formato YYYY-MM-DD
      proxvisitaportiempo: proxvisitaportiempo.toISOString().split("T")[0],
      mas_cercano: getClosestDate(hoy, proxvisitaporkm, proxvisitaportiempo), // Fecha más cercana
    };

    return NextResponse.json(resultado);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al obtener datos del vehículo." },
      { status: 500 }
    );
  }
}

// Función para obtener la fecha más cercana a hoy
function getClosestDate(hoy, fecha1, fecha2) {
  const diff1 = Math.abs(hoy - new Date(fecha1));
  const diff2 = Math.abs(hoy - new Date(fecha2));

  return diff1 < diff2 ? new Date(fecha1).toISOString().split("T")[0] : new Date(fecha2).toISOString().split("T")[0];
}