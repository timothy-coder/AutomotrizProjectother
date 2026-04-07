function getConfig() {
  const url = process.env.CHATWOOT_URL;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;
  const token = process.env.CHATWOOT_API_TOKEN;

  if (!url || !accountId || !token) {
    throw new Error(
      "Chatwoot config missing. Required: CHATWOOT_URL, CHATWOOT_ACCOUNT_ID, CHATWOOT_API_TOKEN"
    );
  }

  return {
    baseUrl: `${url}/api/v1/accounts/${accountId}`,
    headers: {
      api_access_token: token,
      "Content-Type": "application/json",
    },
  };
}

async function chatwootFetch(path, options = {}) {
  const { baseUrl, headers } = getConfig();
  let res;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: { ...headers, ...(options.headers || {}) },
    });
  } catch (networkErr) {
    throw new Error(
      `Chatwoot network error — ${options.method || "GET"} ${path}: ${networkErr.message}`
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Chatwoot ${options.method || "GET"} ${path} → ${res.status}: ${text}`);
  }
  return res.json().catch((err) => {
    throw new Error(`Chatwoot ${options.method || "GET"} ${path} → non-JSON response: ${err.message}`);
  });
}

// Conversaciones
export async function getConversations({ status, inboxId, teamId, page = 1 } = {}) {
  const params = new URLSearchParams({ page });
  if (status) params.append("status", status);
  if (inboxId) params.append("inbox_id", inboxId);
  if (teamId) params.append("team_id", teamId);
  return chatwootFetch(`/conversations?${params}`);
}

export async function getConversation(id) {
  return chatwootFetch(`/conversations/${id}`);
}

// Mensajes
export async function getMessages(conversationId) {
  const MAX_PAGES = 15; // cap at 300 messages
  const allMessages = [];
  let before = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const query = before ? `?before=${before}` : "";
    const data = await chatwootFetch(`/conversations/${conversationId}/messages${query}`);
    const batch = data?.payload ?? [];

    if (batch.length === 0) break;
    allMessages.push(...batch);
    if (batch.length < 20) break;

    // batch is ascending (oldest first) — use first element as cursor for older page
    before = batch[0].id;
  }

  // Ensure final order is ascending (oldest → newest) regardless of page concat order
  allMessages.sort((a, b) => {
    const ta = typeof a.created_at === "number" ? a.created_at : new Date(a.created_at).getTime() / 1000;
    const tb = typeof b.created_at === "number" ? b.created_at : new Date(b.created_at).getTime() / 1000;
    return ta - tb;
  });

  return { payload: allMessages };
}

export async function sendMessage(conversationId, content, { messageType = "outgoing", private: isPrivate = false } = {}) {
  return chatwootFetch(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content, message_type: messageType, private: isPrivate }),
  });
}

// Asignación
export async function assignConversation(conversationId, { agentId, teamId } = {}) {
  if (!agentId && !teamId) {
    throw new Error("assignConversation requires at least agentId or teamId");
  }
  const body = {};
  if (agentId) body.assignee_id = agentId;
  if (teamId) body.team_id = teamId;
  return chatwootFetch(`/conversations/${conversationId}/assignments`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// Estado
export async function updateConversationStatus(conversationId, status) {
  return chatwootFetch(`/conversations/${conversationId}/toggle_status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function markConversationAsRead(conversationId) {
  return chatwootFetch(`/conversations/${conversationId}/update_last_seen`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

// Contactos
export async function getContact(contactId) {
  return chatwootFetch(`/contacts/${contactId}`);
}

export async function getContactConversations(contactId) {
  return chatwootFetch(`/contacts/${contactId}/conversations`);
}

export async function searchContacts(query) {
  return chatwootFetch(`/contacts/search?q=${encodeURIComponent(query)}&include_contacts=true`);
}

// Métricas
export async function getAccountSummary({ since, until } = {}) {
  const params = new URLSearchParams();
  if (since) params.append("since", since);
  if (until) params.append("until", until);
  return chatwootFetch(`/reports/summary?${params}`);
}

// Agentes
export async function getAgents() {
  return chatwootFetch("/agents");
}

// Equipos
export async function getTeams() {
  return chatwootFetch("/teams");
}

// Etiquetas
export async function addLabel(conversationId, label) {
  return chatwootFetch(`/conversations/${conversationId}/labels`, {
    method: "POST",
    body: JSON.stringify({ labels: [label] }),
  });
}

export async function getLabels(conversationId) {
  return chatwootFetch(`/conversations/${conversationId}/labels`);
}
