// app/api/plantilla-pdf/route.js

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const PLANTILLA_PATH = path.join(process.cwd(), 'public/plantilla-pdf.json');

export async function GET() {
    try {
        if (fs.existsSync(PLANTILLA_PATH)) {
            const data = fs.readFileSync(PLANTILLA_PATH, 'utf-8');
            return NextResponse.json(JSON.parse(data));
        }
        return NextResponse.json({});
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error leyendo plantilla' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const plantilla = await req.json();
        fs.writeFileSync(PLANTILLA_PATH, JSON.stringify(plantilla, null, 2));
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Error guardando plantilla' }, { status: 500 });
    }
}