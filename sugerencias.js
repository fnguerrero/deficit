/* ============================================================
   Qué comer: lo que la app propone y lo que descarta.

   Dos preguntas del mismo lado del mostrador. Una mira para atrás —de dónde
   vienen los carbos que te sacan del modo— y la otra para adelante: de lo que
   se te propone, qué podés comer de verdad.
   ============================================================ */

/*
 * De dónde vienen los carbos, cuando el modo tiene techo.
 *
 * Decir "hace cuatro días que no entrás" y ofrecer cambiar de modo es ofrecer
 * bajar la vara. Lo útil es lo otro: cuánto de más venís comiendo y qué platos
 * lo traen, que es sobre lo que se puede hacer algo mañana.
 */
function loQueTeSaca(dias, techoDia, { hasta = hoyISO(), largo = 7, cuantos = 3 } = {}) {
  if (!(techoDia > 0)) return null;

  const porNombre = new Map();
  let carbosTotales = 0;
  let diasConDatos = 0;

  for (let i = 0; i < largo; i++) {
    const comidas = (dias?.[sumarDias(hasta, -i)]?.comidas) || [];
    if (!comidas.length) continue;
    diasConDatos++;

    for (const c of comidas) {
      const netos = Math.max(0, (Number(c.carb) || 0) - (Number(c.fibra) || 0));
      carbosTotales += netos;
      /* Por ítem cuando el análisis los trajo, y si no por el plato entero: es
         la diferencia entre decir "el pan" y decir "el sándwich". */
      const partes = (c.items || []).filter(it => it && it.nombre && Number(it.carbohidratos) > 0);
      if (partes.length) {
        for (const it of partes) {
          const g = Number(it.carbohidratos) || 0;
          porNombre.set(it.nombre, (porNombre.get(it.nombre) || 0) + g);
        }
      } else if (netos > 0) {
        const n = c.titulo || 'esa comida';
        porNombre.set(n, (porNombre.get(n) || 0) + netos);
      }
    }
  }

  if (!diasConDatos) return null;

  const top = [...porNombre.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, cuantos)
    .map(([nombre]) => nombre.toLowerCase());

  return {
    porDia: Math.round(carbosTotales / diasConDatos),
    techo: Math.round(techoDia),
    culpables: top
  };
}

/*
 * Las sugerencias que de verdad se pueden comer.
 *
 * El prompt ya lleva las reglas del modo, pero un prompt es un pedido, no una
 * garantía: en keto llegaron a venir empanadas de jamón y queso. La app tiene
 * comidaApta() para juzgar un plato y no la estaba usando acá, que es donde
 * más falta hace, porque una sugerencia es la app diciendo "comé esto".
 *
 * Las que no entran se descartan y se cuentan, en vez de esconderse: si de tres
 * quedó una, eso también es información.
 */
function sugerenciasQueEntran(opciones, idModo, objetivo, consumidoHoy = null) {
  const buenas = [];
  let descartadas = 0;

  for (const o of opciones || []) {
    const items = o?.items || [];
    const comida = {
      titulo: o?.titulo || '',
      kcal: items.reduce((a, i) => a + (Number(i.calorias) || 0), 0),
      prot: items.reduce((a, i) => a + (Number(i.proteinas) || 0), 0),
      carb: items.reduce((a, i) => a + (Number(i.carbohidratos) || 0), 0),
      gras: items.reduce((a, i) => a + (Number(i.grasas) || 0), 0),
      items
    };

    if (comidaApta(comida, idModo, objetivo, consumidoHoy).nivel === 'no') descartadas++;
    else buenas.push(o);
  }

  return { opciones: buenas, descartadas };
}
