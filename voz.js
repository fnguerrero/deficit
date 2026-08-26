/* ============================================================
   voz.js — lo que dice Fito.

   Un personaje que dice siempre lo mismo deja de ser un personaje a los tres
   días. Acá vive su repertorio, y la regla que lo ordena:

   **Reclama, insiste y hace chistes; nunca humilla.** Puede ser dramático,
   puede hacerse el ofendido, puede exagerar. Lo que no hace nunca es tratar
   mal a Nico por su cuerpo ni por haber comido de más — esa es exactamente la
   línea entre que dé gracia volver y que dé bronca abrir la app.

   Ninguna frase se repite dos veces seguidas: eso solo requiere acordarse de
   la anterior, y es la diferencia entre un personaje y un cartel.
   ============================================================ */

const VOZ = {
  /* Al abrir, con el día en blanco. */
  vacio: [
    'Ah, apareciste. Yo acá, esperando, como siempre.',
    'Día en blanco. Impecable. Un lienzo. Una hoja. Una nada.',
    'No tengo un solo dato tuyo hoy. Estoy trabajando a ciegas acá.',
    'Empezamos de cero. Otra vez. Pero bueno, es lo que hay.',
    'Cero comidas, cero agua, cero todo. Al menos sos consistente.'
  ],

  agua: [
    'Tomá agua. Te lo pido por favor. Me estoy secando yo también.',
    'El agua está ahí. Es gratis. Sale de la canilla. No entiendo el problema.',
    '{n} de {meta} vasos. Ese número me duele físicamente.',
    'Un vaso de agua. Uno. Tardás menos que en leer esto.',
    'Che, el agua. No me hagas insistir que sabés que insisto.'
  ],

  comida: [
    'No registraste nada todavía. ¿Comiste? ¿Estás bien? ¿Necesitás ayuda?',
    'Una foto. Un plato. Algo. Dame algo con qué trabajar.',
    'Sé que comiste. Siempre comés. Lo que no sé es qué.',
    'Si no me contás lo que comés, esto es un diario vacío con dibujitos.',
    'Registrá algo, dale. Después no me vengas con que los gráficos están vacíos.'
  ],

  entrenamiento: [
    'Hoy no te moviste. Lo digo sin juzgar. Pero lo digo.',
    'Veinte minutos de caminata también cuentan, por si estabas buscando excusa.',
    'Tu racha de entrenamiento me está mirando con cara de "y?".',
    'Movete un poco. Yo tampoco puedo, estoy hecho de SVG.',
    'El ejercicio de hoy sigue en cero. Solo lo menciono. Al pasar.'
  ],

  sueno: [
    'Contame cuánto dormiste. Es el dato que más explica todo lo demás.',
    'Falta el sueño de anoche. Sin eso no puedo explicarte por qué tenés hambre.',
    'Dormiste algo, supongo. Anotalo y seguimos.',
    'El sueño de anoche está sin cargar. Y sí, importa más de lo que parece.'
  ],

  /* Todo cumplido. Poder festejar de verdad es lo que hace que reclamar sirva. */
  completo: [
    'Día completo. Las cuatro. No tengo NADA para reprocharte y me incomoda.',
    'Cumpliste todo. Estoy orgulloso y un poco sorprendido.',
    'Las cuatro actividades. Sos otra persona hoy.',
    'Impecable. Guardá este día que lo vamos a extrañar.',
    'Todo hecho. Andá tranquilo, hoy no te jodo más.'
  ],

  /* Falta poco: es el momento en que insistir sirve de verdad. */
  casi: [
    'Te falta una sola cosa para el día completo. UNA.',
    'Estás a un paso. Un paso. No me hagas esto.',
    'Falta una y cerramos el día perfecto. Dale que llegamos.',
    'Una sola pendiente. Después me callo, prometido.'
  ],

  racha: [
    '{n} días seguidos. No te vas a cortar hoy, ¿no?',
    'Llevás {n} días de {que}. Eso ya es una costumbre.',
    '{n} días. Empiezo a creer en vos.',
    'Racha de {n} en {que}. Cuidala.'
  ],

  rachaEnPeligro: [
    'Tu racha de {que} muere hoy si no hacés algo. Sin drama, pero muere.',
    '{n} días de {que} colgando de un hilo. El hilo sos vos.',
    'Un día más y perdés {n} días de {que}. Vos verás.'
  ],

  escudo: [
    'Ayer no cumpliste {que}, pero te tapé el día con un escudo. De nada.',
    'Gasté un escudo para salvarte la racha de {que}. Me debés una.',
    'Se te iban {n} días de {que}. Usé un escudo. No lo hagas costumbre.'
  ],

  logro: [
    '¡{logro}! Eso se gana una sola vez.',
    'Desbloqueaste "{logro}". Ahora es tuyo para siempre.',
    '{logro}. Guardado. Anotado. Celebrado.'
  ],

  nivel: [
    '¡Nivel {n}! Ahora sos {nombre}.',
    'Subiste a nivel {n}: {nombre}. Se siente distinto, ¿no?',
    'Nivel {n} alcanzado. {nombre}, nada menos.'
  ],

  /* Cuando algo sigue pendiente después de un rato con la app abierta. */
  insiste: [
    'Sigo acá. Sigue pendiente. Sigo mirándote.',
    'Ya pasó un rato y {que} sigue igual. Solo digo.',
    'No me olvidé de {que}. Nunca me olvido.',
    'Te dije lo de {que} hace un rato. Lo repito por las dudas.'
  ]
};

