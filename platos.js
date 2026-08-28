/*
 * platos.js — los momentos del día y el tamaño de una porción.
 *
 * Salió de core.js, que se pasó de su límite. Son las dos cosas que la app
 * necesita saber sobre una comida más allá de sus calorías: cuándo se comió y
 * cuánto de lo estimado se comió de verdad.
 */

const MOMENTOS = [
  { id: 'desayuno', nombre: 'Desayuno', articulo: 'el', icono: '☕', desde: 5 * 60, hasta: 10 * 60 + 59 },
  { id: 'almuerzo', nombre: 'Almuerzo', articulo: 'el', icono: '🍽️', desde: 11 * 60, hasta: 15 * 60 + 29 },
  { id: 'merienda', nombre: 'Merienda', articulo: 'la', icono: '🥐', desde: 15 * 60 + 30, hasta: 19 * 60 + 29 },
  { id: 'cena', nombre: 'Cena', articulo: 'la', icono: '🌙', desde: 19 * 60 + 30, hasta: 23 * 60 + 59 },
  { id: 'snack', nombre: 'Snack', articulo: 'el', icono: '🍎', desde: 0, hasta: 4 * 60 + 59 }
];

/** Momento probable según la hora del día (0-23 y minutos). */
function momentoPorHora(hora, minutos = 0) {
  const t = hora * 60 + minutos;
  const m = MOMENTOS.find(x => t >= x.desde && t <= x.hasta);
  return m ? m.id : 'snack';
}

function momentoDe(ts) {
  const d = new Date(ts);
  return momentoPorHora(d.getHours(), d.getMinutes());
}

/*
 * Cuanto falta para la proxima comida esperada.
 *
 * No es un recordatorio: es saber si conviene cargar ahora o esperar. Sin esto,
 * a las cinco de la tarde uno no sabe si lo que va a comer cuenta como merienda
 * o como cena, y termina eligiendo mal el momento, que es de donde salen los
 * graficos de reparto del dia.
 *
 * Devuelve null cuando ya paso la ultima del dia: a esa hora lo que falta no es
 * una comida sino dormir.
 */
function proximaComida(ts = Date.now()) {
  const d = new Date(ts);
  const ahora = d.getHours() * 60 + d.getMinutes();
  const actual = momentoPorHora(d.getHours(), d.getMinutes());

  const siguiente = MOMENTOS
    .filter(m => m.desde > ahora && m.id !== 'snack')
    .sort((a, b) => a.desde - b.desde)[0];

  if (!siguiente) return null;

  return {
    id: siguiente.id,
    nombre: siguiente.nombre,
    minutos: siguiente.desde - ahora,
    dentroDe: actual
  };
}

/*
 * Reescalar una comida entera por un factor.
 *
 * "Comí la mitad" es la corrección más frecuente que existe, y la más cara de
 * hacer: el modelo puede haber entendido el plato perfecto y aun así uno comió
 * dos tercios. Sin esto hay que abrir la edición y dividir a mano cada alimento
 * y cada macro, seis números por plato, y nadie hace eso dos veces.
 *
 * La porción se anota en el texto, no se pierde: un "1/2" adelante deja dicho
 * que ese número salió de la mitad de lo que se estimó.
 */
const PORCIONES = [
  { f: 0.25, txt: '¼' }, { f: 0.5, txt: '½' }, { f: 0.75, txt: '¾' },
  { f: 1, txt: '1' }, { f: 1.5, txt: '1½' }, { f: 2, txt: '2' }
];

function escalarComida(comida, factor) {
  const f = Number(factor);
  if (!comida || !(f > 0)) return comida;

  const num = (v) => Math.round((Number(v) || 0) * f * 10) / 10;
  const etiqueta = (PORCIONES.find(p => p.f === f) || {}).txt;

  return {
    ...comida,
    kcal: Math.round((Number(comida.kcal) || 0) * f),
    prot: num(comida.prot),
    carb: num(comida.carb),
    gras: num(comida.gras),
    porcionFactor: f,
    titulo: f === 1 ? comida.titulo : `${etiqueta || f + '×'} ${comida.titulo || ''}`.trim(),
    items: (comida.items || []).map(it => ({
      ...it,
      calorias: Math.round((Number(it.calorias) || 0) * f),
      proteinas: num(it.proteinas),
      carbohidratos: num(it.carbohidratos),
      grasas: num(it.grasas)
    }))
  };
}

