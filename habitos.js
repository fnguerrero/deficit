/* ============================================================
   habitos.js — ejercicio, agua y ayuno.

   Salió de modos.js, que se pasó de tamaño, y el corte tiene sentido propio:
   un modo decide QUÉ comés y cuánto; esto es todo lo demás que se registra en
   el día y no depende del modo elegido.
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
const ACTIVIDADES = [
  { id: 'funcional', nombre: 'Funcional', emoji: '🏋️', met: 6.0, minutos: 60 },
  { id: 'running', nombre: 'Running', emoji: '🏃', met: 9.8, minutos: 30 },
  { id: 'futbol', nombre: 'Fútbol', emoji: '⚽', met: 7.0, minutos: 60 },
  { id: 'gimnasio', nombre: 'Pesas', emoji: '💪', met: 5.0, minutos: 60 },
  { id: 'bici', nombre: 'Bici', emoji: '🚴', met: 7.5, minutos: 45 },
  { id: 'natacion', nombre: 'Natación', emoji: '🏊', met: 7.0, minutos: 45 },
  { id: 'caminata', nombre: 'Caminata', emoji: '🚶', met: 3.5, minutos: 45 },
  { id: 'tenis', nombre: 'Tenis / pádel', emoji: '🎾', met: 6.5, minutos: 60 },
  { id: 'basquet', nombre: 'Básquet', emoji: '🏀', met: 6.5, minutos: 60 },
  { id: 'yoga', nombre: 'Yoga', emoji: '🧘', met: 3.0, minutos: 45 }
];

const FAVORITAS_DEFECTO = ['funcional', 'running', 'futbol'];

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

/** Las que aparecen en Hoy, de un toque. */
function actividadesFavoritas(estado) {
  const ids = estado?.cfg?.favoritasActividad || FAVORITAS_DEFECTO;
  const todas = actividadesDe(estado);
  return ids.map(id => todas.find(a => a.id === id)).filter(Boolean);
}

/** Lo que gastó de verdad esa actividad, para ese cuerpo y ese tiempo. */
function caloriasActividad(actividad, pesoKg, minutos = null) {
  if (!actividad || !pesoKg) return 0;
  const mins = Number(minutos ?? actividad.minutos) || 0;
  return Math.round(actividad.met * Number(pesoKg) * (mins / 60));
}

/* ---------------- agua ---------------- */

/*
 * El objetivo de agua NO es la recomendación médica: es lo próximo que podés
 * cumplir.
 *
 * Antes devolvía 35 ml por kilo, que para 86 kg son 12 vasos. Nadie que hoy
 * toma dos pasa a doce, así que el casillero quedaba sin marcar todos los días
 * y terminaba ignorado — y un objetivo que se ignora no mueve nada. Ahora
 * arranca en 4, que es una mejora real sobre lo que toma la mayoría, y sube a
 * mano cuando ya se cumple sin esfuerzo.
 *
 * `vasosRecomendados()` sigue calculando el número de la referencia, pero como
 * dato al costado y no como meta.
 */
const VASOS_DEFECTO = 4;
const VASOS_MIN = 1;
const VASOS_MAX = 16;

function vasosObjetivo(pesoKg, elegido = null) {
  const n = Number(elegido);
  if (n > 0) return Math.min(VASOS_MAX, Math.max(VASOS_MIN, Math.round(n)));
  return VASOS_DEFECTO;
}

/** Lo que dice la referencia habitual: 35 ml por kilo, en vasos de 250 ml. */
function vasosRecomendados(pesoKg) {
  if (!pesoKg) return 8;
  return Math.min(14, Math.max(6, Math.round((pesoKg * 35) / 250)));
}

/* ---------------- ayuno intermitente ---------------- */

/* Las ventanas que usa la gente. La primera es la habitual. */
const VENTANAS_AYUNO = [
  { id: '16:8', horas: 16, nombre: '16:8', detalle: '16 h de ayuno, 8 para comer. La más común.' },
  { id: '18:6', horas: 18, nombre: '18:6', detalle: 'Un poco más exigente.' },
  { id: '20:4', horas: 20, nombre: '20:4', detalle: 'Una sola comida grande.' },
  { id: '12:12', horas: 12, nombre: '12:12', detalle: 'Suave: básicamente no picar de noche.' }
];

/**
 * En qué anda un ayuno arrancado.
 *
 * No hay nada que medir automáticamente acá: es un cronómetro. Justamente por
 * eso funciona — no depende de sensores que la PWA no tiene.
 */
function estadoAyuno(inicio, ahora = Date.now(), horasObjetivo = 16) {
  if (!inicio) return { activo: false };

  const ms = Math.max(0, ahora - inicio);
  const horas = ms / 3600000;
  const objetivoMs = horasObjetivo * 3600000;

  const h = Math.floor(horas);
  const m = Math.floor((ms % 3600000) / 60000);

  return {
    activo: true,
    inicio,
    ms,
    horas: +horas.toFixed(2),
    texto: `${h}h ${String(m).padStart(2, '0')}m`,
    pct: Math.min(1, ms / objetivoMs),
    completo: ms >= objetivoMs,
    faltan: Math.max(0, objetivoMs - ms),
    horasObjetivo
  };
}

/** Un ayuno terminado, listo para guardar en el día. */
function cerrarAyuno(inicio, fin = Date.now(), horasObjetivo = 16) {
  const e = estadoAyuno(inicio, fin, horasObjetivo);
  return {
    inicio,
    fin,
    horas: e.horas,
    objetivo: horasObjetivo,
    cumplido: e.completo
  };
}
