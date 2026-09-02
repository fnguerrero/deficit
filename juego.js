/* ============================================================
   juego.js — rachas, XP, niveles y logros.

   Lo que hace que se vuelva mañana. La app del ciclo 5 ya era cumplible; esto
   es lo que hace que cumplirla tenga con qué medirse.

   Dos decisiones que atraviesan todo el archivo:

   1. **Las rachas son varias y separadas.** Perder la del agua no toca la del
      entrenamiento. Una sola racha grande, cuando se rompe, se abandona; las
      chicas se recuperan de a una.

   2. **El XP se gana por registrar, no solo por cumplir.** Cumplir paga más,
      pero un día malo anotado también suma. Lo que sostiene el hábito es
      volver, no no fallar nunca — y una app que solo premia la perfección se
      cierra el primer día que se falla.
   ============================================================ */

/* Las rachas. `cumple` recibe el día y el contexto porque los objetivos de agua
   y de pasos los elige cada uno. */
const RACHAS = [
  {
    /* El id no cambia nunca: es la clave con la que quedaron guardados los
       escudos ya gastados. El nombre sí, para que diga lo mismo que el
       casillero de la grilla. */
    id: 'registro', nombre: 'Comidas', icono: '🍽️',
    cumple: (d) => (d?.comidas || []).length > 0
  },
  {
    id: 'agua', nombre: 'Agua', icono: '💧',
    cumple: (d, ctx) => (d?.agua || 0) >= (ctx?.vasos || 8)
  },
  {
    id: 'entrenamiento', nombre: 'Ejercicio', icono: '🏃',
    cumple: (d) => (d?.ejercicio || 0) > 0
  },
  {
    id: 'sueno', nombre: 'Sueño', icono: '😴',
    cumple: (d) => Number(d?.sueno?.horas) >= 6.5
  },
  {
    id: 'pasos', nombre: 'Pasos', icono: '👟',
    cumple: (d, ctx) => (d?.pasos || 0) >= (ctx?.pasos || PASOS_DEFECTO)
  },
  {
    id: 'peso', nombre: 'Peso', icono: '⚖️',
    cumple: (d) => Number(d?.peso) > 0
  },
  {
    id: 'animo', nombre: 'Ánimo', icono: '🙂',
    cumple: (d) => !!d?.animo
  }
];

/*
 * Las cuatro de siempre, y desde cuando son siete.
 *
 * La grilla de Hoy y esta lista venian midiendo cosas distintas sin decirlo:
 * habia dias con los cinco casilleros en verde que no eran perfectos (faltaba
 * cargar una comida) y dias perfectos sin haberse pesado. Ahora es una sola
 * lista, y todo lo que se ve cuenta.
 *
 * Pero el cambio no puede mirar hacia atras. Nadie cargo pasos nunca, y quien
 * se peso o anoto como venia lo hizo sin saber que contaba: exigirselo hoy a
 * un año de historial borraria de un saque la racha y los dias perfectos
 * ganados con las reglas que habia. Asi que hay una fecha de corte, y antes de
 * ella un dia perfecto sigue siendo lo que era cuando se vivio.
 */
const RACHAS_BASE = ['registro', 'agua', 'entrenamiento', 'sueno'];
const DESDE_SIETE = '2026-09-02';

/** Que rachas hacen un dia perfecto en esa fecha. */
function rachasDe(fecha) {
  return fecha >= DESDE_SIETE ? RACHAS : RACHAS.filter(r => RACHAS_BASE.includes(r.id));
}

/**
 * Si ese dia quedo completo, con las reglas que regian ESE dia.
 *
 * Todo lo que decide un dia perfecto —el XP, la fase, los logros— pasa por
 * aca. Tenerlo en un solo lugar es lo que evita que dentro de seis meses una
 * de las cuatro cuentas se olvide de la fecha de corte y contradiga a las
 * otras tres.
 */
