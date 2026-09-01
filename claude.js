/* ============================================================
   claude.js — todo lo que habla con la API de Claude.
   El fetch se inyecta, así los tests lo pueden reemplazar por un mock.
   ============================================================ */

const API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';

/* ---------------- de dónde sale el acceso a la API ---------------- */

/**
 * Hay dos caminos posibles y se elige uno solo:
 *
 * - Con clave propia cargada en Ajustes, se llama derecho a la API.
 * - Sin clave, se pasa por el proxy (un Worker que tiene la clave del lado
 *   servidor). Así el celular no necesita configurar nada.
 *
 * La clave propia gana: si alguien se tomó el trabajo de cargarla, es porque
 * quiere usar esa. El proxy es el camino por defecto, no una imposición.
 */
/*
 * El tope de la foto, en bytes.
 *
 * No es por lo que sale mandarla —eso ya lo resuelve el redimensionado, que
 * baja una foto de celular a unos 60 kB— sino por leerla: `readAsDataURL` de un
 * archivo de veinte megas arma un string de treinta y pico y en un celular
 * modesto la pestaña se cae sin decir nada. Vale mas negarse y explicar por que.
 */
const TOPE_FOTO = 14 * 1024 * 1024;

/** El aviso si la foto no entra, o null si esta bien. Aparte para poder probarlo. */
function avisoPorPeso(bytes) {
  const n = Number(bytes) || 0;
  if (n <= TOPE_FOTO) return null;
  const mb = (n / 1024 / 1024).toFixed(1);
  const tope = Math.round(TOPE_FOTO / 1024 / 1024);
  return `Esa foto pesa ${mb} MB y el máximo son ${tope}. Sacala de nuevo con menos resolución.`;
}

function accesoApi(cfg = {}, config = null) {
  const app = config || (typeof CONFIG_APP !== 'undefined' ? CONFIG_APP : {});
  const apiKey = String(cfg.apiKey || '').trim();

  if (apiKey) return { apiKey, proxyUrl: '' };
  return { apiKey: '', proxyUrl: String(app.proxyUrl || '').trim() };
}

/** Si esto es falso, no hay forma de analizar nada y conviene decirlo antes. */
function hayAcceso(cfg, config = null) {
  const a = accesoApi(cfg, config);
  return !!(a.apiKey || a.proxyUrl);
}

const SIN_ACCESO = 'Falta la API key. Cargala en Ajustes.';

/* Precio por millón de tokens, para estimar el costo de cada análisis. */
const PRECIOS = {
  'claude-opus-5': { entrada: 5, salida: 25 },
  'claude-sonnet-5': { entrada: 3, salida: 15 },
  'claude-haiku-4-5': { entrada: 1, salida: 5 }
};

/*
 * Sonnet por defecto en vez de Opus: baja el costo a un tercio y en un plato
 * servido la diferencia casi no se nota. Lo que limita la precision ahi no es el
 * modelo, es que la porcion se estima a ojo desde una foto.
 */
const MODELO_DEFAULT = 'claude-sonnet-5';

/* Leer una etiqueta es transcribir, no estimar: Haiku alcanza y sale diez veces
   menos. Pagar el modelo grande para copiar numeros de una tabla es tirar plata. */
const MODELO_TRANSCRIPCION = 'claude-haiku-4-5';

/* Cuando el modelo avisa que no vio bien, ahi si conviene pagar el grande. Se
   ofrece, no se hace solo: la persona decide si vale los centavos. */
const MODELO_ESCALADO = 'claude-opus-5';

/** Con que modelo conviene arrancar, segun lo que se este mirando. */
function modeloPara(modo, modeloBase = MODELO_DEFAULT) {
  return modo === 'etiqueta' ? MODELO_TRANSCRIPCION : modeloBase;
}

/** Si vale la pena ofrecer una segunda pasada con el modelo grande. */
function convieneEscalar(resultado, modeloUsado) {
  if (!resultado || modeloUsado === MODELO_ESCALADO) return false;
  return resultado.confianza === 'baja';
}

/* Cada modo elige modelo y esfuerzo: la diferencia real de plata está acá. */
const PRECISIONES = {
  rapido: { modelo: 'claude-haiku-4-5', effort: null, nombre: 'Rápido', detalle: 'Haiku · más barato, para platos simples' },
  normal: { modelo: null, effort: 'medium', nombre: 'Normal', detalle: 'El modelo elegido, esfuerzo medio' },
  preciso: { modelo: null, effort: 'high', nombre: 'Preciso', detalle: 'Más esfuerzo: platos mezclados o difíciles de ver' }
};

