/* ============================================================
   mascota.js — el personaje que refleja cómo venís.

   La idea: en vez de mirar cinco números, mirás una cara. Si dormiste poco
   está cansado, si no tomaste agua está seco, si te pasaste de calorías está
   pesado. Es el mismo dato de siempre, dicho de una forma que se entiende sin
   leer.

   Una decisión deliberada: el personaje refleja ENERGÍA y ÁNIMO, nunca forma
   corporal. Dibujar un cuerpo gordo como castigo por comer de más convierte a
   la app en algo que dice "tu cuerpo es el fracaso" cada vez que se abre, y eso
   empuja a una relación peor con la comida, no mejor.
   ============================================================ */

const MASCOTA_NOMBRE = 'Fito';

/* Cada dimensión del día se resuelve por separado y después se elige la que
   más pesa. Así el personaje siempre puede decir POR QUÉ está como está. */

/** ¿Durmió? Sin dato no se inventa: se devuelve null y no cuenta. */
function estadoSueno(d) {
  const s = d?.sueno;
  if (!s || !s.horas) return null;

  const h = Number(s.horas);
  if (h < 5) return { dim: 'sueno', nivel: 'mal', peso: 3, texto: `Dormiste ${fmtNum(h, 1)} h. Así el hambre y las ganas de azúcar suben solas.` };
  if (h < 6.5) return { dim: 'sueno', nivel: 'flojo', peso: 2, texto: `${fmtNum(h, 1)} h de sueño: se nota en el día.` };
  if (h > 9.5) return { dim: 'sueno', nivel: 'flojo', peso: 1, texto: `${fmtNum(h, 1)} h. Dormir de más también deja pesado.` };
  return { dim: 'sueno', nivel: 'bien', peso: 1, texto: `${fmtNum(h, 1)} h de sueño.` };
}

/** ¿Tomó agua? Se mide contra su propio objetivo. */
function estadoAgua(d, objetivoVasos, hora) {
  const vasos = d?.agua || 0;
  const meta = objetivoVasos || 8;
  const pct = vasos / meta;

  // Antes del mediodía nadie tomó su objetivo: no se lo reprocha.
  if (hora < 14 && vasos > 0) return { dim: 'agua', nivel: 'bien', peso: 1, texto: `${vasos} de ${meta} vasos.` };
  if (hora < 14) return null;

  if (pct < 0.35) return { dim: 'agua', nivel: 'mal', peso: 2, texto: `${vasos} de ${meta} vasos. Está seco.` };
  if (pct < 0.7) return { dim: 'agua', nivel: 'flojo', peso: 1, texto: `${vasos} de ${meta} vasos.` };
  return { dim: 'agua', nivel: 'bien', peso: 1, texto: `${vasos} de ${meta} vasos.` };
}

/** ¿Comió lo que tenía que comer? Mira el total y también la hora. */
function estadoComida(d, objetivo, hora) {
  if (!objetivo?.kcal) return null;

  const kcal = (d?.comidas || []).reduce((a, c) => a + (Number(c.kcal) || 0), 0);
  const pct = kcal / objetivo.kcal;

  if (pct > 1.25) return { dim: 'comida', nivel: 'mal', peso: 3, texto: `${fmtNum(Math.round(kcal))} kcal: te pasaste bastante del objetivo.` };
  if (pct > 1.05) return { dim: 'comida', nivel: 'flojo', peso: 2, texto: `${fmtNum(Math.round(kcal))} kcal, un poco por encima.` };

  // quedarse muy corto tampoco es ganar: es el camino al atracón de la noche
  if (hora >= 21 && pct < 0.6) return { dim: 'comida', nivel: 'flojo', peso: 2, texto: `Solo ${fmtNum(Math.round(kcal))} kcal en todo el día. Comer de menos se paga después.` };
  if (hora >= 14 && kcal === 0) return { dim: 'comida', nivel: 'mal', peso: 2, texto: 'No registraste nada todavía.' };

  // Con el día en blanco no hay nada que celebrar ni que reprochar: se calla.
  if (kcal === 0) return null;

  if (pct >= 0.75 && pct <= 1.05) return { dim: 'comida', nivel: 'bien', peso: 2, texto: `${fmtNum(Math.round(kcal))} de ${fmtNum(objetivo.kcal)} kcal.` };
  return { dim: 'comida', nivel: 'bien', peso: 1, texto: `${fmtNum(Math.round(kcal))} kcal hasta ahora.` };
}