function diaPerfecto(d, fecha, ctx = {}) {
  return rachasDe(fecha).every(r => r.cumple(d, ctx));
}

function racha(id) {
  return RACHAS.find(r => r.id === id) || null;
}

const JUEGO_VACIO = { xp: 0, logros: [], anunciados: [], escudosGastados: 0, escudosUsados: {} };

/** El juego de un estado, completando lo que falte. Sirve de migración. */
function juegoDe(state) {
  const j = state?.juego || {};
  return {
    xp: Number(j.xp) || 0,
    logros: Array.isArray(j.logros) ? j.logros.slice() : [],
    anunciados: Array.isArray(j.anunciados) ? j.anunciados.slice() : [],
    escudosGastados: Number(j.escudosGastados) || 0,
    /* Qué día tapó un escudo, por actividad: `{ agua: ['2026-08-20'] }`. */
    escudosUsados: j.escudosUsados && typeof j.escudosUsados === 'object' ? clonar(j.escudosUsados) : {},
    /* Y qué día se ganó cada logro. Va acá y no afuera porque esta función es
       una lista blanca: lo que no se nombre se pierde en cada recálculo, que es
       exactamente lo que pasaba con las fechas. */
    fechasLogros: j.fechasLogros && typeof j.fechasLogros === 'object' ? clonar(j.fechasLogros) : {}
  };
}

/* ---------------- las rachas ---------------- */

/**
 * Días seguidos cumpliendo una actividad, contando hacia atrás desde hoy.
 *
 * Dos reglas que parecen detalles y no lo son:
 *
 * · **El día de hoy sin cumplir no corta**: todavía se puede completar. Cortar
 *   a las 9 de la mañana sería mentir sobre un día que ni empezó.
 * · **Un día tapado por un escudo cuenta como cumplido**, que es exactamente
 *   para lo que existe el escudo.
 */
function rachaDe(dias, id, { hoy = hoyISO(), vasos = 8, pasos = PASOS_DEFECTO, juego = null } = {}) {
  const r = racha(id);
  if (!r) return { actual: 0, mejor: 0, hoyCumplido: false, escudado: false };

  const tapados = new Set((juego?.escudosUsados || {})[id] || []);
  const ctx = { vasos, pasos };

  let actual = 0;
  let escudado = false;
  const ventana = ventanaHistorial(dias, hoy);

  for (let i = 0; i < ventana; i++) {
    const f = sumarDias(hoy, -i);
    if (r.cumple(dias?.[f], ctx)) { actual++; continue; }
    if (tapados.has(f)) { actual++; escudado = true; continue; }
    if (i === 0) continue;   // hoy todavía puede completarse
    break;
  }

  return {
    actual,
    mejor: mejorRacha(dias, id, { hoy, vasos, pasos, juego }),
    hoyCumplido: r.cumple(dias?.[hoy], ctx),
    escudado
  };
}

/** La racha más larga que hubo, para poder decir "tu récord son 12". */
function mejorRacha(dias, id, { hoy = hoyISO(), vasos = 8, pasos = PASOS_DEFECTO, juego = null } = {}) {
  const r = racha(id);
  const tapados = new Set((juego?.escudosUsados || {})[id] || []);
  const ctx = { vasos, pasos };

  let mejor = 0;
  let corriendo = 0;

  for (let i = ventanaHistorial(dias, hoy) - 1; i >= 0; i--) {
    const f = sumarDias(hoy, -i);
    if (r.cumple(dias?.[f], ctx) || tapados.has(f)) {
      corriendo++;
      if (corriendo > mejor) mejor = corriendo;
    } else if (i > 0) {
      corriendo = 0;
    }
  }
  return mejor;
}

/** Las siete rachas de un saque, que es como se muestran. */
function todasLasRachas(dias, opts = {}) {
  return RACHAS.map(r => ({ ...r, ...rachaDe(dias, r.id, opts) }));
}

