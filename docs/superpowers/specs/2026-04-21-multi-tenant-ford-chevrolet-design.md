# Diseño — Replicación multi-tenant del sistema Wankamotors para Ford y Chevrolet

**Fecha:** 2026-04-21
**Autor:** POOL
**Estado:** Aprobado (pendiente de implementación)
**Prioridad de rollout:** Ford primero, Chevrolet la semana siguiente

---

## Contexto

Wankamotors tiene actualmente un CRM funcionando en `/var/www/myprototipe` (VPS) que se conecta a Chatwoot (`os.app20.tech`) y a n8n (`64.23.235.153`) para atender mensajes de WhatsApp, Facebook Messenger e Instagram. Ese sistema se mantiene como **staging / testing** y va a seguir en pie para probar nuevas actualizaciones.

Ahora hay que levantar dos instancias productivas nuevas, una por cada centro de la concesionaria:

| Centro | Subdominio CRM | Base de datos | Meta accounts |
|--------|----------------|---------------|---------------|
| **Ford** | `wankamotorsford.onesolution.website` | `db_wankamotorsford` | WABA + Página FB + IG propios (ya asignados) |
| **Chevrolet** | `wankamotorschevrolet.onesolution.website` | `db_wankamotorschevrolet` | WABA + Página FB + IG propios (asignación la semana siguiente) |

Restricciones importantes:

- **Ford y Chevrolet viven en un mismo droplet productivo** (distintos subdominios + puertos), distinto al droplet de staging.
- Las **dos bases de datos productivas** (`db_wankamotorsford` y `db_wankamotorschevrolet`) viven en el mismo droplet que los CRM productivos. La base de staging queda en su droplet aparte.
- **Chatwoot es una sola instancia** compartida (la de `os.app20.tech`), con cuentas separadas por tenant.
- **n8n es una sola instancia** compartida (la de `64.23.235.153`), con flujos duplicados por tenant.
- Las bases `db_wankamotorsford` y `db_wankamotorschevrolet` están creadas pero **vacías**.

---

## Principios de diseño

1. **Aislamiento por deployment, no por código.** El mismo codebase corre tres veces con `.env.local` distintos. No se introduce lógica multi-tenant en la app (nada de `tenant_id` en queries, nada de middleware de tenant). Mantiene la app simple y cada tenant queda realmente aislado (una caída de Ford no afecta a Chevrolet).
2. **Una sola fuente de verdad de código.** El repo `AutomotrizProjectother` es único. Ford y Chevrolet corren el mismo commit. Se despliegan en paralelo desde el mismo `git pull`.
3. **Secrets por tenant, endpoints compartidos.** JWT, credenciales MySQL, tokens Meta y secretos de webhook son distintos por tenant. URLs de Chatwoot y n8n son compartidas.
4. **Staging intacto.** El sistema actual (`myprototipe`) no se toca. Sigue conectado a su Chatwoot account 1, su DB actual y sus workflows n8n actuales.

---

## Sección 1 — Arquitectura global

### Diagrama de alto nivel

```
                    ┌──────────────────────────────────────────┐
                    │   Meta (WhatsApp Cloud + FB + IG)        │
                    │                                           │
                    │   ┌──────────┐  ┌──────────┐  ┌────────┐ │
                    │   │ STAGING  │  │   FORD   │  │CHEVROLET│ │
                    │   │ WABA/FB/IG│ │ WABA/FB/IG│ │WABA/FB/IG│ │
                    │   └────┬─────┘  └────┬─────┘  └───┬────┘ │
                    └────────┼─────────────┼────────────┼──────┘
                             │             │            │
                             ▼             ▼            ▼
                    ┌─────────────────────────────────────────┐
                    │  Chatwoot (os.app20.tech — 1 instancia) │
                    │                                          │
                    │  Account 1   Account 2       Account 3   │
                    │  STAGING     CHEVROLET       FORD        │
                    │  (actual)    (inboxes +      (inboxes +  │
                    │              agents)          agents)    │
                    └────┬─────────────┬─────────────┬─────────┘
                         │             │             │
                         │ webhooks    │ webhooks    │ webhooks
                         ▼             ▼             ▼
                    ┌─────────────────────────────────────────┐
                    │  n8n (64.23.235.153 — 1 instancia)      │
                    │                                          │
                    │  Tag: staging   Tag: chevrolet   Tag: ford│
                    │  (9 flujos)     (9 flujos)       (9 flujos)│
                    └────┬─────────────┬─────────────┬─────────┘
                         │             │             │
                         ▼             ▼             ▼
    ┌──────────────────────────────────┐   ┌────────────────────────────────────┐
    │  Droplet STAGING (aparte)        │   │  Droplet PRODUCTIVO (Ford + Chev)  │
    │                                  │   │                                    │
    │  :3000  myprototipe              │   │  :3000  wankamotorsford...         │
    │                                  │   │  :3001  wankamotorschevrolet...    │
    │  MySQL:                          │   │                                    │
    │   • db_myprototipe               │   │  MySQL 8:                          │
    │                                  │   │   • db_wankamotorsford             │
    │                                  │   │   • db_wankamotorschevrolet        │
    └──────────────────────────────────┘   └────────────────────────────────────┘
```

> **Nota sobre droplets:** staging (`myprototipe`) vive en su propio droplet, aparte. Ford y Chevrolet comparten un droplet productivo distinto — por eso pueden usar 3000 y 3001 sin chocar con staging. En el diagrama de arriba el bloque "Droplet de CRMs" refiere SOLO al droplet productivo; la línea de staging está incluida únicamente para mostrar el contexto del sistema completo.

