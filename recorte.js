/* ============================================================
   El marco de recorte: donde esta, adonde se lo puede mover y que
   pedazo de la imagen sale.

   Todo aca es aritmetica pura sobre rectangulos, sin DOM: es lo que permite
   probar los limites —que el marco no se salga, que no se de vuelta, que no
   quede de dos pixeles— sin tener que arrastrar nada con el dedo.

   Las coordenadas son SIEMPRE relativas a la imagen mostrada, en pixeles de
   pantalla. La conversion a pixeles de la imagen original la hace una sola
   funcion, al final, y por eso el resto no necesita saber a que escala se
   esta viendo.
   ============================================================ */

/* Un marco mas chico que esto no es un encuadre, es un accidente: con el dedo
   es facil cerrarlo sin querer, y despues no hay de donde agarrarlo. */
const MINIMO_MARCO = 48;

/** Arranca abarcando todo: sin tocar nada, "Analizar" manda la foto entera. */
function encuadreInicial(ancho, alto) {
  return { x: 0, y: 0, w: Math.max(0, ancho), h: Math.max(0, alto) };
}

function limitar(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/** Mover no cambia el tamaño: el marco se frena contra el borde, no se achica. */
function moverMarco(marco, dx, dy, ancho, alto) {
  return {
    x: limitar(marco.x + dx, 0, Math.max(0, ancho - marco.w)),
    y: limitar(marco.y + dy, 0, Math.max(0, alto - marco.h)),
    w: marco.w,
    h: marco.h
  };
}

/**
 * Estirar de una esquina. La esquina opuesta queda clavada, que es lo que hace
 * que el gesto se sienta como agarrar el papel de una punta.
 *
 * `esquina` es 'ne' | 'no' | 'se' | 'so'.
 */
function redimensionarMarco(marco, esquina, dx, dy, ancho, alto, minimo = MINIMO_MARCO) {
  const der = marco.x + marco.w;
  const abajo = marco.y + marco.h;
  const min = Math.min(minimo, ancho, alto);

  let { x, y, w, h } = marco;

  if (esquina.includes('o')) {
    x = limitar(marco.x + dx, 0, der - min);
    w = der - x;
  } else {
    w = limitar(marco.w + dx, min, ancho - marco.x);
  }

  if (esquina.includes('n')) {
    y = limitar(marco.y + dy, 0, abajo - min);
    h = abajo - y;
  } else {
    h = limitar(marco.h + dy, min, alto - marco.y);
  }

  return { x, y, w, h };
}

/** Si el marco sigue abarcando todo, no hay nada que recortar. */
function esRecorteEntero(marco, ancho, alto, tolerancia = 1) {
  return marco.x <= tolerancia && marco.y <= tolerancia &&
    marco.w >= ancho - tolerancia * 2 && marco.h >= alto - tolerancia * 2;
}

/**
 * Del marco en pantalla al rectangulo en pixeles de la imagen original.
 *
 * Se redondea y se recorta contra el tamaño real: un marco pegado al borde da
 * por redondeo un pixel de mas, y `drawImage` con un rectangulo que se sale de
 * la imagen dibuja una franja transparente en el sobrante.
 */
function marcoEnImagen(marco, mostrado, natural) {
  const escX = natural.ancho / (mostrado.ancho || 1);
  const escY = natural.alto / (mostrado.alto || 1);

  const x = limitar(Math.round(marco.x * escX), 0, natural.ancho);
  const y = limitar(Math.round(marco.y * escY), 0, natural.alto);
  return {
    x,
    y,
    w: limitar(Math.round(marco.w * escX), 1, natural.ancho - x),
    h: limitar(Math.round(marco.h * escY), 1, natural.alto - y)
  };
}
