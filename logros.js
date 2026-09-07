/* ============================================================
   logros.js — el catalogo de logros y lo que hace falta para ganarlos.

   Salio de juego.js. Las condiciones miran el historial entero y no un
   contador guardado: quien los reparte sigue siendo recalcularJuego(), alla.
   ============================================================ */

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
function contextoLogros(dias, juego, { hoy = hoyISO(), vasos = 8, pasos = PASOS_DEFECTO, modo = null, objetivo = null } = {}) {
  const pasadas = Object.entries(diasPasados(dias, hoy));
  const valores = pasadas.map(([, d]) => d);
  const mejores = {};
  for (const r of RACHAS) mejores[r.id] = mejorRacha(dias, r.id, { hoy, vasos, pasos, juego, modo, objetivo });

  return {
    registrados: diasRegistrados(dias, hoy),
    entrenamientos: valores.filter(d => (d?.ejercicio || 0) > 0).length,
    pesadas: valores.filter(d => Number(d?.peso) > 0).length,
    perfectos: pasadas.filter(([f, d]) => diaPerfecto(d, f, { vasos, pasos, modo, objetivo, fecha: f })).length,
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