### Tabla de componentes

| Componente | Host / Instancia | Separación entre tenants |
|------------|------------------|--------------------------|
| **CRM (Next.js)** | Droplet productivo: 2 carpetas, 2 procesos PM2 (Ford + Chev). Staging en droplet aparte. | `.env.local` distinto, puerto distinto, subdominio distinto |
| **MySQL** | Droplet productivo: 2 DBs (Ford + Chev). Staging en droplet aparte. | 2 users separados con permisos sobre su propia DB únicamente |
| **Chatwoot** | `os.app20.tech` | 3 accounts separados — datos 100% aislados a nivel Chatwoot |
| **n8n** | `64.23.235.153` | 1 instancia, flujos duplicados con tags y sufijos por tenant |
| **Meta (WA/FB/IG)** | `business.facebook.com` | Business Portfolio separado por tenant, WABA/tokens/páginas propios |
| **Dominios** | Cloudflare / DNS provider | `wankamotorsford.onesolution.website` y `wankamotorschevrolet.onesolution.website`, certs Let's Encrypt separados |

### Principio de aislamiento

Si Ford tiene un pico de tráfico, Chevrolet no se entera. Si la DB de Ford se corrompe, la de Chevrolet está intacta. Si un flujo n8n de Ford rompe, Chevrolet sigue respondiendo. La ÚNICA superficie compartida es la instancia física de Chatwoot y la de n8n — y ahí el aislamiento lo hacen sus propios mecanismos nativos (accounts en Chatwoot, workflows separados en n8n).

---

## Sección 2 — Capa CRM (Next.js)

### Layout del droplet productivo

El droplet productivo (distinto al de staging) tiene las dos carpetas:

```
/var/www/
├── crm-ford/                 ← Ford productivo (puerto 3000)
└── crm-chevrolet/            ← Chevrolet productivo (puerto 3001)
```

Staging sigue intacto en su propio droplet (`/var/www/myprototipe`, puerto 3000) — NO se toca.

Cada carpeta del droplet productivo es un `git clone` del mismo repo, en el mismo branch (`main`). Se actualizan con `git pull && npm install && npm run build && pm2 restart <proceso> --update-env`.

### Puertos y PM2 (droplet productivo)

| Proceso | Puerto | Nombre PM2 | Subdominio |
|---------|--------|------------|------------|
| **Ford productivo** | **3000** | `crm-ford` | `wankamotorsford.onesolution.website` |
| **Chevrolet productivo** | **3001** | `crm-chevrolet` | `wankamotorschevrolet.onesolution.website` |

Si mañana aparece un tercer centro, va al 3002 y así.

### Ecosystem PM2 (por tenant)

Un archivo `ecosystem.config.cjs` por carpeta. Ejemplo de Ford (`/var/www/crm-ford/ecosystem.config.cjs`):

```js
module.exports = {
  apps: [{
    name: "crm-ford",
    script: "npm",
    args: "start",
    cwd: "/var/www/crm-ford",
    env: {
      NODE_ENV: "production",
      PORT: 3000,
    },
    max_memory_restart: "800M",
    error_file: "/var/log/pm2/crm-ford-error.log",
    out_file: "/var/log/pm2/crm-ford-out.log",
  }, {
    name: "crm-ford-outbox",
    script: "scripts/process-conversations-outbox.cjs",
    cwd: "/var/www/crm-ford",
    node_args: "--env-file=.env.local",
    cron_restart: "*/2 * * * *",
    autorestart: false,
  }, {
    name: "crm-ford-mass",
    script: "scripts/process-mass-campaigns.cjs",
    cwd: "/var/www/crm-ford",
    node_args: "--env-file=.env.local",
    cron_restart: "*/5 * * * *",
    autorestart: false,
  }]
};
```

El de Chevrolet es idéntico cambiando `ford` por `chevrolet` y `PORT: 3000` por `PORT: 3001`.

### nginx — vhosts por tenant

Un archivo por subdominio en `/etc/nginx/sites-available/`:

**`/etc/nginx/sites-available/wankamotorsford`:**
```nginx
server {
    listen 443 ssl http2;
    server_name wankamotorsford.onesolution.website;

    ssl_certificate /etc/letsencrypt/live/wankamotorsford.onesolution.website/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/wankamotorsford.onesolution.website/privkey.pem;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $proxy_scheme;
    }

    # SSE — timeout largo para el endpoint de Chatwoot SSE
    location /api/chatwoot/sse {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 24h;
    }
}

server {
    listen 80;
    server_name wankamotorsford.onesolution.website;
    return 301 https://$host$request_uri;
}
```

El de Chevrolet es idéntico apuntando al `3001` y al cert de su subdominio.

Certificados con `certbot --nginx -d wankamotorsford.onesolution.website` (uno por subdominio).

### Variables de entorno — `.env.local` por tenant

**Decisión: un `.env.local` por carpeta.** NO un archivo compartido. Cada carpeta (`crm-ford`, `crm-chevrolet`) tiene el suyo con sus valores.

Tabla completa de variables:

