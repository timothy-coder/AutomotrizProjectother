export const runtime = "nodejs";

import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";

const MIME_BY_EXT = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function sanitizeFilename(raw) {
  const file = path.basename(String(raw || "").trim());
  return /^[a-zA-Z0-9._-]+$/.test(file) ? file : "";
}

function getContentType(filename) {
  const ext = path.extname(filename || "").toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

function resolveFilePath(filename) {
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  return path.join(uploadDir, filename);
}

export async function HEAD(_req, { params }) {
  try {
    const filename = sanitizeFilename(params?.filename);
    if (!filename) {
      return NextResponse.json({ message: "Archivo inválido" }, { status: 400 });
    }

    const filePath = resolveFilePath(filename);
    const stat = await fs.stat(filePath);

    return new NextResponse(null, {
      status: 200,
      headers: {
        "Content-Type": getContentType(filename),
        "Content-Length": String(stat.size),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return NextResponse.json({ message: "Archivo no encontrado" }, { status: 404 });
    }

    console.error("HEAD /api/upload/files/[filename] error:", error);
    return NextResponse.json({ message: "Error al leer archivo" }, { status: 500 });
  }
}

export async function GET(_req, { params }) {
  try {
    const filename = sanitizeFilename(params?.filename);
    if (!filename) {
      return NextResponse.json({ message: "Archivo inválido" }, { status: 400 });
    }

    const filePath = resolveFilePath(filename);
    const data = await fs.readFile(filePath);

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": getContentType(filename),
        "Content-Length": String(data.length),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      return NextResponse.json({ message: "Archivo no encontrado" }, { status: 404 });
    }

    console.error("GET /api/upload/files/[filename] error:", error);
    return NextResponse.json({ message: "Error al leer archivo" }, { status: 500 });
  }
}
