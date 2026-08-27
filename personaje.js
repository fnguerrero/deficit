/* ============================================================
   personaje.js — el personaje, dibujado en estilo anime.

   Reescrito entero. La versión anterior era vector plano tipo emoji: formas
   redondeadas, un solo tono por parte y sin contorno. Por más músculo y aura
   que se le pusiera encima, ese estilo se lee tierno — y era exactamente lo que
   no servía.

   Tres cosas hacen el estilo nuevo, y son las tres del referente:

   1. **Contorno oscuro** en cada parte. Es lo que separa un dibujo de una
      silueta de color.
   2. **Cel shading**: dos tonos por parte con el corte DURO, no un degradé. La
      luz viene de arriba a la izquierda y la sombra cae siempre del mismo lado.
   3. **Ángulos en vez de círculos**: mandíbula marcada, ojos afilados, cejas en
      cuña, pelo en mechones puntiagudos.

   Lo que NO cambió: los tres ejes. El cuerpo sigue saliendo del IMC medido y de
   los entrenamientos, la cara del día de hoy, y la fase de los días perfectos
   seguidos. El estilo es cómo se dibuja; los datos son qué se dibuja.
   ============================================================ */

const PALETA = {
  /* El contorno no es negro puro: un marrón muy oscuro se integra con la piel
     y el pelo en vez de recortarlos como un sticker. */
  linea: '#241812',

  piel: '#f2c391',
  pielSombra: '#cf9a63',

  pelo: '#2a1d15',
  peloSombra: '#150e0a',
  peloBrillo: '#4a3427',

  /* La musculosa se queda con el verde de siempre: es lo último que sobrevive
     de la primera versión y lo que mantiene al personaje reconocible. */
  remera: '#41ad5b',
  remeraOsc: '#2d7d40',

  short: '#39445a',
  shortOsc: '#28303f',

  zapa: '#e9edf4',
  zapaOsc: '#a9b3c2',

  ojo: '#ffffff',
  iris: '#5b3a22',
  pupila: '#1a1208',
  boca: '#8f3b32',
  bocaOsc: '#5e211c',
  ceja: '#241812',
  mejilla: '#e0736a'
};

/* El lienzo. Crece hacia arriba y a los costados: el pelo de las fases sube
   bastante más que la cabeza y la postura de poder abre los brazos fuera del
   ancho del cuerpo. El origen negativo deja intactas las coordenadas del cuerpo. */
const VB = { x: -8, y: -46, w: 136, h: 222 };

/* Alturas de referencia del cuerpo. */
const Y = { hombro: 62, pecho: 76, cintura: 96, cadera: 110, rodilla: 138, pie: 168 };

/* El grosor del contorno. Un solo número: si cada parte tuviera el suyo, el
   dibujo se desarma en pedazos que no parecen del mismo personaje. */
const LINEA = 2.4;

/* ---------------- las medidas ---------------- */

/**
 * De los ejes del cuerpo salen todos los anchos.
 *
 * `poder` es el músculo que presta la fase. Entra en TODO lo que ensancha y en
 * nada de lo que afina: una racha de días perfectos puede ponerte más grande,
 * nunca más flaco. Afinar la cintura por cumplir sería decirte que ya bajaste
 * de peso sin que la balanza haya dicho nada.
 */
function medidasDe(contextura, musculatura, poder = 0) {
  const c = contextura == null ? 0.42 : Math.min(1, Math.max(0, contextura));
  const m = Math.min(1, Math.max(0, musculatura || 0));
  const p = Math.min(1, Math.max(0, poder || 0));

  return {
    c, m, p,
    fuerza: Math.min(1, m + p),
    hombro: 17 + c * 4 + m * 8 + p * 8,
    pecho: 15.5 + c * 12 + m * 4 + p * 4,
    cintura: 11.5 + c * 22 - m * 2,
    cadera: 13.5 + c * 16,
    brazo: 3.6 + c * 2.6 + (m + p) * 3.6,
    pierna: 5.4 + c * 5 + (m + p) * 1.8,
    cuello: 6 + c * 3 + (m + p) * 2.4,
    caraRx: 16.5 + c * 6,
    caraRy: 20.5
  };
}

