# Envíos Masivos WhatsApp — Costos y Condiciones de Funcionamiento

## La regla más importante: la ventana de 24 horas

WhatsApp Business API tiene una restricción fundamental que determina qué tipo de mensaje podés enviar:

| Situación | Qué podés enviar |
|---|---|
| El cliente te escribió en las últimas **24 horas** | Texto libre, imágenes, documentos — cualquier cosa |
| Pasaron más de 24 horas desde la última respuesta | **Solo plantillas aprobadas por Meta** |
| El cliente nunca te escribió | **Solo plantillas aprobadas por Meta** |

Para una campaña masiva, prácticamente el 100% de la lista cae en la tercera categoría. Por eso, **los envíos masivos solo funcionan correctamente usando plantillas aprobadas**.

---

## Estructura de costos de WhatsApp Business API

Meta cobra por **conversación**, no por mensaje individual. Una conversación es una ventana de 24 horas que se abre con el primer mensaje entregado.

### Tipos de conversación y precios aproximados (Perú / Latinoamérica)

| Tipo | Cuándo se usa | Precio aprox. por conversación |
|---|---|---|
| **Marketing** | Campañas promocionales, ofertas, seguimientos | ~$0.025 USD |
| **Utility** | Cotizaciones, confirmaciones de servicio, recordatorios | ~$0.004 USD |
| **Authentication** | Códigos OTP, verificación de identidad | ~$0.003 USD |
| **Service** | El cliente escribe primero (responde a tu marketing) | **GRATIS** desde 2024 |

