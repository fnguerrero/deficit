/* ============================================================
   transformacion.js — el aura, los rayos y el pelo de las fases.

   Salió de personaje.js, que se pasó de tamaño. El corte tiene sentido propio:
   acá está TODO lo que cambia con los días perfectos seguidos, y nada de lo que
   cambia con el cuerpo o con el día de hoy.

   La decisión de fondo: la transformación vive en el pelo y el aura, nunca en
   el cuerpo. Si cumplir un día te dibujara flaco, la app estaría diciendo que
   ya adelgazaste — mentira, y encima desinfla el día que la balanza no
   acompañe. El cuerpo sale de lo que medís. Lo que se prende fuego es el resto.
   ============================================================ */

/*
 * El pelo, que es donde se ve la transformación.
 *
 * Va acá y no en el cuerpo porque el cuerpo sale de lo que medís: si cumplir un
 * día te dibujara flaco, la app estaría mintiendo. Encender el pelo no miente
 * nada, y se ve desde la otra punta de la pantalla.
 */
function pelo(cy, rx, ry, fase) {
  const color = fase && fase.pelo ? fase.color : PALETA.pelo;
  const brillo = fase && fase.pelo ? '#fff6c2' : PALETA.peloBrillo;

  const izq = 60 - rx;
  const der = 60 + rx;
  const tapa = cy - 3;

  /* La base: la misma tapa redonda de siempre, en el color que toque. */
  const base = `<path d="M${izq.toFixed(1)} ${tapa} a${rx.toFixed(1)} ${(ry * 0.95).toFixed(1)} 0 0 1 ${(rx * 2).toFixed(1)} 0
      q${(rx * -0.5).toFixed(1)} -5 ${(rx * -1).toFixed(1)} -4.5 q${(rx * -0.55).toFixed(1)} -.5 ${(rx * -1).toFixed(1)} 4.5z"
      fill="${color}"/>`;

  const reflejo = `<path d="M${(60 - rx * 0.55).toFixed(1)} ${(cy - ry * 0.82).toFixed(1)} q${(rx * 0.5).toFixed(1)} -3 ${rx.toFixed(1)} -1.5"
      stroke="${brillo}" stroke-width="1.6" fill="none" opacity=".85" stroke-linecap="round"/>`;

  if (!fase || !fase.pelo) return base + reflejo;

  /* Las puntas.
     La clave está en el valle: si baja poco entre pico y pico, la silueta se
     lee como una CORONA de barritas y no como pelo parado. Los valles bajan
     hasta la línea del cráneo y los picos tienen alturas distintas, que es lo
     que lo vuelve pelo. */
  const arriba = cy - ry;
  const picos = [[-0.9, 13], [-0.55, 27], [-0.18, 17], [0.18, 31], [0.55, 20], [0.9, 12]];
  /* El valle va ARRIBA del borde del craneo, no abajo: la tapa redonda del pelo
     llega hasta `arriba` y cualquier valle por debajo queda escondido detras,
     dejando a la vista solo las puntas rectas — que es lo que hacia que el pelo
     se leyera como una corona de barritas. */
  const valle = arriba - 5;

  let d = `M${izq.toFixed(1)} ${tapa.toFixed(1)} L${(60 + rx * -0.98).toFixed(1)} ${valle.toFixed(1)}`;
  picos.forEach(([fx, alto], i) => {
    const x = 60 + rx * fx;
    d += ` L${x.toFixed(1)} ${(arriba - alto).toFixed(1)}`;
    const sig = picos[i + 1];
    const xValle = sig ? 60 + rx * ((fx + sig[0]) / 2) : 60 + rx * 0.98;
    d += ` L${xValle.toFixed(1)} ${valle.toFixed(1)}`;
  });
  d += ` L${der.toFixed(1)} ${tapa.toFixed(1)} Z`;

  const melena = fase.pelo === 'largo'
    ? [-1, 1].map(sg => {
      const x0 = 60 + sg * (rx - 1);
      return `<path d="M${x0.toFixed(1)} ${(tapa - 4).toFixed(1)}
          q${(sg * 9).toFixed(1)} 26 ${(sg * 2).toFixed(1)} 56
          q${(sg * -9).toFixed(1)} 4 ${(sg * -13).toFixed(1)} -6
          q${(sg * 5).toFixed(1)} -22 ${(sg * 2).toFixed(1)} -46z" fill="${color}" opacity=".92"/>`;
    }).join('')
    : '';

  return melena + base + `<path d="${d}" fill="${color}"/>` + reflejo;
}

/*
 * El aura. Va detrás de todo, y crece con la fase.
 *
 * Son tres capas del mismo color con opacidades distintas en vez de un filtro
 * de blur: el blur en SVG cuesta caro en el celular y acá se re-dibuja en cada
 * render.
 */
function aura(med, fase) {
  if (!fase || !fase.n) return '';

  const c = fase.color;
  const alto = Y.pie + 6;
  const ancho = med.cadera + 26 + fase.n * 3;
  const capas = [
    [ancho, 0.1], [ancho * 0.78, 0.16], [ancho * 0.55, 0.2]
  ];

  const halos = capas.map(([a, op]) =>
    `<ellipse cx="60" cy="86" rx="${a.toFixed(1)}" ry="${(a * 1.25).toFixed(1)}" fill="${c}" opacity="${op}"/>`
  ).join('');

  /* Las llamitas de abajo: lo que hace que se lea como energía subiendo y no
     como una mancha de color. */
  const llamas = [-1, 1].map(sg => {
    const x = 60 + sg * (med.cadera + 12);
    return `<path d="M${x.toFixed(1)} ${alto} q${(sg * -7).toFixed(1)} -18 ${(sg * 2).toFixed(1)} -32
        q${(sg * 5).toFixed(1)} 16 ${(sg * -2).toFixed(1)} 32z" fill="${c}" opacity=".35"/>`;
  }).join('');

  const divino = fase.divino
    ? `<circle cx="60" cy="86" r="${(ancho + 6).toFixed(1)}" fill="none" stroke="${c}" stroke-width="1.6" opacity=".5"/>`
    : '';

  return `<g class="aura">${halos}${llamas}${divino}</g>`;
}

/** Los rayos, a partir de la fase 2. */
function rayos(med, fase) {
  if (!fase || !fase.rayos) return '';

  const puntos = [[16, 40], [104, 62], [24, 104], [100, 118]].slice(0, 2 + fase.n - 2);
  return puntos.map(([x, y]) =>
    `<path d="M${x} ${y} l6 9 -4 1 6 11 -9 -10 4 -1z" fill="${fase.color}" opacity=".85"/>`
  ).join('');
}