function estadoMovimiento(d, hora) {
  const kcal = d?.ejercicio || 0;
  if (kcal > 0) return { dim: 'movimiento', nivel: 'bien', peso: 2, texto: `Te moviste: ${fmtNum(kcal)} kcal.` };

  if (hora >= 20) return { dim: 'movimiento', nivel: 'flojo', peso: 1, texto: 'Hoy no te moviste.' };
  return null;
}

/**
 * Cómo está el personaje hoy.
 *
 * Gana la dimensión con más peso entre las que están mal: si dormiste 4 horas,
 * eso manda por más que hayas tomado agua. Con todo bien, el estado depende de
 * cuánto se completó.
 */
function estadoMascota(d, { objetivo = null, objetivoVasos = 8, racha = 0, hora = new Date().getHours() } = {}) {
  /* La hora entra por parámetro y no se lee adentro: media docena de reglas
     dependen de ella —a las 10 de la mañana no se reprocha nada, a las 18 sí—,
     y sin poder fijarla los tests dependen de a qué hora se corren. */
  const dims = [
    estadoSueno(d),
    estadoAgua(d, objetivoVasos, hora),
    estadoComida(d, objetivo, hora),
    estadoMovimiento(d, hora)
  ].filter(Boolean);

  const malas = dims.filter(x => x.nivel === 'mal').sort((a, b) => b.peso - a.peso);
  const flojas = dims.filter(x => x.nivel === 'flojo').sort((a, b) => b.peso - a.peso);
  const bien = dims.filter(x => x.nivel === 'bien');

  // día en blanco: ni siquiera hay con qué opinar
  if (!dims.length) {
    return {
      animo: 'neutral', dim: null, racha,
      titulo: `${MASCOTA_NOMBRE} está esperando`,
      texto: 'Cargá algo del día y te digo cómo venís.'
    };
  }

  if (malas.length) {
    const p = malas[0];
    return {
      animo: ANIMO_POR_DIM[p.dim] || 'triste',
      dim: p.dim, racha,
      titulo: TITULO_POR_DIM[p.dim] || `${MASCOTA_NOMBRE} no la está pasando bien`,
      texto: p.texto
    };
  }

  if (flojas.length) {
    const p = flojas[0];
    return { animo: 'flojo', dim: p.dim, racha, titulo: `${MASCOTA_NOMBRE} va tirando`, texto: p.texto };
  }

  // todo lo que se midió está bien: cuánto se completó define el brillo
  const completo = bien.length >= 3;
  return {
    animo: completo ? 'genial' : 'bien',
    dim: null, racha,
    titulo: completo ? `${MASCOTA_NOMBRE} está a pleno` : `${MASCOTA_NOMBRE} está bien`,
    texto: bien.map(b => b.texto).join(' ')
  };
}

const ANIMO_POR_DIM = {
  sueno: 'cansado',
  agua: 'seco',
  comida: 'pesado',
  movimiento: 'flojo'
};

const TITULO_POR_DIM = {
  sueno: `${MASCOTA_NOMBRE} está cansado`,
  agua: `${MASCOTA_NOMBRE} tiene sed`,
  comida: `${MASCOTA_NOMBRE} está pesado`,
  movimiento: `${MASCOTA_NOMBRE} está quieto`
};

/* ---------------- la racha de registro ---------------- */

/* Los niveles se mudaron a juego.js: pasaron de contarse por días registrados a
   contarse por XP. El principio no cambió —se sube por volver, no por ser
   perfecto—, pero ahora hay con qué premiar cumplir además de aparecer. */

/** Días seguidos con algo cargado, contando hacia atrás desde hoy. */
function rachaActual(dias, hoy = hoyISO()) {
  let n = 0;
  for (let i = 0; i < 400; i++) {
    const f = sumarDias(hoy, -i);
    const d = dias?.[f];
    const hayAlgo = d && ((d.comidas || []).length || d.peso || d.agua || d.ejercicio || d.animo || d.sueno);

    if (!hayAlgo) {
      // el día de hoy todavía puede completarse: no corta la racha
      if (i === 0) continue;
      break;
    }
    n++;
  }
  return n;
}

/* El dibujo vive en personaje.js: acá quedó solo la lógica de en qué estado
   está el personaje, que es lo que se puede probar con tests. */