/** El medio ancho del torso a una altura cualquiera, interpolando. */
function anchoEn(y, med) {
  const puntos = [
    [Y.hombro, med.hombro], [Y.pecho, med.pecho],
    [Y.cintura, med.cintura], [Y.cadera, med.cadera]
  ];

  if (y <= puntos[0][0]) return puntos[0][1];
  for (let i = 1; i < puntos.length; i++) {
    const [y0, a0] = puntos[i - 1];
    const [y1, a1] = puntos[i];
    if (y <= y1) return a0 + (a1 - a0) * ((y - y0) / (y1 - y0));
  }
  return puntos[puntos.length - 1][1];
}

/**
 * La silueta del torso entre dos alturas, muestreada.
 *
 * Muestrear en vez de escribir curvas a mano deja cortar el contorno a
 * cualquier altura, que es lo que hace falta para que la ropa siga al cuerpo en
 * vez de ser un rectángulo pegado encima.
 */
function silueta(med, desdeY, hastaY, paso = 2) {
  const izq = [];
  const der = [];

  for (let y = desdeY; y <= hastaY; y += paso) {
    const a = anchoEn(y, med);
    izq.push((60 - a).toFixed(1) + ' ' + y.toFixed(1));
    der.unshift((60 + a).toFixed(1) + ' ' + y.toFixed(1));
  }

  const aFin = anchoEn(hastaY, med);
  izq.push((60 - aFin).toFixed(1) + ' ' + hastaY.toFixed(1));
  der.unshift((60 + aFin).toFixed(1) + ' ' + hastaY.toFixed(1));

  return 'M ' + izq.join(' L ') + ' L ' + der.join(' L ') + ' Z';
}

/**
 * La mitad derecha de la silueta, cerrada por una vertical.
 *
 * Es el truco que resuelve todo el cel shading del torso sin `clipPath`: la
 * sombra es la misma silueta partida al medio, así que nunca se sale del
 * cuerpo. Con clipPath habría que generar ids únicos, y en la página de taller
 * hay siete personajes a la vez.
 */
function mediaSilueta(med, desdeY, hastaY, corte = 0.3, paso = 2) {
  const borde = [];
  const eje = [];

  for (let y = desdeY; y <= hastaY; y += paso) {
    const a = anchoEn(y, med);
    borde.push((60 + a).toFixed(1) + ' ' + y.toFixed(1));
    eje.unshift((60 + a * corte).toFixed(1) + ' ' + y.toFixed(1));
  }

  return 'M' + borde.join(' L ') + ' L ' + eje.join(' L ') + ' Z';
}

/* ---------------- las poses ---------------- */

const POSES = {
  neutral: { hombros: 0, cabeza: 0, inclina: 0, brazos: -6, piernas: .25 },
  bien: { hombros: -1, cabeza: -1, inclina: 0, brazos: -8, piernas: .3 },
  genial: { hombros: -2, cabeza: -2, inclina: 0, brazos: -26, piernas: .35, festeja: true },
  flojo: { hombros: 2, cabeza: 1.5, inclina: 3, brazos: 2, piernas: .1 },
  cansado: { hombros: 4, cabeza: 4, inclina: 8, brazos: 5, piernas: 0 },
  seco: { hombros: 2, cabeza: 2, inclina: 4, brazos: 3, piernas: .1 },
  pesado: { hombros: 4, cabeza: 3, inclina: 5, brazos: 6, piernas: 0 },
  triste: { hombros: 5, cabeza: 4, inclina: -4, brazos: 6, piernas: 0 }
};

/*
 * La cara, en parámetros. Las cejas son donde vive casi toda la expresión y por
 * eso tienen tres controles propios; la boca tiene uno solo.
 */
const CARAS = {
  neutral: { ceja: 0, cejaY: 0, parpado: 0, boca: 'recta', mirada: [0, 0] },
  bien: { ceja: -5, cejaY: -1.5, parpado: 0, boca: 'sonrisa', mirada: [0, 0] },
  genial: { ceja: -9, cejaY: -2.5, parpado: 0, boca: 'risa', mirada: [0, -.5], ojosFelices: true, brillos: true },
  flojo: { ceja: 8, cejaY: .5, parpado: .3, boca: 'recta', mirada: [0, .8] },
  cansado: { ceja: 12, cejaY: 1, parpado: .72, boca: 'chica', mirada: [0, 1.4], ojeras: true, zzz: true },
  seco: { ceja: 14, cejaY: 1, parpado: .15, boca: 'seca', mirada: [1, 0], gota: true },
  pesado: { ceja: 17, cejaY: 1.6, parpado: .3, boca: 'triste', mirada: [0, 1.8], ojeras: true },
  triste: { ceja: -20, cejaY: -.5, parpado: .15, boca: 'triste', mirada: [0, .5], lagrima: true },

  /* De la fase 2 para arriba la cara la manda la fase: cejas hacia adentro,
     ojos apretados y la boca gritando. */
  furioso: { ceja: 26, cejaY: -1, parpado: 0, boca: 'grito', mirada: [0, -.4], intenso: true }
};

