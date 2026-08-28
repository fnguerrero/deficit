/*
 * sprite.js — el personaje por capas: el cuerpo es un dibujo, el resto se sigue
 * dibujando por codigo encima.
 *
 * Por que hibrido y no una cosa o la otra:
 *
 * El cuerpo sale de la lamina que dibujo Nico, recortada por tools/sprites.py.
 * Son siete contexturas, exactamente los siete cuerpos que la app sabe
 * distinguir, y se ven como el se los imagino: eso no lo alcanza un SVG
 * parametrico, y perseguirlo a mano ya consumio dos ciclos.
 *
 * Pero SOLO el cuerpo. Las fases se siguen dibujando: son siete auras por siete
 * contexturas, cuarenta y nueve dibujos que nadie va a hacer, y sobre todo el
 * cuerpo tiene que seguir saliendo de la balanza. Con la lamina de fases como
 * sprite, alguien con panza en fase 3 veria el cuerpo flaco del dibujo, y la
 * regla es que el cuerpo no miente sobre el cuerpo.
 *
 * Asi que el fuego va detras y el pelo de color va encima, tapando al negro.
 */

/* Los siete sprites, en el orden en que los devuelve el recorte, ubicados en el
   plano contextura x musculatura. Son los mismos siete cuerpos del taller:
   flaco, medio, grande, maximo, fibra, macizo y fuerte. */
const SPRITE_CUERPOS = [
  { c: 0.05, m: 0.00 },   // flaco
  { c: 0.38, m: 0.00 },   // normal
  { c: 0.75, m: 0.00 },   // con panza
  { c: 1.00, m: 0.00 },   // panza grande
  { c: 0.30, m: 0.45 },   // atletico
  { c: 0.30, m: 0.80 },   // musculoso, con abdominales
  { c: 0.35, m: 1.00 }    // musculoso ancho
];

/**
 * Cual de los siete le toca a un cuerpo.
 *
 * Distancia en el plano, con la musculatura pesando mas que la contextura: la
 * diferencia entre entrenar y no entrenar se nota antes que un escalon de
 * grasa, y equivocarse de eje es lo que hace que alguien que levanta pesas se
 * vea a si mismo blando.
 */
function spritePara(cuerpo, fase = null) {
  const c = Math.min(1, Math.max(0, cuerpo?.efectiva ?? 0.42));

  /*
   * La fase SUMA musculo, y no toca la grasa.
   *
   * Es la unica parte del cuerpo que la constancia puede mover, y puede porque
   * un dia perfecto incluye haber entrenado: el muneco se pone fuerte porque
   * entrenaste treinta dias seguidos, no porque la app te quiera premiar. La
   * grasa se queda como esta hasta que lo diga la balanza, que es de donde sale
   * la regla de que el dibujo no miente sobre el cuerpo.
   */
  /*
   * El x1,5 adelanta el cambio de cuerpo a Bestia en vez de Leyenda: hay pocos
   * saltos disponibles y conviene gastarlos a la mitad de la escalera y no al
   * final, donde casi nadie llega.
   *
   * Y se apaga con la panza, porque EN LA LAMINA NO HAY UN GORDO MUSCULOSO: los
   * tres cuerpos con musculo son delgados. Sin este freno, alguien con panza
   * llegaba a Bestia y de golpe aparecia flaco y marcado, o sea la app le
   * borraba veinte kilos por haber cumplido tres dias seguidos. Mientras la
   * balanza no baje, la fase le da pelo y fuego; el cuerpo, no.
   */
  const margen = Math.min(1, Math.max(0, 1 - (c - 0.5) / 0.3));
  const m = Math.min(1, Math.max(0,
    (cuerpo?.musculatura ?? 0) + (fase?.musculo ?? 0) * 1.5 * margen));

  let mejor = 0;
  let menor = Infinity;
  SPRITE_CUERPOS.forEach((s, i) => {
    const d = (s.c - c) * (s.c - c) + ((s.m - m) * 1.6) * ((s.m - m) * 1.6);
    if (d < menor) { menor = d; mejor = i; }
  });
  return mejor;
}

/**
 * El pelo de la fase, escalado y puesto sobre la cabeza del sprite.
 *
 * El SVG del pelo se dibuja en el sistema del personaje viejo (cara centrada en
 * x = 60) y despues se transforma para caer sobre la mata negra que el recorte
 * midio. Se agranda un 18 % a proposito: tiene que TAPAR al pelo del dibujo, y
 * si queda justo, las puntas negras asoman por los costados y se ve sucio.
 */
