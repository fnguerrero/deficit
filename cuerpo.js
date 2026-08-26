/* ============================================================
   cuerpo.js — los números detrás del cuerpo del personaje.

   Acá no se dibuja nada: se calcula QUÉ cuerpo corresponde. El dibujo vive en
   personaje.js, y la separación importa porque estos números se pueden probar
   con tests y un SVG no.

   La regla que ordena todo el archivo: el cuerpo sale de datos MEDIDOS —el peso
   de la balanza, los entrenamientos que hiciste—, nunca de la conducta del día.
   Comer de más hoy pone cara de culpa; engorda solo si la balanza lo dice.
   ============================================================ */

/* Las bandas de la OMS. Se usan para el texto, no para el dibujo: el dibujo
   interpola, así que un kilo se nota un poco en vez de no notarse nada hasta
   cruzar un umbral y ahí cambiar de golpe. */
const BANDAS_IMC = [
  { hasta: 18.5, id: 'bajo', nombre: 'Bajo peso' },
  { hasta: 25, id: 'normal', nombre: 'Peso normal' },
  { hasta: 30, id: 'sobrepeso', nombre: 'Sobrepeso' },
  { hasta: Infinity, id: 'obesidad', nombre: 'Obesidad' }
];

/* Los extremos del dibujo.

   El tramo hasta 35 se lleva el 80% del recorrido y de 35 a 50 el 20% restante.
   Es a propósito: entre 22 y 30 —donde de verdad se mueve la gente— cada punto
   de IMC tiene que notarse, y arriba de 35 el dibujo sigue creciendo pero cada
   vez menos, porque un muñeco de 120 px de alto no puede representar un IMC de
   60 sin dejar de ser una persona. */
const IMC_MIN = 17;
const IMC_CODO = 35;
const IMC_MAX = 50;
const PESO_TRAMO_BAJO = 0.8;

/* Con esta cantidad de días entrenados en las últimas dos semanas se considera
   una rutina sostenida. Bajó de 10 a 6 porque con 10 el eje casi nunca llegaba
   arriba: quien entrena tres veces por semana ya está entrenando en serio, y el
   personaje tiene que mostrarlo. */
const DIAS_RUTINA = 6;

function imcDe(pesoKg, alturaCm) {
  const p = Number(pesoKg);
  const a = Number(alturaCm);
  if (!(p > 0) || !(a > 0)) return null;
  return +(p / Math.pow(a / 100, 2)).toFixed(1);
}

function bandaIMC(imc) {
  if (imc == null) return null;
  return BANDAS_IMC.find(b => imc < b.hasta) || BANDAS_IMC.at(-1);
}

/** El IMC llevado a 0–1 para el dibujo, en dos tramos. */
function contexturaDe(imc) {
  if (imc == null) return null;
  if (imc <= IMC_MIN) return 0;

  const t = imc <= IMC_CODO
    ? PESO_TRAMO_BAJO * (imc - IMC_MIN) / (IMC_CODO - IMC_MIN)
    : PESO_TRAMO_BAJO + (1 - PESO_TRAMO_BAJO) * (imc - IMC_CODO) / (IMC_MAX - IMC_CODO);

  return +Math.min(1, Math.max(0, t)).toFixed(3);
}

/**
 * El último peso que se sabe de verdad.
 *
 * Se busca en los días registrados antes que en el perfil: el perfil se carga
 * una vez y queda viejo, mientras que la balanza es de esta semana.
 */
function ultimoPesoConocido(perfil, dias, hasta = hoyISO()) {
  for (let i = 0; i < 90; i++) {
    const p = dias?.[sumarDias(hasta, -i)]?.peso;
    if (Number(p) > 0) return Number(p);
  }
  return Number(perfil?.peso) > 0 ? Number(perfil.peso) : null;
}

/** Cuántos días de las últimas dos semanas tuvieron ejercicio cargado. */
function diasEntrenados(dias, hasta = hoyISO(), ventana = 14) {
  let n = 0;
  for (let i = 0; i < ventana; i++) {
    if (Number(dias?.[sumarDias(hasta, -i)]?.ejercicio) > 0) n++;
  }
  return n;
}

function musculaturaDe(entrenados) {
  return +Math.min(1, Math.max(0, (Number(entrenados) || 0) / DIAS_RUTINA)).toFixed(3);
}

/*
 * Cuánto se le descuenta a la contextura por entrenar.
 *
 * El músculo pesa más que la grasa, así que el IMC acusa de sobrepeso a
 * cualquiera que entrene en serio. Sin esta corrección el personaje de alguien
 * que entrena cinco veces por semana se ve blando, que es exactamente lo
 * contrario de la verdad.
 */
const DESCUENTO_MUSCULO = 0.18;

/**
 * Todo el cuerpo en un objeto.
 *
 * Sin peso conocido devuelve `contextura: null` — el dibujo usa la media y la
 * app pide el peso. Inventar una contextura sería mostrarle a Nico un cuerpo
 * que no es el suyo.
 */
function cuerpoDe(perfil, dias, hasta = hoyISO(), { bonus = 0 } = {}) {
  const peso = ultimoPesoConocido(perfil, dias, hasta);
  const imc = imcDe(peso, perfil?.altura);
  const entrenados = diasEntrenados(dias, hasta);

  /* El plus por días perfectos seguidos. Es chico y se va solo al cortar la
     racha: motiva sin mentir que cumplir un día ya te puso en forma. */
  const musculatura = +Math.min(1, musculaturaDe(entrenados) + (Number(bonus) || 0)).toFixed(3);
  const contextura = contexturaDe(imc);

  const efectiva = contextura == null
    ? null
    : +Math.min(1, Math.max(0, contextura - musculatura * DESCUENTO_MUSCULO)).toFixed(3);

  return {
    peso, imc, entrenados, musculatura, contextura,
    /* La que usa el dibujo: la del IMC ya corregida por lo que entrenaste. */
    efectiva,
    banda: bandaIMC(imc),
    hayDatos: contextura != null,
    aviso: avisoDeIMC(imc, musculatura, entrenados)
  };
}

/**
 * El IMC no distingue músculo de grasa. Cuando hay rutina sostenida y el número
 * acusa sobrepeso, decirlo es más honesto que dejar que el número solo hable:
 * es la diferencia entre una medida y un diagnóstico.
 */
function avisoDeIMC(imc, musculatura, entrenados) {
  if (imc == null || musculatura < 0.5) return '';
  const b = bandaIMC(imc);
  if (b.id !== 'sobrepeso' && b.id !== 'obesidad') return '';

  return `Entrenaste ${entrenados} de los últimos 14 días. El IMC no distingue músculo de ` +
    'grasa, así que en tu caso el número exagera: tomalo como referencia, no como diagnóstico.';
}
