# Coding Standards — Automotriz CRM

## Stack
- Next.js 16 App Router, React 19, JavaScript (no TypeScript)
- UI: shadcn/ui components, lucide-react icons, Tailwind CSS
- DB: MySQL via `@/lib/db` (promise-based pool)
- Auth: session-based via `authorizeConversation()` from `@/lib/conversationsAuth`

---

## API Routes (`app/api/**/route.js`)

### Auth — always first
Every handler must authenticate before doing anything else.

```js
// Session-based (CRM users)
const auth = authorizeConversation(req, "view" | "edit" | "admin");
if (!auth.ok) return auth.response;

// Webhook-based (n8n / external services)
function authenticateWebhook(req) {
  const secret = req.headers.get("x-conversations-webhook-secret") || "";
  const expected = process.env.CONVERSATIONS_WEBHOOK_SECRET || "";
  return expected && secret === expected;
}
```

**FAIL**: any handler that queries the DB before authenticating.

### Input validation
- Validate required fields and return `400` with a descriptive `message` before any DB call.
- Use allowlists for enum-like params (e.g., `AGENT_KEYS_VALIDOS = ["taller", "ventas", "presales"]`).
- Never trust user input in SQL — always use parameterized queries (`?` placeholders).

### DB queries
- Use `await db.query(sql, params)` — destructure as `const [rows] = await db.query(...)`.
- Always use parameterized queries. No string concatenation in SQL.
- Sanitize string inputs with `.trim() || null` before inserting/updating.

### Response shape
- Success: `NextResponse.json({ data })` or `NextResponse.json({ message: "..." })`
- Error: `NextResponse.json({ message: "..." }, { status: 4xx })`
- Consistent field naming: use `snake_case` to match DB columns.

### HTTP methods
- `GET` — read only, no side effects
- `POST` — create
- `PUT` — full or partial update (this project uses PUT for updates)
- `DELETE` — delete, always confirm the resource exists first

---

## React Components (`app/components/**/*.jsx`, `app/**/page.jsx`)

### Client vs Server
- Add `"use client"` only when the component uses hooks, browser APIs, or event handlers.
- Pages that only render data can be Server Components (no directive needed).

### State management
- `useState` + `useEffect` for local state. Keep effects clean with proper cleanup.
- Fetch data in `useEffect` for client components; use `async` server components or API routes for server-side fetching.

### Component structure
```jsx
// 1. "use client" (if needed)
// 2. imports (React hooks → external libs → internal components → utils)
// 3. constants outside component
// 4. component function
// 5. export default
```

### Naming
- Components: `PascalCase`
- Files: `PascalCase.jsx` for components, `camelCase.js` for utilities
- Event handlers: `handle` prefix — `handleSubmit`, `handleDelete`

### UI patterns
- Use shadcn/ui components (`Card`, `Dialog`, `Button`, etc.) — don't reinvent.
- Icons from `lucide-react` only.
- Tailwind for styling — no inline styles, no CSS modules.
- Loading states: use skeleton components (`*Skeleton.jsx`) or `isLoading` guards.

---

## Error handling

- API routes: wrap DB calls in try/catch, return `500` with a generic message (don't leak internals).
- Client components: show user-friendly error messages, log errors to console in dev.
- Never swallow errors silently.

---

## Security

- No SQL string concatenation — ever.
- No secrets in client-side code.
- Validate `agent_key` / enum params against an allowlist before querying.
- Webhook endpoints must validate `x-conversations-webhook-secret`.

---

## What to flag in review

- DB query without auth check above it
- SQL built with string concatenation
- `console.log` left in production code
- `any` type (if TypeScript is ever introduced)
- Missing error handling in async functions
- Hardcoded secrets or credentials
- `useEffect` without cleanup for event listeners
- Fetching inside render without loading/error state handling
