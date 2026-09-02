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

/* Los extremos del dibujo, en TRES tramos.

   Antes eran dos y cortaba en 50, y eso hacía que 200, 300 y 400 kg dibujaran
   exactamente el mismo cuerpo: con 1,80 m, 200 kg ya son IMC 62. El muñeco se
   quedaba quieto por más que el número subiera, que es lo peor que puede pasar
   — parece que la app ignoró el dato.

   Ahora el recorrido llega hasta IMC 90. Sigue habiendo un techo, porque no
   existe dibujo de una persona con IMC 120, pero al menos 150, 200 y 300 se
   distinguen entre sí. */
const IMC_MIN = 17;
const IMC_CODO = 30;
const IMC_CODO2 = 45;
const IMC_MAX = 90;

/* Cuánto del recorrido se lleva cada tramo. El primero es el ancho donde de
   verdad se mueve la gente, así que se lleva la mitad él solo. */
const TRAMO_1 = 0.5;
const TRAMO_2 = 0.28;

/* Con esta cantidad de días entrenados en las últimas dos semanas se considera
   una rutina sostenida. Bajó de 10 a 6 porque con 10 el eje casi nunca llegaba
   arriba: quien entrena tres veces por semana ya está entrenando en serio, y el
   personaje tiene que mostrarlo. */
const DIAS_RUTINA = 6;

/* Los limites no son decorativos: sin ellos un 0 en altura divide por cero y un
   peso negativo cargado de apuro devuelve un IMC negativo que despues clampea a
   0 y dibuja un cuerpo flaco, que es peor que no dibujar nada. */
const PESO_MIN = 20;
const PESO_MAX = 500;
const ALTURA_MIN = 80;
const ALTURA_MAX = 260;

function imcDe(pesoKg, alturaCm) {
  const p = Number(pesoKg);
  const a = Number(alturaCm);
  if (!isFinite(p) || !isFinite(a)) return null;
  if (p < PESO_MIN || p > PESO_MAX) return null;
  if (a < ALTURA_MIN || a > ALTURA_MAX) return null;
  return +(p / Math.pow(a / 100, 2)).toFixed(1);
}

function bandaIMC(imc) {
  if (imc == null) return null;
  return BANDAS_IMC.find(b => imc < b.hasta) || BANDAS_IMC.at(-1);
}

/** El IMC llevado a 0–1 para el dibujo, en tres tramos. */
function contexturaDe(imc) {
  if (imc == null) return null;
  if (imc <= IMC_MIN) return 0;

  let t;
  if (imc <= IMC_CODO) {
    t = TRAMO_1 * (imc - IMC_MIN) / (IMC_CODO - IMC_MIN);
  } else if (imc <= IMC_CODO2) {
    t = TRAMO_1 + TRAMO_2 * (imc - IMC_CODO) / (IMC_CODO2 - IMC_CODO);
  } else {
    t = TRAMO_1 + TRAMO_2 + (1 - TRAMO_1 - TRAMO_2) * (imc - IMC_CODO2) / (IMC_MAX - IMC_CODO2);
  }

  return +Math.min(1, Math.max(0, t)).toFixed(3);
}

/** Si el IMC se pasó de lo que el dibujo puede representar. */
function fueraDeEscala(imc) {
  return imc != null && imc > IMC_MAX;
}

/*
 * Cuánto por DEBAJO del rango está el IMC, de 0 a 1.
 *
 * La contextura clampea en IMC 17: de ahí para abajo todos los cuerpos daban
 * el mismo dibujo, y 40 kg en 1,78 m son IMC 12,6 — un cuerpo que tiene que
 * verse esquelético, no "flaco como cualquiera". Es un eje aparte y aditivo
 * a propósito: nadie con IMC 17 o más cambia un píxel por esto.
 */
const IMC_DEMACRADO = 13;

function demacradoDe(imc) {
  if (imc == null || imc >= IMC_MIN) return 0;
  const t = (IMC_MIN - imc) / (IMC_MIN - IMC_DEMACRADO);
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
    const f = sumarDias(hasta, -i);
    if (!f) break;
    const p = dias?.[f]?.peso;
    if (Number(p) >= PESO_MIN && Number(p) <= PESO_MAX) return Number(p);
  }
  const pp = Number(perfil?.peso);
  return pp >= PESO_MIN && pp <= PESO_MAX ? pp : null;
}

