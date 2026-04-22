# Plan de implementación — Multi-tenant Ford/Chevrolet Wankamotors

> **Para workers agénticos:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan sintaxis checkbox (`- [ ]`) para tracking.

**Goal:** Levantar dos instancias productivas del CRM Wankamotors (Ford y Chevrolet) replicando staging, cada una con su propia cuenta Chatwoot, sus flujos n8n duplicados y sus Business Assets de Meta — Ford primero, Chevrolet la semana siguiente.

**Architecture:** Multi-tenancy por deployment (no por código). El mismo codebase corre en dos carpetas distintas del droplet productivo con `.env.local` separados. Chatwoot es una instancia única con accounts separados. n8n es una instancia única con workflows duplicados por tenant. Ford y Chevrolet comparten droplet productivo; staging queda en su droplet aparte.

**Tech Stack:** Next.js 16.1.6, React 19, MySQL 8, PM2, nginx + Let's Encrypt (certbot), Chatwoot self-hosted, n8n, Meta Business (WhatsApp Cloud API + FB + IG), Ubuntu 22.04.

**Spec de referencia:** `docs/superpowers/specs/2026-04-21-multi-tenant-ford-chevrolet-design.md`

---

## Estructura de archivos y artefactos

### En el droplet productivo (nuevo o el que se asigne)

```
/var/www/
├── crm-ford/                         ← nuevo (Fase 1-3)
│   ├── .env.local                    ← nuevo (Fase 3)
│   └── ecosystem.config.cjs          ← nuevo (Fase 3)
└── crm-chevrolet/                    ← nuevo (Fase 11, replica de Ford)
    ├── .env.local
    └── ecosystem.config.cjs

/etc/nginx/sites-available/
├── wankamotorsford                   ← nuevo (Fase 1)
└── wankamotorschevrolet              ← nuevo (Fase 11)

/etc/nginx/sites-enabled/
├── wankamotorsford -> ../sites-available/wankamotorsford
└── wankamotorschevrolet -> ../sites-available/wankamotorschevrolet

/etc/letsencrypt/live/
├── wankamotorsford.onesolution.website/
└── wankamotorschevrolet.onesolution.website/

/etc/mysql/mysql.conf.d/mysqld.cnf   ← modificar bind-address (Fase 2)
```

### En Chatwoot (`os.app20.tech`)

- Account 2 `Wankamotors Ford` (Fase 4)
- Account 3 `Wankamotors Chevrolet` (Fase 11)

### En n8n (`64.23.235.153`)

- Credenciales `MySQL - Ford`, `WA - Ford`, `FB - Ford`, `IG - Ford`, `Chatwoot API - Ford` (Fase 8)
- Variables `CRM_BASE_URL_FORD`, `CRM_WEBHOOK_SECRET_FORD`, `CHATWOOT_ACCOUNT_ID_FORD`, `ALERT_WEBHOOK_URL_FORD` (Fase 8)
- 7+ workflows duplicados con sufijo `[FORD]` y tag `ford` (Fase 9)
- Idem para Chevrolet (Fase 11)

### En Meta Business Manager

- System User + token permanente Ford (Fase 6)
- System User + token permanente Chevrolet (Fase 11)

### Repo del proyecto (no se toca código de app)

Todas las tareas son de infra, configuración y operación. No se edita código fuente del CRM en este plan. El único cambio al repo es agregar este plan a `docs/superpowers/plans/`.

---

## Generación de secretos (referencia)

Antes de empezar, generar TODOS los secretos de Ford y guardarlos en el gestor de contraseñas con etiquetas claras (`WKM-Ford-*`). Los comandos:

```bash
# JWT secret (64 chars hex)
openssl rand -hex 32

# DB password (24 chars base64)
openssl rand -base64 18

# Webhook secrets (32 chars hex)
openssl rand -hex 16
```

Lista de secretos a generar por tenant:

| Etiqueta en gestor | Comando |
|--------------------|---------|
| `WKM-Ford-JWT_SECRET` | `openssl rand -hex 32` |
| `WKM-Ford-DB_PASS` | `openssl rand -base64 18` |
| `WKM-Ford-CONVERSATIONS_WEBHOOK_SECRET` | `openssl rand -hex 16` |
| `WKM-Ford-CHATWOOT_WEBHOOK_HMAC_CRM` | `openssl rand -hex 16` |
| `WKM-Ford-CHATWOOT_WEBHOOK_HMAC_N8N_WA` | `openssl rand -hex 16` |
| `WKM-Ford-CHATWOOT_WEBHOOK_HMAC_N8N_FB` | `openssl rand -hex 16` |
| `WKM-Ford-CHATWOOT_WEBHOOK_HMAC_N8N_IG` | `openssl rand -hex 16` |

---

## FASE 0 — Pre-requisitos y accesos

### Tarea 0.1: Verificar accesos

**Ubicación:** checklist previo, sin ejecución.

- [ ] **Paso 1: Verificar acceso SSH al droplet productivo**

```bash
ssh root@<IP-DROPLET-PRODUCTIVO>
```

Expected: prompt de shell `root@hostname:~#`. Si pide password, usar el del gestor.

- [ ] **Paso 2: Verificar acceso al panel DNS**

Abrir Cloudflare (o provider de `onesolution.website`) → confirmar que aparece la zona `onesolution.website` y se pueden crear A records.

- [ ] **Paso 3: Verificar acceso Super Admin a Chatwoot**

Abrir `https://os.app20.tech/super_admin` → login con credenciales de Super Admin. Expected: ver listado de accounts (incluye account 1 "Staging").

- [ ] **Paso 4: Verificar acceso admin a n8n**

Abrir `https://<url-n8n>` (o `http://64.23.235.153:5678` si es HTTP) → login. Expected: ver lista de workflows incluidos `Bot Taller v14`, `Ventas IA - WhatsApp Agent`, `Chatwoot: WhatsApp IA Bot`.

- [ ] **Paso 5: Verificar acceso al Business Portfolio de Ford en Meta**

Abrir `https://business.facebook.com` → seleccionar Business Portfolio de Ford Wankamotors. Expected: ver el WABA asignado + número de WhatsApp verificado + página de Facebook + cuenta de Instagram.

### Tarea 0.2: Generar y guardar secretos de Ford

- [ ] **Paso 1: Abrir el gestor de contraseñas** (1Password, Bitwarden) y crear la sección `Wankamotors Ford`.

- [ ] **Paso 2: Generar los 7 secretos y guardar cada uno con su etiqueta**

```bash
# Ejecutar localmente o en el droplet
echo "JWT_SECRET:" && openssl rand -hex 32
echo "DB_PASS:" && openssl rand -base64 18
echo "CONVERSATIONS_WEBHOOK_SECRET:" && openssl rand -hex 16
echo "CHATWOOT_WEBHOOK_HMAC_CRM:" && openssl rand -hex 16
echo "CHATWOOT_WEBHOOK_HMAC_N8N_WA:" && openssl rand -hex 16
echo "CHATWOOT_WEBHOOK_HMAC_N8N_FB:" && openssl rand -hex 16
echo "CHATWOOT_WEBHOOK_HMAC_N8N_IG:" && openssl rand -hex 16
```

Expected: 7 strings aleatorias. Copiar CADA UNO al gestor con su etiqueta `WKM-Ford-*`. No dejar en texto plano en ningún archivo local.

- [ ] **Paso 3: Verificar que los 7 secretos están guardados**

Buscar en el gestor por `WKM-Ford-` → contar 7 entradas.

---

## FASE 1 — Provisioning del droplet productivo (Ford)

### Tarea 1.1: Crear el A record DNS para Ford

**Ubicación:** panel DNS de Cloudflare (o provider).

- [ ] **Paso 1: Crear A record**

| Campo | Valor |
|-------|-------|
| Type | A |
| Name | `wankamotorsford` |
| IPv4 address | `<IP-DROPLET-PRODUCTIVO>` |
| Proxy status | DNS only (gris, no proxy naranja) |
| TTL | Auto |

- [ ] **Paso 2: Verificar propagación**

```bash
dig +short wankamotorsford.onesolution.website
```

Expected: devuelve `<IP-DROPLET-PRODUCTIVO>`. Si no, esperar 2-5 minutos y reintentar.

