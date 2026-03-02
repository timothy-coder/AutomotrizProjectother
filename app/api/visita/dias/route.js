import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = request.nextUrl;

    const cliente_id = searchParams.get("cliente_id");
    const vehiculo_id = searchParams.get("vehiculo_id");
    const km_actual = searchParams.get("km_actual");

    if (!cliente_id || !vehiculo_id || !km_actual) {
      return NextResponse.json(
        { message: "Faltan parámetros requeridos." },
        { status: 400 }
      );
    }

    const kmActualNum = Number(km_actual);
    if (Number.isNaN(kmActualNum)) {
      return NextResponse.json(
        { message: "km_actual debe ser numérico." },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `
      SELECT 
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
      `,
      [cliente_id, vehiculo_id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { message: "No se encontró el vehículo o cliente." },
        { status: 404 }
      );
    }

    const data = rows[0];

    if (!data.fecha_ultima_visita) {
      return NextResponse.json(
        { message: "El vehículo no tiene fecha_ultima_visita." },
        { status: 400 }
      );
    }

    if (data.av_kilometraje == null || data.av_meses == null || data.av_años == null) {
      return NextResponse.json(
        { message: "No existe configuración en algoritmo_visita para ese modelo/marca." },
        { status: 404 }
      );
    }

    let av_anios_parsed;
    try {
      av_anios_parsed =
        typeof data.av_años === "string" ? JSON.parse(data.av_años) : data.av_años;
    } catch {
      return NextResponse.json(
        { message: "av_años no es JSON válido en algoritmo_visita." },
        { status: 400 }
      );
    }

    if (!Array.isArray(av_anios_parsed) || !av_anios_parsed[0]) {
      return NextResponse.json(
        { message: "av_años debe ser un array con formato tipo ['2010-2020']." },
        { status: 400 }
      );
    }

    const [startYear, endYear] = String(av_anios_parsed[0]).split("-").map(Number);

    if (Number.isNaN(startYear) || Number.isNaN(endYear)) {
      return NextResponse.json(
        { message: "Formato inválido en av_años, debe ser 'inicio-fin'." },
        { status: 400 }
      );
    }

    if (Number(data.anio) < startYear || Number(data.anio) > endYear) {
      return NextResponse.json(
        { message: "El año del vehículo no está dentro del rango de visitas." },
        { status: 400 }
      );
    }

    const fechaUltimaVisita = new Date(data.fecha_ultima_visita);
    const hoy = new Date();

    const diasTranscurridos = (hoy - fechaUltimaVisita) / (1000 * 3600 * 24);
    if (diasTranscurridos <= 0) {
      return NextResponse.json(
        { message: "fecha_ultima_visita es hoy o futura, no se puede calcular promedio." },
        { status: 400 }
      );
    }

    const kmAnterior = Number(data.kilometraje);
    if (Number.isNaN(kmAnterior)) {
      return NextResponse.json(
        { message: "kilometraje del vehículo no es válido." },
        { status: 400 }
      );
    }

    const kmpromedio = (kmActualNum - kmAnterior) / diasTranscurridos;

    if (!isFinite(kmpromedio) || kmpromedio <= 0) {
      return NextResponse.json(
        { message: "kmpromedio inválido (revisa km_actual y kilometraje anterior)." },
        { status: 400 }
      );
    }

    const avKm = Number(data.av_kilometraje);
    const avMeses = Number(data.av_meses);

    const diasaprox = Math.round(avKm / kmpromedio);

    const proxvisitaporkm = new Date(fechaUltimaVisita);
    proxvisitaporkm.setDate(proxvisitaporkm.getDate() + diasaprox);

    const proxvisitaportiempo = new Date(fechaUltimaVisita);
    proxvisitaportiempo.setMonth(proxvisitaportiempo.getMonth() + avMeses);

    const masCercanoStr = getClosestDate(hoy, proxvisitaporkm, proxvisitaportiempo);
    const masCercanoDate = new Date(masCercanoStr);

    const [freqRows] = await db.query(
      "SELECT dias FROM frecuencia ORDER BY dias ASC"
    );

    const avisos = (Array.isArray(freqRows) ? freqRows : [])
      .map((f) => {
        const diasNum = Number(f.dias);
        if (Number.isNaN(diasNum)) return null;

        const avisoDate = new Date(masCercanoDate);
        avisoDate.setDate(avisoDate.getDate() - diasNum);

        return avisoDate.toISOString().split("T")[0];
      })
      .filter(Boolean);

    return NextResponse.json(avisos);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al obtener datos del vehículo." },
      { status: 500 }
    );
  }
}

function getClosestDate(hoy, fecha1, fecha2) {
  const f1 = new Date(fecha1);
  const f2 = new Date(fecha2);

  const diff1 = Math.abs(hoy - f1);
  const diff2 = Math.abs(hoy - f2);

  return diff1 < diff2
    ? f1.toISOString().split("T")[0]
    : f2.toISOString().split("T")[0];
}