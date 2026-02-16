export async function GET(req, context) {
  const { id } = await context.params;

  const [rows] = await db.query(
    "SELECT * FROM cita_archivos WHERE cita_id=?",
    [id]
  );

  return Response.json(rows);
}
export async function POST(req, context) {
  const { id } = await context.params;
  const formData = await req.formData();

  const file = formData.get("file");

  const path = `/uploads/${Date.now()}_${file.name}`;
  await fs.writeFile(`./public${path}`, Buffer.from(await file.arrayBuffer()));

  await db.query(`
    INSERT INTO cita_archivos
    (cita_id,file_name,file_path,mime_type,size_kb,uploaded_by)
    VALUES (?,?,?,?,?,?)
  `, [
    id,
    file.name,
    path,
    file.type,
    Math.round(file.size/1024),
    formData.get("user_id")
  ]);

  return Response.json({ ok:true });
}
