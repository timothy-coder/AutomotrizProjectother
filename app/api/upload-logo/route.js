// app/api/upload-logo/route.js

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Crear directorio si no existe
        const uploadDir = path.join(process.cwd(), 'public/logos');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // Guardar archivo
        const filename = `${Date.now()}-${file.name}`;
        const filepath = path.join(uploadDir, filename);
        fs.writeFileSync(filepath, buffer);

        return NextResponse.json({ url: `/logos/${filename}` });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error uploading file' }, { status: 500 });
    }
}