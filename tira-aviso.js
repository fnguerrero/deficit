/* ============================================================
   tira-aviso.js — la fila del dia, dibujada como imagen.

   Una notificacion no admite HTML: el sistema la dibuja con su plantilla y lo
   unico que se puede meter propio es UNA imagen grande, la que Android muestra
   al desplegarla. Asi que la fila de casilleros se dibuja en un canvas y viaja
   como imagen.

   Se dibuja con los mismos datos que la grilla de Hoy \u2014emoji, nombre y valor\u2014
   para que la barra de notificaciones y la app no digan cosas distintas.
   ============================================================ */

/* Las celdas eran cuadrados altos y ocupaban media notificacion para decir tres
   renglones. Achatadas dicen lo mismo y dejan ver lo que hay debajo. */
const TIRA_ANCHO = 720;
const TIRA_ALTO = 250;

const TIRA_COLORES = {
  fondo: '#11161d',
  celda: '#1b232e',
  borde: '#2b3644',
  texto: '#e8edf4',
  tenue: '#93a0b1'
};

/*
 * Los mismos colores que los casilleros de la app, por nivel.
 *
 * Antes el dibujo solo miraba si estaba cumplido, asi que dos vasos de cuatro
 * —que en la app se ven en ambar— salian en gris, igual que cero. El color es
 * la mitad de lo que dice un casillero.
 */
const TIRA_NIVEL = {
  bien: { texto: '#4ade80', celda: '#16341f', borde: '#2f7d4a' },
  /* Sin ambar, igual que la app: un dato flojo pero cargado se ve cumplido, y
     ver ambar en la notificacion y verde en la app para el mismo dato es lo que
     mas confunde de las dos superficies. */
  mal: { texto: '#f87171', celda: '#3a1d1d', borde: '#8f3b3b' }
};

/*
 * El dia completo se ve distinto, no un poco mas verde.
 *
 * Con todos los casilleros cumplidos la fila entera pasa a dorado, marco
 * incluido: es el unico estado que se mira de lejos y sin leer nada, y verde
 * con un casillero mas verde no se distingue de verde con uno menos. El fondo
 * tambien cambia porque el premio es del dia, no de cada casillero.
 */
const TIRA_ORO = {
  fondo: '#241d08',
  texto: '#fcd34d',
  celda: '#3a2e0b',
  borde: '#b08900'
};

/*
 * Lo ultimo que se dibujo, para no volver a dibujarlo igual.
 *
 * Son 60 KB de PNG y el aviso se refresca en cada cambio del dia: sin esto, un
 * dia con veinte toques dibuja veinte veces la misma fila. La firma es lo que
 * se ve, asi que si nada de eso cambio, el dibujo tampoco.
 */
let ultimaTira = { firma: '', png: null };

function firmaDeTira(lista, ancho, alto) {
  return `${ancho}x${alto}|` + (todoOptimo(lista) ? 'oro|' : '') + lista
    .map(i => `${i.icono}:${i.nombre}:${i.valor}:${i.nivel || ''}:${i.listo ? 1 : 0}:${i.optimo ? 1 : 0}:${i.opcional ? 1 : 0}`)
    .join('|');
}

/*
 * Lo que enciende el dorado: todos en su OPTIMO, no todos cargados.
 *
 * Cargados alcanzaba para dorar un dia de 3.000 pasos y cinco horas de sueno,
 * con un casillero en rojo adentro del marco dorado. El premio dejaba de ser un
 * premio: se ganaba anotando, no haciendo. Un casillero sin la estrella alcanza
 * para que no sea un dia completo, aunque los otros cuatro esten impecables.
 */
function todoOptimo(lista) {
  /* Los `opcional` no cuentan, igual que en la grilla de la app. Las comidas
     salen en el aviso pero no tienen casillero en la pantalla: sin sacarlas de
     la cuenta, la app se doraba entera y la notificacion de al lado no, con los
     mismos cuatro datos y en el mismo segundo. */
  const items = (lista || []).filter(i => i && !i.opcional);
  return items.length > 0 && items.every(i => i.optimo);
}

