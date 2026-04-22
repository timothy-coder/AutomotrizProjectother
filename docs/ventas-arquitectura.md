# Arquitectura del módulo Ventas

Fuente de verdad para el agente n8n de Ventas IA y la UI de precios.

## Tablas involucradas

| Tabla | Rol | Editada desde |
|-------|-----|---------------|
| `marcas` / `modelos` / `versiones` | Catálogo base del inventario | `/configuracion/inventario` |
| `precios_region_version` | **Autoridad** de precio, stock, existe, días de entrega por (marca, modelo, versión) | `/carros` (matriz) |
| `modelo_especificaciones` | Specs técnicas por modelo | `/configuracion/especificaciones` |
| `ventas_versiones` | Detalle de catálogo por versión: equipamiento y colores | Sin UI (ver abajo) |
| `ventas_promociones` | Promos vigentes | `/ventas/promociones` |
| `ventas_configuracion` | Textos de financiamiento, documentación, garantías | `/ventas/configuracion` |

## Flujo de datos al agente n8n

```
GET /api/ventas/catalogo  (header: x-ventas-webhook-secret)

   precios_region_version (prv)   <-- precio, stock, existe, días
            ├── JOIN versiones v    (v.id = prv.version_id)
            └── LEFT JOIN ventas_versiones vv
                           (vv.version_id = prv.version_id
                            AND vv.modelo_id = prv.modelo_id
                            AND vv.is_active = 1)
                           ^^^^^^^^^^^^^^^^^^^^
                           equipamiento, colores

   Filtro: WHERE prv.existe = 1 AND prv.precio_base > 0
```

Si una versión tiene `existe = 0` en `precios_region_version`, **no aparece** en el catálogo del agente, aunque haya data en `ventas_versiones`.

## `ventas_versiones` — sin UI, por diseño

Esta tabla quedó como fuente de **detalles de catálogo** (equipamiento textual, colores disponibles) después de que la gestión de precios se consolidó en `precios_region_version`.

- No tiene formulario en el dashboard.
- Para poblar filas nuevas, hay dos caminos:
  1. SQL directo, asegurándose de setear `version_id` apuntando a `versiones.id`.
  2. Endpoint `POST /api/ventas/versiones` (con JWT de usuario con permiso `edit`).

La migración `migrations/link_ventas_versiones_to_versiones.js` agregó la columna `version_id` e hizo backfill por match de nombre. Cualquier fila con `version_id = NULL` queda fuera del catálogo hasta que se linkee manualmente.

## Endpoints clave

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/api/ventas/catalogo` | n8n — lee todo el catálogo con auth por webhook secret |
| `GET` / `PUT` | `/api/precios-region-version` | UI `/carros` — lee y upsertea la matriz de precios |
| `GET` / `POST` | `/api/ventas/versiones` | CRUD de detalles de catálogo (sin UI pero disponible) |
| `PUT` / `DELETE` | `/api/ventas/versiones/[id]` | Editar o desactivar una fila de catálogo |

## Migraciones relacionadas

- `add_ventas_catalogo_and_leads.js` — creación inicial de `ventas_versiones`, `ventas_promociones`, `ventas_configuracion`
- `add_stock_to_precios_region_version.js` — stock por región
- `move_existe_to_precios_region_version.js` — mueve `existe` desde `ventas_versiones` a `precios_region_version`
- `link_ventas_versiones_to_versiones.js` — FK de `ventas_versiones.version_id` a `versiones.id`