/* La última frase de cada situación, para no repetirla. Vive en memoria y no en
   el estado guardado: que después de cerrar la app se repita una frase es
   inofensivo, guardar basura en el almacenamiento no. */
const ULTIMAS_FRASES = {};

/**
 * Una frase de la situación pedida, distinta de la anterior.
 *
 * `datos` reemplaza los `{marcadores}`. Un marcador sin dato queda en blanco en
 * vez de mostrar `{n}`, que es lo que pasa siempre que esto no se contempla.
 */
function decir(situacion, datos = {}, memoria = ULTIMAS_FRASES) {
  const lista = VOZ[situacion];
  if (!lista || !lista.length) return '';

  const previa = memoria[situacion];
  const candidatas = lista.length > 1 ? lista.filter(f => f !== previa) : lista;
  const elegida = candidatas[Math.floor(Math.random() * candidatas.length)];

  memoria[situacion] = elegida;
  return elegida.replace(/\{(\w+)\}/g, (_, k) => (datos[k] != null ? String(datos[k]) : ''));
}

/* Qué reclamar primero cuando falta más de una cosa. El orden no es casual:
   el agua es lo más fácil de resolver en el momento, y por eso encabeza. */
const ORDEN_RECLAMO = ['agua', 'comida', 'entrenamiento', 'sueno'];

const NOMBRE_ACTIVIDAD = {
  agua: 'agua', comida: 'las comidas',
  entrenamiento: 'entrenamiento', sueno: 'sueño', registro: 'registro'
};

/**
 * Qué tiene Fito para decir sobre el día.
 *
 * Antes del mediodía casi no reclama: reprochar a las 9 de la mañana un día que
 * no empezó es la forma más rápida de que la app se vuelva molesta de la manera
 * equivocada.
 */
function reclamoDelDia(d, { vasos = 8, hora = new Date().getHours(), memoria = ULTIMAS_FRASES } = {}) {
  const hechas = {
    comida: (d?.comidas || []).length > 0,
    agua: (d?.agua || 0) >= vasos,
    entrenamiento: (d?.ejercicio || 0) > 0,
    sueno: Number(d?.sueno?.horas) > 0
  };

  const faltan = ORDEN_RECLAMO.filter(k => !hechas[k]);

  if (!faltan.length) return { situacion: 'completo', texto: decir('completo', {}, memoria) };

  const nadaCargado = faltan.length === ORDEN_RECLAMO.length;
  if (nadaCargado && hora >= 11) return { situacion: 'vacio', texto: decir('vacio', {}, memoria) };
  if (nadaCargado) return { situacion: null, texto: '' };

  if (faltan.length === 1 && hora >= 14) {
    return { situacion: 'casi', texto: decir('casi', {}, memoria), falta: faltan[0] };
  }

  /* Antes de las 12 no se reclama nada puntual: el día sigue abierto. */
  if (hora < 12) return { situacion: null, texto: '' };

  const cual = faltan[0];
  return {
    situacion: cual,
    falta: cual,
    texto: decir(cual, { n: d?.agua || 0, meta: vasos, que: NOMBRE_ACTIVIDAD[cual] }, memoria)
  };
}

/** El texto de un logro recién ganado. */
function celebrarLogro(id, memoria = ULTIMAS_FRASES) {
  const l = typeof logro === 'function' ? logro(id) : null;
  return l ? decir('logro', { logro: l.nombre }, memoria) : '';
}

/** El texto de haber subido de nivel. */
function celebrarNivel(lvl, memoria = ULTIMAS_FRASES) {
  return decir('nivel', { n: lvl.nivel, nombre: lvl.nombre }, memoria);
}

/** Lo que se cuenta cuando un escudo salvó una racha. */
function contarEscudo(salvada, memoria = ULTIMAS_FRASES) {
  return decir('escudo', {
    que: NOMBRE_ACTIVIDAD[salvada.id] || salvada.nombre,
    n: salvada.racha
  }, memoria);
}