/** Resuelve con qué modelo y esfuerzo se va a analizar. */
function resolverPrecision(precision, modeloBase = MODELO_DEFAULT) {
  const p = PRECISIONES[precision] || PRECISIONES.normal;
  return { modelo: p.modelo || modeloBase, effort: p.effort };
}

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
          grasas: { type: 'number' },
          fibra: { type: 'number', description: 'Gramos de fibra; 0 si no se puede estimar' },
          azucar: { type: 'number', description: 'Gramos de azúcar; 0 si no se puede estimar' },
          sodio: { type: 'number', description: 'Miligramos de sodio; 0 si no se puede estimar' }
        },
        required: ['nombre', 'porcion', 'calorias', 'proteinas', 'carbohidratos', 'grasas', 'fibra', 'azucar', 'sodio'],
        additionalProperties: false
      }
    },
    notas: { type: 'string', description: 'Qué supuestos hiciste o qué no se ve bien en la foto' },
    /* De qué está hecho el plato. Con esto las reglas de cada patrón —keto,
       mediterráneo, vegetariano— se resuelven localmente: una sola llamada
       alcanza para juzgar cualquier modo, presente o futuro. */
    perfil: {
      type: 'object',
      properties: {
        vegetales: { type: 'boolean', description: 'Tiene verduras o ensalada en cantidad visible' },
        frutas: { type: 'boolean' },
        legumbres: { type: 'boolean', description: 'Lentejas, garbanzos, porotos' },
        pescado: { type: 'boolean' },
        carneRoja: { type: 'boolean', description: 'Vaca, cerdo o cordero' },
        aveOHuevo: { type: 'boolean' },
        lacteos: { type: 'boolean' },
        cereales: { type: 'boolean', description: 'Pan, pasta, arroz, avena' },
        integral: { type: 'boolean', description: 'Los cereales que hay son integrales' },
        aceiteOliva: { type: 'boolean' },
        frutosSecos: { type: 'boolean' },
        ultraprocesado: { type: 'boolean', description: 'Fiambres, snacks de paquete, gaseosa, congelados listos' },
        azucarAgregada: { type: 'boolean', description: 'Azúcar, dulce, postre, bebida azucarada' },
        frito: { type: 'boolean' },
        gluten: { type: 'boolean', description: 'Trigo, avena, cebada o centeno' },
        vegetariano: { type: 'boolean', description: 'No tiene carne, ave ni pescado' }
      },
      required: ['vegetales', 'frutas', 'legumbres', 'pescado', 'carneRoja', 'aveOHuevo',
                 'lacteos', 'cereales', 'integral', 'aceiteOliva', 'frutosSecos',
                 'ultraprocesado', 'azucarAgregada', 'frito', 'gluten', 'vegetariano'],
      additionalProperties: false
    },
    /*
     * Lo que la foto NO puede mostrar.
     *
     * Unas empanadas de carne, de humita y de jamón y queso son idénticas por
     * fuera, y la diferencia entre ellas es real: cambian los macros y, en
     * keto, cambian si el plato entra o no. Hasta acá el modelo elegía la más
     * probable y lo anotaba en las notas, donde nadie lo lee.
     *
     * En vez de preguntar y volver a llamar a la API —otra espera, otro
     * costo—, se le piden TODAS las variantes de una: la app ya tiene los
     * números de cada una y aplicar la elección es instantáneo y gratis.
     *
     * Solo cuando la diferencia importa. Preguntar por cosas que cambian
     * treinta calorías convierte cada foto en un formulario.
     */
    ambiguedad: {
      type: ['object', 'null'],
      description: 'Solo si de verdad no se puede saber de la foto y la diferencia entre las opciones supera el 15% de las calorías del plato o cambia los macros de forma clara. Si no, null.',
      properties: {
        pregunta: { type: 'string', description: 'Corta y directa, ej: "¿De qué son las empanadas?"' },
        item: { type: 'string', description: 'El nombre exacto, tal cual figura en items, del alimento del que se duda' },
        opciones: {
          type: 'array',
          description: 'De 2 a 5. La primera tiene que ser la que ya usaste en items: es la que queda si no se elige nada.',
          items: {
            type: 'object',
            properties: {
              etiqueta: { type: 'string', description: 'Corta, ej: "De carne"' },
              calorias: { type: 'number', description: 'De ese alimento con esta opción, no del plato entero' },
              proteinas: { type: 'number' },
              carbohidratos: { type: 'number' },
              grasas: { type: 'number' }
            },
            required: ['etiqueta', 'calorias', 'proteinas', 'carbohidratos', 'grasas'],
            additionalProperties: false
          }
        }
      },
      required: ['pregunta', 'item', 'opciones'],
      additionalProperties: false
    }
  },
  required: ['titulo', 'confianza', 'items', 'notas', 'perfil', 'ambiguedad'],
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
- Fibra, azúcar y sodio: estimalos si el alimento los tiene de forma evidente (una fruta tiene fibra, una gaseosa azúcar, un embutido sodio). Si no podés, poné 0; es mejor que inventar.
- Respondé todo en español.
- El campo "perfil" describe de qué está hecho el plato, para poder juzgarlo contra distintas dietas. Marcá cada cosa solo si está presente de forma clara: no adivines.
- El campo "ambiguedad" es para lo que la foto no puede mostrar: el relleno de una empanada o una tarta, si la milanesa es de carne o de soja, si el yogur es entero o descremado. Usalo SOLO cuando no se pueda saber mirando y la diferencia sea grande. Poné primero la opción que ya usaste en los items. Si la foto alcanza para saberlo, va null.`;

const PROMPT_ETIQUETA = `Sos un nutricionista leyendo la etiqueta nutricional de un producto envasado.

