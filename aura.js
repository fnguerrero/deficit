/*
 * aura.js — lo que rodea al personaje en las fases: fuego, escombros, rayos,
 * suelo y ki.
 *
 * Salio de transformacion.js, que se paso de su limite al crecer el aura. Ahi
 * quedo el pelo, que es la otra mitad de una transformacion.
 *
 * La regla: la transformacion va en el PELO y en el AURA, nunca en el cuerpo.
 * El cuerpo sale del dato medido; si la fase lo inflara, la app estaria
 * diciendo que cumplir objetivos te hace mas grande, que es justo lo que el
 * dibujo no tiene que decir.
 */

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
      fill="${c}" opacity=".13"/>`;

  /*
   * Las lenguas de fuego, con el borde en ZIGZAG.
   *
   * Antes eran dos curvas suaves por lado: petalos, no fuego. El fuego de este
   * estilo se dibuja con muescas —sube, retrocede, vuelve a subir— y es eso lo
   * que lo hace leer como llama y no como una hoja de planta. Alturas alternadas
   * ademas, porque siete iguales se leen como una cerca de estacas.
   *
   * Y ALTAS: a la mitad de esta altura el fuego llegaba a la cintura y el
   * personaje parecia parado en un charco de llamas en vez de envuelto.
   */
  const lenguas = [
    [-1.05, 116, 1], [-0.75, 82, -1], [-0.45, 140, 1], [0, 170, -1],
    [0.45, 132, 1], [0.75, 88, -1], [1.05, 110, 1]
  ].map(([fx, alto, giro]) => {
    const x = 60 + ancho * fx;
    const w = (5 + fase.n) * 1.5;
    const p = (dx, f) => `L${(x + w * dx * giro).toFixed(1)} ${(pie - alto * f).toFixed(1)}`;

    return `<path d="M${x.toFixed(1)} ${pie}
        ${p(-0.95, 0.24)} ${p(-0.34, 0.36)} ${p(-0.78, 0.64)} ${p(-0.18, 0.7)}
        ${p(0.12, 1)}
        ${p(0.52, 0.66)} ${p(0.22, 0.56)} ${p(0.7, 0.3)} ${p(0.3, 0.2)} Z"
        fill="${c}" opacity=".45"/>`;
  }).join('');

  /*
   * Los escombros: pedazos de piso levantados por la energia, de fase 3 para
   * arriba. Sin ellos el aura es un efecto que le pasa al personaje y nada mas;
   * con ellos, algo que le pasa al lugar donde esta parado, que es lo que la
   * referencia muestra y lo que hace que la fase se sienta cara.
   */
  const piedras = fase.n >= 3
    ? [[-1.22, 96, 3.4], [1.16, 128, 2.6], [-0.98, 46, 2.2],
    [1.3, 62, 3], [0.86, 158, 2], [-1.32, 148, 2.4]]
      .slice(0, 2 + fase.n)
      .map(([fx, alto, r]) => {
        const x = 60 + ancho * fx;
        const y = pie - alto;
        return `<path d="M${(x - r).toFixed(1)} ${(y + r * 0.3).toFixed(1)}
            l${(r * 0.7).toFixed(1)} ${(-r * 1.1).toFixed(1)} l${(r * 1.3).toFixed(1)} ${(r * 0.2).toFixed(1)}
            l${(r * 0.3).toFixed(1)} ${(r * 1).toFixed(1)} l${(-r * 1.1).toFixed(1)} ${(r * 0.6).toFixed(1)} z"
          fill="${PALETA.escombro}" opacity=".85"/>`;
      }).join('')
    : '';

  const anillo = fase.divino
    ? `<ellipse cx="60" cy="${(Y.pie - 2).toFixed(1)}" rx="${(ancho + 10).toFixed(1)}" ry="7"
        fill="none" stroke="${c}" stroke-width="2.4" opacity=".75"/>`
    : '';

  return `<g class="aura">${halo}${lenguas}${piedras}${anillo}</g>`;
}

/** Los rayos, a partir de la fase 2. Más rayos cuanto más alta la fase. */
function rayos(med, fase) {
  if (!fase || !fase.rayos) return '';

  const puntos = [[14, 30], [104, 54], [20, 96], [102, 110], [8, 62], [110, 20]];
  return puntos.slice(0, Math.min(puntos.length, fase.n)).map(([x, y]) =>
    `<path d="M${x} ${y} l7 12 -5 1 8 15 -12 -13 5 -1z" fill="${fase.color}"
      stroke="${PALETA.linea}" stroke-width="1.4" stroke-linejoin="round"/>`
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
    return `<path d="M${x.toFixed(1)} ${y} l${(fx * 6).toFixed(1)} ${alto}" stroke="${PALETA.linea}"
        stroke-width="1.6" opacity=".45" stroke-linecap="round"/>`;
  }).join('');

  const piedras = [[-0.8, 12], [0.7, 18], [-0.35, 22]].map(([fx, alto]) =>
    `<path d="M${(60 + ancho * fx).toFixed(1)} ${(y - alto).toFixed(1)} l4.5 3.5 -3.5 4.5 -4.5 -3.5z"
      fill="${PALETA.pielSombra}" stroke="${PALETA.linea}" stroke-width="1.3" stroke-linejoin="round" opacity=".8"/>`
  ).join('');

  return grietas + piedras;
}


/*
 * Las partículas de ki que suben.
 *
 * Es lo que convierte un aura quieta en energía saliendo del cuerpo. Cada una
 * arranca en un punto distinto y con su propio retraso: si salieran todas
 * juntas se leería como una sola cosa parpadeando.
 */
function ki(med, fase) {
  if (!fase || !fase.n) return '';

  const ancho = med.cadera + 16;
  const cuantas = 4 + fase.n * 2;

  let out = '';
  for (let i = 0; i < cuantas; i++) {
    /* Sin Math.random: la posición sale del índice, así el dibujo es el mismo
       en cada render y no salta con cada actualización de pantalla. */
    const fx = ((i * 37) % 100) / 50 - 1;
    const x = 60 + ancho * fx * 0.95;
    const y = Y.pie - ((i * 53) % 60);
    const r = 1.4 + (i % 3) * 0.7;
    const demora = ((i * 29) % 140) / 100;

    out += `<circle class="ki" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"
      fill="${fase.color}" style="animation-delay:${demora.toFixed(2)}s"/>`;
  }
  return `<g class="ki-grupo">${out}</g>`;
}

/*
 * La electricidad, desde la fase 2.
 *
 * Arcos quebrados pegados al cuerpo, que parpadean alternados. La clave es que
 * NO sean simétricos ni parejos: un rayo prolijo no se lee como electricidad.
 */
function electricidad(med, fase) {
  if (!fase || fase.n < 2) return '';

  const arcos = [
    [-1, 46, 22], [1, 62, 26], [-1, 88, 20], [1, 100, 24], [-1, 118, 18], [1, 34, 16]
  ].slice(0, Math.min(6, fase.n + 1));

  return arcos.map(([sg, y, largo], i) => {
    const x0 = 60 + sg * (anchoEn(y, med) + 4);
    const paso = largo / 4;
    const d = `M${x0.toFixed(1)} ${y}
      l${(sg * 6).toFixed(1)} ${paso.toFixed(1)}
      l${(sg * -4).toFixed(1)} ${paso.toFixed(1)}
      l${(sg * 7).toFixed(1)} ${paso.toFixed(1)}
      l${(sg * -5).toFixed(1)} ${paso.toFixed(1)}`;

    return `<path class="chispa" d="${d}" stroke="${fase.color}" stroke-width="2"
      fill="none" stroke-linecap="round" stroke-linejoin="round"
      style="animation-delay:${(i * 0.13).toFixed(2)}s"/>
      <path class="chispa" d="${d}" stroke="#ffffff" stroke-width="0.9"
      fill="none" stroke-linecap="round" stroke-linejoin="round"
      style="animation-delay:${(i * 0.13).toFixed(2)}s"/>`;
  }).join('');
}
