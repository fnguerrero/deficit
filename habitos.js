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
  { id: 'yoga', nombre: 'Yoga', emoji: '🧘', met: 3.0, minutos: 45 },
  { id: 'boxeo', nombre: 'Boxeo', emoji: '🥊', met: 7.8, minutos: 45 }
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

/* ---------------- pasos ---------------- */

/*
 * Los pasos se cargan A MANO, y eso decide todo lo demas.
 *
 * Una PWA no llega al podometro: ni la Sensor API ni Health Connect estan
 * disponibles desde el navegador, asi que el numero sale de mirar el reloj o
 * el telefono y anotarlo. Por eso el objetivo se cumple de un toque en vez de
 * pedir el numero exacto: quien anota 10.000 no conto los pasos, leyo una
 * pantalla y la copio.
 *
 * El default es 10.000 por pedido explicito de Nico. Vale aclarar que va a
 * contramano de lo que hace el agua unas lineas mas arriba, que arranca bajo a
 * proposito para que el casillero se pueda cumplir: 10.000 es la cifra
 * conocida, no la proxima alcanzable. Se baja de a 500 desde el mismo editor.
 */
const PASOS_DEFECTO = 10000;
const PASOS_MIN = 1000;
const PASOS_MAX = 40000;
const PASOS_SALTO = 500;

function pasosObjetivo(elegido = null) {
  const n = Number(elegido);
  if (n > 0) return Math.min(PASOS_MAX, Math.max(PASOS_MIN, Math.round(n / 100) * 100));
  return PASOS_DEFECTO;
}

/* ---------------- agua (sigue) ---------------- */

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

/* ---------------- proyección al peso objetivo ---------------- */

/*
 * Cuándo se llega al peso objetivo al ritmo de las últimas semanas.
 *
 * Se calcula sobre el ritmo REAL medido, no sobre el que promete el modo: el
 * del modo es una intención, y la única cifra que sirve para planear es la que
 * está pasando de verdad.
 *
 * Con menos de tres semanas de peso no se proyecta nada. Una recta trazada
 * sobre dos pesadas no es una tendencia, es ruido con pretensiones.
 */
const SEMANAS_MINIMAS_PROYECCION = 3;

function proyeccionPeso(dias, pesoObjetivo, hasta = hoyISO()) {
  const puntos = [];
  const ventana = 120;

  for (let i = ventana - 1; i >= 0; i--) {
    const f = sumarDias(hasta, -i);
    if (!f) continue;
    const p = Number(dias?.[f]?.peso);
    if (p > 0) puntos.push({ f, p, i: ventana - 1 - i });
  }

  const meta = Number(pesoObjetivo);
  if (!(meta > 0)) return { hay: false, motivo: 'Cargá tu peso objetivo en Perfil.' };
  if (puntos.length < 4) {
    return { hay: false, motivo: `Con ${plural(puntos.length, 'pesada')} no alcanza. Pesate unas cuantas veces más.` };
  }

  const dias_ = diasEntre(puntos[0].f, puntos[puntos.length - 1].f);
  if (dias_ < SEMANAS_MINIMAS_PROYECCION * 7) {
    return { hay: false, motivo: `Faltan datos: hacen falta al menos ${SEMANAS_MINIMAS_PROYECCION} semanas de pesadas.` };
  }

  /* Cuadrados mínimos sobre (día, peso). Con el promedio de los extremos
     alcanzaría, pero una sola pesada rara en la punta torcería todo. */
  const n = puntos.length;
  const sx = puntos.reduce((a, q) => a + q.i, 0);
  const sy = puntos.reduce((a, q) => a + q.p, 0);
  const sxy = puntos.reduce((a, q) => a + q.i * q.p, 0);
  const sxx = puntos.reduce((a, q) => a + q.i * q.i, 0);
  const denom = n * sxx - sx * sx;
  if (!denom) return { hay: false, motivo: 'No se puede calcular la tendencia.' };

  const porDia = (n * sxy - sx * sy) / denom;
  const actual = puntos[puntos.length - 1].p;
  const falta = meta - actual;

  const porSemana = +(porDia * 7).toFixed(2);

  if (Math.abs(porSemana) < 0.05) {
    return { hay: false, porSemana, actual, meta, motivo: 'Tu peso está estable: a este ritmo no llegás ni te alejás.' };
  }
  if (falta === 0) return { hay: true, llegaste: true, porSemana, actual, meta, dias: 0 };
  if ((falta > 0) !== (porDia > 0)) {
    return {
      hay: false, porSemana, actual, meta,
      motivo: `Vas para el otro lado: ${porSemana > 0 ? 'subiendo' : 'bajando'} ${fmtNum(Math.abs(porSemana), 2)} kg por semana.`
    };
  }

  const diasFaltan = Math.round(falta / porDia);
  return {
    hay: true, llegaste: false, porSemana, actual, meta,
    dias: diasFaltan,
    fecha: sumarDias(hasta, diasFaltan),
    /* El rango honesto: el ritmo medido no es una promesa. */
    optimista: sumarDias(hasta, Math.round(diasFaltan * 0.75)),
    pesimista: sumarDias(hasta, Math.round(diasFaltan * 1.5))
  };
}

/* ---------------- déficit peligroso ---------------- */