function nombreMomento(id) {
  const m = MOMENTOS.find(x => x.id === id);
  return m ? m.nombre : 'Otro';
}


/*
 * Lo que solés comer a esta hora.
 *
 * Cargar el café con leche de todas las mañanas cuesta hoy lo mismo que cargar
 * algo que nunca comiste: sacar la foto, esperar el análisis, pagarlo. Y el
 * desayuno es justo la comida más repetida que hay.
 *
 * Se mira solo la misma franja del día: lo que comés a las 8 no dice nada sobre
 * lo que vas a comer a las 21, y mezclarlas daría una lista de la que nunca
 * sirve nada.
 */
function sugerenciasPorMomento(dias, momento, { limite = 3, desde = null } = {}) {
  const cuenta = new Map();

  for (const [fecha, d] of Object.entries(dias || {})) {
    if (desde && fecha < desde) continue;
    for (const c of (d.comidas || [])) {
      if ((c.momento || momentoDe(c.ts || 0)) !== momento) continue;
      const clave = String(c.titulo || '').trim();
      if (!clave) continue;

      const ya = cuenta.get(clave.toLowerCase());
      if (ya) { ya.veces++; ya.ultima = Math.max(ya.ultima, c.ts || 0); }
      else cuenta.set(clave.toLowerCase(), { titulo: clave, veces: 1, ultima: c.ts || 0, kcal: Number(c.kcal) || 0 });
    }
  }

  /* Dos veces no es una costumbre: con una sola aparición la lista se llena de
     lo que comiste una vez y no volviste a comer nunca. */
  return [...cuenta.values()]
    .filter(x => x.veces >= 2)
    .sort((a, b) => (b.veces - a.veces) || (b.ultima - a.ultima))
    .slice(0, limite);
}

/*
 * ¿Se pasó la hora de la que siempre cargás?
 *
 * No es un recordatorio por horario fijo —eso ya existe y se puede apagar— sino
 * uno que sale de lo que la persona hace: si en veinte días cargaste el almuerzo
 * dieciocho veces y hoy son las tres de la tarde y no hay nada, eso es un olvido
 * y no un cambio de rutina.
 *
 * Devuelve null apenas falta contexto. Insistirle a alguien que recién empieza,
 * con dos días cargados, es la forma más rápida de que apague los avisos.
 */
function faltaLaDeSiempre(dias, ahora = Date.now(), { minimoDias = 8, ratio = 0.6 } = {}) {
  const d = new Date(ahora);
  /* hoyISO espera un Date, no un timestamp: pasarle el número lo hacía reventar
     con "d.getTime is not a function" en la primera llamada real. */
  const hoy = hoyISO(d);
  const momento = momentoPorHora(d.getHours(), d.getMinutes());
  const m = MOMENTOS.find(x => x.id === momento);

  /* Recién cuando la franja va por la mitad: a las 11:05 todavía no se hace
     tarde para almorzar. */
  if (!m || (d.getHours() * 60 + d.getMinutes()) < (m.desde + m.hasta) / 2) return null;

  const fechas = Object.keys(dias || {}).filter(f => f < hoy).sort().slice(-30);
  if (fechas.length < minimoDias) return null;

  const conEsa = fechas.filter(f =>
    (dias[f].comidas || []).some(c => (c.momento || momentoDe(c.ts || 0)) === momento));

  if (conEsa.length / fechas.length < ratio) return null;

  const yaHoy = ((dias[hoy] || {}).comidas || [])
    .some(c => (c.momento || momentoDe(c.ts || 0)) === momento);
  if (yaHoy) return null;

  return {
    momento,
    nombre: m.nombre,
    veces: conEsa.length,
    de: fechas.length,
    texto: `Cargaste ${m.nombre.toLowerCase()} ${conEsa.length} de los últimos ${fechas.length} días, y hoy todavía no.`
  };
}