Leé la tabla de información nutricional de la foto y devolvé los valores del producto.

Pautas:
- Si la tabla está "por porción" y "por 100 g", usá la porción declarada por el envase.
- Anotá en las notas cuántas porciones trae el envase y a cuánto equivale una porción.
- Si se ve el nombre del producto, usalo como nombre del alimento.
- Si algún macro no figura en la etiqueta, estimalo y aclaralo en las notas.
- Los valores tienen que ser los de UNA porción, no los del envase entero.
- Si la etiqueta trae fibra, azúcares o sodio, cargalos; si no figuran, poné 0.
- Respondé todo en español.`;

/**
 * Arma el texto del prompt: base + contexto del usuario + instrucciones de formato.
 * El contexto ayuda a que la estimación se parezca a lo que esta persona come.
 */
function construirPrompt({ modo = 'plato', contexto = null, conSchema = true, correccion = '', cantidadFotos = 1 } = {}) {
  let txt = modo === 'etiqueta' ? PROMPT_ETIQUETA : PROMPT_PLATO;

  if (cantidadFotos > 1) {
    txt += `

Hay ${cantidadFotos} fotos y son de la MISMA comida (por ejemplo el plato, la bebida y el postre). ` +
      'Devolvé una sola lista con todos los alimentos que veas entre todas, sin contar dos veces lo que aparezca repetido en varias fotos.';
  }

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
function armarBody({ modelo = MODELO_DEFAULT, imagen, imagenes, prompt, conSchema = true, previo = null, stream = false, effort = 'medium' }) {
  const contenido = [];

  // varias fotos del mismo momento (el plato, la bebida, el postre) van juntas
  // en un solo mensaje: es una sola comida, no tres análisis sueltos.
  const fotos = (imagenes && imagenes.length) ? imagenes : (imagen ? [imagen] : []);
  for (const f of fotos) {
    contenido.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: f } });
  }

  contenido.push({ type: 'text', text: prompt });

  const mensajes = [{ role: 'user', content: contenido }];

  if (previo) {
    mensajes.push({ role: 'assistant', content: [{ type: 'text', text: JSON.stringify(previo) }] });
    mensajes.push({ role: 'user', content: [{ type: 'text', text: 'Corregí la estimación según lo que te acabo de indicar.' }] });
  }

  const body = { model: modelo, max_tokens: 4000, messages: mensajes };
  if (stream) body.stream = true;

  if (conSchema) body.output_config = { format: { type: 'json_schema', schema: SCHEMA_COMIDA } };

  // effort existe de la generación 4.6 en adelante; en Haiku 4.5 da error
  if (effort && /opus-5|sonnet-5|opus-4-[678]|sonnet-4-6|fable-5/.test(modelo)) {
    body.output_config = { ...(body.output_config || {}), effort };
  }

  return body;
}

/* ---------------- sugerencias ---------------- */

const SCHEMA_SUGERENCIAS = {
  type: 'object',
  properties: {
    opciones: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          porque: { type: 'string', description: 'Una línea: por qué le sirve ahora' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                nombre: { type: 'string' },
                porcion: { type: 'string' },
                calorias: { type: 'number' },
                proteinas: { type: 'number' },
                carbohidratos: { type: 'number' },
                grasas: { type: 'number' }
              },
              required: ['nombre', 'porcion', 'calorias', 'proteinas', 'carbohidratos', 'grasas'],
              additionalProperties: false
            }
          }
        },
        required: ['titulo', 'porque', 'items'],
        additionalProperties: false
      }
    }
  },
  required: ['opciones'],
  additionalProperties: false
};

/** Prompt para pedir qué comer con lo que queda del día. */
/*
 * Las reglas del modo, en palabras y arriba de todo.
 *
 * El prompt no sabía en qué modo estaba la persona: pedía "3 opciones que
 * entren en las calorías" y listo, así que a alguien en keto le proponía
 * empanadas de jamón y queso. Las calorías son la mitad del problema; la otra
 * mitad es qué se puede comer.
 */
function reglasDelModo(modo) {
  if (!modo) return '';

  const lineas = [`La persona está haciendo ${modo.nombre}: ${modo.resumen.toLowerCase()}.`];

  if (modo.carbosMaxDia) {
    lineas.push(
      `REGLA QUE NO SE NEGOCIA: como máximo ${modo.carbosMaxDia} g de carbohidratos netos POR DÍA, contando todo lo que ya comió.`,
      'Queda afuera todo lo que tenga harina, masa, pan, fideos, arroz, papa, batata, choclo, legumbres, azúcar, miel o fruta dulce.',
      'Nada de empanadas, tartas, sándwiches, milanesas empanadas, pizza ni postres.',
      'Sí entran: carne, pollo, pescado, huevo, quesos, fiambres sin azúcar, verduras de hoja, palta, aceitunas, frutos secos, aceite y manteca.'
    );
  }

  /* Lo que cada patrón deja afuera, dicho como lo diría una persona. Son las
     mismas reglas que después aplica comidaApta() para juzgar el plato. */
  const DURAS = {
    vegetariana: 'REGLA QUE NO SE NEGOCIA: nada de carne, pollo ni pescado.',
    singluten: 'REGLA QUE NO SE NEGOCIA: nada con gluten (trigo, avena, cebada, centeno).',
    sinlactosa: 'REGLA QUE NO SE NEGOCIA: nada de lácteos.',
    paleo: 'REGLA QUE NO SE NEGOCIA: nada de cereales, legumbres, lácteos ni azúcar.',
    mediterranea: 'Nada de ultraprocesados ni azúcar agregada. La carne roja, poca y de vez en cuando.',
    antiinflamatoria: 'Nada de ultraprocesados ni azúcar agregada.',
    dash: 'Poco sodio: nada de fiambres, embutidos, enlatados ni snacks salados.',
    flexi: 'Mayormente vegetal: la carne aparece poco.',
    proteina: 'La proteína manda: que cada opción la traiga de verdad.'
  };
  if (DURAS[modo.regla]) lineas.push(DURAS[modo.regla]);
  if (modo.detalle) lineas.push(modo.detalle);

  return lineas.join('\n') + '\n\n';
}

function promptSugerencias({ margen, momento, faltaProteina, frecuentes = [], modo = null, conSchema = true }) {
  const techo = modo?.carbosMaxDia;

  let txt = `Sos un nutricionista que arma opciones de comida concretas.

