export async function POST(req) {

  const {
    origen_id,
    destino_id,
    cantidad
  } = await req.json();

  const conn = await db.getConnection();
  await conn.beginTransaction();

  try {

    const [[origen]] = await conn.query(`
      SELECT producto_id, stock FROM stock_parcial WHERE id=?
    `, [origen_id]);

    if (origen.stock < cantidad)
      throw new Error("Stock insuficiente");

    await conn.query(`
      UPDATE stock_parcial
      SET stock = stock - ?
      WHERE id=?
    `, [cantidad, origen_id]);

    await conn.query(`
      UPDATE stock_parcial
      SET stock = stock + ?
      WHERE id=?
    `, [cantidad, destino_id]);

    await conn.commit();

    return NextResponse.json({ message: "Transferido" });

  } catch (e) {
    await conn.rollback();
    return NextResponse.json({ message: e.message }, { status: 400 });
  }
}
