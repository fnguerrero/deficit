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
 * Fito es un SVG hecho a mano, no una imagen.
 *
 * Lo que hace que un personaje se lea como personaje y no como ícono son tres
 * cosas: ojos grandes con pupila (para que mire), CEJAS (que es donde vive el
 * 90% de la expresión) y un cuerpo con panza. Todo lo demás es decoración.
 *
 * Los colores son propios y no del tema: un personaje que cambia de color con
 * el tema deja de ser el mismo personaje. Solo el fondo se adapta.
 */

const FITO = {
  cuerpo: '#5fbf6a',
  cuerpoOscuro: '#4aa356',
  panza: '#e8f5d8',
  pico: '#f5a742',
  picoOscuro: '#e08c28',
  ojo: '#ffffff',
  pupila: '#2c2418',
  ceja: '#3d8f47',
  mejilla: '#f08ea0',
  hoja: '#7dd67d'
};

/*
 * Cada ánimo es un puñado de parámetros, no un dibujo aparte: así los ocho
 * estados son el mismo bicho y no ocho bichos distintos.
 *
 * ceja: inclinación en grados (negativo = enojado/preocupado hacia adentro)
 * parpado: cuánto baja el párpado, 0 a 1
 * mirada: hacia dónde miran las pupilas
 */
const ANIMOS = {
  neutral: { ceja: 0, cejaY: 0, parpado: 0, boca: 'recta', mirada: [0, 0], mejillas: false, color: FITO.cuerpo },
  bien:    { ceja: -4, cejaY: -2, parpado: 0, boca: 'sonrisa', mirada: [0, 0], mejillas: true, color: FITO.cuerpo },
  genial:  { ceja: -8, cejaY: -3, parpado: 0, boca: 'sonrisota', mirada: [0, -1], mejillas: true, color: FITO.cuerpo, ojosFelices: true, brillos: true },
  flojo:   { ceja: 7, cejaY: 0, parpado: .35, boca: 'recta', mirada: [0, 1], mejillas: false, color: '#8fc47a' },
  cansado: { ceja: 11, cejaY: 1, parpado: .75, boca: 'chica', mirada: [0, 2], mejillas: false, color: '#9fb98f', zzz: true, ojeras: true },
  seco:    { ceja: 13, cejaY: 1, parpado: .15, boca: 'seca', mirada: [1, 0], mejillas: false, color: '#b5bf70', gota: true },
  /* Pesado mira para abajo y con los ojos casi cerrados; triste mira de frente
     con las cejas hacia arriba por dentro, que es el gesto de pena y no de
     modorra. Sin eso los dos se leían igual. */
  pesado:  { ceja: 17, cejaY: 2, parpado: .3, boca: 'triste', mirada: [0, 2.4], mejillas: false, color: '#9aad72', pesado: true },
  triste:  { ceja: -20, cejaY: -1, parpado: .15, boca: 'triste', mirada: [0, .6], mejillas: false, color: '#8fa891', lagrima: true }
};

/*
 * Un tono más oscuro del mismo color. La ceja tenía color fijo, y cuando el
 * cuerpo se apaga —cansado, seco— quedaba como una barra oscura pegada al ojo
 * en vez de leerse como parte de la cara.
 */
