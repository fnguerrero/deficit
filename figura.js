/*
 * figura.js — los miembros: piernas, brazos, hombros y zapatillas.
 *
 * Salio de personaje.js, que se estaba pasando de largo. Ahi quedaron las
 * medidas, el torso y la composicion; aca lo que cuelga del torso.
 *
 * La regla que ordena todo el dibujo esta en personaje.js y vale igual aca: la
 * grasa es VOLUMEN que cuelga y el musculo es SEPARACION entre piezas.
 */

/** Un miembro como trazo: contorno, relleno y una sombra corrida. */
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

/*
 * La pierna, como SILUETA y no como trazo.
 *
 * Un trazo de ancho constante da un tubo, y una pierna no es un tubo: el muslo
 * es lo mas ancho, la rodilla se afina, la pantorrilla vuelve a abrirse y el
 * tobillo es lo mas fino de todo. Con el tubo, el que entrena y el que no
 * tenian exactamente la misma pierna, solo que mas gorda.
 */
function siluetaPierna(x, s2, g, med, corte = -1) {
  const yCadera = Y.cadera - 4;
  const yRodilla = Y.rodilla;
  const yPanto = Y.rodilla + 11;
  const yTobillo = Y.pie - 5;

  /* El musculo abre la pantorrilla; la grasa engorda parejo, que es
     justamente la diferencia entre las dos cosas. */
  const muslo = g * (1.02 + med.c * 0.06);
  const rodilla = g * 0.68;
  const panto = g * (0.82 + med.fuerza * 0.16);
  const tobillo = g * 0.46;

  const xr = x + s2 * 1;
  const xp = x + s2 * 1.2;
  const xt = x + s2 * 1.5;

  /* El borde izquierdo se corre hacia adentro para sacar la franja de sombra:
     un clip-path necesitaria un id, y con varios personajes en la misma pagina
     los ids chocan. La misma geometria recortada resuelve lo mismo sin id. */
  const li = (w) => corte < 0 ? -w : w * corte;

  return `M${(x + li(muslo)).toFixed(1)} ${yCadera}
    C${(x + li(muslo)).toFixed(1)} ${(yCadera + 14).toFixed(1)} ${(xr + li(rodilla)).toFixed(1)} ${(yRodilla - 12).toFixed(1)} ${(xr + li(rodilla)).toFixed(1)} ${yRodilla}
    C${(xr + li(rodilla)).toFixed(1)} ${(yRodilla + 4).toFixed(1)} ${(xp + li(panto)).toFixed(1)} ${(yPanto - 6).toFixed(1)} ${(xp + li(panto)).toFixed(1)} ${yPanto}
    C${(xp + li(panto)).toFixed(1)} ${(yPanto + 8).toFixed(1)} ${(xt + li(tobillo)).toFixed(1)} ${(yTobillo - 8).toFixed(1)} ${(xt + li(tobillo)).toFixed(1)} ${yTobillo}
    L${(xt + tobillo).toFixed(1)} ${yTobillo}
    C${(xt + tobillo).toFixed(1)} ${(yTobillo - 8).toFixed(1)} ${(xp + panto).toFixed(1)} ${(yPanto + 8).toFixed(1)} ${(xp + panto).toFixed(1)} ${yPanto}
    C${(xp + panto).toFixed(1)} ${(yPanto - 6).toFixed(1)} ${(xr + rodilla).toFixed(1)} ${(yRodilla + 4).toFixed(1)} ${(xr + rodilla).toFixed(1)} ${yRodilla}
    C${(xr + rodilla).toFixed(1)} ${(yRodilla - 12).toFixed(1)} ${(x + muslo).toFixed(1)} ${(yCadera + 14).toFixed(1)} ${(x + muslo).toFixed(1)} ${yCadera} Z`;
}

/*
 * La zapatilla: puntera redonda, empeine y una suela que se ve.
 *
 * Antes eran dos rectangulos con una esquina redondeada. A este tamano el
 * calzado es de las pocas piezas que se lee entera de un vistazo, y un bloque
 * plano tira abajo todo lo demas.
 */
