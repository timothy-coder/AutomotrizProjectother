// app/api/chatwoot/sse/route.js
import { addSseClient, removeSseClient } from "@/lib/chatwootSse";
import { verifyToken } from "@/lib/auth";

// EXCEPCIÓN DOCUMENTADA: SSE usa EventSource en el cliente, que no permite
// headers custom (Authorization). Por eso el JWT viene como query param ?token=
// y se valida directamente con verifyToken() en lugar de authorizeConversation().
// Esto es una desviación aprobada del estándar solo para endpoints SSE.

export async function GET(req) {
  // SSE no soporta headers custom — token viene por query param
  const token = new URL(req.url).searchParams.get("token");

  if (!token) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    verifyToken(token);
  } catch (err) {
    console.error("SSE: token inválido o expirado:", err?.message);
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream({
    start(ctrl) {
      addSseClient(ctrl);
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
