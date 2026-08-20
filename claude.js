/* ============================================================
   claude.js — todo lo que habla con la API de Claude.
   El fetch se inyecta, así los tests lo pueden reemplazar por un mock.
   ============================================================ */

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

/* Precio por millón de tokens, para estimar el costo de cada análisis. */
const PRECIOS = {
  'claude-opus-5': { entrada: 5, salida: 25 },
  'claude-sonnet-5': { entrada: 3, salida: 15 },
  'claude-haiku-4-5': { entrada: 1, salida: 5 }
};

const MODELO_DEFAULT = 'claude-opus-5';

/* ---------------- schema de la respuesta ---------------- */

const SCHEMA_COMIDA = {
  type: 'object',
  properties: {
    titulo: { type: 'string', description: 'Nombre corto del plato, ej: "Milanesa con puré"' },
    confianza: { type: 'string', enum: ['alta', 'media', 'baja'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          porcion: { type: 'string', description: 'Cantidad estimada, ej: "150 g", "1 taza"' },
          calorias: { type: 'number' },
          proteinas: { type: 'number' },
          carbohidratos: { type: 'number' },
          grasas: { type: 'number' }
        },
        required: ['nombre', 'porcion', 'calorias', 'proteinas', 'carbohidratos', 'grasas'],
        additionalProperties: false
      }
    },
    notas: { type: 'string', description: 'Qué supuestos hiciste o qué no se ve bien en la foto' }
  },
  required: ['titulo', 'confianza', 'items', 'notas'],
  additionalProperties: false
};

/* ---------------- prompts ---------------- */

const PROMPT_PLATO = `Sos un nutricionista analizando la foto de una comida.

Identificá cada alimento del plato y estimá su porción real usando las referencias visuales disponibles (tamaño del plato, cubiertos, vaso, mano). Para cada alimento devolvé calorías y macros (proteínas, carbohidratos y grasas en gramos) de la porción estimada, no por 100 g.

Pautas:
- Contexto argentino: usá alimentos y preparaciones típicas de Argentina cuando corresponda.
- Tené en cuenta el método de cocción y el aceite o la grasa visible: fritura, salteado, plancha, horno.
- Incluí también bebidas, aderezos y salsas visibles si aportan calorías.
- Si algo no se ve con claridad, asumí la porción más probable y aclaralo en las notas.
- Poné confianza "baja" si la foto es ambigua, tiene mala luz o el alimento está tapado.
- Los números tienen que ser realistas y coherentes: 4 kcal por gramo de proteína y de carbohidratos, 9 por gramo de grasa.
- Respondé todo en español.`;

const PROMPT_ETIQUETA = `Sos un nutricionista leyendo la etiqueta nutricional de un producto envasado.

Leé la tabla de información nutricional de la foto y devolvé los valores del producto.

Pautas:
- Si la tabla está "por porción" y "por 100 g", usá la porción declarada por el envase.
- Anotá en las notas cuántas porciones trae el envase y a cuánto equivale una porción.
- Si se ve el nombre del producto, usalo como nombre del alimento.
- Si algún macro no figura en la etiqueta, estimalo y aclaralo en las notas.
- Los valores tienen que ser los de UNA porción, no los del envase entero.
- Respondé todo en español.`;

/**
 * Arma el texto del prompt: base + contexto del usuario + instrucciones de formato.
 * El contexto ayuda a que la estimación se parezca a lo que esta persona come.
 */