/* ---------------- los escudos ---------------- */

/*
 * Un escudo cada 7 días registrados, hasta 2 guardados.
 *
 * Se gana, no se regala ni se compra: un escudo regalado no protege nada
 * porque no costó nada. Y el tope de 2 evita lo que le pasa a toda app con
 * congeladores acumulables — juntás quince y la racha deja de significar algo.
 */
const DIAS_POR_ESCUDO = 7;
const MAX_ESCUDOS = 2;

/*
 * Solo los dias que ya pasaron: uno del futuro sumaba a la cuenta y regalaba
 * escudos y logros que no se ganaron. `hoy` entra por parametro y no se lee
 * adentro porque toda la familia de funciones del juego ya lo recibe — leerlo
 * acá rompia cualquier calculo hecho sobre una fecha que no fuera la de verdad.
 */
function diasRegistrados(dias, hoy = hoyISO()) {
  return Object.values(diasPasados(dias, hoy)).filter(
    d => (d?.comidas || []).length || d?.peso || d?.agua || d?.ejercicio || d?.animo || d?.sueno
  ).length;
}

function escudosDisponibles(dias, juego, hoy = hoyISO()) {
  const ganados = Math.floor(diasRegistrados(dias, hoy) / DIAS_POR_ESCUDO);
  const gastados = juego?.escudosGastados || 0;
  return Math.max(0, Math.min(MAX_ESCUDOS, ganados - gastados));
}

/* Debajo de esto no se gasta un escudo: tapar el día 2 de una racha de 2 es
   tirar el escudo a la basura. Se guarda para cuando duela. */
const RACHA_MINIMA_ESCUDO = 3;

/**
 * Gasta escudos por los días que se perdieron, si hay con qué.
 *
 * Muta el juego a propósito: es una acción, no un cálculo, y corre una vez al
 * arrancar el día. Devuelve qué actividades se salvaron para poder contarlo.
 */
function aplicarEscudos(dias, juego, { hoy = hoyISO(), vasos = 8, pasos = PASOS_DEFECTO } = {}) {
  const ayer = sumarDias(hoy, -1);
  const salvadas = [];

  /* Solo las que regian ayer: un escudo gastado en una racha que ese dia
     todavia no existia seria tirar el escudo. */
  for (const r of rachasDe(ayer)) {
    if (escudosDisponibles(dias, juego, hoy) <= 0) break;
    if (r.cumple(dias?.[ayer], { vasos, pasos })) continue;

    const usados = juego.escudosUsados[r.id] || [];
    if (usados.includes(ayer)) continue;

    /* La racha que había hasta anteayer: si era corta, no se gasta el escudo. */
    const previa = rachaDe(dias, r.id, { hoy: sumarDias(hoy, -2), vasos, juego }).actual;
    if (previa < RACHA_MINIMA_ESCUDO) continue;

    juego.escudosUsados[r.id] = usados.concat([ayer]);
    juego.escudosGastados = (juego.escudosGastados || 0) + 1;
    salvadas.push({ id: r.id, nombre: r.nombre, racha: previa });
  }

  return salvadas;
}

/* ---------------- XP y niveles ---------------- */

const XP = {
  registrar: 10,     // por anotar cualquier cosa del día
  objetivo: 15,      // por cada objetivo completado
  diaCompleto: 25,   // las cuatro actividades el mismo día
  logro: 40
};

/*
 * Los cortes de nivel. Con un día normal de uso se juntan entre 40 y 70 XP, así
 * que el nivel 1 llega el segundo día y el último pide como medio año. Sube
 * rápido al principio, que es cuando hace falta que suba.
 */
const XP_POR_NIVEL = [0, 100, 250, 500, 900, 1500, 2300, 3400, 4800, 6600, 9000];

const NOMBRES_NIVEL = [
  'Recién llegado', 'Curioso', 'Constante', 'Enganchado', 'Disciplinado',
  'Veterano', 'Imparable', 'Referente', 'Leyenda', 'Fuera de serie', 'Mítico'
];

