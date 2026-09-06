/* ============================================================
   Encuadrar la foto antes de analizarla.

   La aritmetica del marco esta en recorte.js, probada aparte. Aca queda lo que
   necesita pantalla: cargar la imagen, seguir el dedo y devolver el pedazo
   elegido como dataURL.
   ============================================================ */

/* La promesa que espera al usuario. Mientras vive, `recibirFotos` esta detenido
   en el await: resolverla es lo unico que lo deja seguir. */
let esperandoRecorte = null;

let marcoActual = null;
let mostradoRec = { ancho: 0, alto: 0 };
let arrastre = null;

/**
 * Muestra la foto y devuelve la que se va a analizar: la recortada, la entera,
 * o null si se cancelo.
 *
 * Cancelar no es lo mismo que "foto entera": una foto sacada de casualidad se
 * tira aca, antes de gastar el analisis, que es lo que cuesta plata.
 */
function pedirRecorte(dataUrl) {
  return new Promise((resolver) => {
    esperandoRecorte = { resolver, dataUrl };

    const img = $('recImg');

    /* Primero se muestra y despues se carga: midiendo la imagen adentro de un
       contenedor todavia oculto, clientWidth da cero y el marco nace de un
       pixel. */
    $('recMarco').hidden = true;
    $('recortador').hidden = false;

    img.onload = () => {
      mostradoRec = { ancho: img.clientWidth, alto: img.clientHeight };
      marcoActual = encuadreInicial(mostradoRec.ancho, mostradoRec.alto);
      pintarMarco();
      $('recMarco').hidden = false;
    };
    img.src = dataUrl;
    marcarAtras();
  });
}

function pintarMarco() {
  const m = $('recMarco');
  if (!marcoActual) return;
  m.style.left = marcoActual.x + 'px';
  m.style.top = marcoActual.y + 'px';
  m.style.width = marcoActual.w + 'px';
  m.style.height = marcoActual.h + 'px';

  /* "Foto entera" solo cuando hay algo que deshacer: un boton que no cambia
     nada es una pregunta al pedo. */
  $('recTodo').hidden = esRecorteEntero(marcoActual, mostradoRec.ancho, mostradoRec.alto);
}

function cerrarRecorte(resultado) {
  const pendiente = esperandoRecorte;
  esperandoRecorte = null;
  arrastre = null;

  $('recortador').hidden = true;
  $('recImg').src = '';
  marcarAtras();

  if (pendiente) pendiente.resolver(resultado);
}

/**
 * El pedazo elegido, en la resolucion original.
 *
 * Se corta ANTES de redimensionar: recortar despues seria recortar sobre una
 * imagen que ya perdio la mitad de los pixeles, y lo que queda del plato es
 * justamente lo que el analisis va a mirar de cerca.
 */
function recortarImagen(dataUrl, marco) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const r = marcoEnImagen(marco, mostradoRec, { ancho: img.naturalWidth, alto: img.naturalHeight });
      const cv = document.createElement('canvas');
      cv.width = r.w;
      cv.height = r.h;
      cv.getContext('2d').drawImage(img, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h);
      res(cv.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => rej(new Error('Imagen inválida'));
    img.src = dataUrl;
  });
}

/* ---------------- el dedo ---------------- */

function puntoDe(e) {
  return { x: e.clientX, y: e.clientY };
}

$('recLienzo').addEventListener('pointerdown', (e) => {
  if (!marcoActual) return;
  const esq = e.target.dataset?.esq;
  const dentro = e.target.closest('#recMarco');
  if (!esq && !dentro) return;

  arrastre = { esq: esq || null, desde: puntoDe(e) };
  e.target.setPointerCapture?.(e.pointerId);
  e.preventDefault();
});

$('recLienzo').addEventListener('pointermove', (e) => {
  if (!arrastre || !marcoActual) return;

  const p = puntoDe(e);
  const dx = p.x - arrastre.desde.x;
  const dy = p.y - arrastre.desde.y;
  arrastre.desde = p;

  marcoActual = arrastre.esq
    ? redimensionarMarco(marcoActual, arrastre.esq, dx, dy, mostradoRec.ancho, mostradoRec.alto)
    : moverMarco(marcoActual, dx, dy, mostradoRec.ancho, mostradoRec.alto);

  pintarMarco();
  e.preventDefault();
});

for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
  $('recLienzo').addEventListener(ev, () => { arrastre = null; });
}

/* ---------------- los botones ---------------- */

$('recOk').onclick = async () => {
  const pendiente = esperandoRecorte;
  if (!pendiente) return;

  if (!marcoActual || esRecorteEntero(marcoActual, mostradoRec.ancho, mostradoRec.alto)) {
    cerrarRecorte(pendiente.dataUrl);
    return;
  }

  try {
    const cortada = await recortarImagen(pendiente.dataUrl, marcoActual);
    cerrarRecorte(cortada);
  } catch (e) {
    /* Si el recorte falla, la foto sigue estando: mandarla entera es peor que
       el encuadre pedido y muchisimo mejor que perder la comida. */
    toast('No pude recortarla, la mando entera');
    cerrarRecorte(pendiente.dataUrl);
  }
};

$('recTodo').onclick = () => {
  if (!mostradoRec.ancho) return;
  marcoActual = encuadreInicial(mostradoRec.ancho, mostradoRec.alto);
  pintarMarco();
};

$('recCancelar').onclick = () => cerrarRecorte(null);
