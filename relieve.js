/* ============================================================
   relieve.js — el volumen del torso: la panza, las costillas, el músculo.

   Salió de personaje.js cuando la cintura medida entró al dibujo. El corte no
   es arbitrario: personaje.js arma la SILUETA —de dónde a dónde va cada
   contorno— y acá se dibuja lo que pasa ADENTRO de esa silueta.

   La regla del archivo: la grasa es VOLUMEN que cuelga y el músculo es
   SEPARACIÓN entre piezas. Si los dos ensancharan, el torso del que entrena se
   vería igual de blando que el del que no.
   ============================================================ */

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

  /* ---- músculo ----
     La musculosa ajustada marcando el pecho y los abdominales. Solo cuando hay
     fuerza de verdad y la panza no los tapa: unos abs dibujados sobre una
     contextura alta serían mentira, y la app no miente ni en el dibujo. */
  if (med.fuerza > 0.35 && med.cGrasa < 0.55) {
    const f = Math.min(1, (med.fuerza - 0.35) / 0.5);
    const op = (0.25 + f * 0.4).toFixed(2);
    const pW = med.pecho * 0.52;
    const yPecho = Y.pecho + 1;
    const yAbs = Y.pecho + 8.5;

    out += `<g class="musculo" stroke="${col.remeraOsc}" stroke-width="1.6" fill="none"
        stroke-linecap="round" opacity="${op}">
      <path d="M${(60 - pW).toFixed(1)} ${yPecho} q${(pW * 0.55).toFixed(1)} 4.2 ${pW.toFixed(1)} 0.6"/>
      <path d="M${(60 + pW).toFixed(1)} ${yPecho} q${(-pW * 0.55).toFixed(1)} 4.2 ${(-pW).toFixed(1)} 0.6"/>
      <path d="M60 ${(yAbs - 2).toFixed(1)} v${(9 + f * 3).toFixed(1)}"/>
      <path d="M${(60 - med.cintura * 0.42).toFixed(1)} ${yAbs.toFixed(1)} h${(med.cintura * 0.84).toFixed(1)}"/>
      <path d="M${(60 - med.cintura * 0.38).toFixed(1)} ${(yAbs + 4.6).toFixed(1)} h${(med.cintura * 0.76).toFixed(1)}"/>
    </g>`;
  }

  /* ---- costillas ----
     A través de la tela, como una remera pegada a un cuerpo que no tiene nada
     abajo. Tres arcos por lado, más las clavículas en el triángulo de piel. */
  if (med.d > 0.25) {
    const q = (med.d - 0.25) / 0.75;
    const op = (0.2 + q * 0.4).toFixed(2);
    let arcos = '';
    for (let i = 0; i < 3; i++) {
      const y = Y.pecho + 3 + i * 4.4;
      const w = anchoEn(y, med) * 0.72;
      arcos += `<path d="M${(60 - w).toFixed(1)} ${y.toFixed(1)} q${(w * 0.5).toFixed(1)} 3 ${w.toFixed(1)} 3.4"/>
        <path d="M${(60 + w).toFixed(1)} ${y.toFixed(1)} q${(-w * 0.5).toFixed(1)} 3 ${(-w).toFixed(1)} 3.4"/>`;
    }
    out += `<g class="costillas" stroke="${col.remeraOsc}" stroke-width="1.4" fill="none"
        stroke-linecap="round" opacity="${op}">${arcos}</g>
      <g class="claviculas" stroke="${PALETA.pielSombra}" stroke-width="1.5" fill="none"
        stroke-linecap="round" opacity="${(0.5 + q * 0.4).toFixed(2)}">
        <path d="M${(60 - med.cuello * 1.3).toFixed(1)} ${(Y.hombro - 2).toFixed(1)} q${(med.cuello * 0.9).toFixed(1)} 2.4 ${(med.cuello * 1.15).toFixed(1)} 1.4"/>
        <path d="M${(60 + med.cuello * 1.3).toFixed(1)} ${(Y.hombro - 2).toFixed(1)} q${(-med.cuello * 0.9).toFixed(1)} 2.4 ${(-med.cuello * 1.15).toFixed(1)} 1.4"/>
      </g>`;
  }

  /* ---- grasa ---- */
  if (med.cGrasa > 0.42) {
    const g = (med.cGrasa - 0.42) / 0.58;
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
