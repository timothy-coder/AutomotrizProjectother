import { verifyToken } from "./auth";
import { NextResponse } from "next/server";

export function withAuth(handler, requiredPermission = null) {

  return async (req) => {

    try {

      const token = req.headers.get("authorization")?.split(" ")[1];

      if (!token) {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 });
      }

      const user = verifyToken(token);

      if (requiredPermission) {

        const perms = JSON.parse(user.permissions || "{}");

        if (!perms[requiredPermission]) {
          return NextResponse.json(
            { message: "Sin permisos" },
            { status: 403 }
          );
        }
      }

      return handler(req, user);

    } catch {
      return NextResponse.json({ message: "Token inválido" }, { status: 401 });
    }
  };
}
