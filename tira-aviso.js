/* ============================================================
   tira-aviso.js — la fila del dia, dibujada como imagen.

   Una notificacion no admite HTML: el sistema la dibuja con su plantilla y lo
   unico que se puede meter propio es UNA imagen grande, la que Android muestra
   al desplegarla. Asi que la fila de casilleros se dibuja en un canvas y viaja
   como imagen.

   Se dibuja con los mismos datos que la grilla de Hoy \u2014emoji, nombre y valor\u2014
   para que la barra de notificaciones y la app no digan cosas distintas.
   ============================================================ */

/* Android muestra la imagen expandida en una relacion cercana a 2:1. Mas alta
   se recorta por arriba y por abajo, que es justo donde estan los nombres. */
const TIRA_ANCHO = 720;
const TIRA_ALTO = 360;

const TIRA_COLORES = {
  fondo: '#11161d',
  celda: '#1b232e',
  celdaOk: '#16341f',
  borde: '#2b3644',
  bordeOk: '#2f7d4a',
  texto: '#e8edf4',
  tenue: '#93a0b1',
  acento: '#4ade80'
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

  const margen = 18;
  const hueco = 12;
  const anchoCelda = (ancho - margen * 2 - hueco * (lista.length - 1)) / lista.length;
  const altoCelda = alto - margen * 2;

  lista.forEach((it, i) => {
    const x = margen + i * (anchoCelda + hueco);
    const y = margen;

    c.fillStyle = it.listo ? TIRA_COLORES.celdaOk : TIRA_COLORES.celda;
    c.strokeStyle = it.listo ? TIRA_COLORES.bordeOk : TIRA_COLORES.borde;
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

    c.font = '58px system-ui, "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    c.fillText(it.icono || '', centro, y + altoCelda * 0.42);

    c.fillStyle = it.listo ? TIRA_COLORES.acento : TIRA_COLORES.texto;
    c.font = '600 26px system-ui, sans-serif';
    c.fillText(it.nombre || '', centro, y + altoCelda * 0.68);

    /* El valor manda sobre el tilde: "4/4" dice mas que un tilde, y que este
       cumplido ya lo dice el verde. El tilde queda para lo que no tiene numero. */
    c.fillStyle = it.listo ? TIRA_COLORES.acento : TIRA_COLORES.tenue;
    c.font = '600 24px system-ui, sans-serif';
    c.fillText(it.valor || (it.listo ? '✓' : '—'), centro, y + altoCelda * 0.87);
  });

  try {
    return cv.toDataURL('image/png');
  } catch {
    return null;
  }
}
