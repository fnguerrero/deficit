/* ============================================================
   Escanear un código de barras y cargar el producto.
   Para todo lo envasado esto reemplaza la foto: es gratis, no gasta
   API y los datos son los de la etiqueta, no una estimación.
   ============================================================ */

let escanerActivo = null;      // { stream, detector, timer }
let productoActual = null;

/** El cache de productos vive en el state, así sobrevive a recargas. */
const cacheDeProductos = {
  leer: (codigo) => leerProducto(state.productos, codigo),
  guardar: (producto) => {
    state.productos = guardarProducto(state.productos, producto);
    save();
  }
};

function hayDetectorDeCodigos() {
  return typeof BarcodeDetector !== 'undefined';
}

$('btnEscanear').onclick = async () => {
  // vive dentro del menú de la flechita: se cierra antes de abrir la cámara
  if (typeof cerrarOrigenFoto === 'function') cerrarOrigenFoto();
  productoActual = null;
  $('modalTitle').textContent = 'Escanear producto';
  mostrarEstado('escaner');
  abrirModal();

  $('codigoManual').value = '';
  await arrancarCamara();
};

/**
 * Prende la cámara y busca códigos. Si el navegador no trae el detector
 * (Firefox, iOS viejo), queda la carga a mano, que es la mitad del trabajo
 * pero funciona en todos lados.
 */
async function arrancarCamara() {
  const video = $('escanerVideo');

  if (!hayDetectorDeCodigos()) {
    video.hidden = true;
    $('escanerEstado').textContent = 'Este navegador no puede leer códigos con la cámara. Escribilo a mano acá abajo.';
    $('codigoManual').focus();
    return;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    video.hidden = true;
    $('escanerEstado').textContent = 'No hay cámara disponible. Escribí el código a mano.';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });

    video.hidden = false;
    video.srcObject = stream;
    await video.play();

    const detector = new BarcodeDetector({
      formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e']
    });

    $('escanerEstado').textContent = 'Apuntá al código de barras del envase.';

    const timer = setInterval(async () => {
      try {
        const codigos = await detector.detect(video);
        if (!codigos.length) return;

        const valor = limpiarCodigo(codigos[0].rawValue);
        if (!codigoValido(valor)) return;

        detenerCamara();
        await cargarProducto(valor);
      } catch { /* un frame que no se pudo leer no es un error */ }
    }, 400);

    escanerActivo = { stream, timer };
  } catch (err) {
    video.hidden = true;
    $('escanerEstado').textContent = err.name === 'NotAllowedError'
      ? 'No diste permiso para la cámara. Podés escribir el código a mano.'
      : 'No se pudo abrir la cámara. Escribí el código a mano.';
  }
}

function detenerCamara() {
  if (!escanerActivo) return;
  clearInterval(escanerActivo.timer);
  escanerActivo.stream.getTracks().forEach(t => t.stop());
  $('escanerVideo').srcObject = null;
  escanerActivo = null;
}

$('btnBuscarCodigo').onclick = () => cargarProducto($('codigoManual').value);
$('codigoManual').onkeydown = (e) => { if (e.key === 'Enter') cargarProducto($('codigoManual').value); };

/** Busca el código y muestra el producto con sus porciones. */
async function cargarProducto(codigo) {
  const limpio = limpiarCodigo(codigo);
  if (!codigoValido(limpio)) { toast('Ese código no parece válido'); return; }

  detenerCamara();
  $('modalTitle').textContent = 'Buscando el producto';
  mostrarEstado('loading');
  $('preview').src = '';
  $('loadingTxt').textContent = 'Buscando en Open Food Facts…';

  try {
    const producto = await buscarProducto(limpio, {
      fetchFn: (...a) => fetch(...a),
      cache: cacheDeProductos
    });

    productoActual = producto;
    mostrarProducto(producto);
  } catch (err) {
    $('modalTitle').textContent = 'No lo encontré';
    $('errorTxt').textContent = err.message +
      '\n\nPodés cargarlo con "Leer etiqueta de un envase", que lee la tabla con la cámara.';
    mostrarEstado('error');
  }
}

function mostrarProducto(producto) {
  $('modalTitle').textContent = 'Revisá la porción';

  $('productoNombre').textContent = producto.nombre;
  $('productoMarca').textContent = [producto.marca, producto.envase].filter(Boolean).join(' · ');

  const img = $('productoImagen');
  img.hidden = !producto.imagen;
  if (producto.imagen) img.src = producto.imagen;

  $('productoOrigen').textContent = producto.deCache
    ? 'Ya lo tenías guardado: no hizo falta buscarlo de nuevo.'
    : `${fmtNum(producto.por100.calorias)} kcal por 100 g · datos de Open Food Facts`;

  const opciones = porcionesDe(producto);
  const cont = $('productoPorciones');
  cont.innerHTML = '';

  for (const o of opciones) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = o.etiqueta;
    b.dataset.gramos = o.gramos;
    b.onclick = () => elegirPorcion(o.gramos);
    cont.appendChild(b);
  }

  elegirPorcion(opciones[0].gramos);
  mostrarEstado('producto');
}

function elegirPorcion(gramos) {
  if (!productoActual) return;

  $('productoGramos').value = gramos;
  [...$('productoPorciones').children].forEach(b => {
    b.className = Number(b.dataset.gramos) === gramos ? 'sel' : '';
  });

  const item = productoAItem(productoActual, gramos);
  $('productoTotal').textContent =
    `${fmtKcal(item.calorias)} · P ${fmtNum(item.proteinas)} C ${fmtNum(item.carbohidratos)} G ${fmtNum(item.grasas)}`;
}

$('productoGramos').oninput = () => {
  const g = Number($('productoGramos').value);
  if (g > 0 && g <= 5000) elegirPorcion(g);
};

/** Del producto al editor de comidas, para poder ajustar antes de guardar. */
function productoAEditor() {
  if (!productoActual) return;

  const gramos = Number($('productoGramos').value) || 100;
  const item = productoAItem(productoActual, gramos);

  pendiente = {
    titulo: productoActual.nombre,
    momento: fecha === hoyISO() ? momentoDe(Date.now()) : 'almuerzo',
    confianza: 'alta',
    notas: 'Datos de la etiqueta (Open Food Facts)',
    thumb: null,
    items: [item]
  };

  $('modalTitle').textContent = 'Revisá y guardá';
  mostrarResultado(pendiente);
  mostrarEstado('result');
}

$('btnGuardarProducto').onclick = productoAEditor;