function zapatilla(x, sg) {
  const piso = Y.pie + 1;
  const alto = 10.5;
  const talon = x - sg * 5;
  const punta = x + sg * 11.5;
  const suela = 3.2;

  return `<path d="M${talon.toFixed(1)} ${(piso - alto).toFixed(1)}
      q${(sg * 3.4).toFixed(1)} -1.4 ${(sg * 5.2).toFixed(1)} 0.6
      Q${(x + sg * 5).toFixed(1)} ${(piso - alto + 3.4).toFixed(1)} ${(punta - sg * 2).toFixed(1)} ${(piso - suela - 2.6).toFixed(1)}
      Q${punta.toFixed(1)} ${(piso - suela - 1.6).toFixed(1)} ${punta.toFixed(1)} ${(piso - suela).toFixed(1)}
      L${talon.toFixed(1)} ${(piso - suela).toFixed(1)} Z"
      fill="${PALETA.zapa}" stroke="${PALETA.linea}" stroke-width="${LINEA}" stroke-linejoin="round"/>
    <path d="M${(talon - sg * 0.6).toFixed(1)} ${(piso - suela).toFixed(1)}
      L${punta.toFixed(1)} ${(piso - suela).toFixed(1)}
      q${(sg * 1.4).toFixed(1)} 0.2 ${(sg * 0.6).toFixed(1)} ${suela}
      L${(talon - sg * 0.6).toFixed(1)} ${piso.toFixed(1)} Z"
      fill="${PALETA.zapaOsc}" stroke="${PALETA.linea}" stroke-width="1.7" stroke-linejoin="round"/>
    <path d="M${(x + sg * 0.5).toFixed(1)} ${(piso - alto + 1.4).toFixed(1)}
      q${(sg * 3).toFixed(1)} 2.6 ${(sg * 3.4).toFixed(1)} 5.4"
      stroke="${PALETA.linea}" stroke-width="1.4" fill="none" opacity=".45" stroke-linecap="round"/>`;
}

function piernas(med, col, pose) {
  const sep = med.cadera * 0.5 + 1 + (pose?.piernas || 0) * 10;
  const g = med.pierna;
  const iz = 60 - sep;
  const de = 60 + sep;

  const una = (x, s2) => `
    <path d="${siluetaPierna(x, s2, g, med)}" fill="${col.piel}" stroke="${PALETA.linea}"
      stroke-width="${LINEA}" stroke-linejoin="round"/>
    <path d="${siluetaPierna(x, s2, g, med, 0.34)}" fill="${col.pielSombra}" opacity=".8"/>`;

  /* La rodilla, apenas sugerida: sin ella la pierna se lee como una media. */
  const rodilla = (x, s2) => `<path d="M${(x + s2 - g * 0.36).toFixed(1)} ${Y.rodilla}
      q${(g * 0.36).toFixed(1)} 2.2 ${(g * 0.72).toFixed(1)} 0"
    stroke="${PALETA.linea}" stroke-width="1.4" fill="none" opacity=".45" stroke-linecap="round"/>`;

  return una(iz, -1) + una(de, 1) + rodilla(iz, -1) + rodilla(de, 1)
    + zapatilla(iz, -1) + zapatilla(de, 1);
}


/*
 * Los medio anchos del brazo, afuera del dibujo para poder probarlos.
 *
 * El musculo tiene que abrir MUCHO mas arriba que abajo: el que entrena tiene
 * hombro y biceps, no muneca. Si los cuatro crecieran parejo, entrenar seria
 * indistinguible de engordar, que es exactamente el error que tenia el dibujo.
 */
function anchosBrazo(med) {
  const f = med.fuerza;
  return {
    hombro: med.brazo * (0.98 + f * 0.55),
    biceps: med.brazo * (0.9 + f * 0.5),
    codo: med.brazo * (0.66 + f * 0.06),
    muneca: med.brazo * (0.56 + f * 0.1)
  };
}

/*
 * El brazo, tambien como silueta.
 *
 * Un tubo con una tapa ovalada encima para el hombro se lee como una hombrera
 * despegada, no como un deltoide. El brazo entero es una sola pieza que nace
 * ancha en el hombro, abulta en el biceps, se estrangula en el codo y se afina
 * hacia la muneca: ahi es donde se ve si entrena o no, sin agregar nada encima.
 */
