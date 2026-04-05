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
  return chatwootFetch(`/conversations/${conversationId}/messages`);
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

// Contactos
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