/* Un color mezclado con otro, para apagar la ropa cuando el día viene mal. */
function mezclar(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16);
  const b = parseInt(hexB.slice(1), 16);
  const mix = (d) => {
    const va = (a >> d) & 255;
    const vb = (b >> d) & 255;
    return Math.round(va + (vb - va) * t).toString(16).padStart(2, '0');
  };
  return '#' + mix(16) + mix(8) + mix(0);
}

const APAGADOS = { flojo: .2, cansado: .42, seco: .3, pesado: .38, triste: .45 };

/*
 * La postura de poder: brazos separados del cuerpo, hombros arriba y piernas
 * abiertas. El ángulo del brazo es ABSOLUTO y no relativo al ánimo — 'genial'
 * ya los levanta 26 grados y sumarle la fase los ponía en cruz, que se lee como
 * rendición y no como fuerza.
 */
function posturaDePoder(base, fase) {
  const t = fase.pose || 0;
  return {
    ...base,
    hombros: base.hombros - 2 * t,
    cabeza: base.cabeza - 1 * t,
    inclina: base.inclina * (1 - t * 0.7),
    brazos: -10 - 12 * t,
    piernas: Math.max(base.piernas || 0, t),
    punos: t > 0.3
  };
}

/* ---------------- las partes ---------------- */

/*
 * Un miembro es un trazo grueso con contorno y su banda de sombra.
 *
 * Tres trazos superpuestos: el contorno (más ancho, oscuro), el relleno, y una
 * banda fina corrida hacia la derecha que hace de sombra dura. Es todo el cel
 * shading de brazos y piernas, sin una sola máscara.
 */
function miembro(d, ancho, col, sombra) {
  return `
    <path d="${d}" stroke="${PALETA.linea}" stroke-width="${(ancho + LINEA).toFixed(1)}"
      fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" stroke="${col}" stroke-width="${ancho.toFixed(1)}"
      fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" stroke="${sombra}" stroke-width="${(ancho * 0.3).toFixed(1)}"
      fill="none" stroke-linecap="butt" stroke-linejoin="round"
      transform="translate(${(ancho * 0.3).toFixed(1)} 0)" opacity=".85"/>`;
}

function piernas(med, col, pose) {
  const sep = med.cadera * 0.5 + 1 + (pose?.piernas || 0) * 10;
  const g = med.pierna;
  const iz = 60 - sep;
  const de = 60 + sep;

  /* La pierna entera en un solo trazo: dos trazos separados dejaban una costura
     redonda en la rodilla y el conjunto parecia un muneco de salchichas. */
  const pierna = (x, s2) => `M${x.toFixed(1)} ${Y.cadera - 4}
      L${(x + s2 * 1).toFixed(1)} ${Y.rodilla} L${(x + s2 * 1.5).toFixed(1)} ${Y.pie - 5}`;

  return `
    ${miembro(pierna(iz, -1), g * 1.85, col.piel, col.pielSombra)}
    ${miembro(pierna(de, 1), g * 1.85, col.piel, col.pielSombra)}

    <g stroke="${PALETA.linea}" stroke-width="${LINEA}" stroke-linejoin="round">
      <path d="M${(iz - 8.5).toFixed(1)} ${Y.pie - 2} h14.5 a3.4 3.4 0 0 0 0 -7 h-10 a4.4 4.4 0 0 0 -4.5 3.4z" fill="${PALETA.zapa}"/>
      <path d="M${(de + 8.5).toFixed(1)} ${Y.pie - 2} h-14.5 a3.4 3.4 0 0 1 0 -7 h10 a4.4 4.4 0 0 1 4.5 3.4z" fill="${PALETA.zapa}"/>
      <path d="M${(iz - 9).toFixed(1)} ${Y.pie - 2} h15.5 v3 h-15.5z" fill="${PALETA.zapaOsc}"/>
      <path d="M${(de + 9).toFixed(1)} ${Y.pie - 2} h-15.5 v3 h15.5z" fill="${PALETA.zapaOsc}"/>
    </g>`;
}