> Los precios varían según el país de origen del número del destinatario. Los valores indicados son referenciales para Perú (código +51). Verificar la tabla oficial en: [developers.facebook.com/docs/whatsapp/pricing](https://developers.facebook.com/docs/whatsapp/pricing)

### Ejemplo de costos para una campaña de 500 contactos

| Tipo de plantilla | Costo estimado |
|---|---|
| Marketing (promoción de autos) | ~$12.50 USD |
| Utility (recordatorio de mantenimiento) | ~$2.00 USD |

### ¿Cuándo aplica cada categoría?

- **Marketing**: Cuando el objetivo es vender, promocionar o recuperar un cliente sin que él lo haya pedido.
  - Ejemplo: "Hola Juan, tenemos una oferta especial en el Toyota RAV4 esta semana."
  
- **Utility**: Cuando es una notificación relacionada a una transacción o servicio que el cliente ya inició.
  - Ejemplo: "Recordamos que su Toyota Corolla tiene servicio de mantenimiento programado para el viernes."

Meta define la categoría al momento de aprobar la plantilla. Si la etiquetás como Utility pero el contenido parece Marketing, Meta puede rechazarla o reclasificarla.

---

## Costo del BSP (proveedor de la API)

Además de lo que cobra Meta, el BSP (Business Solution Provider — quien te da acceso a la API de WhatsApp) cobra por su parte.

Los BSPs más comunes y sus modelos de precios:

| BSP | Modelo de cobro | Precio aprox. |
|---|---|---|
| **Meta Cloud API directa** | Solo pagas a Meta, sin intermediario | $0 adicional |
| **360dialog** | Fee mensual fijo | ~$5–49 USD/mes según plan |
| **Twilio** | Por mensaje enviado | ~$0.005 USD adicional por mensaje |
| **Vonage / Infobip** | Por mensaje o por volumen | Variable |

Si la empresa usa **Meta Cloud API directa** (configurada en Chatwoot con WABA propio), el costo adicional es $0.

---

## Condiciones para que funcione un envío masivo

### Requisito 1: Plantilla aprobada por Meta
1. Accedé a **business.facebook.com → WhatsApp Manager → Plantillas de mensajes**
2. Creá la plantilla con el texto, variables (`{{1}}`, `{{2}}`), e imágenes si corresponde
3. Elegí la categoría correcta (Marketing o Utility)
4. Enviá para aprobación — puede tardar entre minutos y 24 horas
5. Una vez aprobada, aparece automáticamente en Chatwoot y en el CRM

### Requisito 2: Número verificado y conectado
- El número de WhatsApp debe estar conectado a una **WABA (WhatsApp Business Account)** activa
- El número debe tener **Quality Rating** en verde o amarillo (no rojo)
- Números con rating rojo tienen límites de envío reducidos o bloqueados

### Requisito 3: Límites de volumen (Messaging Tiers)

Meta controla cuántos contactos únicos podés contactar por día:

| Tier | Contactos únicos por día | Cómo llegar al siguiente |
|---|---|---|
| Tier 1 (nuevo) | 1,000 | Enviar regularmente sin bloqueos por 7 días |
| Tier 2 | 10,000 | Idem |
| Tier 3 | 100,000 | Idem |
| Sin límite | Ilimitado | Solo con alta verificación empresarial |

Una cuenta nueva empieza en Tier 1. Para una campaña de 5,000 contactos, primero hay que alcanzar Tier 2.

### Requisito 4: Opt-in de los clientes

Meta exige que los destinatarios hayan dado su consentimiento para recibir mensajes de marketing. En la práctica para este sistema, el opt-in está implícito porque:
- Los clientes de postventa tienen historial de servicio en el concesionario
- Los leads de ventas interactuaron previamente a través del agente IA

Para evitar penalizaciones, el sistema ya tiene:
- Tabla `campaign_opt_outs` para registrar bajas
- Botón "DETENER PROMOCIONES" en las campañas CTA
- Filtro de opt-out en la resolución de audiencia

---

## Flujo completo de un envío masivo con plantilla aprobada

```
CRM: usuario crea campaña
  → selecciona "Plantilla aprobada de Meta"
  → elige bandeja WhatsApp (inbox de Chatwoot)
  → elige la plantilla aprobada
  → mapea variables ({{1}} = nombre del cliente)
  ↓
CRM → API /api/envios-masivos (POST)
  → resuelve audiencia (clientes filtrados por marca/modelo/etc.)
  → inserta registros en campaign_recipients
  → encola cada destinatario en conversations_outbox
  ↓
Outbox → n8n webhook (N8N_CAMPAIGN_OUTBOUND_URL)
  → payload incluye: whatsapp_template.name, .language, .components
  ↓
n8n: detecta template_source === "aprobada"
  → llama Meta Cloud API con tipo "template"
  → NO llama la API de mensaje regular (que fallaría fuera de 24h)
  ↓
WhatsApp: entrega el mensaje al destinatario
  → respuesta del cliente abre conversación en Chatwoot (GRATIS por 24h)
```

---

## Configuración requerida en n8n

El workflow de n8n que procesa los mensajes de campaña (`N8N_CAMPAIGN_OUTBOUND_URL`) debe:

1. **Leer el campo `template_source`** del payload entrante
2. **Si `template_source === "aprobada"`**:
   - Usar el campo `whatsapp_template` del payload
   - Llamar a Meta Cloud API con:
     ```json
     {
       "messaging_product": "whatsapp",
       "to": "{{phone}}",
       "type": "template",
       "template": {
         "name": "{{whatsapp_template.name}}",
         "language": { "code": "{{whatsapp_template.language.code}}" },
         "components": "{{whatsapp_template.components}}"
       }
     }
     ```
3. **Si `template_source === "libre"`** (o no existe):
   - Comportamiento actual: enviar `text` como mensaje regular

---

## Resumen ejecutivo

| Escenario | ¿Funciona? | Costo por 500 contactos |
|---|---|---|
| Texto libre, cliente escribió hace menos de 24h | ✅ Sí | ~$0 (ventana service) |
| Texto libre, cliente sin historial reciente | ❌ No llega | $0 (pero $0 porque no llega) |
| Plantilla aprobada Marketing | ✅ Siempre funciona | ~$12.50 USD |
| Plantilla aprobada Utility | ✅ Siempre funciona | ~$2.00 USD |

**Recomendación**: Para campañas de postventa (recordatorios de mantenimiento), crear plantillas de categoría **Utility** — son más baratas y tienen mayor tasa de aprobación. Para campañas de ventas (promociones), plantillas **Marketing** — mayor costo pero necesario.