/** Cuántos días de las últimas dos semanas tuvieron ejercicio cargado. */
function diasEntrenados(dias, hasta = hoyISO(), ventana = 14) {
  let n = 0;
  for (let i = 0; i < ventana; i++) {
    const f = sumarDias(hasta, -i);
    if (f && Number(dias?.[f]?.ejercicio) > 0) n++;
  }
  return n;
}

function musculaturaDe(entrenados) {
  return +Math.min(1, Math.max(0, (Number(entrenados) || 0) / DIAS_RUTINA)).toFixed(3);
}

/*
 * Cuántos PUNTOS DE IMC se le descuentan por entrenar, con rutina sostenida.
 *
 * El músculo pesa más que la grasa, así que el IMC acusa de sobrepeso a
 * cualquiera que entrene en serio. Sin esta corrección el personaje de alguien
 * que entrena cinco veces por semana se ve blando, que es lo contrario de la
 * verdad.
 *
 * En puntos de IMC y no en fracción del eje, y esa es toda la diferencia. El
 * eje de contextura NO es lineal: su tercer tramo cubre de IMC 45 a 90 con
 * apenas 0,22 del recorrido, así que restar una fracción fija valía dos puntos
 * de IMC abajo y DIEZ arriba. Alguien de 140 kg que entrena dos veces y media
 * por semana se dibujaba con 34 kg menos de los que marca la balanza.
 *
 * 2,5 puntos es lo que el músculo explica de verdad: un atleta muy trabajado
 * ronda IMC 27 con poca grasa donde otro cuerpo estaría en 24.
 */
const DESCUENTO_IMC = 2.5;

/**
 * El IMC que el dibujo usa: el medido, menos lo que explica el entrenamiento.
 *
 * Nunca baja del piso de la escala. Entrenar mucho no puede empujar a nadie a
 * la zona de "demacrado": ese eje es para quien pesa poco de verdad, y llegar
 * ahí por ir al gimnasio sería la app diciendo algo bastante peor que un
 * número mal dibujado.
 */
function imcParaElDibujo(imc, musculatura) {
  if (imc == null) return null;
  const baja = Math.min(1, Math.max(0, musculatura || 0)) * DESCUENTO_IMC;
  return Math.max(IMC_MIN, imc - baja);
}

/**
 * Todo el cuerpo en un objeto.
 *
 * Sin peso conocido devuelve `contextura: null` — el dibujo usa la media y la
 * app pide el peso. Inventar una contextura sería mostrarle a Nico un cuerpo
 * que no es el suyo.
 */
