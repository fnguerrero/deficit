/*
 * platos.js — los momentos del día y el tamaño de una porción.
 *
 * Salió de core.js, que se pasó de su límite. Son las dos cosas que la app
 * necesita saber sobre una comida más allá de sus calorías: cuándo se comió y
 * cuánto de lo estimado se comió de verdad.
 */

/*
 * Los horarios de arranque, con criterio argentino.
 *
 * Acá se almuerza entre las 12:30 y las 14, y se cena a las 21 o más tarde.
 * Los cortes anteriores —almuerzo a las 11, cena a las 19:30— venían de un
 * horario que no es el de nadie de por acá: lo que comías a las 20 se guardaba
 * como cena cuando casi siempre era otra cosa.
 *
 * Igual son solo el punto de partida. Apenas hay comidas cargadas, los cortes
 * se recalculan con las horas de verdad: ver `momentosSegun()`.
 */
const MOMENTOS = [
  { id: 'desayuno', nombre: 'Desayuno', articulo: 'el', icono: '☕', desde: 6 * 60, hasta: 11 * 60 + 29 },
  { id: 'almuerzo', nombre: 'Almuerzo', articulo: 'el', icono: '🍽️', desde: 11 * 60 + 30, hasta: 16 * 60 + 29 },
  { id: 'merienda', nombre: 'Merienda', articulo: 'la', icono: '🥐', desde: 16 * 60 + 30, hasta: 20 * 60 + 29 },
  { id: 'cena', nombre: 'Cena', articulo: 'la', icono: '🌙', desde: 20 * 60 + 30, hasta: 23 * 60 + 59 },
  { id: 'snack', nombre: 'Snack', articulo: 'el', icono: '🍎', desde: 0, hasta: 5 * 60 + 59 }
];

/*
 * Los horarios que rigen ahora: los de la tabla, o los tuyos si ya se
 * aprendieron. Se recalculan al arrancar y cada vez que se guarda una comida.
 */
let MOMENTOS_VIGENTES = MOMENTOS;

/* Cinco comidas de un mismo momento alcanzan para saber a qué hora lo hacés.
   Con menos, una cena tardía suelta correría el corte para todo el mes. */
const MINIMO_PARA_APRENDER = 5;

/** El valor del medio. Se usa la mediana y no el promedio justamente para que
    una comida a las 3 de la mañana no arrastre el horario de la cena. */
function medianaDe(lista) {
  const orden = [...lista].sort((a, b) => a - b);
  const m = Math.floor(orden.length / 2);
  return orden.length % 2 ? orden[m] : Math.round((orden[m - 1] + orden[m]) / 2);
}

/**
 * Los momentos con los cortes movidos a los horarios de la persona.
 *
 * De cada momento se toma la hora típica —la mediana de sus comidas— y el
 * corte entre dos momentos queda a mitad de camino entre sus horas típicas.
 * Si alguno todavía no tiene suficientes comidas, ese corte se deja como está:
 * mejor un horario de tabla que uno inventado con tres datos.
 */
function momentosSegun(dias, base = MOMENTOS) {
  const horas = {};

  for (const d of Object.values(dias || {})) {
    for (const c of d.comidas || []) {
      if (!c.momento || !c.ts) continue;
      const f = new Date(c.ts);
      (horas[c.momento] = horas[c.momento] || []).push(f.getHours() * 60 + f.getMinutes());
    }
  }

  const tipica = {};
  for (const [id, lista] of Object.entries(horas)) {
    if (lista.length >= MINIMO_PARA_APRENDER) tipica[id] = medianaDe(lista);
  }

  // en orden cronológico, que es como se suceden los cortes
  const salida = [...base].map(m => ({ ...m })).sort((a, b) => a.desde - b.desde);

  for (let i = 0; i < salida.length - 1; i++) {
    const a = salida[i];
    const b = salida[i + 1];
    if (tipica[a.id] == null || tipica[b.id] == null) continue;

    // si las horas típicas vienen cruzadas, los datos no sirven para mover nada
    if (tipica[a.id] >= tipica[b.id]) continue;

    const corte = Math.round((tipica[a.id] + tipica[b.id]) / 2);
    if (corte <= a.desde || corte >= b.hasta) continue;

    a.hasta = corte - 1;
    b.desde = corte;
  }

  return salida;
}

/** Recalcula los horarios vigentes. Se llama al arrancar y al guardar. */
function aprenderMomentos(dias) {
  MOMENTOS_VIGENTES = momentosSegun(dias);
  return MOMENTOS_VIGENTES;
}