function nivelDe(xp) {
  /* `Number(xp) || 0` sola deja pasar Infinity, que despues rompe la barra de
     progreso con un ancho de NaN%. */
  const bruto = Number(xp);
  const x = isFinite(bruto) ? Math.max(0, bruto) : 0;
  let nivel = 0;
  for (let i = 0; i < XP_POR_NIVEL.length; i++) {
    if (x >= XP_POR_NIVEL[i]) nivel = i;
  }

  const siguiente = XP_POR_NIVEL[nivel + 1] ?? null;
  const base = XP_POR_NIVEL[nivel];

  return {
    nivel,
    nombre: NOMBRES_NIVEL[nivel] || NOMBRES_NIVEL[NOMBRES_NIVEL.length - 1],
    xp: x,
    faltan: siguiente == null ? 0 : siguiente - x,
    siguiente,
    pct: siguiente == null ? 1 : (x - base) / (siguiente - base)
  };
}

/**
 * El XP que vale un día.
 *
 * Se recalcula entero en vez de irse sumando: sumar de a poco significa que un
 * error de conteo queda para siempre, y que borrar una comida no devuelve lo
 * que había pagado.
 */
function xpDelDia(d, fecha, { vasos = 8, pasos = PASOS_DEFECTO } = {}) {
  if (!d) return 0;

  /* Contra las rachas de ESE dia: pagar por siete objetivos en un dia en que
     habia cuatro daria menos XP hoy que ayer por el mismo esfuerzo. */
  const vigentes = rachasDe(fecha);
  const cumplidas = vigentes.filter(r => r.cumple(d, { vasos, pasos })).length;
  const algo = (d.comidas || []).length || d.peso || d.agua || d.ejercicio || d.animo || d.sueno || d.pasos;
  if (!algo) return 0;

  let total = XP.registrar + cumplidas * XP.objetivo;
  if (cumplidas === vigentes.length) total += XP.diaCompleto;
  return total;
}

function xpTotal(dias, { vasos = 8, pasos = PASOS_DEFECTO, logros = [] } = {}) {
  const porDias = Object.entries(dias || {}).reduce((a, [f, d]) => a + xpDelDia(d, f, { vasos, pasos }), 0);
  return porDias + (logros?.length || 0) * XP.logro;
}

/* ---------------- logros ---------------- */

/*
 * Las condiciones miran el historial entero, no un contador guardado. Es más
 * caro y es lo correcto: un logro que depende de un contador se pierde si el
 * contador se rompe, y se puede ganar dos veces si se duplica.
 */