function brazos(med, pose, col) {
  const hx = med.hombro - med.brazo * 0.3;
  const codoY = Y.pecho + 12;
  const manoY = Y.cadera + 4;
  const codoX = Math.max(med.hombro, med.pecho) - med.brazo * 0.15;
  const manoX = Math.max(med.cintura, med.cadera) + med.brazo * 0.35;

  const uno = (s) => {
    const hombroX = 60 + hx * s;
    const codo = 60 + codoX * s;
    const mano = 60 + manoX * s;

    /* El bíceps: una curva sobre el brazo que solo aparece cuando hay músculo
       de verdad. Es la línea que hace que un brazo grueso se lea entrenado en
       vez de blando. */
    const bicep = med.fuerza > 0.45
      ? `<path d="M${(hombroX + 2.2 * s).toFixed(1)} ${Y.hombro + 9}
           q${(4.5 * s).toFixed(1)} 5 ${(1 * s).toFixed(1)} 10"
           stroke="${PALETA.pielSombra}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
      : '';

    return `
      <g transform="rotate(${(pose.brazos * s).toFixed(1)} ${hombroX.toFixed(1)} ${Y.hombro + 4})">
        ${miembro(`M${hombroX.toFixed(1)} ${Y.hombro + 3} L${codo.toFixed(1)} ${codoY} L${mano.toFixed(1)} ${manoY}`,
      med.brazo * 1.85, col.piel, col.pielSombra)}
        <circle cx="${mano.toFixed(1)}" cy="${manoY + 2}" r="${(med.brazo * (pose.punos ? 1.15 : 0.9)).toFixed(1)}"
          fill="${col.piel}" stroke="${PALETA.linea}" stroke-width="${LINEA}"/>
        ${pose.punos ? `<path d="M${(mano - med.brazo).toFixed(1)} ${manoY + 2} h${(med.brazo * 2).toFixed(1)}"
          stroke="${PALETA.linea}" stroke-width="1.3" opacity=".7" stroke-linecap="round"/>` : ''}
        ${bicep}
      </g>`;
  };

  return uno(-1) + uno(1);
}

function torso(med, col) {
  const hemTop = Y.hombro - 5;
  const hemMusculosa = Y.cintura + 8;
  const hemShort = Y.cadera + 17;
  const cu = med.cuello;

  /* Los pectorales se dibujan sobre la musculosa, no sobre la piel: es lo que
     hace que la ropa se vea apoyada en un cuerpo y no pintada encima de una
     silueta. */
  const pecho = med.fuerza > 0.4
    ? `<path d="M60 ${Y.pecho - 4} v${(9 + med.fuerza * 4).toFixed(1)}"
         stroke="${col.remeraOsc}" stroke-width="1.8" stroke-linecap="round" opacity=".9"/>
       <path d="M${(60 - med.pecho * 0.72).toFixed(1)} ${Y.pecho - 5}
         q${(med.pecho * 0.72).toFixed(1)} ${(6 + med.fuerza * 3).toFixed(1)} ${(med.pecho * 1.44).toFixed(1)} 0"
         stroke="${col.remeraOsc}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".8"/>`
    : '';

  return `
    <path d="${silueta(med, hemTop, Y.cadera + 4)}" fill="${col.piel}"
      stroke="${PALETA.linea}" stroke-width="${LINEA}" stroke-linejoin="round"/>
    <path d="${mediaSilueta(med, hemTop, Y.cadera + 4)}" fill="${col.pielSombra}" opacity=".85"/>

    <path d="${silueta(med, Y.cadera - 6, hemShort)}" fill="${col.short}"
      stroke="${PALETA.linea}" stroke-width="${LINEA}" stroke-linejoin="round"/>
    <path d="${mediaSilueta(med, Y.cadera - 6, hemShort)}" fill="${col.shortOsc}" opacity=".95"/>
    <path d="M60 ${Y.cadera + 4} v${(hemShort - Y.cadera - 4).toFixed(1)}"
      stroke="${PALETA.linea}" stroke-width="1.5" opacity=".55"/>

    <path d="${silueta(med, hemTop, hemMusculosa)}" fill="${col.remera}"
      stroke="${PALETA.linea}" stroke-width="${LINEA}" stroke-linejoin="round"/>
    <path d="${mediaSilueta(med, hemTop, hemMusculosa, 0.32)}" fill="${col.remeraOsc}" opacity=".95"/>
    ${pecho}

    <path d="M${(60 - med.hombro).toFixed(1)} ${hemTop} h${(med.hombro * 0.3).toFixed(1)}
             q${(med.hombro * -0.06).toFixed(1)} 11 ${(med.hombro * 0.02).toFixed(1)} 19
             q${(med.hombro * -0.16).toFixed(1)} 2 ${(med.hombro * -0.26).toFixed(1)} -2z"
      fill="${col.piel}" stroke="${PALETA.linea}" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M${(60 + med.hombro).toFixed(1)} ${hemTop} h${(med.hombro * -0.3).toFixed(1)}
             q${(med.hombro * 0.06).toFixed(1)} 11 ${(med.hombro * -0.02).toFixed(1)} 19
             q${(med.hombro * 0.16).toFixed(1)} 2 ${(med.hombro * 0.26).toFixed(1)} -2z"
      fill="${col.pielSombra}" stroke="${PALETA.linea}" stroke-width="1.7" stroke-linejoin="round"/>

    <path d="M${(60 - cu).toFixed(1)} ${Y.hombro - 12} h${(cu * 2).toFixed(1)} v10 h${(cu * -2).toFixed(1)}z"
      fill="${col.piel}" stroke="${PALETA.linea}" stroke-width="${LINEA}" stroke-linejoin="round"/>
    <path d="M${(60 - cu * 1.45).toFixed(1)} ${hemTop}
             a${(cu * 1.45).toFixed(1)} ${(cu * 1.05).toFixed(1)} 0 0 0 ${(cu * 2.9).toFixed(1)} 0z"
      fill="${col.pielSombra}" stroke="${PALETA.linea}" stroke-width="1.7"/>`;
}

/* ---------------- el personaje entero ---------------- */

/**
 * El personaje, listo para meter en el DOM.
 *
 * `cuerpo` es lo que devuelve `cuerpoDe()` y `fase` lo que devuelve `faseDe()`.
 * Sin cuerpo se dibuja una contextura media: mostrar un cuerpo inventado como
 * si fuera el de Nico sería peor que no mostrar ninguno.
 */
function svgPersonaje(animo = 'neutral', tam = 96, cuerpo = null, fase = null) {
  const base = POSES[animo] || POSES.neutral;
  const f = fase && fase.n ? fase : null;

  /* De la fase 2 para arriba la cara la manda la fase, no el ánimo: un día que
     llegó a fase 2 ya cumplió todo dos veces seguidas. */
  const cara = (f && f.n >= 2) ? CARAS.furioso : (CARAS[animo] || CARAS.neutral);

  const med = medidasDe(
    cuerpo && cuerpo.efectiva != null ? cuerpo.efectiva : null,
    cuerpo?.musculatura ?? 0,
    f ? f.musculo : 0
  );

  const pose = f ? posturaDePoder(base, f) : base;

  const apagado = APAGADOS[animo] || 0;
  const col = {
    piel: PALETA.piel,
    pielSombra: PALETA.pielSombra,
    short: PALETA.short,
    shortOsc: PALETA.shortOsc,
    remera: mezclar(PALETA.remera, '#7d8a80', apagado),
    remeraOsc: mezclar(PALETA.remeraOsc, '#5e6a62', apagado)
  };

  const alto = Math.round(tam);
  const ancho = Math.round(tam * VB.w / VB.h);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}" width="${ancho}" height="${alto}"
    class="mascota-svg${f ? ' fase-' + f.n : ''}" role="img"
    aria-label="Cómo venís: ${animo}${f ? ', en fase ' + f.n : ''}">

    ${aura(med, fase)}
    <ellipse cx="60" cy="${Y.pie + 3}" rx="${(med.cadera + 12).toFixed(1)}" ry="4" fill="${PALETA.linea}" opacity=".16"/>
    ${suelo(med, fase)}

    ${piernas(med, col, pose)}

    <g transform="translate(0 ${pose.hombros})">
      ${torso(med, col)}
      ${brazos(med, pose, col)}
      <g transform="translate(0 ${pose.cabeza}) rotate(${pose.inclina} 60 ${Y.hombro - 4})">
        ${cabeza(med, cara, col, fase)}
      </g>
    </g>

    ${adornos(cara)}
    ${rayos(med, fase)}
  </svg>`;
}

/* El nombre viejo sigue andando: lo usan los tests de ciclos anteriores, y
   romperlos por un cambio de dibujo no aporta nada. */
function svgMascota(animo = 'neutral', tam = 96, cuerpo = null, fase = null) {
  return svgPersonaje(animo, tam, cuerpo, fase);
}
