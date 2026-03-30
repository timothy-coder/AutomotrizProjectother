import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { safeParsePermissions } from "@/lib/permissions";

function getBearerToken(req) {
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }
  return "";
}

function hasMensajesPermission(perms, action) {
  const mod = perms?.mensajes;

  if (!mod) return false;

  if (Array.isArray(mod)) {
    const actionMap = {
      view: ["read", "view"],
      create: ["create", "write"],
      edit: ["edit", "update", "write"],
      delete: ["delete"],
    };

    return (actionMap[action] || [action]).some((a) => mod.includes(a));
  }

  if (typeof mod === "object") {
    if (mod.viewall === true || mod.all === true) return true;
    return mod?.[action] === true;
  }

  return false;
}

/**
 * Verifica que el request tenga un JWT válido (cualquier usuario autenticado).
 * No chequea permisos de módulo — solo que la sesión sea válida.
 */
export function requireAuth(req) {
  try {
    const token = getBearerToken(req) || req.cookies.get("token")?.value || "";
    if (!token) {
      return {
        ok: false,
        response: NextResponse.json({ message: "No autorizado" }, { status: 401 }),
      };
    }
    const decoded = verifyToken(token);
    return { ok: true, user: decoded };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ message: "Token inválido" }, { status: 401 }),
    };
  }
}

export function authorizeConversation(req, action = "view") {
  try {
    const token = getBearerToken(req) || req.cookies.get("token")?.value || "";

    if (!token) {
      return {
        ok: false,
        response: NextResponse.json({ message: "No autorizado" }, { status: 401 }),
      };
    }

    const decoded = verifyToken(token);
    const perms = safeParsePermissions(decoded?.permissions);

    const role = String(decoded?.role || "").toLowerCase();
    const roleBypass = role.includes("admin");

    if (!roleBypass && !hasMensajesPermission(perms, action)) {
      return {
        ok: false,
        response: NextResponse.json({ message: "Sin permisos" }, { status: 403 }),
      };
    }

    return {
      ok: true,
      user: decoded,
      permissions: perms,
    };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ message: "Token inválido" }, { status: 401 }),
    };
  }
}