function construirPrompt({ modo = 'plato', contexto = null, conSchema = true, correccion = '' } = {}) {
  let txt = modo === 'etiqueta' ? PROMPT_ETIQUETA : PROMPT_PLATO;

  if (contexto) {
    const lineas = [];
    if (contexto.momento) lineas.push(`- Es la comida de: ${contexto.momento}.`);
    if (contexto.objetivo) lineas.push(`- Objetivo diario de quien come: ${contexto.objetivo} kcal.`);
    if (contexto.consumido != null) lineas.push(`- Ya lleva consumidas hoy: ${contexto.consumido} kcal.`);
    if (contexto.frecuentes && contexto.frecuentes.length) {
      lineas.push(`- Alimentos que suele comer (si reconocés alguno, usá el mismo nombre): ${contexto.frecuentes.join(', ')}.`);
    }
    if (lineas.length) {
      txt += '\n\nContexto de la persona:\n' + lineas.join('\n') +
        '\nEl contexto es solo para nombrar mejor los alimentos: no ajustes las calorías para que le cierre el objetivo.';
    }
  }

  if (correccion) {
    txt += `\n\nLa persona corrige tu estimación anterior con esto: "${correccion}"\n` +
      'Rehacé la estimación tomando esa corrección como cierta, aunque contradiga lo que creías ver.';
  }

  if (!conSchema) {
    txt += '\n\nRespondé únicamente con un objeto JSON válido, sin texto alrededor y sin bloques de código, con esta forma exacta:\n' +
      '{"titulo":string,"confianza":"alta"|"media"|"baja","items":[{"nombre":string,"porcion":string,"calorias":number,"proteinas":number,"carbohidratos":number,"grasas":number}],"notas":string}';
  }

  return txt;
}

/** Cuerpo del request. `previo` reenvía la estimación anterior para corregirla. */
function armarBody({ modelo = MODELO_DEFAULT, imagen, prompt, conSchema = true, previo = null }) {
  const contenido = [];
  if (imagen) contenido.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imagen } });
  contenido.push({ type: 'text', text: prompt });

  const mensajes = [{ role: 'user', content: contenido }];

  if (previo) {
    mensajes.push({ role: 'assistant', content: [{ type: 'text', text: JSON.stringify(previo) }] });
    mensajes.push({ role: 'user', content: [{ type: 'text', text: 'Corregí la estimación según lo que te acabo de indicar.' }] });
  }

  const body = { model: modelo, max_tokens: 4000, messages: mensajes };

  if (conSchema) body.output_config = { format: { type: 'json_schema', schema: SCHEMA_COMIDA } };

  // effort existe de la generación 4.6 en adelante; en Haiku 4.5 da error
  if (/opus-5|sonnet-5|opus-4-[678]|sonnet-4-6|fable-5/.test(modelo)) {
    body.output_config = { ...(body.output_config || {}), effort: 'medium' };
  }

  return body;
}

/* ---------------- costo ---------------- */

/** Costo en dólares de un análisis, según los tokens que informó la API. */
function costoAnalisis(usage, modelo) {
  const p = PRECIOS[modelo] || PRECIOS[MODELO_DEFAULT];
  const entrada = (Number(usage?.input_tokens) || 0) / 1e6 * p.entrada;
  const salida = (Number(usage?.output_tokens) || 0) / 1e6 * p.salida;
  return +(entrada + salida).toFixed(5);
}

function formatearCosto(usd) {
  if (!usd) return '';
  if (usd < 0.01) return `${Math.round(usd * 100 * 100) / 100} centavos`.replace('.', ',');
  return `US$ ${usd.toFixed(3).replace('.', ',')}`;
}

/* ---------------- errores ---------------- */

const REINTENTABLES = [429, 500, 502, 503, 504, 529];

function mensajeDeError(status, detalle = '') {
  if (status === 401) return 'API key inválida o vencida. Revisala en Ajustes.';
  if (status === 429) return 'Límite de uso alcanzado. Esperá un momento y probá de nuevo.';
  if (/credit|balance/i.test(detalle)) return 'Tu cuenta de Anthropic no tiene saldo.';
  if (status >= 500) return 'La API de Claude está con problemas. Probá de nuevo en un rato.';
  return `Error ${status}${detalle ? ': ' + detalle : ''}`;
}

/* ---------------- llamada con reintentos ---------------- */

const espera = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * POST a la API reintentando los errores transitorios (429 y 5xx) con backoff.
 * Los errores definitivos (401, 400) no se reintentan: no van a cambiar.
 */
async function pedirAClaude({ fetchFn, apiKey, body, señal, intentos = 3, dormir = espera, base = 800 }) {
  let ultimo = null;

  for (let i = 0; i < intentos; i++) {
    let res;
    try {
      res = await fetchFn(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': API_VERSION,
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body),
        signal: señal
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;          // cancelado a propósito
      ultimo = new Error('No se pudo conectar con la API. Revisá tu conexión a internet.');
      if (i < intentos - 1) { await dormir(base * Math.pow(2, i)); continue; }
      throw ultimo;
    }

    if (res.ok || !REINTENTABLES.includes(res.status)) return res;

    // transitorio: si la API pidió una espera puntual, la respetamos
    const sugerido = Number(res.headers?.get?.('retry-after')) * 1000;
    if (i < intentos - 1) await dormir(sugerido > 0 ? sugerido : base * Math.pow(2, i));
    else return res;
  }

  throw ultimo || new Error('No se pudo contactar a la API.');
}