| Variable | Ford (`/var/www/crm-ford/.env.local`) | Chevrolet (`/var/www/crm-chevrolet/.env.local`) |
|----------|----------------------------------------|--------------------------------------------------|
| `NODE_ENV` | `production` | `production` |
| `PORT` | `3000` | `3001` |
| `APP_BASE_URL` | `https://wankamotorsford.onesolution.website` | `https://wankamotorschevrolet.onesolution.website` |
| `DB_HOST` | `127.0.0.1` | `127.0.0.1` |
| `DB_PORT` | `3306` | `3306` |
| `DB_USER` | `wmford` | `wmchev` |
| `DB_PASS` | `<pass generado>` | `<pass generado>` |
| `DB_NAME` | `db_wankamotorsford` | `db_wankamotorschevrolet` |
| `JWT_SECRET` | `<random 64 chars>` | `<random 64 chars distinto>` |
| `CHATWOOT_URL` | `https://os.app20.tech` | `https://os.app20.tech` |
| `CHATWOOT_ACCOUNT_ID` | `2` | `3` |
| `CHATWOOT_API_TOKEN` | `<super admin token>` | `<super admin token>` |
| `CONVERSATIONS_WEBHOOK_SECRET` | `<random 32 chars ford>` | `<random 32 chars chevrolet>` |
| `CHATWOOT_WEBHOOK_HMAC_SECRET` | `<HMAC del webhook a CRM de account 2>` | `<HMAC del webhook a CRM de account 3>` |
| `OPENAI_API_KEY` | compartido | compartido |
| `GEMINI_API_KEY` | compartido | compartido |

> **`CHATWOOT_ACCOUNT_ID`:** Staging ya ocupa el account 1. Como el rollout arranca por Ford, se crea **Ford = 2** primero y **Chevrolet = 3** la semana siguiente. Chatwoot asigna los IDs secuencialmente al crear el account; una vez asignado, ese ID queda fijado en `CHATWOOT_ACCOUNT_ID` del `.env.local` correspondiente y NO se cambia nunca más. Si por algún motivo Chatwoot asigna un ID distinto (4, 5, etc.), se usa el que Chatwoot devuelva.

### Secretos — generación

```bash
# JWT secret (64 chars)
openssl rand -hex 32

# Webhook secret (32 chars)
openssl rand -hex 16

# Password MySQL (24 chars)
openssl rand -base64 18
```

Un valor por tenant. Se guardan en un gestor de secretos (1Password, Bitwarden) con el nombre del tenant claro.

### Migraciones de base de datos

El repo tiene scripts de migración (`migrations/*.js`). La secuencia es:

1. Extraer el schema actual de staging: `mysqldump --single-transaction --routines --triggers --no-data db_myprototipe > schema.sql`
2. Sanear: revisar `schema.sql` y quitar `CREATE DATABASE` / `USE` si los trae, y cualquier referencia a data.
3. Cargar en cada tenant:
   ```bash
   mysql -u wmford -p db_wankamotorsford < schema.sql
   mysql -u wmchev -p db_wankamotorschevrolet < schema.sql
   ```
4. Ejecutar migraciones de datos de seed (roles, catálogos) que el repo ya tenga como script.
5. Crear el usuario admin inicial con bcrypt hasheado.

---

## Sección 3 — Capa Chatwoot

### Modelo: 1 instancia, 3 accounts

Chatwoot soporta multi-tenant nativo a nivel de **account**. Se crean dos accounts nuevos en la instancia `os.app20.tech`, uno por centro. El aislamiento entre accounts es total: agentes, inboxes, teams, conversaciones, automation rules, todo está separado.

| Account ID | Nombre | Estado |
|------------|--------|--------|
| 1 | Staging (actual) | Existe — no se toca |
| **2** | **Wankamotors Ford** | Se crea primero |
| **3** | **Wankamotors Chevrolet** | Se crea la semana siguiente |

### Super Admin access token

El Super Admin actual de Chatwoot ve todos los accounts. Su token (`CHATWOOT_API_TOKEN` en el `.env.local` del CRM) sirve para los dos tenants — lo que cambia es el `CHATWOOT_ACCOUNT_ID` al que apunta cada CRM.

### Inboxes por account

Cada account tiene sus propios inboxes (uno por canal que el centro opere):

| Canal | Inbox en Ford (account 2) | Inbox en Chevrolet (account 3) |
|-------|---------------------------|--------------------------------|
| WhatsApp Cloud | inbox `id=X` (se define al crear) | inbox `id=Y` |
| Facebook Messenger | inbox `id=X` | inbox `id=Y` |
| Instagram DM | inbox `id=X` | inbox `id=Y` |

Los `inbox_id` NO se pueden predecir — los asigna Chatwoot secuencialmente. Se anotan después de crearlos en una tabla del runbook.

### Agentes y teams por account

**Teams (idénticos en los dos accounts):**
- `Ventas`
- `Taller`
- `Postventa`
- `Administración`

**Agente "API Bot" por account.** Cada account necesita un agente técnico dedicado (rol: agente, NO administrador) que va a ser el que use n8n para responder en nombre del bot. Así las respuestas del bot no quedan atribuidas a un humano y quedan auditables.

Usuarios humanos: los que defina el centro, mapeados a su team vía la tabla `roles_chatwoot_mapping` del CRM.

### Webhooks por account

**Decisión: webhooks a nivel ACCOUNT, no a nivel inbox.** Chatwoot permite configurar webhooks globales del account que se disparan para eventos de TODOS sus inboxes. Esto evita tener que configurar N webhooks (uno por inbox).

Cada account tiene **4 webhooks configurados:**

| URL | Propósito | Eventos |
|-----|-----------|---------|
| `https://n8n.../webhook/chatwoot-wa-<tenant>` | Entradas WhatsApp → router n8n WA | `message_created` |
| `https://n8n.../webhook/chatwoot-fb-<tenant>` | Entradas FB → router n8n FB | `message_created` |
| `https://n8n.../webhook/chatwoot-ig-<tenant>` | Entradas IG → router n8n IG | `message_created` |
| `https://<subdominio>/api/chatwoot/webhook` | Eventos al CRM (para SSE + auditoría) | `conversation_created`, `conversation_updated`, `conversation_status_changed`, `message_created` |

