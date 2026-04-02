const fs = require('fs');

const wf = JSON.parse(fs.readFileSync('d:/Proyectos/ultimo/AutomotrizProjectother/ventas_ia_workflow_backup.json', 'utf8'));

// Write the complete Build AI Prompt code from scratch — no string manipulation, no replace()
const BUILD_AI_PROMPT_CODE = `const inputData = $node['Parse Input & Load History'].json;
const catalogRaw = $input.first().json;

const clienteDb = catalogRaw._cliente || null;
const vehiculosDb = catalogRaw._vehiculos || [];

const clienteNombre = (clienteDb && clienteDb.id && (clienteDb.nombre || clienteDb.apellido))
  ? [clienteDb.nombre, clienteDb.apellido].filter(Boolean).join(' ').trim()
  : null;
const esClienteNuevo = !clienteDb || !clienteDb.id;

const phone = inputData.phone;
const text = inputData.text;
const history = inputData._conversation_history || [];
const paso = inputData._paso_actual || 1;

let catalogText = '';
try {
  const modelos = catalogRaw.modelos || [];
  if (modelos.length > 0) {
    catalogText += '=== VEHICULOS DISPONIBLES ===\\n';
    for (const m of modelos) {
      for (const v of (m.versiones || [])) {
        const precioFinal = v.descuento_porcentaje > 0
          ? v.precio_lista * (1 - v.descuento_porcentaje / 100)
          : v.precio_lista;
        const stockStr = v.en_stock ? 'EN STOCK' : ('BAJO PEDIDO (' + v.tiempo_entrega_dias + ' dias)');
        catalogText += '\\n- ' + m.nombre_completo + ' ' + v.nombre_version;
        catalogText += ' (modelo_id: ' + m.id + ', version_id: ' + v.version_id + ')\\n';
        catalogText += '  Precio: ' + v.precio_lista;
        if (v.descuento_porcentaje > 0) {
          catalogText += ' | Descuento: ' + v.descuento_porcentaje + '% | Precio final: ' + precioFinal.toFixed(0);
        }
        catalogText += '\\n  Disponibilidad: ' + stockStr + '\\n';
        if (v.colores_disponibles && v.colores_disponibles.length > 0) {
          const colores = Array.isArray(v.colores_disponibles) ? v.colores_disponibles.join(', ') : v.colores_disponibles;
          catalogText += '  Colores: ' + colores + '\\n';
        }
        if (v.descripcion_equipamiento) {
          catalogText += '  Equipamiento: ' + v.descripcion_equipamiento + '\\n';
        }
      }
    }
  } else {
    catalogText = 'NO HAY VEHICULOS DISPONIBLES EN EL CATALOGO.\\n';
  }
} catch(e) {
  catalogText = 'ERROR cargando catalogo: ' + e.message;
}

let clienteContext = '';
if (!esClienteNuevo) {
  const vehiculosStr = vehiculosDb.length > 0
    ? vehiculosDb.map(function(v) {
        return v.brand + ' ' + v.model + ' ' + v.year +
          (v.plate ? ' (' + v.plate + ')' : '') +
          (v.current_mileage > 0 ? ' | ' + v.current_mileage + ' km' : '');
      }).join(', ')
    : 'ninguno registrado';
  clienteContext = '=== CLIENTE REGISTRADO ===\\n' +
    'Nombre: ' + clienteNombre + '\\n' +
    'Telefono: ' + phone + '\\n' +
    'Vehiculos actuales: ' + vehiculosStr + '\\n';
} else {
  clienteContext = '=== CLIENTE NUEVO (primera vez) ===\\nTelefono: ' + phone + '\\n';
}

const paso1Instruccion = esClienteNuevo
  ? 'Saluda y pide el nombre del cliente.'
  : 'Saluda a ' + clienteNombre + ' por su nombre y pregunta en que le puedes ayudar hoy. NO pidas el nombre.';

const systemMsg =
  'Eres un asesor de ventas IA de una concesionaria automotriz. Atiendes por WhatsApp con calidez, profesionalismo y emojis amigables.\\n\\n' +
  '=== REGLA ABSOLUTA ===\\n' +
  'NUNCA inventes marcas, modelos, especificaciones ni precios.\\n' +
  'Solo menciona vehiculos de la seccion VEHICULOS DISPONIBLES. Si no hay, di que no tienes disponibles y ofrece hablar con un asesor.\\n' +
  'Si piden una marca/modelo que NO esta en el catalogo: di que no lo manejas y muestra los disponibles.\\n' +
  'Precios SOLO del catalogo, exactos, sin redondear ni estimar.\\n\\n' +
  clienteContext + '\\n' +
  catalogText + '\\n' +
  '=== RESPUESTA: SIEMPRE JSON ESTRICTO ===\\n' +
  '{\\n  "action": "continue" | "save_lead" | "escalate" | "redirect_taller",\\n  "paso_actual": <1-7>,\\n  "message": "<mensaje para WhatsApp>",\\n  "lead_data": {}\\n}\\n\\n' +
  '=== MENU PRINCIPAL ===\\n' +
  'Muestra SOLO al inicio o si no se ha indicado intencion:\\n' +
  '1 - Comprar un auto nuevo\\n' +
  '2 - Mantenimiento / taller\\n' +
  '3 - Hablar con un asesor\\n\\n' +
  '=== ENRUTAMIENTO ===\\n' +
  'Mantenimiento/taller/servicio/aceite -> action: redirect_taller\\n' +
  'Asesor/humano -> action: escalate\\n' +
  'Comprar/cotizar -> flujo de compra\\n\\n' +
  '=== FLUJO DE COMPRA (Paso: ' + paso + '/7) ===\\n' +
  'PASO 1: ' + paso1Instruccion + '\\n' +
  'PASO 2: Pregunta uso del vehiculo y numero de personas.\\n' +
  'PASO 3: Presenta 2-3 modelos del catalogo con emojis.\\n' +
  'PASO 4: 1-2 opciones concretas con precio y disponibilidad.\\n' +
  'PASO 5: Contado o financiamiento.\\n' +
  'PASO 6: Tiempo de entrega y documentacion requerida.\\n' +
  'PASO 7A: Resumen completo, pide confirmacion -> action: continue, paso_actual: 7.\\n' +
  'PASO 7B: Si confirma -> action: save_lead con lead_data completo.\\n\\n' +
  'CRITICO: NUNCA uses save_lead al presentar resumen. Solo al confirmar.\\n\\n' +
  '=== REGLAS GENERALES ===\\n' +
  '- Espanol, amigable, maximo 280 palabras\\n' +
  '- Usa emojis para ser cercano: autos, check, estrella, etc\\n' +
  '- NUNCA inventes precios fuera del catalogo\\n' +
  '- NUNCA repitas preguntas ya respondidas\\n' +
  '- precio_final = precio_lista x (1 - descuento/100)';

const messages = [{ role: 'system', content: systemMsg }]
  .concat(history)
  .concat([{ role: 'user', content: text }]);

return [{ json: { phone, text, session_id: inputData.session_id, _paso_actual: paso, _messages: messages } }];`;

for (const n of wf.nodes) {
  if (n.name === 'Build AI Prompt') {
    n.parameters.jsCode = BUILD_AI_PROMPT_CODE;
    console.log('Replaced Build AI Prompt code completely');
  }
}

const payload = {
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings: {
    executionOrder: wf.settings.executionOrder,
    saveDataErrorExecution: wf.settings.saveDataErrorExecution,
    saveDataSuccessExecution: wf.settings.saveDataSuccessExecution,
    saveManualExecutions: wf.settings.saveManualExecutions,
    callerPolicy: wf.settings.callerPolicy,
  },
  staticData: wf.staticData || null
};

fs.writeFileSync('d:/Proyectos/ultimo/AutomotrizProjectother/ventas_ia_payload.json', JSON.stringify(payload));
console.log('Payload saved:', fs.statSync('d:/Proyectos/ultimo/AutomotrizProjectother/ventas_ia_payload.json').size, 'bytes');

// Quick syntax check on the code we're injecting
try {
  new Function(BUILD_AI_PROMPT_CODE.replace(/\$node|\$input|\$items/g, 'dummy'));
  console.log('Syntax check: OK');
} catch(e) {
  console.log('Syntax check: FAILED -', e.message);
}