/* ---------------- interpretación de la respuesta ---------------- */

/** Saca el JSON de la respuesta y normaliza los items. Tira Error si no sirve. */
function interpretarRespuesta(data) {
  if (data?.stop_reason === 'refusal') {
    throw new Error('Claude no pudo procesar esta imagen. Probá con otra foto.');
  }

  const texto = (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();

  let parsed;
  try {
    parsed = JSON.parse(texto);
  } catch {
    // el modelo pudo haber envuelto el JSON en texto o en un bloque de código
    const ini = texto.indexOf('{'), fin = texto.lastIndexOf('}');
    try { parsed = JSON.parse(texto.slice(ini, fin + 1)); }
    catch { throw new Error('La respuesta no se pudo interpretar. Probá de nuevo.'); }
  }

  if (!parsed || !Array.isArray(parsed.items) || !parsed.items.length) {
    throw new Error('Claude no reconoció ningún alimento en la foto. Probá con otra imagen.');
  }

  parsed.titulo = String(parsed.titulo || 'Comida');
  parsed.confianza = ['alta', 'media', 'baja'].includes(parsed.confianza) ? parsed.confianza : 'media';
  parsed.notas = String(parsed.notas || '');
  parsed.items = parsed.items.map(i => ({
    nombre: String(i.nombre || 'Alimento'),
    porcion: String(i.porcion || ''),
    calorias: Number(i.calorias) || 0,
    proteinas: Number(i.proteinas) || 0,
    carbohidratos: Number(i.carbohidratos) || 0,
    grasas: Number(i.grasas) || 0
  }));

  return parsed;
}

/* ---------------- orquestador ---------------- */

/**
 * Analiza una imagen y devuelve { ...estimación, costo, tokens }.
 * Si el modelo rechaza el structured output, reintenta pidiendo JSON por prompt.
 */
async function analizarImagen({
  fetchFn, apiKey, modelo = MODELO_DEFAULT, imagen,
  modo = 'plato', contexto = null, correccion = '', previo = null,
  señal, dormir
}) {
  if (!apiKey) throw new Error('Falta la API key. Cargala en Ajustes.');

  const pedir = (conSchema) => pedirAClaude({
    fetchFn, apiKey, señal, dormir,
    body: armarBody({
      modelo, imagen, conSchema, previo,
      prompt: construirPrompt({ modo, contexto, conSchema, correccion })
    })
  });

  let res = await pedir(true);

  if (!res.ok) {
    let detalle = '';
    try { detalle = (await res.clone().json())?.error?.message || ''; } catch { /* sin cuerpo legible */ }

    // el modelo no soporta structured outputs: se reintenta pidiendo JSON en el prompt
    if (res.status === 400 && /output_config|format|schema|effort/i.test(detalle)) {
      res = await pedir(false);
      if (!res.ok) {
        let d2 = '';
        try { d2 = (await res.json())?.error?.message || ''; } catch { /* sin cuerpo legible */ }
        throw new Error(mensajeDeError(res.status, d2));
      }
    } else {
      throw new Error(mensajeDeError(res.status, detalle));
    }
  }

  const data = await res.json();
  const parsed = interpretarRespuesta(data);

  parsed.tokens = {
    entrada: data?.usage?.input_tokens || 0,
    salida: data?.usage?.output_tokens || 0
  };
  parsed.costo = costoAnalisis(data?.usage, modelo);
  parsed.modelo = modelo;

  return parsed;
}

if (typeof window !== 'undefined') {
  window.__claude = {
    API_URL, PRECIOS, MODELO_DEFAULT, SCHEMA_COMIDA, REINTENTABLES,
    construirPrompt, armarBody, costoAnalisis, formatearCosto,
    mensajeDeError, pedirAClaude, interpretarRespuesta, analizarImagen
  };
}