### Tarea 1.2: Generar certificado SSL con certbot

**Ubicación:** droplet productivo, como root.

- [ ] **Paso 1: Verificar que certbot está instalado**

```bash
certbot --version
```

Expected: `certbot 1.x.x` o superior. Si no está, instalar: `apt install -y certbot python3-certbot-nginx`

- [ ] **Paso 2: Pedir el certificado**

```bash
certbot --nginx -d wankamotorsford.onesolution.website \
  --agree-tos --email <email-admin> --non-interactive --redirect
```

Expected: output `Successfully received certificate` y certificado en `/etc/letsencrypt/live/wankamotorsford.onesolution.website/fullchain.pem`.

- [ ] **Paso 3: Verificar auto-renewal**

```bash
certbot renew --dry-run
```

Expected: `Congratulations, all simulated renewals succeeded`.

### Tarea 1.3: Crear vhost nginx para Ford

**Archivos:**
- Create: `/etc/nginx/sites-available/wankamotorsford`

- [ ] **Paso 1: Escribir el vhost**

Contenido completo de `/etc/nginx/sites-available/wankamotorsford`:

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
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SSE — timeout largo para el endpoint Chatwoot SSE
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

- [ ] **Paso 2: Habilitar el vhost**

```bash
ln -s /etc/nginx/sites-available/wankamotorsford /etc/nginx/sites-enabled/wankamotorsford
```

- [ ] **Paso 3: Validar sintaxis y recargar**

```bash
nginx -t && systemctl reload nginx
```

Expected: `syntax is ok` + `test is successful` + recarga sin errores.

- [ ] **Paso 4: Verificar respuesta (aún sin backend)**

```bash
curl -I https://wankamotorsford.onesolution.website
```

Expected: `502 Bad Gateway` (correcto — aún no hay proceso Node escuchando en 3000).

### Tarea 1.4: Clonar el repo en `/var/www/crm-ford`

- [ ] **Paso 1: Crear directorio y asignar ownership**

```bash
mkdir -p /var/www/crm-ford
chown -R root:root /var/www/crm-ford
```

- [ ] **Paso 2: Clonar el repo**

```bash
cd /var/www
git clone <URL-REPO> crm-ford
cd crm-ford
git checkout main
git pull
```

Expected: branch `main`, working tree limpio (`git status` muestra "nothing to commit").

- [ ] **Paso 3: Instalar dependencias**

```bash
cd /var/www/crm-ford
npm install
```

Expected: `added N packages` sin errores críticos. Warnings de peer deps son aceptables.

- [ ] **Paso 4: Commit de checkpoint (NO aplica — no se tocó el repo)**

Esta tarea no genera commit. El repo en el droplet solo refleja `main`.

---

## FASE 2 — MySQL: schema y usuarios (Ford)

### Tarea 2.1: Extraer schema de staging

**Ubicación:** droplet de staging.

- [ ] **Paso 1: Conectarse al droplet de staging**

```bash
ssh root@<IP-DROPLET-STAGING>
```

- [ ] **Paso 2: Generar el dump del schema**

```bash
mysqldump --single-transaction --routines --triggers --no-data \
  -u root -p db_myprototipe > /tmp/schema.sql
```

Expected: archivo `/tmp/schema.sql` generado. Tamaño esperado: 50-500 KB.

- [ ] **Paso 3: Verificar el dump**

```bash
head -30 /tmp/schema.sql
wc -l /tmp/schema.sql
```

Expected: empieza con `-- MySQL dump` y contiene `CREATE TABLE` statements. Líneas > 100.

- [ ] **Paso 4: Confirmar que NO trae `CREATE DATABASE` ni `USE`**

```bash
grep -E "CREATE DATABASE|^USE " /tmp/schema.sql
```

Expected: sin output (vacío). Si aparece algo, editar el archivo y eliminar esas líneas.

### Tarea 2.2: Transferir el schema al droplet productivo

- [ ] **Paso 1: Transferir con scp**

```bash
# Desde el droplet de staging:
scp /tmp/schema.sql root@<IP-DROPLET-PRODUCTIVO>:/tmp/schema.sql
```

Expected: `schema.sql 100% ... KB/s` sin errores.

- [ ] **Paso 2: Verificar que llegó**

```bash
ssh root@<IP-DROPLET-PRODUCTIVO> "ls -la /tmp/schema.sql && wc -l /tmp/schema.sql"
```

Expected: mismo tamaño y líneas que el origen.

### Tarea 2.3: Cargar schema en `db_wankamotorsford`

**Ubicación:** droplet productivo.

- [ ] **Paso 1: Confirmar que la DB existe y está vacía**

```bash
mysql -u root -p -e "SHOW DATABASES LIKE 'db_wankamotorsford'; USE db_wankamotorsford; SHOW TABLES;"
```

Expected: la DB existe, `SHOW TABLES` devuelve `Empty set`.

- [ ] **Paso 2: Cargar el schema**

```bash
mysql -u root -p db_wankamotorsford < /tmp/schema.sql
```

Expected: sin errores.

- [ ] **Paso 3: Verificar tablas creadas**

```bash
mysql -u root -p -e "USE db_wankamotorsford; SHOW TABLES;" | wc -l
```

Expected: número de tablas igual al de staging. Para saber cuántas tiene staging: correr lo mismo contra `db_myprototipe` en el droplet de staging y comparar.

### Tarea 2.4: Crear usuarios MySQL para Ford

- [ ] **Paso 1: Crear usuario local `wmford@127.0.0.1`**

```bash
# Pegar contraseña desde gestor: WKM-Ford-DB_PASS
mysql -u root -p <<'EOF'
CREATE USER 'wmford'@'127.0.0.1' IDENTIFIED BY '<WKM-Ford-DB_PASS>';
GRANT ALL PRIVILEGES ON db_wankamotorsford.* TO 'wmford'@'127.0.0.1';
FLUSH PRIVILEGES;
EOF
```

Expected: `Query OK` tres veces.

- [ ] **Paso 2: Crear usuario remoto `wmford@64.23.235.153` (IP de n8n)**

```bash
mysql -u root -p <<'EOF'
CREATE USER 'wmford'@'64.23.235.153' IDENTIFIED BY '<WKM-Ford-DB_PASS>';
GRANT ALL PRIVILEGES ON db_wankamotorsford.* TO 'wmford'@'64.23.235.153';
FLUSH PRIVILEGES;
EOF
```

Expected: `Query OK` tres veces.

- [ ] **Paso 3: Verificar login local**

```bash
mysql -u wmford -p -h 127.0.0.1 db_wankamotorsford -e "SELECT 1;"
```

Expected: `1` devuelto. Si falla con `Access denied`, revisar password.

### Tarea 2.5: Abrir MySQL a red + firewall

- [ ] **Paso 1: Backup de `mysqld.cnf`**

```bash
cp /etc/mysql/mysql.conf.d/mysqld.cnf /etc/mysql/mysql.conf.d/mysqld.cnf.bak-$(date +%Y%m%d)
```

- [ ] **Paso 2: Cambiar `bind-address`**

Editar `/etc/mysql/mysql.conf.d/mysqld.cnf` y reemplazar la línea:

```
bind-address = 127.0.0.1
```

Por:

```
bind-address = 0.0.0.0
```

- [ ] **Paso 3: Reiniciar MySQL**

```bash
systemctl restart mysql
systemctl status mysql --no-pager
```

Expected: `active (running)`. Si tira error, `journalctl -u mysql -n 50` para diagnosticar.

- [ ] **Paso 4: Configurar UFW — permitir solo desde n8n**

```bash
ufw allow from 64.23.235.153 to any port 3306 proto tcp
ufw deny 3306
ufw reload
ufw status numbered | grep 3306
```

Expected: regla `ALLOW from 64.23.235.153` primera, seguida de `DENY` general.

- [ ] **Paso 5: Verificar conectividad remota desde n8n**

```bash
# Desde el droplet de n8n (SSH o la UI):
mysql -h <IP-DROPLET-PRODUCTIVO> -u wmford -p db_wankamotorsford -e "SHOW TABLES;" | head -5
```

Expected: lista de tablas.

### Tarea 2.6: Seed de roles y admin inicial

- [ ] **Paso 1: Ubicar los scripts de seed del repo**

