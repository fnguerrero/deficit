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

  /* Los pedazos de piso que levanta el aura de las fases altas. */
  escombro: '#8a6a4e',
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
/* La cadera y la cintura subieron, y la rodilla bajo: la referencia tiene
   piernas largas y torso corto, y con la cadera a 110 el muneco era un bloque
   sobre dos patas. El pie no se mueve, que es lo que fija el piso del dibujo. */
const Y = { hombro: 62, pecho: 76, cintura: 92, cadera: 105, rodilla: 141, pie: 168 };

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
    pecho: 15.5 + c * 16 + m * 4 + p * 4,
    cintura: 11.5 + c * 30 - m * 2,
    cadera: 13.5 + c * 21,
    brazo: 3.6 + c * 3.6 + (m + p) * 3.6,
    pierna: 5.4 + c * 7 + (m + p) * 1.8,
    cuello: 6 + c * 3 + (m + p) * 2.4,
    caraRx: 15 + c * 7,
    caraRy: 18.6
  };
}

/** El medio ancho del torso a una altura cualquiera, interpolando. */
function anchoEn(y, med) {
  /* La panza es un punto propio del contorno, no una elipse pintada encima.
     Con la silueta interpolando derecho de la cintura a la cadera, el panzon
     tenia el perfil de un barril recto y la barriga era una mancha clara
     dibujada sobre una prenda que no se enteraba. */
  const panza = med.cintura * (1 + Math.max(0, med.c - 0.45) * 0.4);
  const puntos = [
    [Y.hombro, med.hombro], [Y.pecho, med.pecho],
    [Y.cintura, med.cintura], [Y.cintura + 6, panza], [Y.cadera, med.cadera]
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
  genial: { ceja: -9, cejaY: -2.5, parpado: 0, boca: 'risa', mirada: [0, -.5], ojosFelices: true },
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
/*
 * El relieve del torso.
 *
 * La grasa se dibuja como VOLUMEN que cuelga: una panza redonda por debajo de
 * la cintura, con su pliegue y sus rollos al costado. El musculo se dibuja como
 * SEPARACION entre piezas: pectorales, trapecios y la linea del abdomen.
 * Volumen abajo contra piezas arriba. Sin esa separacion los dos ejes hacen lo
 * mismo —ensanchar— y el torso del que entrena se ve igual de blando.
 */
function volumen(med, col) {
  let out = '';

  /* ---- grasa ---- */
  if (med.c > 0.42) {
    const g = (med.c - 0.42) / 0.58;
    const cy = Y.cintura + 1;
    const rx = med.cintura * (0.68 + g * 0.16);
    const ry = Math.min(Y.cintura + 8 - Y.pecho, 9 + g * 11);

    /* Dos tonos, como el resto: la panza recibe luz arriba a la izquierda y
       sombra abajo a la derecha. Con un solo tono era una mancha plana que se
       leía como un cinturón, no como volumen. */
    out += `<ellipse cx="${(60 - rx * 0.12).toFixed(1)}" cy="${(cy - 1).toFixed(1)}"
        rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}"
        fill="${mezclar(col.remera, '#ffffff', 0.18)}" opacity="${(0.55 + g * 0.3).toFixed(2)}"/>
      <path d="M${(60 - rx * 0.1).toFixed(1)} ${(cy + ry * 0.92).toFixed(1)}
        a${rx.toFixed(1)} ${ry.toFixed(1)} 0 0 0 ${(rx * 0.98).toFixed(1)} ${(-ry * 1.5).toFixed(1)}
        a${(rx * 0.75).toFixed(1)} ${(ry * 0.9).toFixed(1)} 0 0 1 ${(-rx * 0.98).toFixed(1)} ${(ry * 1.5).toFixed(1)} z"
        fill="${col.remeraOsc}" opacity="${(0.5 + g * 0.3).toFixed(2)}"/>`;

    /* El pliegue de abajo: es lo que hace que la panza cuelgue en vez de ser
       una pelota pintada sobre la remera. */
    out += `<path d="M${(60 - rx * 0.82).toFixed(1)} ${(cy + ry * 0.5).toFixed(1)}
        q${(rx * 0.82).toFixed(1)} ${(5 + g * 6).toFixed(1)} ${(rx * 1.64).toFixed(1)} 0"
      stroke="${PALETA.linea}" stroke-width="1.7" fill="none" opacity="${(0.35 + g * 0.35).toFixed(2)}"
      stroke-linecap="round"/>`;

    /* Los rollos del costado, a partir de bastante grande. */
    if (g > 0.45) {
      out += [-1, 1].map(sg => `<path d="M${(60 + sg * med.cintura * 0.96).toFixed(1)} ${(Y.cintura - 8).toFixed(1)}
          q${(sg * -3.5).toFixed(1)} 5 0 10"
        stroke="${PALETA.linea}" stroke-width="1.5" fill="none" opacity=".4" stroke-linecap="round"/>`).join('');
    }
  }

  /* ---- músculo ---- */
  if (med.fuerza > 0.35) {
    const f = (med.fuerza - 0.35) / 0.65;
    /* Las líneas de músculo van en el color del contorno y no en el de la ropa:
       con el tono de la remera se perdían contra la propia remera y el torso de
       alguien que entrena se veía igual de liso que el de alguien que no. */
    const l = `stroke="${PALETA.linea}" fill="none" stroke-linecap="round" opacity=".72"`;

    /*
     * Los pectorales: un arco por lado que sale del esternon y sube hacia la
     * axila, mas el surco del medio. El arco tiene que empezar POR DEBAJO del
     * escote (Y.hombro + 12): dibujado a la altura del pecho anatomico caia
     * justo sobre el borde de la prenda y se leia como una arruga de la tela.
     */
    const yP = Y.pecho + 2;
    out += [-1, 1].map(sg => `<path d="M60 ${(yP + 5).toFixed(1)}
        Q${(60 + sg * med.pecho * 0.52).toFixed(1)} ${(yP + 8 + f * 3).toFixed(1)} ${(60 + sg * med.pecho * 0.88).toFixed(1)} ${(yP - 1).toFixed(1)}"
      ${l} stroke-width="${(2.1 + f * 1.3).toFixed(1)}"/>`).join('');

    out += `<path d="M60 ${(yP - 4).toFixed(1)} v${(9 + f * 4).toFixed(1)}"
      ${l} stroke-width="${(2.2 + f * 1.4).toFixed(1)}"/>`;

    /* Trapecios: las dos diagonales del cuello al hombro. Es el detalle que más
       rápido lee como "entrena", incluso más que el ancho. */
    out += [-1, 1].map(sg => `<path d="M${(60 + sg * med.cuello * 0.9).toFixed(1)} ${Y.hombro - 4}
        L${(60 + sg * med.hombro * 0.82).toFixed(1)} ${(Y.hombro + 4 + f * 2).toFixed(1)}"
      ${l} stroke-width="${(2 + f * 1.2).toFixed(1)}"/>`).join('');

    /*
     * El abdomen: la linea media y dos pares de transversales. Solo sin panza
     * encima, porque un abdominal marcado debajo de una panza es mentira.
     */
    if (med.c < 0.6) {
      const yA = yP + 12;
      out += `<path d="M60 ${yA.toFixed(1)} v${(13 + f * 6).toFixed(1)}"
        ${l} stroke-width="${(1.8 + f).toFixed(1)}"/>`;

      out += [0, 1].map(k => [-1, 1].map(sg => `<path d="M${(60 + sg * 1.5).toFixed(1)} ${(yA + 5 + k * 7).toFixed(1)}
          l${(sg * med.cintura * (0.46 - k * 0.06)).toFixed(1)} ${(-1 - k).toFixed(1)}"
        ${l} stroke-width="${(1.5 + f * 0.8).toFixed(1)}"/>`).join('')).join('');
    }
  }

  return out;
}


/*
 * La musculosa, en UNA sola pieza.
 *
 * Antes era el torso entero de verde y encima parches de piel para simular el
 * escote y las sisas. Cada parche traia su propio contorno recto, y todos esos
 * bordes juntos formaban una barra negra cruzando de hombro a hombro: la prenda
 * se leia como una tabla apoyada sobre el pecho. Recortando el cuello y las
 * sisas dentro del mismo path hay un solo contorno, que es como se dibuja una
 * prenda.
 */
function siluetaRemera(med, desdeY, hastaY, paso = 2, mitad = false) {
  const der = [];
  const izq = [];

  for (let y = desdeY; y <= hastaY; y += paso) {
    const a = anchoEn(y, med);
    izq.push((60 - a).toFixed(1) + ' ' + y.toFixed(1));
    der.unshift((60 + a).toFixed(1) + ' ' + y.toFixed(1));
  }
  const aFin = anchoEn(hastaY, med);
  izq.push((60 - aFin).toFixed(1) + ' ' + hastaY.toFixed(1));
  der.unshift((60 + aFin).toFixed(1) + ' ' + hastaY.toFixed(1));

  /*
   * El borde de arriba, de derecha a izquierda: sisa que baja a la axila,
   * tirante que sube al hombro, escote que baja al centro, y lo mismo espejado.
   * El orden importa: con la sisa terminando mas abajo que el escote, el
   * contorno se cruza a si mismo y la prenda sale chorreada de un lado.
   */
  const sx = med.hombro * 0.78;
  const sy = Y.hombro + 15;
  const ti = Math.max(med.hombro * 0.5, med.hombro - 5.5);
  const ex = med.hombro * 0.42;
  const ey = Y.hombro + 12;
  const n = (v) => v.toFixed(1);

  const tapa = `C${n(60 + med.hombro * 0.99)} ${n(desdeY + 9)} ${n(60 + sx + 1.5)} ${n(sy - 9)} ${n(60 + sx)} ${n(sy)}
    C${n(60 + sx - 1)} ${n(sy - 10)} ${n(60 + ti + 1)} ${n(desdeY + 10)} ${n(60 + ti)} ${n(desdeY)}
    C${n(60 + ti - 0.5)} ${n(desdeY + 7)} ${n(60 + ex)} ${n(ey - 1)} 60 ${n(ey)}
    C${n(60 - ex)} ${n(ey - 1)} ${n(60 - ti + 0.5)} ${n(desdeY + 7)} ${n(60 - ti)} ${n(desdeY)}
    C${n(60 - ti - 1)} ${n(desdeY + 10)} ${n(60 - sx + 1)} ${n(sy - 10)} ${n(60 - sx)} ${n(sy)}
    C${n(60 - sx - 1.5)} ${n(sy - 9)} ${n(60 - med.hombro * 0.99)} ${n(desdeY + 9)} ${izq[0]}`;

  const tapaDerecha = `C${n(60 + med.hombro * 0.99)} ${n(desdeY + 9)} ${n(60 + sx + 1.5)} ${n(sy - 9)} ${n(60 + sx)} ${n(sy)}
    C${n(60 + sx - 1)} ${n(sy - 10)} ${n(60 + ti + 1)} ${n(desdeY + 10)} ${n(60 + ti)} ${n(desdeY)}
    C${n(60 + ti - 0.5)} ${n(desdeY + 7)} ${n(60 + ex)} ${n(ey - 1)} 60 ${n(ey)}`;

  /* La media prenda para la sombra sale del MISMO recorte: hecha aparte, con
     un rectangulo o con la silueta del torso, asomaba por el escote y por la
     sisa como un chorreado colgando del pecho. */
  if (mitad) {
    return `M60 ${n(hastaY)} L ${der.join(' L ')} ${tapaDerecha} L60 ${n(hastaY)} Z`;
  }

  return 'M ' + izq.join(' L ') + ' L ' + der.join(' L ') + ' ' + tapa + ' Z';
}

/*
 * El torso, la ropa encima y el relieve.
 *
 * La sombra de la prenda sale del MISMO recorte que la prenda (siluetaRemera
 * con mitad = true). Hecha aparte, con la silueta del torso, asomaba por el
 * escote y por la sisa como un chorreado oscuro colgando del pecho.
 */
function torso(med, col) {
  const hemTop = Y.hombro - 5;
  /* El ruedo baja con la contextura: con la panza grande y el ruedo fijo, la
     mitad de abajo de la panza quedaba afuera de la musculosa y el pliegue caía
     sobre el short, donde se leía como un cinturón. */
  const hemMusculosa = Y.cintura + 8 + med.c * 10;
  /* El short llega a media pierna, como en la referencia. A Y.cadera + 17
     terminaba arriba del muslo y el muneco quedaba en calzoncillos. */
  const hemShort = Y.cadera + 26;
  const cu = med.cuello;


  return `
    <path d="${silueta(med, hemTop, Y.cadera + 4)}" fill="${col.piel}"
      stroke="${PALETA.linea}" stroke-width="${LINEA}" stroke-linejoin="round"/>
    <path d="${mediaSilueta(med, hemTop, Y.cadera + 4)}" fill="${col.pielSombra}" opacity=".85"/>

    <path d="${silueta(med, Y.cadera - 6, hemShort)}" fill="${col.short}"
      stroke="${PALETA.linea}" stroke-width="${LINEA}" stroke-linejoin="round"/>
    <path d="${mediaSilueta(med, Y.cadera - 6, hemShort)}" fill="${col.shortOsc}" opacity=".95"/>
    <path d="M60 ${Y.cadera + 4} v${(hemShort - Y.cadera - 4).toFixed(1)}"
      stroke="${PALETA.linea}" stroke-width="1.5" opacity=".55"/>
    <path d="M${(60 - anchoEn(hemShort - 4, med) * 0.99).toFixed(1)} ${(hemShort - 4).toFixed(1)}
        h${(anchoEn(hemShort - 4, med) * 1.98).toFixed(1)}"
      stroke="${PALETA.linea}" stroke-width="1.5" opacity=".45"/>

    <path d="${siluetaRemera(med, hemTop, hemMusculosa)}" fill="${col.remera}"
      stroke="${PALETA.linea}" stroke-width="${LINEA}" stroke-linejoin="round"/>
    <path d="${siluetaRemera(med, hemTop, hemMusculosa, 2, true)}" fill="${col.remeraOsc}" opacity=".95"/>
    ${volumen(med, col)}

    <path d="M${(60 - cu * 0.82).toFixed(1)} ${Y.hombro - 13}
        q${(-cu * 0.16).toFixed(1)} 7 ${(-cu * 0.5).toFixed(1)} 11
        h${(cu * 2.64).toFixed(1)}
        q${(-cu * 0.34).toFixed(1)} -4 ${(-cu * 0.5).toFixed(1)} -11z"
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
    ${ki(med, fase)}
    <ellipse cx="60" cy="${Y.pie + 3}" rx="${(med.cadera + 12).toFixed(1)}" ry="4" fill="${PALETA.linea}" opacity=".16"/>
    ${suelo(med, fase)}

    ${piernas(med, col, pose)}

    <g transform="translate(0 ${pose.hombros})">
      ${torso(med, col)}
      ${brazos(med, pose, col)}
      ${hombros(med, col)}
      <g transform="translate(0 ${pose.cabeza}) rotate(${pose.inclina} 60 ${Y.hombro - 4})">
        ${cabeza(med, cara, col, fase)}
      </g>
    </g>

    ${adornos(cara)}
    ${electricidad(med, fase)}
    ${rayos(med, fase)}
  </svg>`;
}

/* El nombre viejo sigue andando: lo usan los tests de ciclos anteriores, y
   romperlos por un cambio de dibujo no aporta nada. */
function svgMascota(animo = 'neutral', tam = 96, cuerpo = null, fase = null) {
  return svgPersonaje(animo, tam, cuerpo, fase);
}
