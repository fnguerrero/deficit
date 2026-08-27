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
    /* 0.62 dejaba puntas de tres pixeles: a ese tamano no se leen como puntas
       de pelo sino como muescas en un borde recto. Los ojos estan bastante mas
       abajo, asi que hay lugar para que bajen de verdad. */
    pico: cy - ry * 0.46,      // el pico del medio, lo mas bajo que llega
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

  /*
   * La frente se corta en TRES PUNTAS, y son parte del contorno de la calota.
   *
   * UNA sola punta, ancha. Tres intentos que no funcionan a este tamano, para
   * no repetirlos: seis puntas chicas dejan un borde mordido; los mechones como
   * piezas sueltas superpuestas acumulan contornos hasta que la frente es una
   * hilera de dientes negros; y tres puntas seguidas quedan a seis pixeles una
   * de otra, con lo que el contorno las pinta enteras de negro. El ancho minimo
   * de un diente es el doble del contorno, y aca el contorno mide 2.4.
   *
   * Con el borde en arco liso —como estaba— el pelo terminaba en una raya casi
   * horizontal cruzando la cara: un casquete apoyado, un peluquin.
   */
  const formaCalota = `M${izq.toFixed(1)} ${sien.toFixed(1)}
      C${izq.toFixed(1)} ${(cy - ry * 1.32).toFixed(1)} ${der.toFixed(1)} ${(cy - ry * 1.32).toFixed(1)} ${der.toFixed(1)} ${sien.toFixed(1)}
      L${(der - rx * 0.06).toFixed(1)} ${patilla.toFixed(1)}
      L${(der - rx * 0.2).toFixed(1)} ${(sien + 1).toFixed(1)}
      L${(60 + rx * 0.08).toFixed(1)} ${pico.toFixed(1)}
      L${(izq + rx * 0.26).toFixed(1)} ${(sien + 1).toFixed(1)}
      L${(izq + rx * 0.06).toFixed(1)} ${patilla.toFixed(1)} Z`;

  /* Mechones: [posición, alto, desvío de la punta, ancho de la base].
     Pocos y grandes, no muchos y finitos: el pelo del referente son seis o siete
     mechones gordos que salen en abanico hacia arriba y atrás, no un peine. */
  const conFase = !!(fase && fase.pelo);
  /* Las bases se SOLAPAN a proposito: mechones angostos dejaban huecos de
     fondo entre punta y punta y el pelo se veia como una hilera de estacas
     clavadas en el craneo en vez de una masa con puntas. */
  const mechones = conFase
    ? [[-0.95, 34, -18, 0.62], [-0.62, 50, -15, 0.6], [-0.28, 60, -6, 0.58],
    [0.06, 58, 8, 0.58], [0.42, 48, 16, 0.6], [0.78, 36, 19, 0.56], [1.02, 24, 20, 0.44]]
    : [[-0.86, 11, -7, 0.56], [-0.48, 17, -5, 0.56], [-0.08, 19, 3, 0.54],
    [0.34, 18, 7, 0.56], [0.74, 13, 9, 0.52], [1, 9, 10, 0.4]];

  /* El nacimiento de cada mechon SIGUE LA CURVA DEL CRANEO.
     Antes todos arrancaban a la misma altura, asi que los de los costados
     nacian de la nada por encima de la cabeza y el conjunto se leia como una
     corona de puas apoyada. El tope real de la calota esta en cy - 1.19*ry
     (el punto medio de la cubica), y a los costados baja hasta la sien. */
  const topeCalota = cy - ry * 1.19;
  const nacimiento = (fx) => {
    const t = Math.min(1, Math.abs(fx));
    return topeCalota + (sien - topeCalota) * t * t;
  };

  const formaMechon = mechones.map(([fx, alto, desvio, w]) => {
    const x = 60 + rx * fx;
    const ancho = rx * w;
    /* Metido hacia adentro de la calota para que la base no se vea nunca, pero
       nunca por debajo de la linea del pelo: los mechones de los extremos nacen
       a la altura de la sien, y nueve pixeles mas abajo les dejaba la base
       colgando sobre la frente como un bloque cuadrado. */
    const baseY = Math.min(nacimiento(fx) + (conFase ? 9 : 7), sien - 4);
    /* La punta se afina en dos tramos en vez de ser un triángulo recto: eso es
       lo que le da la curva de mechón y no de estaca. */
    const desde = nacimiento(fx);
    return `M${(x - ancho).toFixed(1)} ${baseY.toFixed(1)}
        Q${(x - ancho * 0.2 + desvio * 0.4).toFixed(1)} ${(desde - alto * 0.55).toFixed(1)}
         ${(x + desvio).toFixed(1)} ${(desde - alto).toFixed(1)}
        Q${(x + ancho * 0.55 + desvio * 0.3).toFixed(1)} ${(desde - alto * 0.4).toFixed(1)}
         ${(x + ancho).toFixed(1)} ${baseY.toFixed(1)} Z`;
  });

  /*
   * Los mechones de la frente: triangulos que APUNTAN HACIA ABAJO, con la base
   * metida dentro de la calota y su propio contorno.
   *
   * Son los que sacan el efecto peluquin. Sin ellos el pelo termina en un arco
   * casi horizontal cruzando la frente de lado a lado, y eso no es una cabeza
   * con pelo: es un casquete apoyado encima. Las patillas de los extremos hacen
   * lo mismo a los costados, donde antes el pelo se cortaba en seco arriba de
   * la oreja.
   */
  /* Aca vivian dos flequillos sueltos sobre la frente. Existian para romper el
     arco liso de la linea del pelo; ahora esa linea son dientes, y los
     flequillos quedaban encima como dos manchas oscuras con contorno propio en
     el medio de la cara. Se fueron: el problema que resolvian ya no existe. */

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

  /* La sombra de la calota y el brillo: los dos tonos del cel shading.
     La sombra NO llega hasta la linea del pelo. Es un path suelto, sin recorte
     contra la silueta, asi que cualquier tramo que pase por debajo del borde se
     pinta sobre la frente: con los dientes nuevos eso dejaba una banda oscura
     cruzando la cara, justo lo que hacia que el pelo pareciera postizo. */
  const pisoSombra = cy - ry * 0.97;
  const sombreado = `
    <path d="M${(60 + rx * 0.26).toFixed(1)} ${(cy - ry * 1.18).toFixed(1)}
      C${(60 + rx * 0.95).toFixed(1)} ${(cy - ry * 1.05).toFixed(1)} ${der.toFixed(1)} ${(cy - ry * 0.98).toFixed(1)} ${(der - rx * 0.04).toFixed(1)} ${pisoSombra.toFixed(1)}
      l${(-rx * 0.26).toFixed(1)} 0
      C${(60 + rx * 0.55).toFixed(1)} ${pisoSombra.toFixed(1)} ${(60 + rx * 0.42).toFixed(1)} ${(cy - ry).toFixed(1)} ${(60 + rx * 0.26).toFixed(1)} ${(cy - ry * 1.18).toFixed(1)} Z"
      fill="${sombra}" opacity=".85"/>
    <path d="M${(60 - rx * 0.6).toFixed(1)} ${(cy - ry * 1.06).toFixed(1)}
      q${(rx * 0.45).toFixed(1)} ${(-ry * 0.24).toFixed(1)} ${(rx * 0.92).toFixed(1)} ${(-ry * 0.1).toFixed(1)}
      q${(-rx * 0.48).toFixed(1)} ${(ry * 0.18).toFixed(1)} ${(-rx * 0.92).toFixed(1)} ${(ry * 0.26).toFixed(1)} z"
      fill="${brillo}" opacity=".9"/>`;

  /*
   * DOS PASADAS, y es lo que separa una cabellera de una jaula.
   *
   * Cada mechon se superpone con el de al lado. Pintando cada uno con su propio
   * contorno, esas lineas quedan cruzando el interior de la masa de pelo: el
   * resultado es amarillo rayado de negro, no pelo. Primero van todas las
   * formas con el contorno (al doble de grosor, porque el relleno de la pasada
   * siguiente se come la mitad de adentro), y encima las mismas formas
   * rellenas y sin contorno. Sobrevive solo el borde de afuera.
   */
  const formas = [formaCalota, ...formaMechon];
  const contorno = formas.map(d => `<path d="${d}" fill="${color}"
      stroke="${PALETA.linea}" stroke-width="${LINEA * 2}" stroke-linejoin="round"/>`).join('');
  const relleno = formas.map(d => `<path d="${d}" fill="${color}"/>`).join('');

  /* Sin ninguna linea adentro el pelo es una mancha de un solo color. La
     separacion entre mechones se sugiere con trazos FINOS en el tono de sombra
     —no con el contorno de cada pieza, que es justamente lo que lo convertia en
     una jaula— y solo en los tres del medio. */
  /* Los mechones del flequillo, dibujados con sombra sobre la calota. Recortar
     mas dientes en el borde no se puede —los pinta el contorno—, pero la sombra
     no tiene ese problema y hace el mismo trabajo: que la frente no termine en
     una masa lisa. */
  const flequillo = [-0.5, -0.18, 0.3].map((fx, i) => {
    const x = 60 + rx * fx;
    return `<path d="M${x.toFixed(1)} ${(sien - ry * 0.34).toFixed(1)}
        L${(x + rx * 0.1).toFixed(1)} ${(sien + ry * (i === 1 ? 0.2 : 0.08)).toFixed(1)}"
      stroke="${sombra}" stroke-width="${conFase ? 2.2 : 1.6}" fill="none"
      stroke-linecap="round" opacity=".7"/>`;
  }).join('');

  const nervios = mechones.slice(1, -1).map(([fx, alto, desvio]) => {
    const x = 60 + rx * fx;
    const desde = nacimiento(fx);
    return `<path d="M${(x - rx * 0.06).toFixed(1)} ${(desde + (conFase ? 6 : 4)).toFixed(1)}
        Q${(x + desvio * 0.4).toFixed(1)} ${(desde - alto * 0.5).toFixed(1)}
         ${(x + desvio * 0.85).toFixed(1)} ${(desde - alto * 0.88).toFixed(1)}"
      stroke="${sombra}" stroke-width="${conFase ? 2 : 1.4}" fill="none"
      stroke-linecap="round" opacity=".75"/>`;
  }).join('');

  return melena + contorno + relleno + nervios + flequillo + sombreado;
}