function siluetaBrazo(hombroX, codoX, munecaX, s, med, corte = -1) {
  const yH = Y.hombro + 1;
  const yBic = Y.pecho - 1;
  const yCodo = Y.pecho + 12;
  const yMun = Y.cadera + 2;

  const { hombro: wH, biceps: wBic, codo: wCodo, muneca: wMun } = anchosBrazo(med);

  /* Igual que en la pierna: el lado de adentro se corre para sacar la sombra
     sin necesitar un clip-path con id. */
  const li = (w) => corte < 0 ? -w : w * corte;
  const bx = (x) => 60 + x * s;

  return `M${(bx(hombroX) + li(wH) * s * s).toFixed(1)} ${yH}
    C${(bx(hombroX) + li(wBic)).toFixed(1)} ${(yH + 5).toFixed(1)} ${(bx(codoX) + li(wBic)).toFixed(1)} ${(yBic + 3).toFixed(1)} ${(bx(codoX) + li(wCodo)).toFixed(1)} ${yCodo}
    C${(bx(codoX) + li(wCodo)).toFixed(1)} ${(yCodo + 6).toFixed(1)} ${(bx(munecaX) + li(wMun)).toFixed(1)} ${(yMun - 8).toFixed(1)} ${(bx(munecaX) + li(wMun)).toFixed(1)} ${yMun}
    L${(bx(munecaX) + wMun).toFixed(1)} ${yMun}
    C${(bx(munecaX) + wMun).toFixed(1)} ${(yMun - 8).toFixed(1)} ${(bx(codoX) + wCodo).toFixed(1)} ${(yCodo + 6).toFixed(1)} ${(bx(codoX) + wCodo).toFixed(1)} ${yCodo}
    C${(bx(codoX) + wBic).toFixed(1)} ${(yBic + 3).toFixed(1)} ${(bx(hombroX) + wH).toFixed(1)} ${(yH + 5).toFixed(1)} ${(bx(hombroX) + wH).toFixed(1)} ${yH}
    C${(bx(hombroX) + wH).toFixed(1)} ${(yH - wH * 0.85).toFixed(1)} ${(bx(hombroX) + li(wH) * 0.9).toFixed(1)} ${(yH - wH * 0.85).toFixed(1)} ${(bx(hombroX) + li(wH) * s * s).toFixed(1)} ${yH} Z`;
}

function brazos(med, pose, col) {
  const hx = med.hombro - med.brazo * 0.25;
  const codoX = Math.max(med.hombro, med.pecho) - med.brazo * 0.1;
  const munecaX = Math.max(med.cintura, med.cadera) + med.brazo * 0.3;
  const manoY = Y.cadera + 4;

  const uno = (s) => {
    const hombroX = 60 + hx * s;
    const mano = 60 + munecaX * s;
    const d = siluetaBrazo(hx, codoX, munecaX, s, med);

    /* Las lineas que separan las piezas del brazo. Solo con musculo: en un
       brazo blando no hay nada que separar, y dibujarlas igual lo unico que
       hace es agregarle arrugas. */
    const relieve = med.fuerza > 0.4 ? `
      <path d="M${(hombroX - med.brazo * 0.5 * s).toFixed(1)} ${Y.hombro + 3}
          q${(med.brazo * 1.1 * s).toFixed(1)} 3.5 ${(med.brazo * 1.25 * s).toFixed(1)} 9"
        stroke="${PALETA.linea}" stroke-width="1.5" fill="none" opacity=".5" stroke-linecap="round"/>
      <path d="M${(hombroX + med.brazo * 0.45 * s).toFixed(1)} ${Y.pecho - 2}
          q${(med.brazo * 0.5 * s).toFixed(1)} 4 ${(med.brazo * 0.1 * s).toFixed(1)} 8"
        stroke="${PALETA.pielSombra}" stroke-width="1.5" fill="none" stroke-linecap="round"/>` : '';

    return `
      <g transform="rotate(${(pose.brazos * s).toFixed(1)} ${hombroX.toFixed(1)} ${Y.hombro + 4})">
        <path d="${d}" fill="${col.piel}" stroke="${PALETA.linea}"
          stroke-width="${LINEA}" stroke-linejoin="round"/>
        <path d="${siluetaBrazo(hx, codoX, munecaX, s, med, 0.36)}" fill="${col.pielSombra}" opacity=".8"/>
        <circle cx="${mano.toFixed(1)}" cy="${manoY + 2}" r="${(med.brazo * (pose.punos ? 1.15 : 0.92)).toFixed(1)}"
          fill="${col.piel}" stroke="${PALETA.linea}" stroke-width="${LINEA}"/>
        ${pose.punos ? `<path d="M${(mano - med.brazo).toFixed(1)} ${manoY + 2} h${(med.brazo * 2).toFixed(1)}"
          stroke="${PALETA.linea}" stroke-width="1.3" opacity=".7" stroke-linecap="round"/>` : ''}
        ${relieve}
      </g>`;
  };

  return uno(-1) + uno(1);
}

/* El deltoide ya viene dibujado en la silueta del brazo. Esto quedo como
   enganche de la composicion. */
function hombros() { return ''; }