```bash
ls /var/www/crm-ford/migrations/
ls /var/www/crm-ford/scripts/
```

Expected: listado de `.js` con migraciones y seeds. Identificar los de seed de roles (`roles_chatwoot_mapping`, `usuarios` admin).

- [ ] **Paso 2: Correr migraciones si existen**

```bash
cd /var/www/crm-ford
# Solo si existen y aún no crearon tablas propias
# (schema.sql ya trajo el DDL, esto es para data)
```

Revisar qué migraciones existen y decidir cuáles correr. Si el schema.sql ya trajo todo el DDL, las migraciones pueden estar cubiertas.

- [ ] **Paso 3: Crear admin inicial con bcrypt**

```bash
cd /var/www/crm-ford
node --env-file=.env.local -e "
const bcrypt = require('bcryptjs');
const pass = process.argv[1] || 'CambiarMe123!';
bcrypt.hash(pass, 10).then(h => console.log('HASH:', h));
" "<PASSWORD-INICIAL-ADMIN-FORD>"
```

Expected: imprime `HASH: $2a$10$...`.

- [ ] **Paso 4: Insertar admin en `usuarios`**

Ajustar campos según schema real. Ejemplo base:

```sql
INSERT INTO usuarios (fullname, username, password_hash, role_id, created_at)
VALUES ('Admin Ford', 'adminford', '<HASH-DEL-PASO-3>', 1, NOW());
```

Ejecutar:

```bash
mysql -u wmford -p db_wankamotorsford -e "<SQL-DE-ARRIBA>"
```

Expected: `Query OK, 1 row affected`.

---

## FASE 3 — CRM Ford: build y arranque

### Tarea 3.1: Crear `.env.local` de Ford

**Archivos:**
- Create: `/var/www/crm-ford/.env.local`

- [ ] **Paso 1: Crear el archivo con nano (NO copiar desde Windows por el tema CRLF)**

```bash
nano /var/www/crm-ford/.env.local
```

Contenido (reemplazar los placeholders `<WKM-Ford-*>` con los valores del gestor):

```env
NODE_ENV=production
PORT=3000
APP_BASE_URL=https://wankamotorsford.onesolution.website

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=wmford
DB_PASS=<WKM-Ford-DB_PASS>
DB_NAME=db_wankamotorsford

JWT_SECRET=<WKM-Ford-JWT_SECRET>

CHATWOOT_URL=https://os.app20.tech
CHATWOOT_ACCOUNT_ID=2
CHATWOOT_API_TOKEN=<SUPER-ADMIN-TOKEN>

CONVERSATIONS_WEBHOOK_SECRET=<WKM-Ford-CONVERSATIONS_WEBHOOK_SECRET>
CHATWOOT_WEBHOOK_HMAC_SECRET=<WKM-Ford-CHATWOOT_WEBHOOK_HMAC_CRM>

OPENAI_API_KEY=<SHARED-OPENAI-KEY>
GEMINI_API_KEY=<SHARED-GEMINI-KEY>
```

> **Nota:** `CHATWOOT_ACCOUNT_ID=2` se asume. Si Chatwoot asigna un ID distinto en la Fase 4, volvé a este paso y actualizalo.

- [ ] **Paso 2: Verificar que el archivo NO tiene CRLF**

```bash
file /var/www/crm-ford/.env.local
```

Expected: `ASCII text`. Si dice `with CRLF line terminators`, correr: `sed -i 's/\r$//' /var/www/crm-ford/.env.local`.

- [ ] **Paso 3: Permisos restrictivos**

```bash
chmod 600 /var/www/crm-ford/.env.local
ls -l /var/www/crm-ford/.env.local
```

Expected: `-rw------- 1 root root`.

### Tarea 3.2: Build de producción

- [ ] **Paso 1: Correr build**

```bash
cd /var/www/crm-ford
npm run build
```

Expected: finaliza con `✓ Compiled successfully` y genera `.next/`. Si falla, leer el error — lo más común son env vars faltantes o typos.

- [ ] **Paso 2: Verificar artefactos**

```bash
ls -la /var/www/crm-ford/.next/
```

Expected: carpeta `.next/` con `server/`, `static/`, `BUILD_ID`.

### Tarea 3.3: Crear ecosystem PM2

**Archivos:**
- Create: `/var/www/crm-ford/ecosystem.config.cjs`

- [ ] **Paso 1: Escribir el ecosystem**

```bash
nano /var/www/crm-ford/ecosystem.config.cjs
```

Contenido:

```js
module.exports = {
  apps: [
    {
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
    },
    {
      name: "crm-ford-outbox",
      script: "scripts/process-conversations-outbox.cjs",
      cwd: "/var/www/crm-ford",
      node_args: "--env-file=.env.local",
      cron_restart: "*/2 * * * *",
      autorestart: false,
      error_file: "/var/log/pm2/crm-ford-outbox-error.log",
      out_file: "/var/log/pm2/crm-ford-outbox-out.log",
    },
    {
      name: "crm-ford-mass",
      script: "scripts/process-mass-campaigns.cjs",
      cwd: "/var/www/crm-ford",
      node_args: "--env-file=.env.local",
      cron_restart: "*/5 * * * *",
      autorestart: false,
      error_file: "/var/log/pm2/crm-ford-mass-error.log",
      out_file: "/var/log/pm2/crm-ford-mass-out.log",
    },
  ],
};
```

- [ ] **Paso 2: Crear carpeta de logs**

```bash
mkdir -p /var/log/pm2
```

### Tarea 3.4: Arrancar PM2 y verificar

- [ ] **Paso 1: Arrancar**

```bash
cd /var/www/crm-ford
pm2 start ecosystem.config.cjs
```

Expected: tres procesos listados — `crm-ford` online (puerto 3000), `crm-ford-outbox` y `crm-ford-mass` en "stopped" (son cron tasks, arrancan solas).

- [ ] **Paso 2: Persistir la configuración**

```bash
pm2 save
pm2 startup   # si aún no está configurado el startup script
```

- [ ] **Paso 3: Ver logs**

```bash
pm2 logs crm-ford --lines 50 --nostream
```

Expected: `ready - started server on 0.0.0.0:3000` sin errores.

- [ ] **Paso 4: Verificar response local**

```bash
curl -I http://127.0.0.1:3000
```

Expected: `HTTP/1.1 200 OK` (o redirect a login).

- [ ] **Paso 5: Verificar response público**

```bash
curl -I https://wankamotorsford.onesolution.website
```

Expected: `HTTP/2 200` o redirect a `/login`.

### Tarea 3.5: Smoke test de login

- [ ] **Paso 1: Abrir en navegador**

Ir a `https://wankamotorsford.onesolution.website` — debería redirigir a `/login` o mostrar la página de login.

- [ ] **Paso 2: Login con admin seed**

Ingresar `adminford` + password de la Tarea 2.6.

Expected: login exitoso, dashboard abre.

- [ ] **Paso 3: Verificar consola del navegador**

Abrir DevTools → Console. Expected: sin errores rojos. Warnings aceptables.

---

## FASE 4 — Chatwoot: account Ford

### Tarea 4.1: Crear el account en Chatwoot

**Ubicación:** `https://os.app20.tech/super_admin`.

- [ ] **Paso 1: Login como Super Admin**

Abrir `https://os.app20.tech/super_admin` → login.

- [ ] **Paso 2: Crear account**

Menu lateral → Accounts → New Account.

| Campo | Valor |
|-------|-------|
| Account Name | `Wankamotors Ford` |
| Locale | `Spanish (Latin America)` o `Spanish` |
| Domain | (opcional, dejar vacío) |

Submit.

- [ ] **Paso 3: Anotar el `account_id`**

Chatwoot redirige a la vista del account. La URL muestra `/super_admin/accounts/<ID>`. Anotar ese ID.

Expected: asumimos `id=2`. Si Chatwoot asigna un número distinto (p. ej. 4 si hubo accounts eliminados), seguir con ese número y actualizar el `.env.local` de Ford en el próximo paso.

- [ ] **Paso 4: Actualizar `.env.local` si hace falta**

Si el ID real difiere de 2:

```bash
sed -i "s/CHATWOOT_ACCOUNT_ID=.*/CHATWOOT_ACCOUNT_ID=<ID-REAL>/" /var/www/crm-ford/.env.local
pm2 restart crm-ford --update-env
```

### Tarea 4.2: Crear agente API Bot

- [ ] **Paso 1: Entrar al account Ford como Super Admin**

Super Admin → Accounts → `Wankamotors Ford` → "Login to Account" (o el botón equivalente).

- [ ] **Paso 2: Crear agente**

Settings → Agents → Add Agent.

| Campo | Valor |
|-------|-------|
| Name | `API Bot` |
| Email | `api-bot-ford@wankamotors.local` (no recibe correos, puede ser ficticio) |
| Role | **Agent** (NO Administrator) |

Submit. Chatwoot manda un email de invitación — lo ignoramos, vamos a fijar el password manualmente.

- [ ] **Paso 3: Activar el agente forzando password**

Como Super Admin, en `super_admin` → Users → buscar el email `api-bot-ford@wankamotors.local` → "Reset Password" o setear password directamente. Guardar password en gestor como `WKM-Ford-ChatwootBotPass`.

- [ ] **Paso 4: Obtener el `access_token` del bot**

Login con `api-bot-ford@wankamotors.local` → Profile (icono usuario esquina inferior) → **Access Token** → copiar y guardar en gestor como `WKM-Ford-ChatwootBotToken`.

- [ ] **Paso 5: Anotar el `agent_id`**

En la URL del profile aparece `/app/accounts/<account_id>/profile/settings` — el user_id se obtiene vía API:

```bash
curl -H "api_access_token: <WKM-Ford-ChatwootBotToken>" \
  https://os.app20.tech/api/v1/profile
```

Expected: JSON con `id: <N>`. Anotar como `API_BOT_AGENT_ID_FORD`.

### Tarea 4.3: Crear teams

- [ ] **Paso 1: Navegar a Teams**

Settings → Teams → Create New Team.

- [ ] **Paso 2: Crear los 4 teams**

Repetir para cada uno. Cada team se crea con los defaults (self-assign, auto-assign según preferencia).

| # | Name |
|---|------|
| 1 | `Ventas` |
| 2 | `Taller` |
| 3 | `Postventa` |
| 4 | `Administración` |

- [ ] **Paso 3: Asignar el API Bot a los 4 teams**

Entrar a cada team → Team Members → Add → seleccionar `API Bot` → Save.

- [ ] **Paso 4: Anotar los `team_id`**

Desde la URL de cada team (`/team/<id>`) o vía API:

```bash
curl -H "api_access_token: <SUPER-ADMIN-TOKEN>" \
  https://os.app20.tech/api/v1/accounts/2/teams
```

Expected: JSON con los 4 teams. Anotar:
- `TEAM_VENTAS_FORD`
- `TEAM_TALLER_FORD`
- `TEAM_POSTVENTA_FORD`
- `TEAM_ADMIN_FORD`

### Tarea 4.4: Poblar `roles_chatwoot_mapping` en DB Ford

- [ ] **Paso 1: Verificar que la tabla existe**

```bash
mysql -u wmford -p db_wankamotorsford -e "DESCRIBE roles_chatwoot_mapping;"
```

Expected: columnas `id`, `role_id`, `chatwoot_team_id`, `chatwoot_agent_id` (o similar según schema real).

- [ ] **Paso 2: Insertar mapeos iniciales**

Ajustar los `role_id` según los roles reales del schema. Ejemplo:

```sql
INSERT INTO roles_chatwoot_mapping (role_id, chatwoot_team_id) VALUES
  (<role_admin>, <TEAM_ADMIN_FORD>),
  (<role_ventas>, <TEAM_VENTAS_FORD>),
  (<role_taller>, <TEAM_TALLER_FORD>),
  (<role_postventa>, <TEAM_POSTVENTA_FORD>);
```

Ejecutar:

```bash
mysql -u wmford -p db_wankamotorsford -e "<SQL>"
```

- [ ] **Paso 3: Verificar**

```bash
mysql -u wmford -p db_wankamotorsford -e \
  "SELECT r.name, m.chatwoot_team_id FROM roles_chatwoot_mapping m JOIN roles r ON r.id = m.role_id;"
```

Expected: 4 filas mapeando cada rol a un team Chatwoot.

### Tarea 4.5: Smoke test — conversaciones vacías en el CRM

- [ ] **Paso 1: Login en CRM Ford**

`https://wankamotorsford.onesolution.website/login` → `adminford`.

- [ ] **Paso 2: Abrir `/mensajes`**

Expected: bandeja vacía, sin errores en consola.

- [ ] **Paso 3: Verificar logs PM2**

```bash
pm2 logs crm-ford --lines 50 --nostream
```

Expected: requests a `/api/chatwoot/conversations` devuelven 200 con array vacío. No hay errores de auth (token) ni de account_id.

---

## FASE 5 — Meta Business: System User y token permanente (Ford)

### Tarea 5.1: Crear System User

**Ubicación:** `business.facebook.com` → Business Portfolio de Ford.

- [ ] **Paso 1: Navegar a System Users**

Business Settings → Users → System Users → Add.

- [ ] **Paso 2: Crear el System User**

| Campo | Valor |
|-------|-------|
| Name | `Wankamotors Ford Bot` |
| System User Role | `Admin` |

Submit.

### Tarea 5.2: Asignar assets al System User

- [ ] **Paso 1: Asignar WABA**

Con el System User seleccionado → Add Assets → WhatsApp Accounts → seleccionar el WABA de Ford → marcar **Full Control** → Save.

- [ ] **Paso 2: Asignar página Facebook**

Add Assets → Pages → seleccionar la página de Facebook Ford → **Full Control** → Save.

- [ ] **Paso 3: Asignar cuenta Instagram**

Add Assets → Instagram Accounts → seleccionar la cuenta IG Ford → **Full Control** → Save.

Expected: los 3 assets aparecen listados bajo el System User.

### Tarea 5.3: Generar token permanente

- [ ] **Paso 1: Generar token**

En el System User → Generate New Token.

- [ ] **Paso 2: Seleccionar app**

| Campo | Valor |
|-------|-------|
| App | Seleccionar la app de Meta Developer asociada (la misma que staging o una nueva si corresponde por portfolio) |
| Token Expiration | **Never** |

- [ ] **Paso 3: Marcar los 5 scopes**

- [ ] `whatsapp_business_messaging`
- [ ] `whatsapp_business_management`
- [ ] `pages_messaging`  ← CRÍTICO, bug conocido en staging
- [ ] `instagram_basic`
- [ ] `instagram_manage_messages`

Submit.

- [ ] **Paso 4: Copiar el token**

El token solo se muestra UNA VEZ. Copiarlo y guardarlo en gestor como `WKM-Ford-MetaToken`.

- [ ] **Paso 5: Verificar token con Graph API**

```bash
curl "https://graph.facebook.com/v21.0/me?access_token=<WKM-Ford-MetaToken>"
```

Expected: JSON con `{"name":"Wankamotors Ford Bot", "id":"..."}`.

### Tarea 5.4: Verificar scope `pages_messaging`

Este es el bug conocido que rompió Messenger en staging — validamos ahora.

- [ ] **Paso 1: Consultar debug del token**

```bash
curl "https://graph.facebook.com/debug_token?input_token=<WKM-Ford-MetaToken>&access_token=<WKM-Ford-MetaToken>"
```

Expected: en `"scopes": [...]` aparece `"pages_messaging"`. Si NO aparece, volver a la Tarea 5.3 Paso 3 y regenerar el token con el scope tildado.

- [ ] **Paso 2: Obtener Page Access Token**

```bash
curl "https://graph.facebook.com/v21.0/<PAGE-ID-FORD>?fields=access_token&access_token=<WKM-Ford-MetaToken>"
```

Expected: JSON con `"access_token": "..."` (el page token derivado). Guardar en gestor como `WKM-Ford-PageAccessToken` — lo pide Chatwoot al crear el inbox de FB.

---

## FASE 6 — Inboxes Chatwoot Ford (WA, FB, IG)

### Tarea 6.1: Crear inbox WhatsApp

**Ubicación:** account Ford en Chatwoot.

- [ ] **Paso 1: Navegar**