function peloDeFase(fase, sprite, ancho, alto, parte = 'adelante') {
  if (!fase || !fase.pelo) return '';

  const caja = sprite.pelo;
  if (!caja) return '';

  /*
   * Lo que tiene que coincidir es la LINEA DEL PELO —donde el pelo termina y
   * empieza la frente— y el ancho de la cabeza. Los mechones que suban, que
   * suban: son de una fase, tienen que salirse.
   *
   * Calzar en cambio la caja entera del pelo negro contra la caja entera del
   * dibujado deja un pelo del mismo tamano que el de abajo, o sea ningun
   * super saiyan; y anclar por el centro lo deja flotando arriba de la cabeza.
   */
  const px = caja.cx * ancho;
  const frente = caja.abajo * alto;
  const pAncho = caja.ancho * ancho;

  const rx = 19;
  const ry = 18.6;
  const cy = 34;
  const { pico } = lineaDelPelo(cy, ry);

  /* La escala vertical va aparte y es mas corta que la horizontal. El pelo de
     fase esta dibujado midiendo tres veces la cabeza —al personaje de SVG le
     quedaba bien— y sobre este sprite tapaba medio cuerpo. Achatarlo lo deja
     ancho y alto como en la referencia, en vez de una antorcha. */
  /* Y crece con la fase. Es lo unico que separa a un Titan de un Encendido
     ahora que no hay melena: el mismo pelo, mas grande. */
  const crece = 1 + (fase.n || 0) * 0.055;
  const sx = (pAncho * 1.08 * crece) / (rx * 2);
  const sy = sx * 0.6;
  const tx = px - 60 * sx;
  const ty = frente - pico * sy;
  const svg = pelo(cy, rx, ry, fase, parte);
  if (!svg) return '';

  return `<svg class="muneco-capa${parte === 'atras' ? ' muneco-atras' : ''}" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}"
      aria-hidden="true"><g transform="translate(${tx.toFixed(1)} ${ty.toFixed(1)}) scale(${sx.toFixed(3)} ${sy.toFixed(3)})">${svg}</g></svg>`;
}


/*
 * El animo, ahora como emoji al lado del texto.
 *
 * Es lo unico que se pierde al pasar el cuerpo a sprite: la cara del dibujo es
 * fija y ya no puede poner cara de culpa, de seco o de dormido. Perderlo del
 * todo seria peor que el cambio: el animo es la mitad de lo que la tarjeta
 * cuenta, y quien la mira de reojo lee la cara antes que el texto. Un emoji
 * junto al titulo lo dice igual de rapido y no depende del dibujo.
 */
const EMOJI_ANIMO = {
  neutral: '😐', bien: '🙂', genial: '😄', flojo: '😕',
  cansado: '😴', seco: '😅', pesado: '😖', triste: '😢', furioso: '😤'
};

function emojiDeAnimo(animo) {
  return EMOJI_ANIMO[animo] || EMOJI_ANIMO.neutral;
}

/**
 * El personaje entero, como HTML de tres capas.
 *
 * Devuelve HTML y no SVG a proposito: la del medio es una imagen, y meterla
 * dentro de un SVG con <image> obliga a un data URI o a un fetch, que es
 * exactamente el problema que el sprite venia a evitar.
 */
function htmlPersonaje(animo = 'neutral', alto = 96, cuerpo = null, fase = null) {
  const f = fase && fase.n ? fase : null;
  const i = spritePara(cuerpo, f);
  const s = SPRITES.sprites[i];
  const ancho = Math.round(alto * s.ancho / SPRITES.alto);

  const med = medidasDe(
    cuerpo && cuerpo.efectiva != null ? cuerpo.efectiva : null,
    cuerpo?.musculatura ?? 0,
    f ? f.musculo : 0
  );

  /* El aura se dibuja en el sistema de siempre y se estira al alto del sprite:
     es humo alrededor, no necesita calzar con nada. */
  const atras = f
    ? `<svg class="muneco-capa muneco-atras" viewBox="${VB.x} ${VB.y} ${VB.w} ${VB.h}"
        width="${Math.round(alto * VB.w / VB.h)}" height="${alto}" aria-hidden="true">
        ${aura(med, f)}${ki(med, f)}${suelo(med, f)}</svg>`
    : '';

  const clase = 'muneco' + (f ? ' fase-' + f.n : '');
  return `<div class="${clase}" style="width:${ancho}px;height:${alto}px"
      role="img" aria-label="Cómo venís: ${animo}${f ? ', en fase ' + f.n : ''}">
      ${atras}
      <img class="muneco-cuerpo" src="img/${s.archivo}" width="${ancho}" height="${alto}" alt="">
      ${peloDeFase(f, s, ancho, alto)}
    </div>`;
}
