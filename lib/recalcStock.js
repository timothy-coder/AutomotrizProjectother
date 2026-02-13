import { db } from "@/lib/db";

export async function recalcStock(producto_id) {

  const [sum] = await db.query(`
    SELECT IFNULL(SUM(stock),0) AS total
    FROM stock_parcial
    WHERE producto_id=?
  `, [producto_id]);

  const total = sum[0].total;

  await db.query(`
    UPDATE productos
    SET 
      stock_total=?,
      stock_disponible = ? - stock_usado
    WHERE id=?
  `, [total, total, producto_id]);
}
