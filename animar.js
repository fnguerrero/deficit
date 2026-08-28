/*
 * animar.js — las animaciones de la app.
 *
 * La regla, y es la que decide qué entra y qué no: **una animación tiene que
 * decir algo**. Qué cambió, cuánto cambió, o que lo que acabás de hacer valió la
 * pena. Una que solo decora es peso muerto, y en una app que se abre quince
 * veces por día encima marea.
 *
 * Todo con CSS y SVG. Una librería de animación pesa más que toda esta app.
 *
 * Nada de acá bloquea: se dispara y la app sigue respondiendo. Y nada de acá
 * corre si la persona pidió menos movimiento.
 */

/** Si el sistema pide menos movimiento, ninguna animación arranca. */
function quieto() {
  return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/*
 * Un número que cuenta hasta su valor nuevo.
 *
 * Es la animación que más trabajo hace de todas: 1.200 que salta a 1.450 es un
 * dato que cambió, pero 1.200 subiendo hasta 1.450 es algo que pasó, y ademas
 * se ve CUÁNTO subió sin tener que acordarse del número anterior.
 *
 * Se anima con requestAnimationFrame y no con una transición de CSS porque lo
 * que cambia es el texto del nodo, no una propiedad.
 */
const contando = new WeakMap();

/*
 * Dónde está el número en un instante de la cuenta.
 *
 * Vive afuera para poder probarla: la animación en sí no se puede verificar sin
 * ojos —y `requestAnimationFrame` ni siquiera corre con la pestaña oculta—,
 * pero la curva sí. Arranca rápido y frena al final, que es como se lee un
 * número que LLEGA a un valor en vez de cortarse de golpe.
 */
function valorEnT(inicio, fin, t) {
  const p = Math.min(1, Math.max(0, Number(t) || 0));
  return inicio + (fin - inicio) * (1 - Math.pow(1 - p, 3));
}

function contarHasta(el, hasta, { desde = null, ms = 650, formato = (v) => Math.round(v) } = {}) {
  if (!el) return;

  /* Si ya venía contando, se corta ahí: dos cuentas sobre el mismo nodo se
     pisan y el número queda saltando para atrás y para adelante. */
  const previa = contando.get(el);
  if (previa) cancelAnimationFrame(previa.raf);

  const inicio = desde != null ? desde : (previa ? previa.valor : Number(String(el.textContent).replace(/[^\d.-]/g, '')) || 0);
  const fin = Number(hasta) || 0;

  if (quieto() || inicio === fin) {
    el.textContent = formato(fin);
    contando.delete(el);
    return;
  }

  const t0 = performance.now();

  const cerrar = () => {
    const st = contando.get(el);
    if (st) { cancelAnimationFrame(st.raf); clearTimeout(st.red); }
    el.textContent = formato(fin);
    contando.delete(el);
  };

  const paso = (ahora) => {
    const t = Math.min(1, (ahora - t0) / ms);
    const v = valorEnT(inicio, fin, t);
    el.textContent = formato(v);

    if (t >= 1) { cerrar(); return; }
    const st = contando.get(el);
    contando.set(el, { valor: v, raf: requestAnimationFrame(paso), red: st && st.red });
  };

  /*
   * La red: si en el doble del tiempo la animación no llegó, se pone el valor
   * final y listo.
   *
   * No es paranoia: `requestAnimationFrame` NO CORRE con la pestaña oculta, y
   * esta app termina análisis mientras la persona está mirando otra cosa. Sin
   * esta red, al volver se encuentra el número viejo congelado —no el nuevo sin
   * animar: el viejo— y creyendo que la comida no se guardó.
   */
  contando.set(el, {
    valor: inicio,
    raf: requestAnimationFrame(paso),
    red: setTimeout(cerrar, ms * 2 + 120)
  });
}

/*
 * Re-disparar una animación de CSS sobre un nodo que ya la tiene.
 *
 * Agregar la clase de nuevo no hace nada si ya está: el navegador no reinicia
 * una animación que no cambió. Hay que sacarla, forzar un reflow y volver a
 * ponerla. Sin esto, el segundo vaso de agua no festeja.
 */
function repetirClase(el, clase, ms = 700) {
  if (!el || quieto()) return;
  el.classList.remove(clase);
  void el.offsetWidth;
  el.classList.add(clase);
  setTimeout(() => el.classList.remove(clase), ms);
}

/** Un pop corto: algo se completó. */
function pop(el) { repetirClase(el, 'anim-pop', 420); }

/** Un salto: subiste de fase. */
function saltar(el) { repetirClase(el, 'anim-salto', 900); }

/** Un tironcito: registramos lo que cargaste. */
function tironcito(el) { repetirClase(el, 'anim-tiron', 500); }

/** Una sacudida: algo no se pudo. */
function sacudir(el) { repetirClase(el, 'anim-error', 450); }

/*
 * Las partículas de un festejo.
 *
 * Se crean, vuelan y se borran solas. Lo importante es lo último: sin la
 * limpieza, cada vaso de agua deja doce nodos en el DOM para siempre y después
 * de un mes de uso la pantalla arrastra miles.
 */
const COLORES_FESTEJO = ['var(--acc)', 'var(--ok)', 'var(--warn)', 'var(--prot)'];

function particulas(el, { cuantas = 12, ms = 900 } = {}) {
  if (!el || quieto()) return;

  const caja = document.createElement('div');
  caja.className = 'particulas';
  caja.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < cuantas; i++) {
    const p = document.createElement('i');
    /* En abanico hacia arriba: hacia abajo se leen como algo que se cae. */
    const angulo = (-90 + (i / (cuantas - 1) - 0.5) * 150) * Math.PI / 180;
    const dist = 26 + (i % 4) * 9;
    p.style.setProperty('--dx', (Math.cos(angulo) * dist).toFixed(1) + 'px');
    p.style.setProperty('--dy', (Math.sin(angulo) * dist).toFixed(1) + 'px');
    p.style.setProperty('--giro', ((i % 5) * 72) + 'deg');
    p.style.animationDelay = (i % 3) * 40 + 'ms';
    p.style.background = COLORES_FESTEJO[i % COLORES_FESTEJO.length];
    caja.appendChild(p);
  }

  const antes = getComputedStyle(el).position;
  if (antes === 'static') el.style.position = 'relative';
  el.appendChild(caja);
  setTimeout(() => caja.remove(), ms + 200);
}

/*
 * Un valor que se dibuja creciendo: barras de macros, anillo, lo que sea.
 *
 * La gracia es que crece DESDE DONDE ESTABA. Animar siempre desde cero es
 * mentir sobre lo que cambió: si ya ibas por el 80 % y sumás dos por ciento, lo
 * que la barra tiene que contar son esos dos, no los ochenta y dos.
 */
function crecerBarra(el, pct) {
  if (!el) return;
  const v = Math.max(0, Math.min(100, Number(pct) || 0));
  if (quieto()) { el.style.transition = 'none'; el.style.width = v + '%'; return; }
  el.style.width = v + '%';
}
