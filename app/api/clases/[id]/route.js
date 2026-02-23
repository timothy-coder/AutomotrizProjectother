import { db } from "@/lib/db";

// PUT para editar una clase
export async function PUT(req, { params }) {
  try {
    // Desenvuelve la promesa para obtener el id
    const { id } = await params; // Aquí utilizamos await para resolver params
    const { name } = await req.json();

    if (!name || name.trim() === "") {
      return new Response("Nombre es requerido", { status: 400 });
    }

    await db.query("UPDATE clases SET name=? WHERE id=?", [name, id]);

    return new Response(JSON.stringify({ message: "Clase actualizada" }), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response("Error al actualizar clase", { status: 500 });
  }
}

// DELETE para eliminar una clase
export async function DELETE(req, { params }) {
  try {
    // Desenvuelve la promesa para obtener el id
    const { id } = await params; // Aquí utilizamos await para resolver params

    await db.query("DELETE FROM clases WHERE id=?", [id]);

    return new Response(JSON.stringify({ message: "Clase eliminada" }), {
      status: 200,
    });
  } catch (error) {
    console.error(error);
    return new Response("Error al eliminar clase", { status: 500 });
  }
}