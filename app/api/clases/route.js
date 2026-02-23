import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query("SELECT * FROM clases ORDER BY name");
    return new Response(JSON.stringify(rows), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response("Error al obtener clases", { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { name } = await req.json();

    if (!name || name.trim() === "") {
      return new Response("Nombre es requerido", { status: 400 });
    }

    await db.query("INSERT INTO clases (name) VALUES (?)", [name]);

    return new Response(JSON.stringify({ message: "Clase creada" }), {
      status: 201,
    });
  } catch (error) {
    console.error(error);
    return new Response("Error al crear clase", { status: 500 });
  }
}