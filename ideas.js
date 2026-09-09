/* ============================================================
   ideas.js — pedirle a Claude que sugiera QUE comer.

   Salio de claude.js. Todo lo demas de ese archivo mira una foto de algo que ya
   se comio; esto es la pregunta al reves —que entra en lo que queda del dia— y
   tiene su propio prompt, su propio schema y sus propias reglas de modo.
   ============================================================ */

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
    /* 2000 no alcanzaba: los modelos que razonan se gastaban el presupuesto
       entero pensando —1.999 de 2.000 en tokens de thinking— y cortaban por
       max_tokens sin llegar a escribir una sola opción. */
    max_tokens: 6000,
    messages: [{ role: 'user', content: [{ type: 'text', text: promptSugerencias({ margen, momento, faltaProteina, frecuentes, modo }) }] }],
    output_config: { format: { type: 'json_schema', schema: SCHEMA_SUGERENCIAS } }
  };

  /* Y esfuerzo bajo: proponer tres comidas con las reglas escritas al lado no
     es un problema que mejore pensándolo más, y pensarlo más era justamente lo
     que se comía el presupuesto antes de escribir nada. */
  if (aceptaEffort(modelo)) body.output_config.effort = 'low';

  const res = await pedirAClaude({ fetchFn, apiKey, proxyUrl, body, señal, dormir });

  if (!res.ok) {
    let detalle = '';
    try { detalle = (await res.json())?.error?.message || ''; } catch { /* sin cuerpo */ }
    throw new Error(mensajeDeError(res.status, detalle, !!proxyUrl));
  }

  const data = await res.json();
  const texto = (data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();

  /* Cortó por presupuesto: el error tiene que decir eso y no "no pude leer",
     que manda a buscar el problema en el lugar equivocado. */
  if (!texto && data?.stop_reason === 'max_tokens') {
    throw new Error('Se cortó pensando la respuesta. Probá de nuevo.');
  }

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

if (typeof window !== 'undefined') {
  window.__ideas = { SCHEMA_SUGERENCIAS, promptSugerencias, sugerirComida };
}

