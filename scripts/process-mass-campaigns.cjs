#!/usr/bin/env node

function toInt(value, fallback) {
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return fallback;
  return parsed;
}

async function main() {
  const endpoint = process.env.MASS_CAMPAIGNS_PROCESS_URL
    || "http://localhost:3000/api/envios-masivos/process-scheduled";
  const secret = process.env.CONVERSATIONS_OUTBOX_SECRET || "";
  const limit = Math.max(1, Math.min(toInt(process.env.MASS_CAMPAIGNS_PROCESS_LIMIT, 10), 20));

  if (!secret) {
    console.error("Falta CONVERSATIONS_OUTBOX_SECRET en variables de entorno");
    process.exit(1);
  }

  const url = `${endpoint}?limit=${encodeURIComponent(limit)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-conversations-outbox-secret": secret,
    },
  });

  let payload = {};
  try {
    payload = await res.json();
  } catch {
    payload = { message: "Respuesta no JSON" };
  }

  if (!res.ok) {
    console.error("Error procesando campañas programadas:", res.status, payload);
    process.exit(1);
  }

  const processed = Number(payload?.processed || 0);
  const results = Array.isArray(payload?.results) ? payload.results : [];
  const ok = results.filter((r) => r?.status === "ok").length;
  const error = results.filter((r) => r?.status === "error").length;

  console.log(
    JSON.stringify(
      {
        message: "Campañas programadas procesadas",
        endpoint,
        processed,
        ok,
        error,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("Fallo inesperado:", error);
  process.exit(1);
});