> **¿Por qué tres webhooks separados a n8n (uno por canal) y no uno solo?** Porque los routers actuales de n8n (los tres "Chatwoot: * IA Bot") están separados por canal. Cada uno filtra y despacha. Si se unifican, hay que refactorizar los flujos. Mantenerlos separados es la opción de menor riesgo para el primer deploy. (Opción de unificar queda en backlog).

### HMAC y secret handshake

Chatwoot firma cada webhook con HMAC-SHA256. La firma viaja en el header `X-Chatwoot-Signature`. El secreto se define al crear el webhook.

**El "triple secret handshake":**

1. **Chatwoot** (al configurar el webhook): se define el `HMAC secret`.
2. **n8n** (en el webhook node): se valida con el mismo secreto vía un Code node o Crypto node que recompute el HMAC y compare.
3. **CRM** (`/api/chatwoot/webhook`): lee `CHATWOOT_WEBHOOK_HMAC_SECRET` del `.env.local` y valida igual.

Los secretos son **distintos por account Y por endpoint**. Ford tiene un set, Chevrolet otro, y dentro de cada account cada webhook tiene su propio secret.

Además, el secreto `CONVERSATIONS_WEBHOOK_SECRET` del `.env.local` es el que n8n manda a `/api/chatwoot/alert` vía el header `x-conversations-webhook-secret`. Ese es OTRO secreto, también por tenant.

---

## Sección 4 — Capa n8n

### Workflows a duplicar (todos los activos por centro)

El análisis con el equipo de agentes confirmó que los 3 workflows "Chatwoot: * IA Bot" son **routers delgados** (9-11 nodos, sin MySQL, sin LLM) que despachan al **Bot Taller v14** (62 nodos, MySQL, Gemini) o al **Ventas IA** (gpt-4o, MySQL). Los legacy son los que ejecutan la lógica real.

**Regla:** se duplica TODO workflow de staging que esté activo o previsto activar en productivo. Como mínimo se conocen estos 7:

| # | Workflow original | ID actual | Duplicado Ford | Duplicado Chevrolet |
|---|-------------------|-----------|----------------|---------------------|
| 1 | Ventas IA - WhatsApp Agent | `zY7IprRjgHhBDaKe` | `Ventas IA - WA [FORD]` | `Ventas IA - WA [CHEV]` |
| 2 | Bot Taller v14 | `WM6smNJyz2tWkESx` | `Bot Taller v14 [FORD]` | `Bot Taller v14 [CHEV]` |
| 3 | Chatwoot: WhatsApp IA Bot | (ver en n8n) | `Chatwoot: WA IA Bot [FORD]` | `Chatwoot: WA IA Bot [CHEV]` |
| 4 | Chatwoot: Facebook IA Bot | (ver en n8n) | `Chatwoot: FB IA Bot [FORD]` | `Chatwoot: FB IA Bot [CHEV]` |
| 5 | Chatwoot: Instagram IA Bot | (ver en n8n) | `Chatwoot: IG IA Bot [FORD]` | `Chatwoot: IG IA Bot [CHEV]` |
| 6 | CRM Error Handler | `ZS6JPw1prX7rT0tG` | `CRM Error Handler [FORD]` | `CRM Error Handler [CHEV]` |
| 7 | Follow-up Automático | `oGq3xxVNhhu4MvI7` | `Follow-up [FORD]` | `Follow-up [CHEV]` |

El usuario mencionó ~10 workflows en total. En la Fase 7 del runbook, el primer paso es **listar TODOS los workflows de staging desde la UI de n8n** y ampliar la tabla arriba con los que falten. La regla es: si está en staging y va a operar en productivo, se duplica con los mismos 6 cambios por nodo (sección siguiente).

### Organización en n8n — tags y folders

n8n soporta **tags** en workflows (no folders de filesystem, pero sí "project folders" en la UI). Estrategia:

- **Tag por tenant:** `staging`, `ford`, `chevrolet`
- **Naming convention:** todos los workflows duplicados llevan el sufijo `[FORD]` o `[CHEV]` en el nombre (ya en la tabla)
- **Credenciales:** se crean credenciales separadas por tenant (ver abajo)

### Cambios por nodo al duplicar (checklist)

Cada workflow duplicado requiere **6 cambios mínimos** por recorrida:

1. **MySQL nodes** → cambiar credencial a la del tenant (`MySQL - Ford` o `MySQL - Chevrolet`)
2. **HTTP Request nodes que llaman al CRM** → cambiar URL de `https://crm.app20.tech/...` a `https://wankamotorsford.onesolution.website/...` o `https://wankamotorschevrolet.onesolution.website/...`
3. **HTTP Request nodes que llaman a Chatwoot API** → cambiar el `account_id` en la URL (`/api/v1/accounts/2/...` o `/3/...`)
4. **Webhook nodes (triggers)** → cambiar path a uno único por tenant (`chatwoot-wa-ford` vs `chatwoot-wa-chev`)
5. **Credentials de WhatsApp / Meta** → usar la credencial del tenant (`WhatsApp - Ford`, `Facebook - Ford`, `Instagram - Ford`)
6. **Headers con secretos** (`x-conversations-webhook-secret`, HMAC verification) → usar el secreto del tenant

