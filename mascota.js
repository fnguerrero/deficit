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
function estadoAgua(d, objetivoVasos) {
  const vasos = d?.agua || 0;
  const meta = objetivoVasos || 8;
  const pct = vasos / meta;

  // Antes del mediodía nadie tomó su objetivo: no se lo reprocha.
  const hora = new Date().getHours();
  if (hora < 14 && vasos > 0) return { dim: 'agua', nivel: 'bien', peso: 1, texto: `${vasos} de ${meta} vasos.` };
  if (hora < 14) return null;

  if (pct < 0.35) return { dim: 'agua', nivel: 'mal', peso: 2, texto: `${vasos} de ${meta} vasos. Está seco.` };
  if (pct < 0.7) return { dim: 'agua', nivel: 'flojo', peso: 1, texto: `${vasos} de ${meta} vasos.` };
  return { dim: 'agua', nivel: 'bien', peso: 1, texto: `${vasos} de ${meta} vasos.` };
}

/** ¿Comió lo que tenía que comer? Mira el total y también la hora. */
function estadoComida(d, objetivo) {
  if (!objetivo?.kcal) return null;

  const kcal = (d?.comidas || []).reduce((a, c) => a + (Number(c.kcal) || 0), 0);
  const pct = kcal / objetivo.kcal;
  const hora = new Date().getHours();

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

function estadoMovimiento(d) {
  const kcal = d?.ejercicio || 0;
  if (kcal > 0) return { dim: 'movimiento', nivel: 'bien', peso: 2, texto: `Te moviste: ${fmtNum(kcal)} kcal.` };

  const hora = new Date().getHours();
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
function estadoMascota(d, { objetivo = null, objetivoVasos = 8, racha = 0 } = {}) {
  const dims = [
    estadoSueno(d),
    estadoAgua(d, objetivoVasos),
    estadoComida(d, objetivo),
    estadoMovimiento(d)
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

/* ---------------- niveles y racha ---------------- */

/*
 * El nivel sube por días registrados, no por días perfectos. Premiar solo la
 * perfección hace que un día malo se sienta como perder todo, y ahí es cuando
 * se abandona: lo que sostiene el hábito es volver, no no fallar nunca.
 */
const DIAS_POR_NIVEL = [0, 3, 7, 14, 25, 40, 60, 90, 130, 180, 250];

const NOMBRES_NIVEL = [
  'Recién llegado', 'Curioso', 'Constante', 'Enganchado', 'Disciplinado',
  'Veterano', 'Imparable', 'Referente', 'Leyenda', 'Fuera de serie', 'Mítico'
];

function nivelDe(diasRegistrados) {
  let nivel = 0;
  for (let i = 0; i < DIAS_POR_NIVEL.length; i++) {
    if (diasRegistrados >= DIAS_POR_NIVEL[i]) nivel = i;
  }

  const siguiente = DIAS_POR_NIVEL[nivel + 1] ?? null;
  const base = DIAS_POR_NIVEL[nivel];

  return {
    nivel,
    nombre: NOMBRES_NIVEL[nivel] || NOMBRES_NIVEL.at(-1),
    dias: diasRegistrados,
    faltan: siguiente == null ? 0 : siguiente - diasRegistrados,
    pct: siguiente == null ? 1 : (diasRegistrados - base) / (siguiente - base)
  };
}

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

/* ---------------- el dibujo ---------------- */

/*
 * SVG hecho a mano y no una imagen: pesa nada, se adapta al tema porque usa las
 * variables de color, y sobre todo permite cambiar la expresión sin tener diez
 * archivos. Cada ánimo mueve los ojos, la boca y un par de detalles.
 */
const CARAS = {
  neutral: { ojos: 'abiertos', boca: 'recta', color: 'var(--acc)', gota: false, zzz: false },
  bien:    { ojos: 'abiertos', boca: 'sonrisa', color: 'var(--acc)', gota: false, zzz: false },
  genial:  { ojos: 'felices', boca: 'sonrisota', color: 'var(--acc)', gota: false, zzz: false, brillo: true },
  flojo:   { ojos: 'medio', boca: 'recta', color: 'var(--warn)', gota: false, zzz: false },
  cansado: { ojos: 'cerrados', boca: 'chica', color: 'var(--dim)', gota: false, zzz: true },
  seco:    { ojos: 'abiertos', boca: 'seca', color: 'var(--warn)', gota: true, zzz: false },
  pesado:  { ojos: 'medio', boca: 'triste', color: 'var(--warn)', gota: false, zzz: false },
  triste:  { ojos: 'tristes', boca: 'triste', color: 'var(--dim)', gota: false, zzz: false }
};

function ojosSvg(tipo) {
  if (tipo === 'cerrados') return '<path d="M34 46 q6 5 12 0" /><path d="M54 46 q6 5 12 0" />';
  if (tipo === 'felices')  return '<path d="M34 48 q6 -7 12 0" /><path d="M54 48 q6 -7 12 0" />';
  if (tipo === 'medio')    return '<circle cx="40" cy="47" r="3.5" fill="currentColor" stroke="none"/><circle cx="60" cy="47" r="3.5" fill="currentColor" stroke="none"/><path d="M34 42 h12" /><path d="M54 42 h12" />';
  if (tipo === 'tristes')  return '<circle cx="40" cy="48" r="3.5" fill="currentColor" stroke="none"/><circle cx="60" cy="48" r="3.5" fill="currentColor" stroke="none"/><path d="M34 41 q6 -4 12 -1" /><path d="M54 40 q6 -3 12 1" />';
  return '<circle cx="40" cy="46" r="4.5" fill="currentColor" stroke="none"/><circle cx="60" cy="46" r="4.5" fill="currentColor" stroke="none"/>';
}

function bocaSvg(tipo) {
  if (tipo === 'sonrisota') return '<path d="M38 60 q12 12 24 0 q-12 5 -24 0" fill="currentColor" stroke="none"/>';
  if (tipo === 'sonrisa')   return '<path d="M40 60 q10 8 20 0" />';
  if (tipo === 'triste')    return '<path d="M40 64 q10 -8 20 0" />';
  if (tipo === 'seca')      return '<path d="M42 62 h16" /><path d="M46 58 v8" /><path d="M54 58 v8" />';
  if (tipo === 'chica')     return '<path d="M46 62 h8" />';
  return '<path d="M42 62 h16" />';
}

/** El personaje entero, listo para meter en el DOM. */
function svgMascota(animo = 'neutral', tam = 96) {
  const c = CARAS[animo] || CARAS.neutral;

  const zzz = c.zzz
    ? '<g opacity=".75" font-size="11" font-weight="700" fill="currentColor" stroke="none">' +
      '<text x="74" y="26">z</text><text x="82" y="17">z</text></g>'
    : '';

  const gota = c.gota
    ? '<path d="M74 40 q4 6 0 9 q-4 -3 0 -9" fill="currentColor" stroke="none" opacity=".7"/>'
    : '';

  const brillo = c.brillo
    ? '<g opacity=".9" fill="currentColor" stroke="none">' +
      '<path d="M16 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/>' +
      '<path d="M84 62 l1.5 4 4 1.5 -4 1.5 -1.5 4 -1.5 -4 -4 -1.5 4 -1.5z"/></g>'
    : '';

  return `<svg viewBox="0 0 100 100" width="${tam}" height="${tam}" class="mascota-svg" role="img"
    aria-label="${MASCOTA_NOMBRE}, ${animo}" style="color:${c.color}">
    <g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
      <circle cx="50" cy="52" r="30" fill="currentColor" fill-opacity=".14"/>
      <path d="M50 22 v-8" /><circle cx="50" cy="11" r="3.5" fill="currentColor" stroke="none"/>
      ${ojosSvg(c.ojos)}
      ${bocaSvg(c.boca)}
      <path d="M22 58 q-7 3 -7 10" /><path d="M78 58 q7 3 7 10" />
      ${zzz}${gota}${brillo}
    </g>
  </svg>`;
}
