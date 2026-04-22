// lib/chatwootSse.js
// Each client entry: { controller, chatwootTeamIds: number[], isAdmin: boolean }
/** @type {Set<{controller: ReadableStreamDefaultController, chatwootTeamIds: number[], isAdmin: boolean}>} */
const clients = new Set();

export function addSseClient(controller, chatwootTeamIds = [], isAdmin = false) {
  clients.add({ controller, chatwootTeamIds, isAdmin });
}

export function removeSseClient(controller) {
  for (const client of clients) {
    if (client.controller === controller) {
      clients.delete(client);
      return;
    }
  }
}

/**
 * Broadcast an SSE event.
 * @param {string} event - Event name
 * @param {object} data - Event payload
 * @param {number|null} targetTeamId - If set, only send to clients in that Chatwoot team (admins always receive)
 */
export function broadcastSseEvent(event, data, targetTeamId = null) {
  const payload = new TextEncoder().encode(
    `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
  );
  for (const client of clients) {
    const shouldReceive =
      targetTeamId === null ||
      client.isAdmin ||
      client.chatwootTeamIds.includes(Number(targetTeamId));

    if (!shouldReceive) continue;

    try {
      client.controller.enqueue(payload);
    } catch (err) {
      console.error("SSE: cliente desconectado, removiendo del set:", err);
      clients.delete(client);
    }
  }
}