**Crítico en duplicados de Bot Taller v14 y Ventas IA:** estos flujos tienen nodos `Send WA Reply` que hablan directo al Graph API de Meta con un token. El sistema actual además tiene un webhook Meta → n8n directo (antes de Chatwoot). En los duplicados hay que **desactivar ese webhook Meta directo** para evitar doble-respuesta: Meta manda el mensaje a Chatwoot, Chatwoot lo despacha vía webhook al router `Chatwoot: * IA Bot`, y ESE es el que arranca la cadena. Si Meta también llama al webhook viejo, el flujo se ejecuta dos veces.

### n8n Variables — configuración por tenant

Para evitar tocar cada nodo cada vez que cambia una URL o un secret, se centralizan en **n8n Variables** (Settings → Variables):

| Variable | Valor Ford | Valor Chevrolet |
|----------|------------|-----------------|
| `CRM_BASE_URL_FORD` | `https://wankamotorsford.onesolution.website` | — |
| `CRM_BASE_URL_CHEV` | — | `https://wankamotorschevrolet.onesolution.website` |
| `CRM_WEBHOOK_SECRET_FORD` | `<secret>` | — |
| `CRM_WEBHOOK_SECRET_CHEV` | — | `<secret>` |
| `CHATWOOT_ACCOUNT_ID_FORD` | `2` | — |
| `CHATWOOT_ACCOUNT_ID_CHEV` | — | `3` |
| `ALERT_WEBHOOK_URL_FORD` | `https://wankamotorsford.../api/chatwoot/alert` | — |
| `ALERT_WEBHOOK_URL_CHEV` | — | `https://wankamotorschevrolet.../api/chatwoot/alert` |

En los nodos se referencian con `{{ $vars.CRM_BASE_URL_FORD }}`. Así, si mañana cambia el dominio, se cambia UNA variable y todos los flujos del tenant se actualizan.

### Credenciales por tenant

En n8n (Credentials):

| Credencial | Ford | Chevrolet |
|------------|------|-----------|
| MySQL | `MySQL - Ford` (host, user, pass, db_wankamotorsford, **multipleStatements: true**) | `MySQL - Chev` (idem con db_wankamotorschevrolet) |
| WhatsApp Cloud (token) | `WA - Ford` | `WA - Chev` |
| Facebook Pages | `FB - Ford` | `FB - Chev` |
| Instagram | `IG - Ford` | `IG - Chev` |
| Chatwoot API | `Chatwoot API - Ford (acct 2)` | `Chatwoot API - Chev (acct 3)` |

**Credenciales compartidas (no se duplican):**
- OpenAI (gpt-4o para Ventas IA)
- Gemini (para Bot Taller v14)

El motivo: son credenciales de proveedores de LLM, pagas por consumo en UNA cuenta, y los flujos de distintos tenants pueden compartirlas sin problemas.

### Acceso MySQL desde n8n al droplet productivo

n8n está en `64.23.235.153` y MySQL productivo está en el droplet de Ford/Chev (IP distinta). Hay que permitir acceso remoto.

**Opción elegida: bind a IP específica + firewall restrictivo.**

1. En `/etc/mysql/mysql.conf.d/mysqld.cnf`:
   ```ini
   bind-address = 0.0.0.0
   ```
2. Crear usuarios con acceso desde la IP de n8n:
   ```sql
   CREATE USER 'wmford'@'64.23.235.153' IDENTIFIED BY '<pass>';
   GRANT ALL PRIVILEGES ON db_wankamotorsford.* TO 'wmford'@'64.23.235.153';

   CREATE USER 'wmford'@'127.0.0.1' IDENTIFIED BY '<pass>';
   GRANT ALL PRIVILEGES ON db_wankamotorsford.* TO 'wmford'@'127.0.0.1';

   FLUSH PRIVILEGES;
   ```
   (Idem para `wmchev`. El CRM usa `@'127.0.0.1'` local, n8n usa `@'64.23.235.153'`.)
3. En UFW del droplet productivo:
   ```bash
   ufw allow from 64.23.235.153 to any port 3306
   ufw deny 3306
   ```

Rechazado: SSH tunnel persistente — mayor complejidad operativa, un punto de falla más.

---

## Sección 5 — Capa Meta (WhatsApp + Facebook + Instagram)

### Estructura en Meta Business Manager

Cada centro necesita:

1. **Business Portfolio** propio (en `business.facebook.com`). Si Wankamotors ya tiene UNO general, se pueden crear dos portfolios hijos o mantener uno por centro — la recomendación es **dos portfolios hijos**, uno por centro, para aislar permisos y facturación.
2. **WhatsApp Business Account (WABA)** propia, dentro del portfolio del centro.
3. **Número de WhatsApp verificado** dentro de esa WABA.
4. **Página de Facebook** propia.
5. **Cuenta de Instagram** vinculada a la página de FB del centro.
6. **System User** dentro del portfolio, con permisos sobre la WABA, la página de FB y la cuenta de IG del centro. El System User genera el **token permanente** (no expira) que usan Chatwoot y n8n.

### Estado actual

| Recurso | Ford | Chevrolet |
|---------|------|-----------|
| Business Portfolio | Existe (asignado) | Pendiente (la semana siguiente) |
| WABA + número | Existe | Pendiente |
| Página de Facebook | Existe | Pendiente |
| Cuenta de Instagram | (verificar si ya está vinculada) | Pendiente |

Por eso el rollout arranca con Ford.

### Tokens permanentes

Para cada System User:

1. `business.facebook.com` → Users → System Users → Add
2. Asignar permisos: WABA (full control), Pages (full control), Instagram (messaging)
3. Generate token → seleccionar los scopes:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
   - `pages_messaging`
   - `instagram_basic`
   - `instagram_manage_messages`
4. Copiar el token — no vence, pero se guarda como secreto en el gestor.

