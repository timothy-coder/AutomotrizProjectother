import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/conversations/clients
export async function GET() {
  try {

    const [rows] = await db.query(`
      SELECT 
        cs.id AS session_id,
        cs.phone,
        cs.state,
        cs.last_intent,
        cs.updated_at,

        CONCAT(c.nombre,' ',c.apellido) AS cliente_nombre,
        c.celular,
        c.email,

        cs.context_json AS ultimo_contexto

      FROM conversation_sessions cs
      LEFT JOIN clientes c 
        ON cs.client_id = c.id

      ORDER BY cs.updated_at DESC
    `);

    return NextResponse.json(rows);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error obteniendo conversaciones con clientes" },
      { status: 500 }
    );
  }
}