/** Momento probable según la hora del día (0-23 y minutos). */
function momentoPorHora(hora, minutos = 0, momentos = null) {
  const t = hora * 60 + minutos;
  const m = (momentos || MOMENTOS_VIGENTES).find(x => t >= x.desde && t <= x.hasta);
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

  /* Los vigentes, no la tabla: si tus horarios ya se aprendieron, "falta para
     la cena" tiene que contar hasta TU hora de cenar. */
  const siguiente = MOMENTOS_VIGENTES
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

/*
 * El prefijo de porción que ya tenga el título.
 *
 * Escalar dos veces encadenaba las etiquetas: "½ Milanesa" reescalada al doble
 * salía "2 ½ Milanesa", y de ahí a la mitad "½ 2 ½ Milanesa". El nombre del
 * plato es uno solo; la porción es un prefijo que se reemplaza, no que se
 * apila.
 */
const PREFIJO_PORCION = /^(?:¼|½|¾|1½|1|2|[\d.,]+×)\s+/;

function sinPrefijoDePorcion(titulo) {
  let t = String(titulo || '');
  /* En bucle: un título ya ensuciado por el bug puede traer varios pegados. */
  while (PREFIJO_PORCION.test(t)) t = t.replace(PREFIJO_PORCION, '');
  return t;
}

function escalarComida(comida, factor) {
  const f = Number(factor);
  if (!comida || !(f > 0)) return comida;

  const num = (v) => Math.round((Number(v) || 0) * f * 10) / 10;
  const etiqueta = (PORCIONES.find(p => p.f === f) || {}).txt;
  const nombre = sinPrefijoDePorcion(comida.titulo);

  return {
    ...comida,
    kcal: Math.round((Number(comida.kcal) || 0) * f),
    prot: num(comida.prot),
    carb: num(comida.carb),
    gras: num(comida.gras),
    porcionFactor: f,
    titulo: f === 1 ? nombre : `${etiqueta || f + '×'} ${nombre}`.trim(),
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
  const m = MOMENTOS_VIGENTES.find(x => x.id === momento);

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

/* ---------------- lo que la foto no puede mostrar ---------------- */

/*
 * Empanadas.
 *
 * De carne, de humita y de jamón y queso son idénticas por fuera, y ninguna
 * foto va a resolver eso nunca. La diferencia es real: cambian los macros y,
 * en keto, cambia si el plato entra o no.
 *
 * El análisis viene con las variantes ya calculadas, así que elegir una es
 * reemplazar un alimento y volver a sumar. Sin red, sin espera y sin pagar
 * otro análisis.
 */

/** El item del que se duda, buscado por su nombre base (puede ya estar renombrado). */
function itemDeLaDuda(items, nombre) {
  const base = String(nombre || '').trim().toLowerCase();
  if (!base) return -1;
  return (items || []).findIndex(i => String(i.nombre || '').trim().toLowerCase().startsWith(base));
}

/**
 * Aplica una de las opciones y devuelve la comida recalculada.
 *
 * Fibra, azúcar y sodio se quedan como estaban: el modelo no los desglosa por
 * variante y estimarlos acá sería inventar. Es una imprecisión conocida y
 * chica al lado de acertarle al relleno.
 */
function aplicarOpcion(comida, indice) {
  const amb = comida?.ambiguedad;
  const op = amb?.opciones?.[indice];
  if (!amb || !op) return comida;

  const items = [...(comida.items || [])];
  const pos = itemDeLaDuda(items, amb.item);
  if (pos < 0) return comida;

  const etiqueta = String(op.etiqueta || '').trim();
  items[pos] = {
    ...items[pos],
    nombre: `${amb.item} ${etiqueta.toLowerCase()}`.trim(),
    calorias: Number(op.calorias) || 0,
    proteinas: Number(op.proteinas) || 0,
    carbohidratos: Number(op.carbohidratos) || 0,
    grasas: Number(op.grasas) || 0
  };

  const t = sumarItems(items);
  return {
    ...comida,
    items,
    kcal: t.calorias,
    prot: t.proteinas,
    carb: t.carbohidratos,
    gras: t.grasas,
    fibra: t.fibra,
    azucar: t.azucar,
    sodio: t.sodio,
    ambiguedad: { ...amb, elegida: indice }
  };
}

/** Si vale la pena preguntar: hace falta la pregunta y al menos dos opciones. */
function hayQuePreguntar(amb) {
  return !!(amb && amb.pregunta && Array.isArray(amb.opciones) && amb.opciones.length >= 2);
}