/*
 * Un déficit sostenido muy grande deja de ser eficaz y empieza a costar músculo
 * y hormonas. Los umbrales son los de manual: bajar más de un 1% del peso por
 * semana, o comer por debajo del metabolismo basal, sostenido.
 */
function deficitPeligroso(dias, perfil, objetivo, hasta = hoyISO(), ventana = 14) {
  const tmb = objetivo?.tmb;
  if (!tmb) return { alerta: false };

  const consumos = [];
  for (let i = 0; i < ventana; i++) {
    const f = sumarDias(hasta, -i);
    if (!f) continue;
    const comidas = dias?.[f]?.comidas || [];
    if (comidas.length) consumos.push(kcalDe(comidas));
  }

  if (consumos.length < 7) return { alerta: false, motivo: 'Pocos días para opinar.' };

  const prom = consumos.reduce((a, b) => a + b, 0) / consumos.length;
  if (prom >= tmb) return { alerta: false, promedio: Math.round(prom), tmb };

  return {
    alerta: true,
    promedio: Math.round(prom),
    tmb,
    dias: consumos.length,
    texto: `Venís comiendo ${fmtNum(Math.round(prom))} kcal por día, por debajo de tu metabolismo basal ` +
      `(${fmtNum(tmb)}). Sostenido, eso cuesta músculo y no solo grasa. Vale la pena hablarlo con un profesional.`
  };
}

/* ---------------- fibra ---------------- */

/* 14 g cada 1.000 kcal es la referencia habitual. Se calcula sobre el objetivo
   y no sobre lo comido, para que no baje sola los días que se come poco. */
function objetivoFibra(kcalObjetivo) {
  const k = Number(kcalObjetivo);
  if (!(k > 0)) return 25;
  return Math.round((k / 1000) * 14);
}

/*
 * El objetivo de agua sube con el ejercicio del día.
 *
 * Media hora de gimnasio pide medio litro más, y pedirlo el día que entrenaste
 * es distinto de pedirlo todos los días: el objetivo sigue siendo cumplible y
 * además se mueve por un motivo que se entiende.
 */
const ML_POR_100_KCAL = 150;

function vasosPorEjercicio(kcalEjercicio, mlVaso = ML_POR_VASO) {
  const k = Number(kcalEjercicio);
  if (!(k > 0)) return 0;
  return Math.round((k / 100) * ML_POR_100_KCAL / mlVaso);
}

/*
 * Moverse, sin tener que ponerle nombre.
 *
 * Para anotar que saliste a caminar había que elegir un rótulo de una lista de
 * tres. Pero de un rato de movimiento uno se acuerda de dos cosas: cuánto duró
 * y qué tan fuerte fue. Con eso alcanza para estimar, y no hace falta mantener
 * una lista de actividades que nunca va a estar completa.
 *
 * Los MET son los de tabla: 3 es caminar tranquilo, 6 trotar o una clase, 9
 * correr fuerte o un partido.
 */
/* Se llaman por lo que uno hizo, no por una escala. "Moderado" hay que
   traducirlo cada vez; "Trote" ya es la respuesta. Los ids no cambian: son lo
   que quedo guardado. */
const INTENSIDADES = [
  { id: 'suave', nombre: 'Caminata', met: 3, detalle: 'o elongar, mandados' },
  { id: 'medio', nombre: 'Trote', met: 6, detalle: 'o bici, clase, nadar' },
  { id: 'fuerte', nombre: 'Correr', met: 9, detalle: 'o partido, pesas fuerte' }
];

const MINUTOS_EJERCICIO = [15, 30, 45, 60, 90];

function intensidadDe(id) {
  return INTENSIDADES.find(i => i.id === id) || INTENSIDADES[1];
}

/* ---------------- los ratos de movimiento del dia ---------------- */

/*
 * El dia guardaba un solo numero: 583 kcal de ejercicio, y de donde salian era
 * cosa de acordarse. Ahora cada rato queda anotado —que fue, cuanto duro y
 * cuanto quemo— y el total es la suma, que es lo unico que ve el resto de la
 * app. Sin el desglose el numero no se puede corregir: borrar los 200 de mas
 * que cargaste dos veces era volver a calcular a mano lo que quedaba.
 */

/** Los ratos anotados de un dia, tolerando los dias viejos que no los tienen. */
function movimientosDe(d) {
  return Array.isArray(d?.movimientos) ? d.movimientos : [];
}

/** La suma de los ratos anotados. */
function kcalDeMovimientos(d) {
  return movimientosDe(d).reduce((a, m) => a + (Number(m.kcal) || 0), 0);
}

/**
 * Lo que no esta desglosado.
 *
 * Un dia de antes de esto, o uno con las kcal puestas a mano, tiene total sin
 * renglones. Ese resto se muestra como una linea propia en vez de esconderse:
 * si el total dice 500 y los renglones suman 300, los otros 200 tienen que
 * estar en alguna parte.
 */
function restoSinDesglosar(d) {
  return Math.max(0, (Number(d?.ejercicio) || 0) - kcalDeMovimientos(d));
}

/** Las calorías de moverse tantos minutos a tal intensidad, para ese cuerpo. */
function caloriasDeMovimiento(minutos, intensidadId, pesoKg) {
  const m = Number(minutos) || 0;
  const p = Number(pesoKg) || 0;
  if (m <= 0 || p <= 0) return 0;
  return Math.round(intensidadDe(intensidadId).met * p * (m / 60));
}
