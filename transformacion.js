/* ============================================================
   transformacion.js — el pelo, el aura, los rayos y el suelo.

   Acá está TODO lo que cambia con los días perfectos seguidos, y nada de lo que
   cambia con el cuerpo o con el día de hoy.

   La decisión de fondo: la transformación NO adelgaza al personaje. Si cumplir
   un día te dibujara flaco, la app estaría diciendo que ya bajaste — mentira, y
   encima desinfla el día que la balanza no acompañe. Lo que sí hace es sumar
   músculo, abrir la postura y prender todo fuego.

   El estilo sigue el mismo criterio que personaje.js: contorno oscuro, dos
   tonos con corte duro y mechones puntiagudos en vez de formas redondeadas.
   ============================================================ */

/*
 * El pelo, dibujado como MECHONES sueltos.
 *
 * Cada mechón es un triángulo con base sobre el cráneo, punta desplazada hacia
 * atrás y su propio contorno. Dibujarlos sueltos —en vez de un zigzag continuo—
 * es lo que permite superponerlos y darle a cada uno su inclinación, que es la
 * diferencia entre pelo y una corona de barritas.
 */
/*
 * Dónde termina el pelo y empieza la cara.
 *
 * Está afuera de `pelo()` para poder probarlo: bajó demasiado dos veces
 * seguidas y en las dos le tapó los ojos al personaje, que quedaba con cejas y
 * boca y nada en el medio. Es el tipo de error que no se ve leyendo el código.
 */
function lineaDelPelo(cy, ry) {
  return {
    sien: cy - ry * 0.8,       // a los costados
    pico: cy - ry * 0.62,      // el pico del medio, lo más bajo que llega
    patilla: cy - ry * 0.22    // las patillas, por delante de la oreja
  };
}

