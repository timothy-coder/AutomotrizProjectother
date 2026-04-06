// lib/chatwootSse.js
/** @type {Set<ReadableStreamDefaultController>} */
const controllers = new Set();

export function addSseClient(controller) {
  controllers.add(controller);
}

export function removeSseClient(controller) {
  controllers.delete(controller);
}

export function broadcastSseEvent(event, data) {
  const payload = new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  );
  for (const ctrl of controllers) {
    try {
      ctrl.enqueue(payload);
    } catch (err) {
      console.error("SSE: cliente desconectado, removiendo del set:", err);
      controllers.delete(ctrl);
    }
  }
}