${reglasDelModo(modo)}A esta persona le quedan ${margen.kcal} kcal para cerrar el día y está por comer ${momento}.
Le faltan todavía ${margen.prot} g de proteína y ${margen.gras} g de grasa.
${techo
    ? `De carbohidratos le quedan ${margen.carb} g y eso es un TECHO: cada opción tiene que quedar por debajo, no acercarse.`
    : `De carbohidratos le faltan ${margen.carb} g.`}

Proponé 3 opciones distintas que entren en esas calorías, con alimentos reales y porciones concretas.

Pautas:
- Comida argentina, de las que se consiguen en cualquier kiosco, verdulería o casa.
- Cada opción tiene que sumar cerca de las calorías que quedan, nunca pasarse.
- Que sean cosas distintas entre sí: no tres versiones de lo mismo.
- Si una opción no cumple las reglas del modo, no la propongas: es preferible
  una sola opción buena que tres que la persona no puede comer.`;

  if (faltaProteina) {
    txt += '\n- Priorizá proteína: es lo que más le está faltando hoy.';
  }

  if (frecuentes.length) {
    txt += `\n- Si podés, usá alimentos que ya come: ${frecuentes.join(', ')}.`;
  }

  txt += '\n- Respondé todo en español.';

  if (!conSchema) {
    txt += '\n\nRespondé únicamente con un objeto JSON válido con esta forma:\n' +
      '{"opciones":[{"titulo":string,"porque":string,"items":[{"nombre":string,"porcion":string,"calorias":number,"proteinas":number,"carbohidratos":number,"grasas":number}]}]}';
  }

  return txt;
}

/** Pide 3 opciones de comida que entren en las calorías que quedan. */
async function sugerirComida({
  fetchFn, apiKey, proxyUrl = '', modelo = MODELO_DEFAULT, margen, momento = 'la próxima comida',
  faltaProteina = false, frecuentes = [], modo = null, señal, dormir
}) {
  if (!apiKey && !proxyUrl) throw new Error(SIN_ACCESO);
  if (!margen || margen.kcal < 100) throw new Error('Te quedan muy pocas calorías para sugerirte algo.');

  const body = {
    model: modelo,
    max_tokens: 2000,
    messages: [{ role: 'user', content: [{ type: 'text', text: promptSugerencias({ margen, momento, faltaProteina, frecuentes, modo }) }] }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA_SUGERENCIAS } }
  };

  const res = await pedirAClaude({ fetchFn, apiKey, proxyUrl, body, señal, dormir });

  if (!res.ok) {
    let detalle = '';
    try { detalle = (await res.json())?.error?.message || ''; } catch { /* sin cuerpo */ }
    throw new Error(mensajeDeError(res.status, detalle, !!proxyUrl));
  }

  const data = await res.json();
  const texto = (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();

  let parsed;
  try {
    parsed = JSON.parse(texto);
  } catch {
    const ini = texto.indexOf('{'), fin = texto.lastIndexOf('}');
    try { parsed = JSON.parse(texto.slice(ini, fin + 1)); }
    catch { throw new Error('No pude leer las sugerencias. Probá de nuevo.'); }
  }

  const opciones = (parsed?.opciones || []).map(o => ({
    titulo: String(o.titulo || 'Opción'),
    porque: String(o.porque || ''),
    items: (o.items || []).map(i => ({
      nombre: String(i.nombre || 'Alimento'),
      porcion: String(i.porcion || ''),
      calorias: Number(i.calorias) || 0,
      proteinas: Number(i.proteinas) || 0,
      carbohidratos: Number(i.carbohidratos) || 0,
      grasas: Number(i.grasas) || 0
    }))
  })).filter(o => o.items.length);

  if (!opciones.length) throw new Error('No pude leer las sugerencias. Probá de nuevo.');

  return {
    opciones,
    costo: costoAnalisis(data?.usage, modelo),
    tokens: { entrada: data?.usage?.input_tokens || 0, salida: data?.usage?.output_tokens || 0 },
    modelo
  };
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

function mensajeDeError(status, detalle = '', porProxy = false) {
  // Con el proxy no hay nada que arreglar en Ajustes: la clave vive en el Worker.
  if (status === 401) {
    return porProxy
      ? 'El proxy tiene una clave inválida o vencida. Hay que cargarla de nuevo en Cloudflare.'
      : 'API key inválida o vencida. Revisala en Ajustes.';
  }
  if (status === 403 && porProxy) return 'El proxy rechazó el pedido: este origen no está en su lista.';
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
async function pedirAClaude({ fetchFn, apiKey, proxyUrl = '', body, señal, intentos = 3, dormir = espera, base = 800 }) {
  let ultimo = null;

  // Por el proxy no viaja ninguna credencial: la pone el Worker del otro lado.
  const url = proxyUrl || API_URL;
  const headers = proxyUrl
    ? { 'content-type': 'application/json', 'anthropic-version': API_VERSION }
    : {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': API_VERSION,
        'anthropic-dangerous-direct-browser-access': 'true'
      };

  for (let i = 0; i < intentos; i++) {
    let res;
    try {
      res = await fetchFn(url, {
        method: 'POST',
        headers,
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

/* ---------------- streaming ---------------- */

/**
 * Lee una respuesta SSE de la API y va entregando el texto a medida que llega.
 * Devuelve el mensaje completo con la misma forma que una respuesta normal,
 * así el resto del código no se entera de si vino en streaming o de una.
 */
async function leerStream(res, onProgreso) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  let buffer = '';
  let texto = '';
  const usage = { input_tokens: 0, output_tokens: 0 };
  let stopReason = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // los eventos vienen separados por línea en blanco
    const partes = buffer.split('\n\n');
    buffer = partes.pop() || '';

    for (const parte of partes) {
      for (const linea of parte.split('\n')) {
        if (!linea.startsWith('data:')) continue;

        const crudo = linea.slice(5).trim();
        if (!crudo || crudo === '[DONE]') continue;

        let evento;
        try { evento = JSON.parse(crudo); } catch { continue; }

        if (evento.type === 'content_block_delta' && evento.delta?.type === 'text_delta') {
          texto += evento.delta.text;
          if (onProgreso) onProgreso(texto);
        } else if (evento.type === 'message_start') {
          usage.input_tokens = evento.message?.usage?.input_tokens || 0;
        } else if (evento.type === 'message_delta') {
          usage.output_tokens = evento.usage?.output_tokens || usage.output_tokens;
          stopReason = evento.delta?.stop_reason || stopReason;
        }
      }
    }
  }

  return {
    content: [{ type: 'text', text: texto }],
    stop_reason: stopReason,
    usage
  };
}

/**
 * Los nombres de alimento que ya se pueden leer del JSON incompleto.
 * Sirve para mostrar avance real mientras el modelo escribe.
 */
function alimentosParciales(textoParcial) {
  const nombres = [];
  const re = /"nombre"\s*:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(textoParcial || '')) !== null) nombres.push(m[1]);
  return nombres;
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
    grasas: Number(i.grasas) || 0,
    fibra: Number(i.fibra) || 0,
    azucar: Number(i.azucar) || 0,
    sodio: Number(i.sodio) || 0
  }));

  return parsed;
}

/* ---------------- orquestador ---------------- */

/**
 * Analiza una imagen y devuelve { ...estimación, costo, tokens }.
 * Si el modelo rechaza el structured output, reintenta pidiendo JSON por prompt.
 */
async function analizarImagen({
  fetchFn, apiKey, proxyUrl = '', modelo = MODELO_DEFAULT, imagen, imagenes,
  modo = 'plato', contexto = null, correccion = '', previo = null,
  señal, dormir, cache = null, onProgreso = null, precision = 'normal'
}) {
  if (!apiKey && !proxyUrl) throw new Error(SIN_ACCESO);

  const elegido = resolverPrecision(precision, modeloPara(modo, modelo));
  modelo = elegido.modelo;

  // La misma foto no se paga dos veces. Una corrección sí vuelve a preguntar:
  // ahí justamente se quiere una respuesta distinta.
  const fotos = (imagenes && imagenes.length) ? imagenes : (imagen ? [imagen] : []);
  const huella = cache && !correccion ? cache.huella(fotos.join('|'), modo + ':' + precision) : null;
  if (huella) {
    const guardado = cache.leer(huella);
    if (guardado) return { ...guardado, deCache: true, costo: 0, tokens: { entrada: 0, salida: 0 } };
  }

  // el streaming solo se pide si hay quien escuche el avance
  const enStreaming = !!onProgreso;

  const pedir = (conSchema) => pedirAClaude({
    fetchFn, apiKey, proxyUrl, señal, dormir,
    body: armarBody({
      modelo, imagenes: fotos, conSchema, previo, stream: enStreaming, effort: elegido.effort,
      prompt: construirPrompt({ modo, contexto, conSchema, correccion, cantidadFotos: fotos.length })
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
        throw new Error(mensajeDeError(res.status, d2, !!proxyUrl));
      }
    } else {
      throw new Error(mensajeDeError(res.status, detalle, !!proxyUrl));
    }
  }

  const data = enStreaming ? await leerStream(res, onProgreso) : await res.json();
  const parsed = interpretarRespuesta(data);

  parsed.tokens = {
    entrada: data?.usage?.input_tokens || 0,
    salida: data?.usage?.output_tokens || 0
  };
  parsed.costo = costoAnalisis(data?.usage, modelo);
  parsed.modelo = modelo;
  parsed.deCache = false;

  if (huella) cache.guardar(huella, parsed);

  return parsed;
}

if (typeof window !== 'undefined') {
  window.__claude = {
    API_URL, PRECIOS, MODELO_DEFAULT, SCHEMA_COMIDA, REINTENTABLES,
    PRECISIONES, resolverPrecision,
    SCHEMA_SUGERENCIAS, promptSugerencias, sugerirComida,
    construirPrompt, armarBody, costoAnalisis, formatearCosto,
    leerStream, alimentosParciales,
    mensajeDeError, pedirAClaude, interpretarRespuesta, analizarImagen
  };
}
