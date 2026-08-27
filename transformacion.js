/* ============================================================
   transformacion.js — el aura, los rayos, el suelo y el pelo de las fases.

   Acá está TODO lo que cambia con los días perfectos seguidos, y nada de lo que
   cambia con el cuerpo o con el día de hoy.

   La decisión de fondo: la transformación NO adelgaza al personaje. Si cumplir
   un día te dibujara flaco, la app estaría diciendo que ya bajaste — mentira, y
   encima desinfla el día que la balanza no acompañe. Lo que sí hace es sumar
   músculo, abrir la postura y prender todo fuego.

   Y una nota de dibujo que costó dos intentos entender: lo que hace que esto se
   lea imponente no es el color. Es la SILUETA. Puntas altas y filosas, hombros
   anchos, piernas abiertas y energía subiendo. Con la misma paleta y el muñeco
   parado de brazos caídos, no transmite nada.
   ============================================================ */

/*
 * El pelo.
 *
 * Tres cosas lo separan de un peinado cualquiera: las puntas son ALTAS (más
 * que media cabeza), FILOSAS (base angosta, punta en pico) y van hacia ATRÁS,
 * no derechas para arriba. Sin las tres, se lee como una corona.
 */
function pelo(cy, rx, ry, fase) {
  const color = fase && fase.pelo ? fase.color : PALETA.pelo;
  const brillo = fase && fase.pelo ? '#fffde7' : PALETA.peloBrillo;

  const izq = 60 - rx;
  const der = 60 + rx;
  const tapa = cy - 3;
  const arriba = cy - ry;

  const base = `<path d="M${izq.toFixed(1)} ${tapa} a${rx.toFixed(1)} ${(ry * 0.95).toFixed(1)} 0 0 1 ${(rx * 2).toFixed(1)} 0
      q${(rx * -0.5).toFixed(1)} -5 ${(rx * -1).toFixed(1)} -4.5 q${(rx * -0.55).toFixed(1)} -.5 ${(rx * -1).toFixed(1)} 4.5z"
      fill="${color}"/>`;

  const reflejo = `<path d="M${(60 - rx * 0.5).toFixed(1)} ${(cy - ry * 0.8).toFixed(1)} q${(rx * 0.45).toFixed(1)} -3 ${(rx * 0.9).toFixed(1)} -1.4"
      stroke="${brillo}" stroke-width="1.6" fill="none" opacity=".9" stroke-linecap="round"/>`;

  if (!fase || !fase.pelo) return base + reflejo;

  /* Cada punta es un triángulo propio, con su base sobre el cráneo y la punta
     corrida hacia atrás. Dibujarlas sueltas —en vez de un zigzag continuo— es
     lo que permite que se superpongan y que cada una tenga su inclinación. */
  const puntas = [
    [-0.95, 30, -12], [-0.7, 44, -14], [-0.42, 36, -10],
    [-0.12, 52, -6], [0.18, 40, 4], [0.48, 46, 10], [0.78, 32, 12], [0.97, 24, 13]
  ].map(([fx, alto, desvio]) => {
    const x = 60 + rx * fx;
    const ancho = rx * 0.3;
    const puntaX = x + desvio;
    const puntaY = arriba - alto;
    return `<path d="M${(x - ancho).toFixed(1)} ${(arriba + 5).toFixed(1)}
        L${puntaX.toFixed(1)} ${puntaY.toFixed(1)}
        L${(x + ancho).toFixed(1)} ${(arriba + 5).toFixed(1)} Z" fill="${color}"/>`;
  }).join('');

  /* La melena de las fases altas: cae por detrás de los hombros. */
  const melena = fase.pelo === 'largo'
    ? [-1, 1].map(sg => {
      const x0 = 60 + sg * (rx - 2);
      return `<path d="M${x0.toFixed(1)} ${(tapa - 6).toFixed(1)}
          q${(sg * 13).toFixed(1)} 28 ${(sg * 5).toFixed(1)} 62
          q${(sg * -11).toFixed(1)} 3 ${(sg * -16).toFixed(1)} -8
          q${(sg * 7).toFixed(1)} -24 ${(sg * 3).toFixed(1)} -52z" fill="${color}" opacity=".95"/>`;
    }).join('')
    : '';

  return melena + base + puntas + reflejo;
}

