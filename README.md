This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Conversaciones CRM MVP (inicio de implementacion)

Se agrego una base funcional para bandeja conversacional con envio manual y webhook entrante.

### Seguridad de endpoints de conversaciones

- Los endpoints internos de conversaciones (`clients`, `timeline`, `metrics`, `messages`, `mark-read`, `assign`, `priority`) ahora exigen autenticación.
- Se acepta token por:
	- Header `Authorization: Bearer <token>`
	- Cookie `token` (flujo actual de login web)
- Validación de permisos por módulo `mensajes`:
	- `view` para lectura
	- `create` para envío
	- `edit` para mark-read/asignación/prioridad
- El endpoint `POST /api/conversations/webhook` mantiene validación por secreto (`x-conversations-webhook-secret`) para integración externa.

### Endpoints nuevos

- `POST /api/conversations/messages`
	- Registra mensaje manual saliente desde UI.
	- Si existe `N8N_CONVERSATIONS_OUTBOUND_URL`, reenvia payload a n8n.
	- Incluye idempotencia (`idempotency_key`) y estado (`message_status`) cuando las columnas de tracking estan migradas.

- `POST /api/conversations/bulk-messages`
	- Envia el mismo mensaje a multiples destinatarios en una sola solicitud.
	- Soporta `whatsapp`, `instagram` y `facebook`.
	- Reutiliza outbox/reintentos y devuelve resumen (`sent`, `queued`, `failed`, `skipped`).
	- Para canales sociales intenta resolver `platform_id` desde `social_identities` por celular.

Body ejemplo:

```json
{
	"text": "Promo de mantenimiento con 15% de descuento",
	"source_channel": "instagram",
	"source": "bulk_ui",
	"recipients": [
		{ "session_id": 10 },
		{ "phone": "+51999999999" },
		{ "phone": "+51988888888", "platform_id": "1784xxxxxx" }
	]
}
```

Body ejemplo:

```json
{
	"session_id": 1,
	"text": "Hola, te confirmo tu cita para manana",
	"direction": "outbound",
	"source": "manual_ui",
	"source_channel": "whatsapp",
	"idempotency_key": "manual-123"
}
```

- `POST /api/conversations/webhook`
	- Ingesta de mensajes entrantes normalizados desde n8n/proveedor.
	- Crea sesion si no existe (por phone/client_id) y registra mensaje inbound.
	- Acepta evento de estado para actualizar mensajes existentes (`event_type: status`).

- `POST /api/conversations/mark-read`
	- Marca la conversacion como leida hasta un `last_message_id`.
	- Se usa desde la UI al abrir el timeline para limpiar no leidos.

Body ejemplo:

```json
{
	"session_id": 1,
	"last_message_id": 245
}
```

- `POST /api/conversations/assign`
	- Asigna una conversacion a un asesor y actualiza su estado operativo.

Body ejemplo:

```json
{
	"session_id": 1,
	"assigned_agent_id": 3,
	"assignment_status": "open"
}
```

- `POST /api/conversations/priority`
	- Actualiza prioridad y fecha limite de SLA de una conversacion.

Body ejemplo:

```json
{
	"session_id": 1,
	"priority_level": "high",
	"sla_due_at": "2026-03-14 19:30:00"
}
```

- `POST /api/conversations/outbox/process`
	- Reprocesa mensajes pendientes/fallidos del outbox para reintentos de entrega.
	- Autorización por:
		- usuario autenticado con permiso `mensajes.edit`, o
		- header interno `x-conversations-outbox-secret`.

Body opcional:

```json
{
	"limit": 20
}
```

- `GET /api/conversations/audit?session_id=1&limit=30`
	- Devuelve historial de auditoría de cambios operativos de la conversación
		(asignación, estado, prioridad y SLA).

- `GET /api/conversations/metrics?user_id=1`
	- Devuelve métricas operativas para tablero de mensajería:
		- total, activas, sin asignar, SLA vencidas, no leídos, mis activas, tiempo promedio de primera respuesta y espera máxima actual.

Body ejemplo:

```json
{
	"phone": "+51999999999",
	"text": "Quiero cotizar un mantenimiento",
	"source": "n8n",
	"source_channel": "whatsapp",
	"external_message_id": "wamid.xxxxxx"
}
```

Body ejemplo para evento de estado:

```json
{
	"event_type": "status",
	"external_message_id": "wamid.xxxxxx",
	"status": "delivered",
	"payload": {
		"provider": "meta"
	}
}
```

Header opcional de seguridad:

- `x-conversations-webhook-secret: <tu_secreto>`

### Variables de entorno

Configurar en `.env.local`:

```env
N8N_CONVERSATIONS_OUTBOUND_URL=https://tu-n8n/webhook/saliente
CONVERSATIONS_WEBHOOK_SECRET=tu-secreto-webhook
CONVERSATIONS_SLA_MINUTES=30
CONVERSATIONS_OUTBOX_MAX_RETRIES=5
CONVERSATIONS_OUTBOX_SECRET=secreto-interno-para-job
OUTBOX_PROCESS_URL=http://localhost:3000/api/conversations/outbox/process
OUTBOX_PROCESS_LIMIT=20
```

### Automatizacion de reproceso outbox

Script incluido:

```bash
npm run outbox:process
```

Este comando llama al endpoint interno de reproceso usando `x-conversations-outbox-secret`.

Ejemplo PowerShell cada 2 minutos (mientras corre tu app Next):

```powershell
while ($true) {
	node --env-file=.env.local scripts/process-conversations-outbox.cjs
	Start-Sleep -Seconds 120
}
```

Ejemplo n8n (Cron -> HTTP Request):

- Método: `POST`
- URL: `${OUTBOX_PROCESS_URL}`
- Header: `x-conversations-outbox-secret: ${CONVERSATIONS_OUTBOX_SECRET}`
- Body JSON: `{ "limit": 20 }`

### Migracion recomendada para tracking

Antes de usar idempotencia y estados de entrega en DB, ejecutar:

```bash
node migrations/add_conversations_message_tracking_columns.js
```

La API es tolerante si aun no migras, pero en ese caso el tracking avanzado/outbox queda parcialmente deshabilitado.

### Cambios visibles en UI

- Modulo `mensajes` ahora muestra ultimo mensaje real de cada sesion.
- Timeline con polling cada 5 segundos cuando el panel esta abierto.
- Composer para enviar mensajes manuales desde la bandeja.
- Contador de no leidos por conversacion + filtro "No leidos".
- Filtros de propiedad (todas, mis conversaciones, sin asignar).
- Selector de asesor y estado de conversacion en el timeline.
- Prioridad y SLA en lista y panel de gestión de conversación.
