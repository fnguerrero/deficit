/* ============================================================
   voz.js — lo que te dice la app.

   Ya no hay un personaje con nombre propio: el muñeco sos vos, y la app te
   habla a vos. Cambió la persona gramatical, no el tono.

   La regla que ordena todo el archivo:

   **Reclama, insiste y hace chistes; nunca humilla.** Puede ser dramática,
   puede hacerse la ofendida, puede exagerar. Lo que no hace nunca es tratarte
   mal por tu cuerpo ni por haber comido de más — esa es exactamente la línea
   entre que dé gracia volver y que dé bronca abrir la app.

   Ninguna frase se repite dos veces seguidas: eso solo requiere acordarse de
   la anterior, y es la diferencia entre una voz y un cartel.
   ============================================================ */

const VOZ = {
  /* Al abrir, con el día en blanco. */
  vacio: [
    'Día en blanco. Un lienzo. Una hoja. Una nada.',
    'Cero comidas, cero agua, cero todo. Al menos sos consistente.',
    'No hay un solo dato de hoy. Así no se puede trabajar.',
    'Empezamos de cero otra vez. Bueno, es lo que hay.',
    'Hoy todavía no pasó nada. Literalmente nada.'
  ],

  agua: [
    'Tomá agua. Es gratis, sale de la canilla, no se entiende el problema.',
    'Vas {n} de {meta} vasos. Ese número duele.',
    'Un vaso de agua. Uno. Tardás menos que en leer esto.',
    'Falta el agua. Y sí, va a seguir apareciendo hasta que la tomes.',
    'El agua sigue en {n} de {meta}. Sin comentarios.'
  ],

  comida: [
    'No registraste nada todavía. ¿Comiste? ¿Estás bien?',
    'Una foto. Un plato. Algo. Dale algo con qué trabajar.',
    'Comiste, seguro. Lo que falta es que se sepa qué.',
    'Sin comidas cargadas esto es un diario vacío con dibujitos.',
    'Registrá algo. Después no te quejes de que los gráficos están vacíos.'
  ],

  entrenamiento: [
    'Hoy no te moviste. Sin juzgar. Pero se dice.',
    'Veinte minutos de caminata también cuentan, por si buscabas excusa.',
    'Tu racha de entrenamiento te está mirando con cara de "y?".',
    'El ejercicio de hoy sigue en cero. Solo se menciona. Al pasar.',
    'Movete un poco. Que después se hace tarde y ahí sí no hay tiempo.'
  ],

  peso: [
    'Falta subirte a la balanza. Un número, cinco segundos.',
    'Sin el peso de hoy la curva se queda con un agujero.',
    'Pesate. Sea cual sea el número, sirve más anotado que evitado.',
    'El peso de hoy sigue sin cargar. La balanza no muerde.'
  ],

  animo: [
    'Falta marcar cómo venís. Es una carita, no una terapia.',
    'Ánimo sin cargar. Un toque y listo.',
    'Todavía no dijiste cómo venís hoy. Es el dato que explica los otros.'
  ],

  pasos: [
    'Los pasos de hoy siguen sin cargar. Aunque sea copiá el número del reloj.',
    'Vas {n} pasos. La meta son {meta}. Las cuentas las hacés vos.',
    'Falta anotar los pasos. Caminaste, seguro. Falta que se sepa cuánto.',
    'Los pasos están en cero. Que no es lo mismo que no haber caminado, pero acá sí.'
  ],

  sueno: [
    'Cargá cuánto dormiste. Es el dato que más explica todo lo demás.',
    'Falta el sueño de anoche. Sin eso no se puede explicar el hambre de hoy.',
    'Dormiste algo, se supone. Anotalo y seguimos.',
    'El sueño de anoche está sin cargar. Y pesa más de lo que parece.'
  ],

  /* Todo cumplido. Poder festejar de verdad es lo que hace que reclamar sirva. */
  completo: [
    'Día completo. Las cuatro. No queda nada para reprocharte.',
    'Cumpliste todo. Es raro y está buenísimo.',
    'Las cuatro actividades. Hoy fuiste otra persona.',
    'Impecable. Guardá este día que lo vamos a extrañar.',
    'Todo hecho. Andá tranquilo, hoy no se te jode más.'
  ],

  /* Falta poco: es el momento en que insistir sirve de verdad. */
  casi: [
    'Te falta una sola cosa para el día completo. UNA.',
    'Estás a un paso. Un paso.',
    'Falta una y cerrás el día perfecto. Dale que llegás.',
    'Una sola pendiente y después silencio, prometido.'
  ],

  racha: [
    '{n} días seguidos. No te vas a cortar hoy, ¿no?',
    'Llevás {n} días de {que}. Eso ya es una costumbre.',
    '{n} días. Empieza a dar para creerte.',
    'Racha de {n} en {que}. Cuidala.'
  ],

  rachaEnPeligro: [
    'Tu racha de {que} muere hoy si no hacés algo.',
    '{n} días de {que} colgando de un hilo. El hilo sos vos.',
    'Un día más así y perdés {n} días de {que}. Vos verás.'
  ],

  escudo: [
    'Ayer no cumpliste {que}, pero un escudo te tapó el día. De nada.',
    'Se gastó un escudo para salvarte la racha de {que}.',
    'Se te iban {n} días de {que}. Fue un escudo. No lo hagas costumbre.'
  ],

  logro: [
    '¡{logro}! Eso se gana una sola vez.',
    'Desbloqueaste "{logro}". Ya es tuyo para siempre.',
    '{logro}. Guardado, anotado y celebrado.'
  ],

  nivel: [
    '¡Nivel {n}! Ahora sos {nombre}.',
    'Subiste a nivel {n}: {nombre}. Se siente distinto, ¿no?',
    'Nivel {n} alcanzado. {nombre}, nada menos.'
  ],

  /* Las fases: la escalera de días perfectos seguidos. */
  fase: [
    '¡{fase}! {n} días perfectos seguidos.',
    'Pasaste a {fase}. Se te nota de lejos.',
    '{n} días perfectos. Estás en {fase} y subiendo.'
  ],

  faseCaida: [
    'Se cortó la racha perfecta y con ella la fase. Se recupera.',
    'Adiós fase. Un día completo y volvés a arrancar la escalera.',
    'La fase se apagó. La buena noticia es que se prende igual de rápido.'
  ],

  /* Cuando algo sigue pendiente después de un rato con la app abierta. */
  insiste: [
    'Sigue pendiente. Solo se avisa.',
    'Ya pasó un rato y {que} sigue igual.',
    'Lo de {que} no se olvidó. Nunca se olvida.',
    'Se dijo lo de {que} hace un rato. Se repite por las dudas.'
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
/* Los pasos van al final: es el unico que no se puede resolver desde el sillon
   a las once de la noche, asi que reclamarlo primero seria pedir lo imposible
   antes que lo facil. */
const ORDEN_RECLAMO = ['agua', 'comida', 'animo', 'entrenamiento', 'sueno', 'peso', 'pasos'];

const NOMBRE_ACTIVIDAD = {
  agua: 'agua', comida: 'las comidas', pasos: 'pasos',
  peso: 'peso', animo: 'ánimo',
  entrenamiento: 'entrenamiento', sueno: 'sueño', registro: 'registro'
};

/**
 * Qué hay para decir sobre el día.
 *
 * Antes del mediodía casi no reclama: reprochar a las 9 de la mañana un día que
 * no empezó es la forma más rápida de que la app se vuelva molesta de la manera
 * equivocada.
 */
function reclamoDelDia(d, { vasos = 8, pasos = 10000, hora = new Date().getHours(), memoria = ULTIMAS_FRASES } = {}) {
  const hechas = {
    comida: (d?.comidas || []).length > 0,
    agua: (d?.agua || 0) >= vasos,
    entrenamiento: (d?.ejercicio || 0) > 0,
    sueno: Number(d?.sueno?.horas) > 0,
    pasos: (d?.pasos || 0) >= pasos,
    /* El peso y el animo entraron cuando la grilla y las rachas se volvieron
       una sola lista: sin esto la voz festejaba el dia completo mientras el
       chip de la fase avisaba que faltaban dos casilleros. */
    peso: Number(d?.peso) > 0,
    animo: !!d?.animo
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
    /* Cada reclamo trae SUS numeros: con {n} y {meta} fijos en el agua, la
       frase de pasos decia "vas 3 pasos, la meta son 4". */
    texto: decir(cual, cual === 'pasos'
      ? { n: d?.pasos || 0, meta: pasos, que: NOMBRE_ACTIVIDAD[cual] }
      : { n: d?.agua || 0, meta: vasos, que: NOMBRE_ACTIVIDAD[cual] }, memoria)
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
