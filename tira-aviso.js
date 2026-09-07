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
  flojo: { texto: '#fbbf24', celda: '#33290f', borde: '#8a6a17' },
  mal: { texto: '#f87171', celda: '#3a1d1d', borde: '#8f3b3b' }
};

/**
 * Dibuja la fila y devuelve un PNG en dataURL, o null si no se puede dibujar.
 *
 * `items` es [{ icono, nombre, valor, listo }], que es lo que ya arma
 * rachasDelDia() para el texto del aviso.
 */
function tiraDelDiaPNG(items, { ancho = TIRA_ANCHO, alto = TIRA_ALTO } = {}) {
  const lista = (items || []).filter(Boolean);
  if (!lista.length || typeof document === 'undefined') return null;

  const cv = document.createElement('canvas');
  cv.width = ancho;
  cv.height = alto;
  const c = cv.getContext('2d');
  if (!c) return null;

  c.fillStyle = TIRA_COLORES.fondo;
  c.fillRect(0, 0, ancho, alto);

  const margen = 14;
  const hueco = 10;
  const anchoCelda = (ancho - margen * 2 - hueco * (lista.length - 1)) / lista.length;
  const altoCelda = alto - margen * 2;

  lista.forEach((it, i) => {
    const x = margen + i * (anchoCelda + hueco);
    const y = margen;

    /* El nivel manda sobre el tilde: un casillero cargado con un dato malo se
       ve malo, igual que en la app. Sin nivel, cumplido es verde. */
    const tono = TIRA_NIVEL[it.nivel] || (it.listo ? TIRA_NIVEL.bien : null);

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

    c.font = '52px system-ui, "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    c.fillText(it.icono || '', centro, y + altoCelda * 0.44);

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
    return cv.toDataURL('image/png');
  } catch {
    return null;
  }
}