function pelo(cy, rx, ry, fase) {
  const color = fase && fase.pelo ? fase.color : PALETA.pelo;
  const sombra = fase && fase.pelo ? mezclar(color, PALETA.linea, 0.3) : PALETA.peloSombra;
  const brillo = fase && fase.pelo ? mezclar(color, '#ffffff', 0.45) : PALETA.peloBrillo;

  const izq = 60 - rx;
  const der = 60 + rx;
  const tapa = cy - 3;
  const arriba = cy - ry;
  const linea = `stroke="${PALETA.linea}" stroke-width="${LINEA}" stroke-linejoin="round"`;

  /* La base: la calota, que termina en la LÍNEA DEL PELO.
     Antes bajaba hasta la altura de la boca y le tapaba los ojos al personaje:
     la cara quedaba con cejas y boca y nada en el medio. La línea del pelo va
     por arriba de las cejas, con un pico al centro y patillas a los costados. */
  const { sien, pico, patilla } = lineaDelPelo(cy, ry);

  const base = `<path d="M${izq.toFixed(1)} ${sien.toFixed(1)}
      C${izq.toFixed(1)} ${(cy - ry * 1.32).toFixed(1)} ${der.toFixed(1)} ${(cy - ry * 1.32).toFixed(1)} ${der.toFixed(1)} ${sien.toFixed(1)}
      L${(der - rx * 0.06).toFixed(1)} ${patilla.toFixed(1)}
      L${(der - rx * 0.26).toFixed(1)} ${sien.toFixed(1)}
      Q${(60 + rx * 0.3).toFixed(1)} ${(sien + 2).toFixed(1)} 60 ${pico.toFixed(1)}
      Q${(60 - rx * 0.3).toFixed(1)} ${(sien + 2).toFixed(1)} ${(izq + rx * 0.26).toFixed(1)} ${sien.toFixed(1)}
      L${(izq + rx * 0.06).toFixed(1)} ${patilla.toFixed(1)} Z" fill="${color}" ${linea}/>`;

  /* Mechones: [posición, alto, desvío de la punta, ancho de la base].
     Pocos y grandes, no muchos y finitos: el pelo del referente son seis o siete
     mechones gordos que salen en abanico hacia arriba y atrás, no un peine. */
  const conFase = !!(fase && fase.pelo);
  const mechones = conFase
    ? [[-0.92, 42, -20, 0.44], [-0.55, 60, -18, 0.46], [-0.14, 68, -8, 0.42],
    [0.28, 62, 12, 0.44], [0.68, 48, 20, 0.42], [0.98, 32, 22, 0.34]]
    : [[-0.82, 12, -8, 0.4], [-0.42, 19, -5, 0.42], [0, 16, 4, 0.4],
    [0.44, 20, 8, 0.42], [0.84, 13, 10, 0.36]];

  const puntas = mechones.map(([fx, alto, desvio, w]) => {
    const x = 60 + rx * fx;
    const ancho = rx * w;
    const baseY = conFase ? arriba + 8 : arriba + 12;
    /* La punta se afina en dos tramos en vez de ser un triángulo recto: eso es
       lo que le da la curva de mechón y no de estaca. */
    return `<path d="M${(x - ancho).toFixed(1)} ${baseY.toFixed(1)}
        Q${(x - ancho * 0.2 + desvio * 0.4).toFixed(1)} ${(arriba - alto * 0.55).toFixed(1)}
         ${(x + desvio).toFixed(1)} ${(arriba - alto).toFixed(1)}
        Q${(x + ancho * 0.55 + desvio * 0.3).toFixed(1)} ${(arriba - alto * 0.4).toFixed(1)}
         ${(x + ancho).toFixed(1)} ${baseY.toFixed(1)} Z" fill="${color}" ${linea}/>`;
  }).join('');

  /* Los flequillos: dos mechones que caen sobre la frente. Sin ellos la línea
     del pelo es un arco liso y el peinado se lee como un casco. */
  const flecos = [[-0.5, 1], [0.16, -1]].map(([fx, sg]) => {
    const x = 60 + rx * fx;
    return `<path d="M${(x - rx * 0.2).toFixed(1)} ${(sien - 1).toFixed(1)}
        Q${(x + sg * rx * 0.1).toFixed(1)} ${(pico + 5).toFixed(1)} ${(x + sg * rx * 0.26).toFixed(1)} ${(pico + 9).toFixed(1)}
        Q${(x + rx * 0.14).toFixed(1)} ${(pico + 2).toFixed(1)} ${(x + rx * 0.24).toFixed(1)} ${(sien - 1).toFixed(1)} Z"
        fill="${color}" ${linea}/>`;
  }).join('');

  /* La melena de las fases altas: cae por detrás de los hombros. */
  const melena = conFase && fase.pelo === 'largo'
    ? [-1, 1].map(sg => {
      const x0 = 60 + sg * (rx - 2);
      return `<path d="M${x0.toFixed(1)} ${(tapa - 6).toFixed(1)}
          q${(sg * 13).toFixed(1)} 28 ${(sg * 5).toFixed(1)} 62
          q${(sg * -11).toFixed(1)} 3 ${(sg * -16).toFixed(1)} -8
          q${(sg * 7).toFixed(1)} -24 ${(sg * 3).toFixed(1)} -52z" fill="${color}" ${linea}/>`;
    }).join('')
    : '';

  /* La sombra de la calota y el brillo: los dos tonos del cel shading. */
  const sombreado = `
    <path d="M${(60 + rx * 0.26).toFixed(1)} ${(cy - ry * 1.18).toFixed(1)}
      C${(60 + rx * 0.95).toFixed(1)} ${(cy - ry * 0.95).toFixed(1)} ${der.toFixed(1)} ${(cy - ry * 0.7).toFixed(1)} ${der.toFixed(1)} ${sien.toFixed(1)}
      l${(-rx * 0.26).toFixed(1)} 0
      C${(60 + rx * 0.55).toFixed(1)} ${(cy - ry * 0.62).toFixed(1)} ${(60 + rx * 0.42).toFixed(1)} ${(cy - ry).toFixed(1)} ${(60 + rx * 0.26).toFixed(1)} ${(cy - ry * 1.18).toFixed(1)} Z"
      fill="${sombra}" opacity=".85"/>
    <path d="M${(60 - rx * 0.62).toFixed(1)} ${(cy - ry * 0.92).toFixed(1)}
      q${(rx * 0.45).toFixed(1)} ${(-ry * 0.28).toFixed(1)} ${(rx * 0.95).toFixed(1)} ${(-ry * 0.12).toFixed(1)}
      q${(-rx * 0.5).toFixed(1)} ${(ry * 0.2).toFixed(1)} ${(-rx * 0.95).toFixed(1)} ${(ry * 0.34).toFixed(1)} z"
      fill="${brillo}" opacity=".9"/>`;

  return melena + base + puntas + sombreado + flecos;
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
      fill="${c}" opacity=".13"/>`;

  /* Las lenguas de fuego. Alturas distintas y alternadas: cinco iguales se leen
     como una cerca de estacas. Cada una lleva su contorno, como el resto. */
  const lenguas = [
    [-1.05, 74], [-0.75, 52], [-0.45, 90], [0, 108], [0.45, 84], [0.75, 56], [1.05, 70]
  ].map(([fx, alto]) => {
    const x = 60 + ancho * fx;
    const cintura = 5 + fase.n;
    return `<path d="M${x.toFixed(1)} ${pie}
        q${(-cintura).toFixed(1)} ${(-alto * 0.55).toFixed(1)} ${(cintura * 0.3).toFixed(1)} ${(-alto).toFixed(1)}
        q${(cintura * 0.9).toFixed(1)} ${(alto * 0.5).toFixed(1)} ${(cintura * 0.4).toFixed(1)} ${alto.toFixed(1)}z"
        fill="${c}" opacity=".45"/>`;
  }).join('');

  const anillo = fase.divino
    ? `<ellipse cx="60" cy="${(Y.pie - 2).toFixed(1)}" rx="${(ancho + 10).toFixed(1)}" ry="7"
        fill="none" stroke="${c}" stroke-width="2.4" opacity=".75"/>`
    : '';

  return `<g class="aura">${halo}${lenguas}${anillo}</g>`;
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