const LOGROS = [
  { id: 'primer-dia', nombre: 'El primer día', detalle: 'Registraste algo por primera vez', icono: '🌱',
    cumple: (c) => c.registrados >= 1 },
  { id: 'semana', nombre: 'Una semana', detalle: '7 días registrados', icono: '📅',
    cumple: (c) => c.registrados >= 7 },
  { id: 'mes', nombre: 'Un mes', detalle: '30 días registrados', icono: '🗓️',
    cumple: (c) => c.registrados >= 30 },
  { id: 'cien', nombre: 'Cien días', detalle: '100 días registrados', icono: '💯',
    cumple: (c) => c.registrados >= 100 },

  { id: 'racha-7', nombre: 'En racha', detalle: '7 días seguidos de registro', icono: '🔥',
    cumple: (c) => c.mejores.registro >= 7 },
  { id: 'racha-30', nombre: 'Imparable', detalle: '30 días seguidos de registro', icono: '🚀',
    cumple: (c) => c.mejores.registro >= 30 },

  { id: 'agua-7', nombre: 'Bien hidratado', detalle: '7 días seguidos llegando al agua', icono: '💧',
    cumple: (c) => c.mejores.agua >= 7 },
  { id: 'agua-30', nombre: 'Como un pez', detalle: '30 días seguidos llegando al agua', icono: '🐟',
    cumple: (c) => c.mejores.agua >= 30 },

  { id: 'entreno-10', nombre: 'Arrancó el gimnasio', detalle: '10 entrenamientos', icono: '💪',
    cumple: (c) => c.entrenamientos >= 10 },
  { id: 'entreno-50', nombre: 'Ya es costumbre', detalle: '50 entrenamientos', icono: '🏋️',
    cumple: (c) => c.entrenamientos >= 50 },
  { id: 'entreno-racha', nombre: 'Semana completa', detalle: '7 días seguidos entrenando', icono: '⚡',
    cumple: (c) => c.mejores.entrenamiento >= 7 },

  { id: 'sueno-7', nombre: 'Dormido', detalle: '7 días seguidos durmiendo bien', icono: '😴',
    cumple: (c) => c.mejores.sueno >= 7 },

  { id: 'balanza-10', nombre: 'Fiel a la balanza', detalle: 'Pesaste 10 veces', icono: '⚖️',
    cumple: (c) => c.pesadas >= 10 },
  { id: 'perfecto', nombre: 'Día perfecto', detalle: 'Todo el tablero el mismo día', icono: '✨',
    cumple: (c) => c.perfectos >= 1 },
  { id: 'perfecto-5', nombre: 'Cinco perfectos', detalle: '5 días con todo completo', icono: '🌟',
    cumple: (c) => c.perfectos >= 5 },
  { id: 'nivel-5', nombre: 'Veterano', detalle: 'Llegaste al nivel 5', icono: '🎖️',
    cumple: (c) => c.nivel >= 5 }
];

/** Todo lo que las condiciones necesitan saber, calculado una sola vez. */
function contextoLogros(dias, juego, { hoy = hoyISO(), vasos = 8, pasos = PASOS_DEFECTO } = {}) {
  const pasadas = Object.entries(diasPasados(dias, hoy));
  const valores = pasadas.map(([, d]) => d);
  const mejores = {};
  for (const r of RACHAS) mejores[r.id] = mejorRacha(dias, r.id, { hoy, vasos, pasos, juego });

  return {
    registrados: diasRegistrados(dias, hoy),
    entrenamientos: valores.filter(d => (d?.ejercicio || 0) > 0).length,
    pesadas: valores.filter(d => Number(d?.peso) > 0).length,
    perfectos: pasadas.filter(([f, d]) => diaPerfecto(d, f, { vasos, pasos })).length,
    mejores,
    nivel: nivelDe(juego?.xp || 0).nivel
  };
}

/** Los ids que ya se ganaron, en el orden del catálogo. */
function logrosGanados(ctx) {
  return LOGROS.filter(l => l.cumple(ctx)).map(l => l.id);
}

function logro(id) {
  return LOGROS.find(l => l.id === id) || null;
}

/**
 * Recalcula el juego entero contra el historial.
 *
 * Devuelve el juego nuevo y qué logros aparecieron, para poder anunciarlos.
 * Recalcular en vez de acumular es lo que hace que borrar una comida cargada
 * por error no deje XP fantasma dando vueltas.
 */
function recalcularJuego(dias, juegoPrevio, { hoy = hoyISO(), vasos = 8, pasos = PASOS_DEFECTO } = {}) {
  const juego = juegoDe({ juego: juegoPrevio });

  const salvadas = aplicarEscudos(dias, juego, { hoy, vasos, pasos });

  /* Los logros se calculan con el XP anterior porque uno de ellos mira el
     nivel: si se calculara con el XP nuevo, ganar el logro podría subir el
     nivel que desbloquea ese mismo logro. */
  const ctx = contextoLogros(dias, juego, { hoy, vasos, pasos });
  const ganados = logrosGanados(ctx);
  const nuevos = ganados.filter(id => !juego.logros.includes(id));

  /* La fecha se anota una sola vez, la primera. Un logro es una cosa que paso
     un dia concreto y sin eso la pantalla solo puede decir que esta ganado, que
     es justamente lo que ya se ve por el color. */
  juego.fechasLogros = { ...(juego.fechasLogros || {}) };
  for (const id of nuevos) {
    if (!juego.fechasLogros[id]) juego.fechasLogros[id] = hoy;
  }

  juego.logros = ganados;
  juego.xp = xpTotal(dias, { vasos, pasos, logros: ganados });

  return { juego, nuevos, salvadas, escudos: escudosDisponibles(dias, juego, hoy) };
}