Settings → Inboxes → Add Inbox → WhatsApp → **WhatsApp Cloud**.

- [ ] **Paso 2: Completar formulario**

| Campo | Valor |
|-------|-------|
| Inbox Name | `WhatsApp Ford` |
| Phone Number | el número de WhatsApp Ford (con código país) |
| Phone Number ID | `<PHONE-NUMBER-ID-FORD>` (del Business Manager → WABA → Phone Numbers) |
| Business Account ID | `<WABA-ID-FORD>` |
| API Key | `<WKM-Ford-MetaToken>` |
| Webhook Verify Token | (generar aleatorio, guardar como `WKM-Ford-WA-VerifyToken`) |

Submit.

- [ ] **Paso 3: Configurar el webhook en Meta**

Chatwoot muestra una URL del tipo `https://os.app20.tech/webhooks/whatsapp/<phone-number>` y el verify token. En Meta Developer → app → WhatsApp → Configuration:

| Campo | Valor |
|-------|-------|
| Callback URL | URL mostrada por Chatwoot |
| Verify Token | el que definiste en el paso 2 |

Subscribe a eventos: `messages`.

- [ ] **Paso 4: Asignar al team Ventas + agente API Bot**

Volver a Chatwoot → inbox `WhatsApp Ford` → Collaborators → agregar API Bot. → Configuration → Teams → asignar `Ventas`.

- [ ] **Paso 5: Anotar el `inbox_id`**

En la URL del inbox (`/settings/inboxes/<id>`) o vía:

```bash
curl -H "api_access_token: <SUPER-ADMIN-TOKEN>" \
  https://os.app20.tech/api/v1/accounts/2/inboxes | jq '.payload[] | {id, name, channel_type}'
```

Anotar como `INBOX_WA_FORD`.

### Tarea 6.2: Crear inbox Facebook Messenger

- [ ] **Paso 1: Navegar**

Settings → Inboxes → Add Inbox → Facebook Messenger.

- [ ] **Paso 2: Método de conexión**

Chatwoot ofrece OAuth o manual. **Usar manual** con el Page Access Token de la Tarea 5.4 Paso 2 (más confiable para self-hosted).

| Campo | Valor |
|-------|-------|
| Inbox Name | `Messenger Ford` |
| Page ID | `<PAGE-ID-FORD>` |
| Page Access Token | `<WKM-Ford-PageAccessToken>` |

- [ ] **Paso 3: Asignar team + API Bot**

Igual que Tarea 6.1 Paso 4 → team `Ventas`.

- [ ] **Paso 4: Anotar `inbox_id`**

Listar inboxes (comando Paso 5 de Tarea 6.1) y anotar como `INBOX_FB_FORD`.

### Tarea 6.3: Crear inbox Instagram

- [ ] **Paso 1: Navegar**

Settings → Inboxes → Add Inbox → Instagram.

- [ ] **Paso 2: Conectar vía API**

Usar credenciales del token Ford (ya tiene `instagram_basic` + `instagram_manage_messages`).

| Campo | Valor |
|-------|-------|
| Inbox Name | `Instagram Ford` |
| Instagram Account ID | `<IG-ACCOUNT-ID-FORD>` (desde Graph API: `/v21.0/<page-id>?fields=instagram_business_account&access_token=<token>`) |
| Access Token | `<WKM-Ford-PageAccessToken>` |

- [ ] **Paso 3: Asignar team + API Bot**

Igual → team `Ventas`.

- [ ] **Paso 4: Anotar `inbox_id`**

Anotar como `INBOX_IG_FORD`.

### Tarea 6.4: Test end-to-end WhatsApp

- [ ] **Paso 1: Desde un celular, mandar mensaje al número WhatsApp Ford**

Texto: `test de integración Ford`.

- [ ] **Paso 2: Verificar que llega a Chatwoot**

Abrir Chatwoot → account Ford → Conversations. Expected: nueva conversación visible en unos segundos.

- [ ] **Paso 3: Verificar SSE en el CRM Ford**

`https://wankamotorsford.onesolution.website/mensajes` debe mostrar la conversación SIN refresh manual (SSE push).

- [ ] **Paso 4: Si NO llega, diagnosticar**

- Webhook Meta → logs en Meta Developer → Webhooks → "Recent Deliveries"
- Chatwoot → logs del servidor `cwctl --logs web` (si existe acceso)

---

## FASE 7 — n8n: credenciales y variables (Ford)

### Tarea 7.1: Crear credenciales MySQL Ford

**Ubicación:** UI de n8n → Credentials.

- [ ] **Paso 1: Crear credencial**

New Credential → MySQL.

| Campo | Valor |
|-------|-------|
| Credential Name | `MySQL - Ford` |
| Host | `<IP-DROPLET-PRODUCTIVO>` |
| Database | `db_wankamotorsford` |
| User | `wmford` |
| Password | `<WKM-Ford-DB_PASS>` |
| Port | `3306` |
| SSL | (según lo que use staging) |

- [ ] **Paso 2: Habilitar `multipleStatements`**

En "Advanced" o en el JSON de la credencial, marcar `multipleStatements: true` (lo piden varios workflows del Bot Taller y CRM Error Handler).

- [ ] **Paso 3: Test de conexión**

Click "Test". Expected: `Connection successful`.

### Tarea 7.2: Crear credenciales Meta Ford (WA, FB, IG, Chatwoot)

- [ ] **Paso 1: WhatsApp Cloud — `WA - Ford`**

New Credential → WhatsApp Business Cloud (u "HTTP Header Auth" si es genérico).

| Campo | Valor |
|-------|-------|
| Access Token | `<WKM-Ford-MetaToken>` |
| Phone Number ID | `<PHONE-NUMBER-ID-FORD>` |
| Business Account ID | `<WABA-ID-FORD>` |

- [ ] **Paso 2: Facebook — `FB - Ford`**

New Credential → Facebook Graph API.

| Campo | Valor |
|-------|-------|
| Access Token | `<WKM-Ford-PageAccessToken>` |

- [ ] **Paso 3: Instagram — `IG - Ford`**

New Credential → Facebook Graph API (IG usa el mismo flujo).

| Campo | Valor |
|-------|-------|
| Access Token | `<WKM-Ford-PageAccessToken>` |

- [ ] **Paso 4: Chatwoot API — `Chatwoot API - Ford (acct 2)`**

New Credential → HTTP Header Auth.

| Campo | Valor |
|-------|-------|
| Header Name | `api_access_token` |
| Header Value | `<SUPER-ADMIN-TOKEN>` |

Alternativamente, si querés segregar: usar `<WKM-Ford-ChatwootBotToken>` (token del API Bot) — tiene menos privilegios pero suficiente para responder mensajes.

### Tarea 7.3: Crear n8n Variables para Ford

**Ubicación:** Settings → Variables.

- [ ] **Paso 1: Crear 4 variables**

| Key | Value |
|-----|-------|
| `CRM_BASE_URL_FORD` | `https://wankamotorsford.onesolution.website` |
| `CRM_WEBHOOK_SECRET_FORD` | `<WKM-Ford-CONVERSATIONS_WEBHOOK_SECRET>` |
| `CHATWOOT_ACCOUNT_ID_FORD` | `2` (o el ID real asignado) |
| `ALERT_WEBHOOK_URL_FORD` | `https://wankamotorsford.onesolution.website/api/chatwoot/alert` |

- [ ] **Paso 2: Verificar**

Volver a Variables → contar 4 entries con prefijo `FORD`.

---

## FASE 8 — n8n: duplicar workflows (Ford)

> **Regla base:** para cada workflow de staging que tenga que operar en productivo, duplicarlo, renombrarlo con sufijo `[FORD]`, aplicar tag `ford`, y hacer los **6 cambios por nodo** de la sección 4 del spec.

### Tarea 8.1: Listar workflows de staging a duplicar

- [ ] **Paso 1: En n8n, abrir Workflows**

Filtrar por los activos + los que el usuario mencionó: ~10 total.

- [ ] **Paso 2: Anotar los IDs y nombres**

Conocidos:

| # | Nombre | ID |
|---|--------|----|
| 1 | Ventas IA - WhatsApp Agent | `zY7IprRjgHhBDaKe` |
| 2 | Bot Taller v14 | `WM6smNJyz2tWkESx` |
| 3 | Chatwoot: WhatsApp IA Bot | (ver) |
| 4 | Chatwoot: Facebook IA Bot | (ver) |
| 5 | Chatwoot: Instagram IA Bot | (ver) |
| 6 | CRM Error Handler | `ZS6JPw1prX7rT0tG` |
| 7 | Follow-up Automático | `oGq3xxVNhhu4MvI7` |

Completar la tabla con los faltantes (~3 más según lo que liste el usuario).

### Tarea 8.2: Duplicar el router `Chatwoot: WhatsApp IA Bot` → `[FORD]`

- [ ] **Paso 1: Clonar**

Click derecho sobre el workflow → Duplicate → renombrar a `Chatwoot: WA IA Bot [FORD]`.

- [ ] **Paso 2: Agregar tag `ford`**

Tags → New tag `ford` (primera vez) → asignar.

- [ ] **Paso 3: Cambiar webhook trigger path**

Nodo de trigger (`Webhook Chatwoot`) → Path: `chatwoot-wa-ford` (era `chatwoot-wa` en staging).

- [ ] **Paso 4: Revisar cada nodo HTTP Request**

Para cada nodo que llama al CRM:
- URL: reemplazar `https://crm.app20.tech` por `{{ $vars.CRM_BASE_URL_FORD }}`
- Headers con `x-conversations-webhook-secret`: usar `{{ $vars.CRM_WEBHOOK_SECRET_FORD }}`

Para cada nodo que llama a Chatwoot API:
- URL: reemplazar `/accounts/1/` por `/accounts/{{ $vars.CHATWOOT_ACCOUNT_ID_FORD }}/`
- Credential: `Chatwoot API - Ford (acct 2)`

- [ ] **Paso 5: Activar**

Top bar → toggle Active.

- [ ] **Paso 6: Ejecutar test manual**

Mandar un test al webhook desde Postman/curl:

```bash
curl -X POST https://<n8n-url>/webhook/chatwoot-wa-ford \
  -H "Content-Type: application/json" \
  -d '{"event":"message_created","message_type":"incoming","content":"ping"}'
```

Expected: execution aparece en "Executions" → Success (o debug error claro).

### Tarea 8.3: Duplicar `Chatwoot: Facebook IA Bot` → `[FORD]`

- [ ] **Paso 1-6:** igual que Tarea 8.2, con estos cambios:
  - Nombre → `Chatwoot: FB IA Bot [FORD]`
  - Webhook path → `chatwoot-fb-ford`
  - Credencial Meta → `FB - Ford`

### Tarea 8.4: Duplicar `Chatwoot: Instagram IA Bot` → `[FORD]`

- [ ] **Paso 1-6:** igual que Tarea 8.2, con estos cambios:
  - Nombre → `Chatwoot: IG IA Bot [FORD]`
  - Webhook path → `chatwoot-ig-ford`
  - Credencial Meta → `IG - Ford`

### Tarea 8.5: Duplicar `Bot Taller v14` → `[FORD]` (CRÍTICO — 62 nodos)

> **Crítico:** este workflow tiene muchos nodos MySQL y HTTP. Hay que recorrerlo nodo por nodo.

- [ ] **Paso 1: Clonar**

Duplicate → renombrar `Bot Taller v14 [FORD]` → tag `ford`.

- [ ] **Paso 2: Cambiar TODOS los nodos MySQL**

Abrir cada nodo tipo `mySql` o `mySqlTool` → Credential → cambiar a `MySQL - Ford`.

Lista conocida (del spec sección 4): `Registrar_Cliente`, `Registrar_Vehiculo`, `Insertar_Marca1`, `Insertar_Modelo1`, `Actualizar_Vehiculo`, `Agendar_Cita`, `MySQL Lookup Social`, `MySQL Guardar Link`, `MySQL Get Precios`, más otros según el workflow real.

- [ ] **Paso 3: Cambiar TODOS los nodos HTTP que hablan al CRM**

Reemplazar `https://crm.app20.tech` por `{{ $vars.CRM_BASE_URL_FORD }}` en:
- `Registrar en CRM`
- `Registrar_Lead_PV`
- `Consultar_Precio_Mantenimiento` (URL: `{{ $vars.CRM_BASE_URL_FORD }}/api/precios/suma`)
- `Enviar_Alerta` (URL: `{{ $vars.ALERT_WEBHOOK_URL_FORD }}`, header `x-conversations-webhook-secret`: `{{ $vars.CRM_WEBHOOK_SECRET_FORD }}`)

- [ ] **Paso 4: Preservar `valueProvider: "modelRequired"` en toolHttpRequest**

En `Consultar_Precio_Mantenimiento` y otros `toolHttpRequest`, verificar en el JSON (modo Raw) que los params `mantenimiento_id`, `marca_id`, `modelo_id` tengan `"valueProvider": "modelRequired"`. Si no, setearlo. Esto es un gotcha conocido del spec.

- [ ] **Paso 5: Cambiar credenciales WA en nodos `Send WA Reply`**

Los nodos que llaman a Graph API de Meta → Credential → `WA - Ford`.

- [ ] **Paso 6: DESACTIVAR webhook Meta directo**

Este workflow tiene DOS triggers: `Webhook` (Meta directo) y `Webhook Chatwoot`. En el duplicado Ford:

- Dejar activo solo `Webhook Chatwoot`
- Desactivar el nodo `Webhook` (Meta directo) → eliminarlo o dejarlo desconectado

Esto evita double-reply cuando Chatwoot ya está en el medio.

- [ ] **Paso 7: Activar**

Toggle Active.

### Tarea 8.6: Duplicar `Ventas IA - WhatsApp Agent` → `[FORD]`

- [ ] **Paso 1: Clonar y renombrar**

`Ventas IA - WA [FORD]` + tag `ford`.

- [ ] **Paso 2: Credencial OpenAI**

Los nodos de LLM usan la credencial compartida de OpenAI (gpt-4o). NO se duplica — mismo credential.

- [ ] **Paso 3: Cambiar nodos MySQL**

Credential → `MySQL - Ford`.

- [ ] **Paso 4: Cambiar nodos HTTP del CRM**

Mismo patrón: URL con `$vars.CRM_BASE_URL_FORD`, secret con `$vars.CRM_WEBHOOK_SECRET_FORD`.

- [ ] **Paso 5: Desactivar webhook Meta directo**

Igual que Tarea 8.5 Paso 6.

- [ ] **Paso 6: `continueOnFail: true` en `Send WA Reply`**

Preservar la config del staging (gotcha conocido).

- [ ] **Paso 7: Activar**

### Tarea 8.7: Duplicar `CRM Error Handler` → `[FORD]`

- [ ] **Paso 1: Clonar**

`CRM Error Handler [FORD]` + tag `ford`.

- [ ] **Paso 2: Credencial MySQL**

→ `MySQL - Ford`.

- [ ] **Paso 3: Ajustar `ALERT_WEBHOOK_URL`**

Si el workflow referencia esta env var de n8n, crear/actualizar para apuntar a `{{ $vars.ALERT_WEBHOOK_URL_FORD }}`.

- [ ] **Paso 4: Activar (si corresponde)**

### Tarea 8.8: Duplicar `Follow-up Automático` → `[FORD]`

- [ ] **Paso 1: Clonar**

`Follow-up [FORD]` + tag `ford`.

- [ ] **Paso 2: Credencial MySQL**

→ `MySQL - Ford` (con `multipleStatements: true` ya habilitado).

- [ ] **Paso 3: Ajustar URLs del CRM**

`{{ $vars.CRM_BASE_URL_FORD }}/api/conversations/webhook` en los nodos HTTP.

- [ ] **Paso 4: Verificar que `/api/conversations/webhook` acepta `event_type: 'followup'`**

Gotcha conocido del spec. Si no lo acepta, esta tarea queda bloqueada hasta que se implemente en el CRM (tarea aparte).

- [ ] **Paso 5: Decidir activación**

Si todo OK, activar. Si no, dejar inactivo y documentar.

### Tarea 8.9: Duplicar workflows restantes (los 3 que mencionó el usuario pero no están en memoria)