function oscurecer(hex, factor = 0.72) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * factor);
  const g = Math.round(((n >> 8) & 255) * factor);
  const b = Math.round((n & 255) * factor);
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function bocaDeFito(tipo) {
  // El pico va cerrado o abierto según el ánimo: es lo que más se nota de lejos.
  if (tipo === 'sonrisota') {
    return `<path d="M50 78 q10 14 20 0 q-10 6 -20 0" fill="${FITO.picoOscuro}"/>
            <path d="M48 76 q12 -9 24 0 q-12 5 -24 0" fill="${FITO.pico}"/>`;
  }
  if (tipo === 'sonrisa') {
    return `<path d="M50 76 q10 -7 20 0 q-10 9 -20 0" fill="${FITO.pico}"/>`;
  }
  if (tipo === 'triste') {
    return `<path d="M50 80 q10 -8 20 0 q-10 -3 -20 0" fill="${FITO.pico}"/>
            <path d="M52 84 q8 5 16 0" stroke="${FITO.picoOscuro}" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }
  if (tipo === 'seca') {
    return `<path d="M50 76 q10 -6 20 0 q-10 8 -20 0" fill="${FITO.pico}"/>
            <path d="M54 82 h12" stroke="${FITO.picoOscuro}" stroke-width="2" stroke-linecap="round"/>`;
  }
  if (tipo === 'chica') {
    return `<path d="M54 77 q6 -4 12 0 q-6 6 -12 0" fill="${FITO.pico}"/>`;
  }
  return `<path d="M51 76 q9 -6 18 0 q-9 7 -18 0" fill="${FITO.pico}"/>`;
}

function ojoDeFito(cx, a) {
  const [mx, my] = a.mirada;
  const px = cx + mx * 2.5;
  const py = 56 + my * 1.8;

  // El párpado es un semicírculo que baja sobre el ojo: con 0.75 queda casi
  // dormido, con 0 bien despierto.
  const parpado = a.parpado > 0
    ? `<path d="M${cx - 14.5} 56 a14.5 14.5 0 0 1 29 0 z" fill="${a.color}"
         transform="translate(0 ${-15 + a.parpado * 32})"/>`
    : '';

  if (a.ojosFelices) {
    return `<path d="M${cx - 11} 58 q11 -13 22 0" stroke="${FITO.pupila}" stroke-width="4"
              fill="none" stroke-linecap="round"/>`;
  }

  return `
    <circle cx="${cx}" cy="56" r="14" fill="${FITO.ojo}"/>
    <circle cx="${px}" cy="${py}" r="7" fill="${FITO.pupila}"/>
    <circle cx="${px - 2.4}" cy="${py - 2.6}" r="2.4" fill="#ffffff" opacity=".95"/>
    ${a.ojeras ? `<path d="M${cx - 9} 66 q9 4 18 0" stroke="#7d8f73" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>` : ''}
    ${parpado}`;
}

/** Fito entero, listo para meter en el DOM. */
function svgMascota(animo = 'neutral', tam = 96) {
  const a = ANIMOS[animo] || ANIMOS.neutral;

  const cejas = `
    <g stroke="${oscurecer(a.color)}" stroke-width="3.6" stroke-linecap="round" fill="none">
      <path d="M34 31 q8 -4 15 -2" transform="rotate(${a.ceja} 42 30) translate(0 ${a.cejaY})"/>
      <path d="M71 29 q7 -2 15 2" transform="rotate(${-a.ceja} 78 30) translate(0 ${a.cejaY})"/>
    </g>`;

  const mejillas = a.mejillas
    ? `<circle cx="30" cy="70" r="6" fill="${FITO.mejilla}" opacity=".5"/>
       <circle cx="90" cy="70" r="6" fill="${FITO.mejilla}" opacity=".5"/>`
    : '';

  const zzz = a.zzz
    ? `<g fill="${FITO.pupila}" opacity=".5" font-family="system-ui" font-weight="700">
         <text x="94" y="30" font-size="13">z</text>
         <text x="103" y="19" font-size="10">z</text>
       </g>`
    : '';

  const lagrima = a.lagrima
    ? `<path d="M55 68 q3 7 0 10 q-3 -3 0 -10" fill="#7ec8f0" opacity=".8"/>`
    : '';

  const gota = a.gota
    ? `<path d="M96 44 q5 8 0 12 q-5 -4 0 -12" fill="#7ec8f0" opacity=".85"/>`
    : '';

  const brillos = a.brillos
    ? `<g fill="#ffe066">
         <path d="M18 34 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z"/>
         <path d="M100 62 l1.8 4.2 4.2 1.8 -4.2 1.8 -1.8 4.2 -1.8 -4.2 -4.2 -1.8 4.2 -1.8z"/>
       </g>`
    : '';

  // La panza cae un poco más cuando está pesado: es el único guiño al cuerpo, y
  // es postura, no forma.
  const panzaY = a.pesado ? 84 : 82;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="${tam}" height="${tam}" class="mascota-svg"
    role="img" aria-label="${MASCOTA_NOMBRE}, ${animo}">

    <ellipse cx="60" cy="112" rx="30" ry="5" fill="${FITO.pupila}" opacity=".12"/>

    <path d="M62 22 q10 -12 20 -6 q-6 12 -18 10z" fill="${FITO.hoja}"/>
    <path d="M60 30 q1 -8 3 -13" stroke="${FITO.cuerpoOscuro}" stroke-width="3" fill="none" stroke-linecap="round"/>

    <ellipse cx="24" cy="72" rx="9" ry="13" fill="${a.color}" transform="rotate(-16 24 72)"/>
    <ellipse cx="96" cy="72" rx="9" ry="13" fill="${a.color}" transform="rotate(16 96 72)"/>

    <ellipse cx="60" cy="64" rx="40" ry="42" fill="${a.color}"/>
    <ellipse cx="60" cy="${panzaY}" rx="27" ry="24" fill="${FITO.panza}"/>

    ${ojoDeFito(42, a)}
    ${ojoDeFito(78, a)}
    ${cejas}
    ${mejillas}
    ${bocaDeFito(a.boca)}

    <ellipse cx="46" cy="105" rx="10" ry="5" fill="${FITO.pico}"/>
    <ellipse cx="74" cy="105" rx="10" ry="5" fill="${FITO.pico}"/>

    ${zzz}${gota}${lagrima}${brillos}
  </svg>`;
}