/** Los que todavía no aparecieron en pantalla, para poder festejarlos una vez. */
function logrosPorAnunciar(juego) {
  return (juego?.logros || []).filter(id => !(juego?.anunciados || []).includes(id));
}

/* ---------------- las fases ---------------- */

/*
 * La escalera de transformaciones, que sube con los días perfectos seguidos.
 *
 * Por qué la transformación va en el AURA y el PELO y no en el cuerpo: si un
 * día bueno te dibujara flaco, la app estaría diciendo que cumpliste y ya
 * adelgazaste, que es mentira y encima desinfla el día que la balanza no
 * acompañe. El cuerpo sigue saliendo de lo que medís. Lo que se prende fuego
 * es el personaje.
 *
 * Hubo una excepción a esa regla —un plus de musculatura por día perfecto— y
 * duró hasta que se vio en pantalla: alguien con IMC 47,9 se dibujaba como uno
 * de 36,3, porque el plus se colaba en el descuento por músculo. La excepción
 * era justo lo que el párrafo de arriba dice que no hay que hacer.
 */
/*
 * `pose` es cuánto se abre la postura. Los colores van de dorado a rojo a blanco:
 * saturados y calientes, no pasteles — un aura pastel se lee tierna, que es
 * exactamente lo contrario de lo que esto tiene que transmitir.
 */
const FASES = [
  { n: 0, nombre: 'Normal', detalle: 'Cumplí un día entero y esto empieza', pose: 0 },
  { n: 1, nombre: 'Encendido', color: '#ffc107', pelo: 'punta', pose: .35 },
  { n: 2, nombre: 'Furia', color: '#ffab00', pelo: 'punta', rayos: true, pose: .55 },
  { n: 3, nombre: 'Bestia', color: '#ff6d00', pelo: 'punta', rayos: true, pose: .75, suelo: true },
  { n: 4, nombre: 'Titán', color: '#f4511e', pelo: 'punta', rayos: true, pose: .9, suelo: true },
  { n: 5, nombre: 'Leyenda', color: '#d50000', pelo: 'punta', rayos: true, pose: 1, suelo: true, divino: true },
  { n: 6, nombre: 'Fuera de escala', color: '#00b0ff', pelo: 'punta', rayos: true, pose: 1, suelo: true, divino: true }
];

const FASE_MAX = FASES.length - 1;

/* El plus al músculo por días perfectos seguidos se fue del todo, y con él el
   campo `musculo` de las fases. Inflaba el cuerpo: con IMC 47,9 el muñeco que
   se dibujaba equivalía a uno de 36,3, porque el plus entraba en el descuento
   por músculo. La fase se ve en el pelo, el aura, los rayos y la pose — que es
   lo que aura.js dice desde que existe. */

/**
 * Días perfectos seguidos, contando hacia atrás.
 *
 * Igual que las rachas: el día de hoy incompleto no corta, porque todavía se
 * puede completar. La diferencia es que acá no hay escudo que valga — la fase
 * se gana y se pierde, y esa es toda la gracia.
 */
function diasPerfectos(dias, { hoy = hoyISO(), vasos = 8, pasos = PASOS_DEFECTO } = {}) {
  let n = 0;
  const ventana = ventanaHistorial(dias, hoy);
  for (let i = 0; i < ventana; i++) {
    const f = sumarDias(hoy, -i);
    if (diaPerfecto(dias?.[f], f, { vasos, pasos })) { n++; continue; }
    if (i === 0) continue;
    break;
  }
  return n;
}