- [ ] **Paso 1: Para cada workflow adicional que aparezca al listar:**
  - Clonar con sufijo `[FORD]`
  - Tag `ford`
  - Aplicar los 6 cambios por nodo (MySQL, URLs CRM, account_id Chatwoot, webhook paths, credenciales Meta, headers con secretos)
  - Activar

---

## FASE 9 — Webhooks Chatwoot → n8n y → CRM (Ford)

### Tarea 9.1: Configurar los 4 webhooks del account Ford

**Ubicación:** Chatwoot account Ford → Settings → Integrations → Webhooks.

- [ ] **Paso 1: Crear webhook WhatsApp → n8n**

| Campo | Valor |
|-------|-------|
| URL | `https://<n8n-url>/webhook/chatwoot-wa-ford` |
| Events | `message_created` |
| HMAC Secret | `<WKM-Ford-CHATWOOT_WEBHOOK_HMAC_N8N_WA>` |

> Nota: si Chatwoot no soporta filtrar webhooks por inbox a nivel account, el workflow n8n debe filtrar por `inbox_id` === `INBOX_WA_FORD` al principio. Esta condición ya existe en los routers de staging — revisar que el duplicado la mantiene.

- [ ] **Paso 2: Crear webhook Facebook → n8n**

| URL | `https://<n8n-url>/webhook/chatwoot-fb-ford` |
| Events | `message_created` |
| HMAC Secret | `<WKM-Ford-CHATWOOT_WEBHOOK_HMAC_N8N_FB>` |

- [ ] **Paso 3: Crear webhook Instagram → n8n**

| URL | `https://<n8n-url>/webhook/chatwoot-ig-ford` |
| Events | `message_created` |
| HMAC Secret | `<WKM-Ford-CHATWOOT_WEBHOOK_HMAC_N8N_IG>` |

- [ ] **Paso 4: Crear webhook al CRM**

| URL | `https://wankamotorsford.onesolution.website/api/chatwoot/webhook` |
| Events | `conversation_created`, `conversation_updated`, `conversation_status_changed`, `message_created` |
| HMAC Secret | `<WKM-Ford-CHATWOOT_WEBHOOK_HMAC_CRM>` |

### Tarea 9.2: Propagar HMAC secrets a n8n workflows

Los workflows duplicados necesitan validar HMAC.

- [ ] **Paso 1: Crear variables n8n para los HMAC**

Settings → Variables → Add:

| Key | Value |
|-----|-------|
| `CHATWOOT_HMAC_WA_FORD` | `<WKM-Ford-CHATWOOT_WEBHOOK_HMAC_N8N_WA>` |
| `CHATWOOT_HMAC_FB_FORD` | `<WKM-Ford-CHATWOOT_WEBHOOK_HMAC_N8N_FB>` |
| `CHATWOOT_HMAC_IG_FORD` | `<WKM-Ford-CHATWOOT_WEBHOOK_HMAC_N8N_IG>` |

- [ ] **Paso 2: Validar HMAC en los 3 routers**

Si los workflows staging ya tienen un nodo Code/Crypto que valida HMAC, solo cambiar la constante por `{{ $vars.CHATWOOT_HMAC_WA_FORD }}` (y los equivalentes para FB/IG).

Si NO validan HMAC, es decisión del operador agregarlo o confiar en el secreto compartido por URL. **Recomendado agregarlo** para no depender solo de que la URL sea secreta.

### Tarea 9.3: Actualizar `.env.local` del CRM con el HMAC

- [ ] **Paso 1: Confirmar que `CHATWOOT_WEBHOOK_HMAC_SECRET` ya está en `.env.local`**

```bash
grep CHATWOOT_WEBHOOK_HMAC_SECRET /var/www/crm-ford/.env.local
```

Expected: línea con `<WKM-Ford-CHATWOOT_WEBHOOK_HMAC_CRM>`. Si no, agregar.

- [ ] **Paso 2: Restart con update-env**

```bash
pm2 restart crm-ford --update-env
```

- [ ] **Paso 3: Verificar en logs**

```bash
pm2 logs crm-ford --lines 30 --nostream
```

Expected: sin errores al startup.

---

## FASE 10 — Testing de integración Ford (10 casos)

> Cada caso es un test end-to-end. Pasa = la funcionalidad está OK. Falla = diagnosticar antes de avanzar.

### Tarea 10.1: Caso 1 — Cliente nuevo WhatsApp, primer mensaje

- [ ] **Paso 1: Desde un celular NUEVO (no usado antes), mandar WA al número de Ford**

Texto: `Hola`.

- [ ] **Paso 2: Verificar en Chatwoot account Ford**

Settings → Conversations. Expected: conversación nueva aparece en ~5 seg.

- [ ] **Paso 3: Verificar en CRM Ford**

`/mensajes` debe mostrarla sin refrescar (SSE).

- [ ] **Paso 4: Verificar logs n8n**

`Chatwoot: WA IA Bot [FORD]` → Executions. Expected: 1 ejecución Success.

### Tarea 10.2: Caso 2 — Router decide `new_client_menu`

- [ ] **Paso 1: Verificar que el bot respondió con el menú de 2 opciones**

El celular del test debería recibir el mensaje de bienvenida + menú (opción 1 = ventas, opción 2 = taller, según el prompt de staging).

- [ ] **Paso 2: Si no responde, revisar**

`Bot Taller v14 [FORD]` Executions. Buscar el mensaje de bienvenida. Ver dónde cortó.

### Tarea 10.3: Caso 3 — Cliente elige opción 2 (taller)

- [ ] **Paso 1: Desde el celular, responder `2`**

- [ ] **Paso 2: Verificar que el bot arranca el flujo de taller**

Bot debería pedir datos del cliente (o del vehículo). Revisar que el system prompt se activó con `clientId = "NO REGISTRADO"`.

- [ ] **Paso 3: Verificar ejecución en n8n**

`Bot Taller v14 [FORD]` → Executions → última → ver el routing.

### Tarea 10.4: Caso 4 — Cliente elige opción 1 (ventas)

- [ ] **Paso 1: (Desde otro celular) mandar mensaje al número WA**

`Hola quiero comprar un auto`.

- [ ] **Paso 2: Verificar que va a Ventas IA**

Verificar en Executions de `Ventas IA - WA [FORD]` que hay ejecución. Respuesta debería usar gpt-4o.

### Tarea 10.5: Caso 5 — Mensaje Facebook Messenger Ford

- [ ] **Paso 1: Desde Messenger, mandar mensaje a la página FB Ford**

- [ ] **Paso 2: Verificar llegada a inbox FB de account Ford**

Conversación nueva aparece en Chatwoot.

- [ ] **Paso 3: Verificar que `Chatwoot: FB IA Bot [FORD]` ejecutó**

Success en Executions.

### Tarea 10.6: Caso 6 — Mensaje Instagram Ford

- [ ] **Paso 1: Desde IG, DM a la cuenta Ford**

- [ ] **Paso 2: Verificar flujo completo**

Chatwoot inbox IG Ford → CRM ve la conversación → `Chatwoot: IG IA Bot [FORD]` responde.

### Tarea 10.7: Caso 7 — Agente humano responde desde el CRM

- [ ] **Paso 1: En `/mensajes`, abrir una conversación activa**

- [ ] **Paso 2: Escribir un mensaje y enviar**

- [ ] **Paso 3: Verificar que llega al celular del cliente**

Debería llegar por WhatsApp con el texto escrito.

- [ ] **Paso 4: Verificar logs**

`pm2 logs crm-ford` → debería loguear POST a `/api/chatwoot/conversations/[id]/messages` exitoso.

### Tarea 10.8: Caso 8 — Asignación a team Taller

- [ ] **Paso 1: En una conversación abierta, abrir popover de Assign**

- [ ] **Paso 2: Asignar a team Taller + un agente Taller**

- [ ] **Paso 3: Verificar en Chatwoot**

La conversación cambia de team en Chatwoot.

- [ ] **Paso 4: SSE refresca**

El badge del team cambia sin refresh.

### Tarea 10.9: Caso 9 — Bot dispara `Enviar_Alerta`

- [ ] **Paso 1: En conversación con el bot, escribir algo que dispare el tool**

Ej: `quiero hacer un test drive`. El bot debería invocar `Enviar_Alerta` con `alert_type: test_drive`.