function cuerpoDe(perfil, dias, hasta = hoyISO()) {
  const peso = ultimoPesoConocido(perfil, dias, hasta);
  const imc = imcDe(peso, perfil?.altura);
  const entrenados = diasEntrenados(dias, hasta);
  const cintura = ultimaCinturaConocida(perfil, dias, hasta);
  const ica = icaDe(cintura, perfil?.altura);

  /* Sale SOLO de los días entrenados. Hubo un plus por días perfectos seguidos
     y hubo que sacarlo: se colaba en el descuento por músculo y en el aviso del
     IMC, así que un día cumplido adelgazaba al muñeco. Con IMC 47,9 el cuerpo
     dibujado equivalía a uno de 36,3 — casi doce puntos, unos 34 kg.

     La regla ya estaba escrita en aura.js: la transformación va en el pelo y en
     el aura, nunca en el cuerpo. Si la fase lo inflara, la app estaría diciendo
     que cumplir objetivos te hace más grande. */
  const musculatura = musculaturaDe(entrenados);
  const contextura = contexturaDe(imc);

  const efectiva = contextura == null
    ? null
    : contexturaDe(+imcParaElDibujo(imc, musculatura).toFixed(1));

  return {
    peso, imc, entrenados, musculatura, contextura,
    demacrado: demacradoDe(imc),
    /* La que usa el dibujo: la del IMC ya corregida por lo que entrenaste. */
    efectiva,
    cintura, ica,
    bandaCintura: bandaICA(ica),
    /* Cuánta panza, medida. Manda sobre la contextura del IMC cuando existe. */
    grasa: grasaDe(ica),
    /* Dónde tenés el peso. 0 sin cintura cargada: el dibujo queda igual. */
    forma: formaDe(cintura, perfil?.altura, imc),
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
  /* Cuando el número se pasa del techo del dibujo hay que decirlo. Si no, subir
     de 200 a 400 kg no cambia nada en pantalla y parece que la app ignoró el
     dato — que es exactamente lo que se sintió cuando el techo estaba en 50. */
  if (fueraDeEscala(imc)) {
    return `IMC ${fmtNum(imc, 1)}. El dibujo llega hasta ${IMC_MAX}: de ahí para arriba el ` +
      'muñeco ya no cambia, aunque el número sí.';
  }

  if (imc == null || musculatura < 0.5) return '';
  const b = bandaIMC(imc);
  if (b.id !== 'sobrepeso' && b.id !== 'obesidad') return '';

  /*
   * Y solo si el músculo puede explicar de verdad la diferencia.
   *
   * El aviso salía con IMC 47,9 y cinco entrenamientos en catorce días: ahí el
   * número no exagera nada, y decirlo es la app ayudando a mirar para otro
   * lado. Tiene sentido cuando sacando lo que el músculo pesa quedarías de
   * este lado del umbral —o sea cuando el número te pone en un lugar donde no
   * estás—, y no cuando quedarías igual.
   */
  const UMBRAL_OBESIDAD = BANDAS_IMC.find(x => x.id === 'sobrepeso').hasta;
  if (imcParaElDibujo(imc, musculatura) >= UMBRAL_OBESIDAD) return '';

  return `Entrenaste ${entrenados} de los últimos 14 días. El IMC no distingue músculo de ` +
    'grasa, así que en tu caso el número exagera: tomalo como referencia, no como diagnóstico.';
}

/* ============================================================
   El día entero, en el cuerpo.

   El dibujo ya reaccionaba al peso y al ejercicio. Lo que faltaba era el resto
   de lo que la app pide todos los días: el agua, el sueño y el ánimo vivían en
   un emoji al costado, que es la forma más rápida de que nadie los mire.

   Todo lo de acá son números de 0 a 1 que el dibujo consume. La regla es una
   sola: lo que no se cargó no se dibuja mal. No anotar el agua no es lo mismo
   que no haber tomado agua, y un muñeco reseco por un dato que falta sería la
   app inventando.
   ============================================================ */

/* Ni bien ni mal: lo que se dibuja cuando no hay dato. */
const NEUTRO = 0.7;

/* Antes de esta hora nadie cumplió su día todavía. Es la misma que usa la
   mascota para no reprochar el agua a las nueve de la mañana. */
const HORA_JUZGAR = 14;

const SUENO_POCO = 4;
const SUENO_BIEN = 8;

/** Qué tan hidratado se ve, de 0 (seco) a 1. */
function hidratacionDe(dia, { meta = 8, hora = 14 } = {}) {
  const vasos = Number(dia?.agua) || 0;
  if (!vasos) return hora < HORA_JUZGAR ? NEUTRO : 0.15;

  const pct = Math.min(1, vasos / (meta || 8));
  /* Temprano el vaso vale más: a las diez de la mañana dos vasos van bien. */
  return hora < HORA_JUZGAR ? Math.max(NEUTRO, pct) : pct;
}

/** Qué tan descansado, de 0 (tres horas) a 1 (ocho o más). */
function descansoDe(dia) {
  const h = Number(dia?.sueno?.horas);
  if (!isFinite(h) || h <= 0) return NEUTRO;
  if (h >= SUENO_BIEN) return 1;
  if (h <= SUENO_POCO) return 0;
  return +((h - SUENO_POCO) / (SUENO_BIEN - SUENO_POCO)).toFixed(3);
}

/**
 * El cuerpo que se dibuja hoy: lo del peso y el ejercicio, más el resto del día.
 */
function cuerpoDelDia(perfil, dias, hasta = hoyISO(), { meta = 8, hora = null } = {}) {
  const base = cuerpoDe(perfil, dias, hasta);
  const d = dias?.[hasta] || null;
  const h = hora == null ? new Date().getHours() : hora;

  return {
    ...base,
    hidratacion: hidratacionDe(d, { meta, hora: h }),
    descanso: descansoDe(d),
    /* El ánimo se elige a mano y ya viene con nombre: se pasa tal cual. */
    animo: d?.animo || null
  };
}
