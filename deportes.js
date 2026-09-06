/* ============================================================
   Los deportes: cuales hay, cuanto duran y cuanto queman.

   Salieron de habitos.js cuando el tiempo por actividad lo paso de su limite.
   El corte cayo donde ya estaba la costura: habitos.js son los habitos del dia
   —agua, pasos, ayuno— y este archivo, el catalogo de lo que se entrena.
   ============================================================ */

/* ---------------- ejercicio por actividad ---------------- */

/*
 * MET = cuántas veces el gasto en reposo. Es la tabla estándar (Compendium of
 * Physical Activities), la misma base que usa cualquier reloj deportivo.
 * kcal = MET × peso en kg × horas.
 *
 * Cargar "45 minutos de fútbol" es algo que alguien sabe; "480 kcal" no lo sabe
 * nadie. Por eso se elige la actividad y el número lo pone la app.
 */
/*
 * Las ocho que Nico hace, y una hora cada una.
 *
 * Eran once, con duraciones distintas cada una —30, 45, 60— que habia que
 * recordar o mirar. Un rato de deporte dura una hora salvo que corras, y esa
 * es toda la regla; el que entrena distinto lo cambia una vez manteniendo
 * apretado el ejercicio y queda guardado para siempre.
 *
 * Las que se fueron —pesas, bici, caminata, tenis, basquet— se pueden volver a
 * agregar con "Otro ejercicio", y lo ya cargado con ellas no se toca: los ratos
 * del historial guardan el nombre, no el id.
 */
const ACTIVIDADES = [
  { id: 'funcional', nombre: 'Funcional', emoji: '🏋️', met: 6.0, minutos: 60 },
  { id: 'futbol', nombre: 'Fútbol', emoji: '⚽', met: 7.0, minutos: 60 },
  { id: 'boxeo', nombre: 'Boxeo', emoji: '🥊', met: 7.8, minutos: 60 },
  { id: 'natacion', nombre: 'Natación', emoji: '🏊', met: 7.0, minutos: 60 },
  { id: 'padel', nombre: 'Pádel', emoji: '🎾', met: 7.0, minutos: 60 },
  { id: 'yoga', nombre: 'Yoga', emoji: '🧘', met: 3.0, minutos: 60 },
  { id: 'pilates', nombre: 'Pilates', emoji: '🤸', met: 3.8, minutos: 60 },
  /* La unica de media hora: correr una hora seguida no es lo que hace casi
     nadie, y cargar de mas infla el objetivo del dia. */
  { id: 'running', nombre: 'Running', emoji: '🏃', met: 9.8, minutos: 30 }
];

const FAVORITAS_DEFECTO = ['funcional', 'futbol', 'boxeo'];

/** Las actividades del catálogo más las que agregó la persona. */
function actividadesDe(estado) {
  const propias = (estado?.cfg?.actividades || []).filter(a => a && a.id && a.nombre);
  const base = ACTIVIDADES.map(a => {
    // una actividad del catálogo puede tener duración o MET propios
    const ajuste = propias.find(p => p.id === a.id);
    return ajuste ? { ...a, ...ajuste } : a;
  });
  const nuevas = propias.filter(p => !ACTIVIDADES.some(a => a.id === p.id));
  return [...base, ...nuevas];
}

function actividadPorId(estado, id) {
  return actividadesDe(estado).find(a => a.id === id) || null;
}

/** Las favoritas, que ahora son las que van primero y no las unicas que se ven. */
function actividadesFavoritas(estado) {
  const ids = estado?.cfg?.favoritasActividad || FAVORITAS_DEFECTO;
  const todas = actividadesDe(estado);
  return ids.map(id => todas.find(a => a.id === id)).filter(Boolean);
}

/**
 * Todas, con las favoritas adelante.
 *
 * En Hoy se veian solo tres y el resto vivia en Ajustes: anotar una caminata
 * pedia ir a buscarla y meterla en la lista corta. Mostrandolas todas, ser
 * favorita ya no es entrar o no entrar —es el orden—, que es lo unico que
 * sigue haciendo falta cuando la lista es larga.
 */
function actividadesOrdenadas(estado) {
  const favs = actividadesFavoritas(estado);
  const ids = favs.map(a => a.id);
  return [...favs, ...actividadesDe(estado).filter(a => !ids.includes(a.id))];
}

/** Lo que gastó de verdad esa actividad, para ese cuerpo y ese tiempo. */
/**
 * Cuanto dura para ESTA persona: lo que eligio manteniendo apretado, o lo que
 * trae el catalogo.
 */
function minutosActividad(estado, a) {
  const propia = (estado?.cfg?.actividades || []).find(p => p && p.id === a?.id);
  const m = Number(propia?.minutos ?? a?.minutos) || 0;
  return m > 0 ? m : 60;
}

/** El ajuste de duracion, guardado con lo que hace falta para reconstruirla. */
function conMinutos(actividades, a, minutos) {
  const otras = (actividades || []).filter(p => p && p.id !== a.id);
  return [...otras, { id: a.id, nombre: a.nombre, emoji: a.emoji, met: a.met, minutos }];
}

function caloriasActividad(actividad, pesoKg, minutos = null) {
  if (!actividad || !pesoKg) return 0;
  const mins = Number(minutos ?? actividad.minutos) || 0;
  return Math.round(actividad.met * Number(pesoKg) * (mins / 60));
}

/*
 * Cuanto conviene moverse, para tener contra que leer el numero del dia.
 *
 * La OMS pide de 150 a 300 minutos semanales de actividad moderada. Eso son
 * minutos, no calorias: se traduce con el MET de una actividad moderada y el
 * peso de cada uno, que es lo que hace que la referencia sea suya y no un
 * numero de folleto. Es una referencia de SALUD, no del deficit: lo que quemes
 * ademas te sube el objetivo del dia, no lo baja.
 */
const MINUTOS_OMS = [150, 300];
const MET_MODERADO = 5;

function referenciaEjercicio(pesoKg) {
  const p = Number(pesoKg) || 0;
  if (p <= 0) return null;

  const semana = MINUTOS_OMS.map(m => Math.round(MET_MODERADO * p * (m / 60)));
  return { semana, dia: semana.map(k => Math.round(k / 7)), minutos: MINUTOS_OMS };
}
