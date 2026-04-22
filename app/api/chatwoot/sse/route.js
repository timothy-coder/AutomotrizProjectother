// app/api/chatwoot/sse/route.js
import { db } from "@/lib/db";
import { addSseClient, removeSseClient } from "@/lib/chatwootSse";
import { verifyToken } from "@/lib/auth";

// EXCEPCIÓN DOCUMENTADA: SSE usa EventSource en el cliente, que no permite
// headers custom (Authorization). Por eso el JWT viene como query param ?token=
// y se valida directamente con verifyToken() en lugar de authorizeConversation().
// Esto es una desviación aprobada del estándar solo para endpoints SSE.

async function resolveUserTeams(decoded) {
  // El campo role viene en el JWT desde el login. Si falta (sesión antigua),
  // hacemos lookup en DB por id.
  let roleName = decoded?.role || null;

  if (!roleName && decoded?.id) {
    try {
      const [rows] = await db.query(
        `SELECT r.name FROM usuarios u JOIN roles r ON r.id = u.role_id WHERE u.id = ? LIMIT 1`,
        [decoded.id]
      );
      roleName = rows[0]?.name || null;
    } catch (err) {
      console.error("SSE: error resolviendo rol por id:", err.message);
    }
  }

  if (!roleName) return { isAdmin: false, chatwootTeamIds: [] };

  const role = roleName.toLowerCase();
  if (role.includes("admin")) {
    return { isAdmin: true, chatwootTeamIds: [] };
  }

  try {
    const [rows] = await db.query(
      `SELECT rcm.chatwoot_team_id
       FROM roles_chatwoot_mapping rcm
       JOIN roles r ON r.id = rcm.role_id
       WHERE LOWER(r.name) = LOWER(?)
       LIMIT 1`,
      [roleName]
    );
    const teamId = rows[0]?.chatwoot_team_id;
    return {
      isAdmin: false,
      chatwootTeamIds: teamId ? [Number(teamId)] : [],
    };
  } catch (err) {
    console.error("SSE: error resolviendo equipos del usuario:", err.message);
    return { isAdmin: false, chatwootTeamIds: [] };
  }
}

export async function GET(req) {
  // SSE no soporta headers custom — token viene por query param
  const token = new URL(req.url).searchParams.get("token");

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    console.error("SSE: token inválido o expirado:", err?.message);
    return new Response("Unauthorized", { status: 401 });
  }

  const { isAdmin, chatwootTeamIds } = await resolveUserTeams(decoded);

  const stream = new ReadableStream({
    start(ctrl) {
      addSseClient(ctrl, chatwootTeamIds, isAdmin);
      // keepalive cada 25s para evitar que el proxy cierre la conexión
      const interval = setInterval(() => {
        try {
          ctrl.enqueue(new TextEncoder().encode(": ping\n\n"));
        } catch (err) {
          console.error("SSE: error enviando keepalive, cerrando intervalo:", err);
          clearInterval(interval);
        }
      }, 25000);
      req.signal.addEventListener("abort", () => {
        clearInterval(interval);
        removeSseClient(ctrl);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
