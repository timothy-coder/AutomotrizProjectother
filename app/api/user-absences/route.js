import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// ===============================
// GET
// ===============================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const user_id = searchParams.get("user_id");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where = [];
    const params = [];

    if (user_id) {
      where.push("ua.user_id = ?");
      params.push(Number(user_id));
    }

    if (from) {
      where.push(`DATE(COALESCE(ua.date, ua.start_date)) >= ?`);
      params.push(from);
    }

    if (to) {
      where.push(`DATE(COALESCE(ua.date, ua.end_date)) <= ?`);
      params.push(to);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        ua.id,
        ua.user_id,
        u.fullname AS usuario,
        DATE(ua.start_date) AS start_date,
        DATE(ua.end_date) AS end_date,
        DATE(ua.date) AS date,
        ua.start_time,
        ua.end_time,
        ua.reason,
        ua.notes,
        ua.will_be_absent,
        ua.created_at
      FROM user_absences ua
      LEFT JOIN usuarios u ON u.id = ua.user_id
      ${whereSql}
      ORDER BY DATE(COALESCE(ua.date, ua.start_date)) DESC, ua.id DESC
      `,
      params
    );

    return NextResponse.json(rows);
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error listando ausencias" },
      { status: 500 }
    );
  }
}



// ===============================
// POST (crear ausencia)
// ===============================
export async function POST(req) {
  try {
    const body = await req.json();

    const user_id = Number(body.user_id);

    if (!Number.isFinite(user_id) || user_id <= 0) {
      return NextResponse.json(
        { message: "user_id inválido" },
        { status: 400 }
      );
    }

    const date = body.date || null;
    const start_date = body.start_date || null;
    const end_date = body.end_date || null;

    const start_time = body.start_time || null;
    const end_time = body.end_time || null;

    const reason = (body.reason || "").trim();
    const notes = body.notes ?? null;
    const will_be_absent = body.will_be_absent ? 1 : 0;

    if (!date && !start_date) {
      return NextResponse.json(
        { message: "Debe enviar date o start_date" },
        { status: 400 }
      );
    }

    const final_end_date = end_date || start_date;

    const [result] = await db.query(
      `
      INSERT INTO user_absences
      (user_id, start_date, end_date, date, start_time, end_time, reason, notes, will_be_absent, created_at)
      VALUES (?,?,?,?,?,?,?,?,?, NOW())
      `,
      [
        user_id,
        start_date,
        final_end_date,
        date,
        start_time,
        end_time,
        reason || null,
        notes,
        will_be_absent,
      ]
    );

    return NextResponse.json({
      message: "Creado correctamente",
      id: result.insertId,
    });

  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error creando ausencia" },
      { status: 500 }
    );
  }
}