/**
 * Dibuja la fila y devuelve un PNG en dataURL, o null si no se puede dibujar.
 *
 * `items` es [{ icono, nombre, valor, nivel, listo, optimo }], que es lo que ya
 * arma rachasDelDia() para el aviso.
 */
function tiraDelDiaPNG(items, { ancho = TIRA_ANCHO, alto = TIRA_ALTO } = {}) {
  const lista = (items || []).filter(Boolean);
  if (!lista.length || typeof document === 'undefined') return null;

  const firma = firmaDeTira(lista, ancho, alto);
  if (firma === ultimaTira.firma && ultimaTira.png) return ultimaTira.png;

  const cv = document.createElement('canvas');
  cv.width = ancho;
  cv.height = alto;
  const c = cv.getContext('2d');
  if (!c) return null;

  const oro = todoOptimo(lista);

  c.fillStyle = oro ? TIRA_ORO.fondo : TIRA_COLORES.fondo;
  c.fillRect(0, 0, ancho, alto);

  const margen = 14;
  const hueco = 10;
  const anchoCelda = (ancho - margen * 2 - hueco * (lista.length - 1)) / lista.length;
  const altoCelda = alto - margen * 2;

  lista.forEach((it, i) => {
    const x = margen + i * (anchoCelda + hueco);
    const y = margen;

    /* El optimo manda sobre todo lo demas, celda por celda: en la app cada
       casillero con estrella ya se pinta dorado, y en el aviso salian con la
       estrella adentro de una celda verde.
       Despues el nivel manda sobre el tilde: un casillero cargado con un dato
       malo se ve malo. Sin nivel, cumplido es verde. */
    /* El dia dorado no dora las celdas que no cuentan para el: las Comidas
       viajan en el aviso pero no deciden el dia, y pintarlas de oro sin haber
       llegado a su optimo decia que estaban bien justo cuando la app las
       mostraba en rojo. */
    const tono = (it.optimo || (oro && !it.opcional))
      ? TIRA_ORO
      : (TIRA_NIVEL[it.nivel] || (it.listo ? TIRA_NIVEL.bien : null));

    c.fillStyle = tono ? tono.celda : TIRA_COLORES.celda;
    c.strokeStyle = tono ? tono.borde : TIRA_COLORES.borde;
    c.lineWidth = 2;
    /* roundRect no esta en todos lados: si falta, el cuadrado sirve igual. */
    if (c.roundRect) {
      c.beginPath();
      c.roundRect(x, y, anchoCelda, altoCelda, 22);
      c.fill();
      c.stroke();
    } else {
      c.fillRect(x, y, anchoCelda, altoCelda);
      c.strokeRect(x, y, anchoCelda, altoCelda);
    }

    const centro = x + anchoCelda / 2;
    c.textAlign = 'center';

    /* La estrella reemplaza al icono cuando el objetivo llego a su optimo: es
       la unica marca de la fila que dice "esto no solo esta hecho, esta bien
       hecho", y puesta al lado del emoji competia con el en vez de decirlo. */
    c.font = '52px system-ui, "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    c.fillText(it.optimo ? '⭐' : (it.icono || ''), centro, y + altoCelda * 0.44);

    c.fillStyle = tono ? tono.texto : TIRA_COLORES.texto;
    c.font = '600 25px system-ui, sans-serif';
    c.fillText(it.nombre || '', centro, y + altoCelda * 0.72);

    /* El valor manda sobre el tilde: "4/4" dice mas que un tilde, y que este
       cumplido ya lo dice el color. El tilde queda para lo que no tiene numero. */
    c.fillStyle = tono ? tono.texto : TIRA_COLORES.tenue;
    c.font = '600 23px system-ui, sans-serif';
    c.fillText(it.valor || (it.listo ? '✓' : '—'), centro, y + altoCelda * 0.93);
  });

  try {
    const png = cv.toDataURL('image/png');
    ultimaTira = { firma, png };
    return png;
  } catch {
    return null;
  }
}