/*
 * El aura.
 *
 * Energía SUBIENDO, no una nube alrededor. Las llamas verticales son lo que da
 * la sensación de fuerza; los halos redondos solos se leían como un globo de
 * color y ablandaban toda la figura.
 */
function aura(med, fase) {
  if (!fase || !fase.n) return '';

  const c = fase.color;
  const pie = Y.pie + 4;
  const ancho = med.cadera + 20 + fase.n * 2;

  const halo = `<ellipse cx="60" cy="82" rx="${ancho.toFixed(1)}" ry="${(ancho * 1.35).toFixed(1)}"
      fill="${c}" opacity=".14"/>`;

  /* Las lenguas de fuego. Alturas distintas y alternadas: cinco iguales se leen
     como una cerca de estacas. */
  const lenguas = [
    [-1.05, 74], [-0.75, 52], [-0.45, 90], [0, 108], [0.45, 84], [0.75, 56], [1.05, 70]
  ].map(([fx, alto]) => {
    const x = 60 + ancho * fx;
    const cintura = 5 + fase.n;
    return `<path d="M${x.toFixed(1)} ${pie}
        q${(-cintura).toFixed(1)} ${(-alto * 0.55).toFixed(1)} ${(cintura * 0.3).toFixed(1)} ${(-alto).toFixed(1)}
        q${(cintura * 0.9).toFixed(1)} ${(alto * 0.5).toFixed(1)} ${(cintura * 0.4).toFixed(1)} ${alto.toFixed(1)}z"
        fill="${c}" opacity=".4"/>`;
  }).join('');

  const anillo = fase.divino
    ? `<ellipse cx="60" cy="${(Y.pie - 2).toFixed(1)}" rx="${(ancho + 10).toFixed(1)}" ry="7"
        fill="none" stroke="${c}" stroke-width="2" opacity=".7"/>`
    : '';

  return `<g class="aura">${halo}${lenguas}${anillo}</g>`;
}

/** Los rayos, a partir de la fase 2. Más rayos cuanto más alta la fase. */
function rayos(med, fase) {
  if (!fase || !fase.rayos) return '';

  const puntos = [[14, 30], [104, 54], [20, 96], [102, 110], [8, 62], [110, 20]];
  return puntos.slice(0, Math.min(puntos.length, fase.n)).map(([x, y]) =>
    `<path d="M${x} ${y} l7 12 -5 1 8 15 -12 -13 5 -1z" fill="${fase.color}" opacity=".9"/>`
  ).join('');
}

/*
 * El suelo que se resquebraja, desde la fase 3.
 *
 * Es el detalle más barato de todos y el que más cambia la lectura: sin él el
 * personaje está parado; con él, está aguantando su propia energía.
 */
function suelo(med, fase) {
  if (!fase || !fase.suelo) return '';

  const y = Y.pie + 5;
  const ancho = med.cadera + 22;

  const grietas = [-1, -0.55, 0.5, 1].map((fx, i) => {
    const x = 60 + ancho * fx;
    const alto = 5 + (i % 2) * 4;
    return `<path d="M${x.toFixed(1)} ${y} l${(fx * 6).toFixed(1)} ${alto}" stroke="${PALETA.pupila}"
        stroke-width="1.4" opacity=".35" stroke-linecap="round"/>`;
  }).join('');

  const piedras = [[-0.8, 12], [0.7, 18], [-0.35, 22]].map(([fx, alto]) =>
    `<path d="M${(60 + ancho * fx).toFixed(1)} ${(y - alto).toFixed(1)} l4 3 -3 4 -4 -3z"
      fill="${PALETA.pupila}" opacity=".3"/>`
  ).join('');

  return grietas + piedras;
}