> **Gotcha conocido:** en el staging actual, Messenger tira "no se puede enviar" por faltar el scope `pages_messaging` en el token. En Ford/Chevrolet se verifica este scope desde el día 1 para no repetir el bug.

### WhatsApp templates

Meta exige que cualquier mensaje **fuera de la ventana de 24 horas** (desde el último mensaje entrante del cliente) sea un **template pre-aprobado**. Dentro de la ventana, mensajes de texto libres son válidos.

**Cómo se crean:**
- En Meta Business Manager → WhatsApp → Templates → Create
- Se define texto + categoría (UTILITY / MARKETING / AUTHENTICATION)
- Meta lo revisa (minutos a días) y queda aprobado o rechazado
- Una vez aprobado, aparece automáticamente en Chatwoot (no se configura nada del lado Chatwoot)
- n8n / CRM los llama vía la API de Chatwoot usando el `template_name` aprobado

**Políticas actuales (20 abril 2026):**
- Template de prueba: 1 template genérico aprobado (ya existe)
- Prioridad inicial: que los mensajes **dentro de la ventana** funcionen. Los flujos de fuera-de-ventana y campañas masivas (envíos masivos) son **backlog** — quedan para iteración siguiente.

**Costos (Perú, referencia):** UTILITY ~$0.004 USD, MARKETING ~$0.025 USD, AUTHENTICATION ~$0.015 USD por conversación de 24h. Se factura por la cuenta Meta asociada al WABA de cada centro (aislado por portfolio).

### Meta webhooks directos vs Chatwoot

**IMPORTANTE:** con Chatwoot en el medio, Meta manda webhooks a **Chatwoot**, no directamente a n8n. El webhook URL que Meta tiene configurado por WABA es el que provee Chatwoot al crear el inbox de WhatsApp:

```
https://os.app20.tech/webhooks/whatsapp/<phone_number>
```

Por eso los duplicados `Bot Taller v14 [FORD]` y `Ventas IA [FORD]` **no deben tener activo el webhook directo de Meta** (el que usan los originales de staging). El trigger correcto de los duplicados es el `Chatwoot: * IA Bot [FORD]` que los despacha. Sino, cada mensaje se procesa dos veces.

---

## Sección 6 — Runbook de implementación (11 fases)

El orden está pensado para **Ford primero** y después repetir para Chevrolet. Cada fase tiene criterios de "hecho" antes de avanzar.

### Fase 0 — Pre-requisitos

- [ ] Acceso root al droplet productivo (donde van Ford y Chevrolet)
- [ ] Acceso al panel DNS (Cloudflare / provider de `onesolution.website`)
- [ ] Acceso al Super Admin de Chatwoot (`os.app20.tech`)
- [ ] Acceso al admin de n8n (`64.23.235.153`)
- [ ] Acceso al Business Portfolio de Ford en Meta
- [ ] Secretos generados (JWT, DB pass, webhook secrets) — guardados en gestor
- [ ] Repo `AutomotrizProjectother` en estado estable (main buildando)

### Fase 1 — Provisioning del droplet productivo

- [ ] DNS: apuntar `wankamotorsford.onesolution.website` al IP del droplet productivo (A record)
- [ ] `certbot --nginx -d wankamotorsford.onesolution.website`
- [ ] nginx vhost de Ford creado y reloaded
- [ ] Directorio `/var/www/crm-ford` creado con permisos correctos
- [ ] `git clone <repo> /var/www/crm-ford` en branch `main`
- [ ] `npm install` en `/var/www/crm-ford`

**Hecho:** `curl https://wankamotorsford.onesolution.website` devuelve un 502 (normal — aún sin proceso Node).

### Fase 2 — MySQL: schema y usuarios

- [ ] En el **droplet de staging**: `mysqldump --single-transaction --routines --triggers --no-data db_myprototipe > /tmp/schema.sql`
- [ ] `scp /tmp/schema.sql root@<ip-droplet-productivo>:/tmp/schema.sql`
- [ ] Revisar `schema.sql` (no tiene `CREATE DATABASE` ni `USE`)
- [ ] En el **droplet productivo**: `mysql -u root -p db_wankamotorsford < /tmp/schema.sql`
- [ ] `CREATE USER 'wmford'@'127.0.0.1'` + `GRANT` sobre `db_wankamotorsford`
- [ ] `CREATE USER 'wmford'@'64.23.235.153'` + mismo GRANT
- [ ] `bind-address = 0.0.0.0` en MySQL + `systemctl restart mysql`
- [ ] `ufw allow from 64.23.235.153 to any port 3306` + `ufw deny 3306`
- [ ] Seed de roles + admin inicial (script del repo o insert manual)

**Hecho:** desde el droplet de n8n, `mysql -h <ip-droplet-productivo> -u wmford -p` conecta y lista las tablas de `db_wankamotorsford`.

### Fase 3 — CRM Ford: build y arranque

- [ ] Crear `/var/www/crm-ford/.env.local` con tabla completa de variables (sección 2)
- [ ] `npm run build` en `/var/www/crm-ford` (debe terminar sin errores)
- [ ] Crear `ecosystem.config.cjs` según template (sección 2)
- [ ] `pm2 start ecosystem.config.cjs`
- [ ] `pm2 save`
- [ ] `pm2 logs crm-ford` — verificar que arranca en puerto 3000

**Hecho:** `curl https://wankamotorsford.onesolution.website` devuelve la home del CRM. Login con el admin seed funciona.

### Fase 4 — Chatwoot account Ford