/**
 * Si la fase se gano en dias que ya terminaron y hoy todavia no aporta nada.
 *
 * `diasPerfectos` no corta la racha con el dia de hoy incompleto, y esta bien:
 * a las nueve de la manana nadie cumplio nada todavia. Pero eso deja la pantalla
 * diciendo dos cosas opuestas —el muneco en llamas al lado de "el dia esta en
 * blanco"— sin avisar que la fase se cae a la medianoche si el dia no se
 * completa. La cuenta no cambia; lo que faltaba era decirlo.
 */
function faseEnRiesgo(dias, { hoy = hoyISO(), vasos = 8, pasos = PASOS_DEFECTO } = {}) {
  return !diaPerfecto(dias?.[hoy], hoy, { vasos, pasos });
}

function faseDe(perfectos) {
  return FASES[Math.min(FASE_MAX, Math.max(0, Number(perfectos) || 0))];
}



/* ---------------- avisos del juego ---------------- */

/*
 * Qué rachas se van a cortar hoy si no se hace nada.
 *
 * Solo sirve avisar cuando todavía se puede hacer algo: a las 23:50 el aviso es
 * un reproche, no una ayuda. Y solo de las rachas que duelen — cortar una de
 * dos días no es noticia.
 */
const RACHA_QUE_DUELE = 3;
const HORA_AVISO_RACHA = 18;

function rachasEnPeligro(dias, { hoy = hoyISO(), vasos = 8, pasos = PASOS_DEFECTO, juego = null, hora = new Date().getHours() } = {}) {
  if (hora < HORA_AVISO_RACHA) return [];

  return todasLasRachas(dias, { hoy, vasos, pasos, juego })
    .filter(r => !r.hoyCumplido && r.actual >= RACHA_QUE_DUELE)
    .sort((a, b) => b.actual - a.actual);
}

/**
 * El logro más cerca de ganarse.
 *
 * Un tablero con dieciséis medallas grises no dice por dónde seguir. Uno solo,
 * con cuánto falta, sí.
 */
function logroMasCerca(dias, juego, { hoy = hoyISO(), vasos = 8, pasos = PASOS_DEFECTO } = {}) {
  const ctx = contextoLogros(dias, juego, { hoy, vasos, pasos });
  const ganados = new Set(logrosGanados(ctx));

  /* Cuánto falta se mide por familia, porque cada logro cuenta otra cosa. */
  const progreso = (l) => {
    const m = /(\d+)/.exec(l.detalle);
    if (!m) return null;
    const meta = Number(m[1]);

    const tengo =
      /registrad/.test(l.detalle) ? ctx.registrados :
        /entrenamiento/.test(l.detalle) ? ctx.entrenamientos :
          /Pesaste/.test(l.detalle) ? ctx.pesadas :
            /tablero|completo/.test(l.detalle) ? ctx.perfectos :
              /seguidos.*registro|registro/.test(l.detalle) ? ctx.mejores.registro :
                /agua/.test(l.detalle) ? ctx.mejores.agua :
                  /entrenando/.test(l.detalle) ? ctx.mejores.entrenamiento :
                    /durmiendo/.test(l.detalle) ? ctx.mejores.sueno : null;

    if (tengo == null || meta <= 0) return null;
    return { meta, tengo, falta: Math.max(0, meta - tengo), pct: Math.min(1, tengo / meta) };
  };

  const candidatos = LOGROS
    .filter(l => !ganados.has(l.id))
    .map(l => ({ logro: l, ...(progreso(l) || {}) }))
    .filter(c => c.pct != null && c.falta > 0)
    .sort((a, b) => b.pct - a.pct);

  return candidatos[0] || null;
}