- [ ] **Paso 2: Verificar que llega al CRM**

`pm2 logs crm-ford` → debería mostrar `POST /api/chatwoot/alert` con header `x-conversations-webhook-secret` correcto.

Response: `{"ok":true,"conversation_id":N,"alert_type":"test_drive","routed":true}`.

- [ ] **Paso 3: Verificar NotificationPanel en CRM**

El alert aparece en el panel lateral `botAlerts`.

### Tarea 10.10: Caso 10 — No hay double-reply

- [ ] **Paso 1: Mandar un mensaje WA**

- [ ] **Paso 2: Verificar que el bot responde UNA sola vez**

Revisar en el celular: una sola respuesta.

- [ ] **Paso 3: Verificar en n8n**

Solo UNA ejecución de `Bot Taller v14 [FORD]` o `Ventas IA - WA [FORD]` por cada mensaje entrante. NO dos.

- [ ] **Paso 4: Si hay double-reply**

Causa raíz probable: webhook Meta directo aún activo en el duplicado. Volver a Tarea 8.5 Paso 6 / Tarea 8.6 Paso 5 y asegurar que SOLO el trigger Chatwoot esté activo.

---

## FASE 11 — Go-live Ford

### Tarea 11.1: Crear usuarios reales del centro Ford

- [ ] **Paso 1: Desde CRM Ford `/usuarios` (admin)**

Crear un user por cada agente humano del centro Ford (ventas, taller, postventa, admin).

- [ ] **Paso 2: Mapear cada uno a su agente Chatwoot**

Cada user del CRM debe tener `chatwoot_agent_id` populado con el `id` del agente correspondiente en account Ford.

Si la UI no lo permite directamente, UPDATE SQL:

```sql
UPDATE usuarios SET chatwoot_agent_id = <agent_id>
WHERE username = '<username>';
```

### Tarea 11.2: Capacitación

- [ ] **Paso 1: Sesión corta con los agentes humanos**

Temas: login, bandeja, asignación, plantillas WA (1 plantilla de prueba), notas internas, archivos adjuntos.

Duración sugerida: 30-45 min.

- [ ] **Paso 2: Documentar credenciales iniciales**

Enviar (por canal seguro) credenciales a cada user. Forzar cambio de password en primer login.

### Tarea 11.3: Monitoreo 48h

- [ ] **Paso 1: Setup inicial**

```bash
pm2 monit  # o abrir en otra sesión
```

- [ ] **Paso 2: Verificar cada 4h las primeras 24h**

- CPU/RAM del droplet: `htop`
- Logs: `pm2 logs crm-ford --lines 50 --nostream`
- Errores en Chatwoot account Ford → Conversations (ninguna marcada como "failed to send")
- Ejecuciones en n8n: sin errores rojos

- [ ] **Paso 3: Al finalizar 48h estables**

Dar por GO-LIVE confirmado. Comunicar al centro.

---

## FASE 12 — Replicar todo para Chevrolet

> Cuando Chevrolet reciba su número de WhatsApp (la semana siguiente), repetir TODAS las fases 0-11 sustituyendo los valores Ford por valores Chevrolet.

### Tarea 12.1: Tabla de sustituciones

Para cada step de las fases 0-11, reemplazar:

| Valor Ford | Valor Chevrolet |
|------------|-----------------|
| `wankamotorsford.onesolution.website` | `wankamotorschevrolet.onesolution.website` |
| `/var/www/crm-ford` | `/var/www/crm-chevrolet` |
| `crm-ford` (PM2) | `crm-chevrolet` |
| `db_wankamotorsford` | `db_wankamotorschevrolet` |
| `wmford` | `wmchev` |
| `WKM-Ford-*` | `WKM-Chev-*` |
| Puerto 3000 | Puerto 3001 |
| `CHATWOOT_ACCOUNT_ID=2` | `CHATWOOT_ACCOUNT_ID=3` |
| Tag `ford` | Tag `chevrolet` |
| Sufijo `[FORD]` | Sufijo `[CHEV]` |
| Credenciales n8n `*- Ford` | Credenciales n8n `*- Chev` |
| n8n Variables `*_FORD` | n8n Variables `*_CHEV` |
| Webhook paths `chatwoot-*-ford` | `chatwoot-*-chev` |
| Business Portfolio Ford | Business Portfolio Chevrolet |

### Tarea 12.2: Orden

Ejecutar las fases en el mismo orden: 0 → 1 → 2 → … → 11.

Esperado: ~1-2 días de trabajo (la curva de aprendizaje de Ford baja el tiempo en Chevrolet ~40%).

### Tarea 12.3: Verificación cross-tenant

- [ ] **Paso 1: Con ambos centros online, verificar aislamiento**

Desde un celular A, mandar WA al número Ford → respuesta de bot Ford.
Desde un celular B, mandar WA al número Chevrolet → respuesta de bot Chevrolet.

Expected: las dos conversaciones NO se cruzan. Ninguna aparece en el CRM del otro centro.

- [ ] **Paso 2: Verificar que staging sigue funcionando**

Mandar mensaje al número staging → respuesta normal. Chatwoot account 1 lo procesa. CRM staging (`myprototipe`) lo muestra.

Expected: staging intacto. Ningún cambio de Ford/Chev lo afectó.

---

## FASE 13 — Commits del plan al repo

### Tarea 13.1: Commitear este plan

- [ ] **Paso 1: Agregar al git**

```bash
cd /mnt/d/Proyectos/ultimo/AutomotrizProjectother
git add docs/superpowers/plans/2026-04-21-multi-tenant-ford-chevrolet-implementation.md
git status
```

Expected: archivo listado en `Changes to be committed`.

- [ ] **Paso 2: Commit**

```bash
git commit -m "docs: add Ford/Chevrolet multi-tenant implementation plan"
```

Expected: commit creado. El pre-commit hook (GGA v2.8.0) no debería bloquear — no hay cambios de código.

- [ ] **Paso 3: Push (opcional, según tu workflow)**

```bash
git push origin main
```

---

## Apéndice A — Troubleshooting común

### CRM no arranca con PM2

```bash
pm2 logs crm-ford --lines 100
```

- **`ENOTFOUND` en DB:** `.env.local` con CRLF → `sed -i 's/\r$//' /var/www/crm-ford/.env.local`
- **Puerto ocupado:** `ss -tlnp | grep 3000` → matar proceso previo
- **Next build faltante:** `cd /var/www/crm-ford && npm run build`

### Webhook Chatwoot → n8n no llega

- Verificar en Chatwoot → Integrations → Webhooks → click en el webhook → "Recent Deliveries"
- Si las deliveries fallan con 404: el path del workflow no matchea — revisar Tarea 8.2 Paso 3
- Si las deliveries fallan con 401: HMAC incorrecto — revisar Tarea 9.1

### Meta Webhook no llega a Chatwoot

- Meta Developer → app → WhatsApp → Configuration → "Recent Deliveries"
- Si fallan: revisar el Verify Token configurado (Tarea 6.1 Paso 3)

### Double-reply del bot

- Causa #1: webhook Meta directo aún activo en `Bot Taller v14 [FORD]` o `Ventas IA - WA [FORD]`
- Revisar Tarea 8.5 Paso 6 / Tarea 8.6 Paso 5

### `/api/chatwoot/alert` devuelve 401

- Causa: `x-conversations-webhook-secret` no coincide
- Verificar que `{{ $vars.CRM_WEBHOOK_SECRET_FORD }}` en n8n = `CONVERSATIONS_WEBHOOK_SECRET` en `.env.local`

---

## Apéndice B — Contactos de emergencia (por completar)

| Rol | Nombre | Contacto |
|-----|--------|----------|
| Admin droplets | (por definir) | |
| Admin DNS | (por definir) | |
| Meta Business Manager admin Ford | (por definir) | |
| Meta Business Manager admin Chevrolet | (por definir) | |

---

## Cierre

Plan listo para ejecutar.

**Próxima acción recomendada:**

- Ejecución tarea por tarea siguiendo el orden: Fase 0 → Fase 11 para Ford, luego Fase 12 para Chevrolet.
- Commit después de cada tarea (o después de cada fase, según preferencia).
- Si algo falla, diagnosticar antes de avanzar a la siguiente fase — NO saltearse.