- [ ] Crear account `Wankamotors Ford` en Chatwoot (Super Admin → Accounts → Create)
- [ ] Anotar `account_id` asignado (debería ser 2) → actualizar `.env.local` de Ford si hace falta
- [ ] Restart PM2 `crm-ford` (`--update-env`)
- [ ] Crear teams: Ventas, Taller, Postventa, Administración
- [ ] Crear agente **API Bot** (rol: agente). Anotar su `agent_id`
- [ ] Crear agentes humanos iniciales (los que defina el centro)
- [ ] Poblar `roles_chatwoot_mapping` en `db_wankamotorsford` (role_id → team_id)

**Hecho:** el CRM de Ford abre `/mensajes` y muestra la bandeja vacía sin errores en consola.

### Fase 5 — Meta Business: Ford

- [ ] Verificar que el Business Portfolio de Ford esté activo
- [ ] Crear System User dentro del portfolio (si no existe)
- [ ] Asignar permisos: WABA, Página FB, IG
- [ ] Generar token permanente con los 5 scopes (sección 5)
- [ ] Guardar token en el gestor de secretos

**Hecho:** el token permanente generado puede hacer `GET /me` al Graph API y devuelve el System User.

### Fase 6 — Inboxes Chatwoot + conexión con Meta (Ford)

- [ ] En Chatwoot account Ford, crear inbox WhatsApp → método Cloud API → pegar el token permanente + phone_number_id
- [ ] Chatwoot configura automáticamente el webhook en Meta (hacia `https://os.app20.tech/webhooks/whatsapp/...`)
- [ ] Anotar `inbox_id` del inbox WhatsApp
- [ ] Repetir para Facebook Messenger (OAuth o token manual) → anotar `inbox_id`
- [ ] Repetir para Instagram → anotar `inbox_id`
- [ ] Asignar los 3 inboxes al team `Ventas` (default)
- [ ] Asignar el agente "API Bot" a los 3 inboxes

**Hecho:** enviar un mensaje de prueba desde un celular al número de WhatsApp de Ford llega a la bandeja de Chatwoot account 2.

### Fase 7 — n8n: duplicación de workflows (Ford)

- [ ] **Paso 0:** listar TODOS los workflows activos de staging en la UI de n8n y completar la tabla de la sección 4 con los que no estuvieran listados (se conocen 7, el usuario mencionó ~10 total).

Para cada workflow de la tabla final:

- [ ] Clonar el workflow original en n8n (Duplicate)
- [ ] Renombrar con sufijo `[FORD]`
- [ ] Aplicar tag `ford`
- [ ] Aplicar los **6 cambios por nodo** (sección 4):
  - [ ] Credencial MySQL → `MySQL - Ford`
  - [ ] URLs al CRM → `wankamotorsford.onesolution.website`
  - [ ] `account_id` en URLs de Chatwoot API → `2`
  - [ ] Webhook paths únicos (`chatwoot-wa-ford`, etc.)
  - [ ] Credenciales Meta → `WA - Ford`, `FB - Ford`, `IG - Ford`
  - [ ] Headers con secretos → usar valores Ford
- [ ] Para `Bot Taller v14 [FORD]` y `Ventas IA [FORD]`: **desactivar webhook Meta directo** (dejar solo el trigger desde el router Chatwoot)
- [ ] Crear las n8n Variables de Ford (sección 4)
- [ ] Crear las credenciales `MySQL - Ford`, `WA - Ford`, `FB - Ford`, `IG - Ford`, `Chatwoot API - Ford`
- [ ] Activar los 9 workflows `[FORD]`

**Hecho:** todos los workflows de Ford están activos en n8n, con tag `ford`, y `n8n execution log` los lista separados de los de staging.

### Fase 8 — Webhooks Chatwoot → n8n y → CRM (Ford)

En Chatwoot account Ford, configurar los **4 webhooks del account**:

- [ ] `https://n8n.../webhook/chatwoot-wa-ford` (evento: `message_created`)
- [ ] `https://n8n.../webhook/chatwoot-fb-ford` (evento: `message_created`)
- [ ] `https://n8n.../webhook/chatwoot-ig-ford` (evento: `message_created`)
- [ ] `https://wankamotorsford.../api/chatwoot/webhook` (eventos: conversation_created, conversation_updated, conversation_status_changed, message_created) — **con HMAC secret**
- [ ] Copiar el HMAC secret del webhook al CRM a `.env.local` de Ford como `CHATWOOT_WEBHOOK_HMAC_SECRET`
- [ ] `pm2 restart crm-ford --update-env`

**Hecho:** enviar un mensaje de prueba dispara todos los webhooks (visible en `pm2 logs` del CRM y en el execution log de los 3 workflows de n8n).

### Fase 9 — Testing de integración Ford

10 casos de prueba end-to-end:

| # | Caso | Hecho cuando |
|---|------|--------------|
| 1 | Cliente nuevo WhatsApp → primer mensaje | Chatwoot crea conversación; CRM la ve vía SSE en `/mensajes` |
| 2 | Cliente existente WhatsApp → mensaje | Bot Taller o Ventas IA (según routing) responde |
| 3 | Router decide `new_client_menu` | Bot manda menú WA de 2 opciones |
| 4 | Router decide `ventas_ia` | Ventas IA responde con gpt-4o |
| 5 | Router decide `default` (taller) | Bot Taller responde con Gemini |
| 6 | Mensaje FB desde página Ford | Llega a inbox FB de account 2; router FB despacha |
| 7 | Mensaje IG desde cuenta Ford | Idem para IG |
| 8 | Agente humano en Chatwoot manda mensaje | `/api/chatwoot/conversations/[id]/messages` POST funciona |
| 9 | Agente asigna conversación a team Taller | Asignación viaja a Chatwoot y SSE refresca |
| 10 | Bot dispara `Enviar_Alerta` (test_drive) | `POST /api/chatwoot/alert` llega al CRM con secret correcto; NotificationPanel muestra el alert |

**Hecho:** los 10 casos pasan. No hay errores en `pm2 logs`, no hay double-reply (mismo mensaje no se procesa 2 veces).

### Fase 10 — GO LIVE Ford

- [ ] Compartir URL `wankamotorsford.onesolution.website` con usuarios del centro
- [ ] Crear usuarios reales vía `/usuarios` (admin)
- [ ] Mapear cada usuario CRM a su agente Chatwoot (tabla `usuarios.chatwoot_agent_id`)
- [ ] Documentar credenciales iniciales en el gestor
- [ ] Capacitar a los agentes humanos (sesión corta: login, bandeja, asignación, plantillas WA)
- [ ] Monitorear 48 horas (CPU, RAM, errores en logs, tiempos de respuesta del bot)

**Hecho:** Ford operando en producción.

### Fase 11 — Repetir 1-10 para Chevrolet

Se replica todo el runbook:

- Nuevo subdominio (Cloudflare + certbot)
- `/var/www/crm-chevrolet` (puerto 3001)
- MySQL user `wmchev` + usuario `@64.23.235.153`
- Chatwoot account 3 + inboxes + teams + API Bot
- Meta portfolio Chevrolet → WABA + páginas + System User
- 9 workflows `[CHEV]` en n8n con variables y credenciales propias
- 4 webhooks del account 3
- 10 casos de prueba
- Go live

**Hecho:** Chevrolet operando en producción junto a Ford, con aislamiento total.

---

## Apéndices

### A. Checklist de "qué cambiar por tenant" (resumen)

| Dimensión | Ford | Chevrolet |
|-----------|------|-----------|
| Subdominio CRM | `wankamotorsford.onesolution.website` | `wankamotorschevrolet.onesolution.website` |
| Puerto Node | 3000 | 3001 |
| Nombre PM2 | `crm-ford` | `crm-chevrolet` |
| Directorio | `/var/www/crm-ford` | `/var/www/crm-chevrolet` |
| DB | `db_wankamotorsford` | `db_wankamotorschevrolet` |
| DB user | `wmford` | `wmchev` |
| Chatwoot account ID | 2 | 3 |
| Tag n8n | `ford` | `chevrolet` |
| Sufijo workflows | `[FORD]` | `[CHEV]` |
| Credenciales MySQL n8n | `MySQL - Ford` | `MySQL - Chev` |
| Credenciales Meta n8n | `WA - Ford`, `FB - Ford`, `IG - Ford` | `WA - Chev`, `FB - Chev`, `IG - Chev` |
| Meta Business Portfolio | Ford | Chevrolet |
| WABA | Ford | Chevrolet |
| Página FB | Ford | Chevrolet |
| Cuenta IG | Ford | Chevrolet |

### B. Secretos a generar (por tenant)

```bash
# Ford
JWT_SECRET_FORD=$(openssl rand -hex 32)
DB_PASS_FORD=$(openssl rand -base64 18)
WEBHOOK_SECRET_FORD=$(openssl rand -hex 16)
HMAC_SECRET_FORD_CRM=$(openssl rand -hex 16)
HMAC_SECRET_FORD_WA=$(openssl rand -hex 16)
HMAC_SECRET_FORD_FB=$(openssl rand -hex 16)
HMAC_SECRET_FORD_IG=$(openssl rand -hex 16)

# Chevrolet — idem
```

### C. Backlog explícito (fuera de scope de este diseño)

- Unificar los 3 routers `Chatwoot: WA/FB/IG IA Bot` en un solo flujo multi-canal
- Migrar envíos masivos a WhatsApp Templates (bug conocido: mensajes fuera de ventana 24h son silenciosamente rechazados por Meta)
- Audio recording + message signature en el composer del CRM
- Extraer `getAuthToken()` y `channelFromInbox()` a `lib/chatwootUtils.js`
- Refactor de staging a multi-tenant verdadero (opcional, si aparece un 4to centro)

### D. Riesgos conocidos

| Riesgo | Mitigación |
|--------|------------|
| Duplicar workflows mal y procesar mensajes 2 veces | Fase 7 checklist + desactivación explícita de webhook Meta directo en duplicados de v14 y Ventas IA |
| Confundir account_id 2 vs 3 al configurar webhooks | Tabla de Apéndice A como fuente única + anotar IDs reales en Fase 4 antes de avanzar |
| Secretos HMAC desincronizados entre Chatwoot, n8n y CRM | Fase 8 explicita el handshake; test case #10 valida end-to-end |
| Acceso remoto a MySQL abierto a internet | `bind-address 0.0.0.0` + UFW con `allow from <ip-n8n>` + `deny 3306` (no queda público) |
| Scope `pages_messaging` faltante en token Ford (bug conocido) | Fase 5 exige los 5 scopes; verificar antes de crear inbox FB |
| Cambio de dominio futuro rompe N nodos de n8n | n8n Variables centralizadas — 1 cambio de variable, todos los flujos actualizados |
| CRLF en `.env.local` (Windows → VPS) causa ENOTFOUND en DB | Generar `.env.local` directo en el droplet con `nano`, no copiar desde Windows |

---

## Aprobación

Diseño presentado y validado en sesión de brainstorming. Listo para pasar a **writing-plans** y armar el plan de tareas de implementación.
