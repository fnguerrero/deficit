/* ============================================================
   Todo lo que carga una comida: el modal, el análisis por foto,
   las sugerencias, repetir, recetas y el editor de alimentos.
   ============================================================ */

/* ---------------- imagen ---------------- */

function leerArchivo(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(new Error('No se pudo leer la imagen'));
    fr.readAsDataURL(file);
  });
}

function redimensionar(dataUrl, max, calidad) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const esc = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * esc);
      cv.height = Math.round(img.height * esc);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL('image/jpeg', calidad));
    };
    img.onerror = () => rej(new Error('Imagen inválida'));
    img.src = dataUrl;
  });
}

/* ---------------- análisis con Claude ---------------- */

let analisisEnCurso = null;   // AbortController del análisis activo

/**
 * Frena antes de gastar. Un aviso que no bloquea no evita la sorpresa a fin
 * de mes; esto sí, y deja andando todo lo que no cuesta plata.
 */
function topeAlcanzado() {
  const e = estadoGasto(state.historialAnalisis, { tope: state.cfg.topeGasto });
  if (!e.bloqueado) return false;

  toast('Llegaste al tope del mes', { texto: 'Ver', accion: () => irTab('ajustes') });
  return true;
}

/** Contexto que se le manda al modelo para que nombre mejor los alimentos. */
function contextoDelUsuario() {
  const calc = calcular();
  return {
    momento: nombreMomento(momentoDe(Date.now())),
    objetivo: calc ? objetivoEfectivo(calc.objetivo, dia().ejercicio) : null,
    consumido: totalesDia().kcal,
    frecuentes: (state.frecuentes || []).slice(0, 15).map(f => f.nombre)
  };
}

/** El cache vive en el state, así sobrevive a recargas y a cerrar la app. */
const cacheDeAnalisis = {
  huella: (imagen, modo) => huellaImagen(imagen) + ':' + modo,
  leer: (h) => leerDeCache(state.cacheAnalisis, h),
  guardar: (h, valor) => {
    state.cacheAnalisis = guardarEnCache(state.cacheAnalisis, h, valor);
    save();
  }
};

/** Llama a la API con la imagen actual. `opciones` permite corregir o leer etiquetas. */
let ultimasImagenes = [];

async function analizarFoto(b64jpeg, opciones = {}) {
  analisisEnCurso = new AbortController();
  try {
    return await analizarImagen({
      fetchFn: (...a) => fetch(...a),
      ...accesoApi(state.cfg),
      modelo: state.cfg.modelo || MODELO_DEFAULT,
      precision: state.cfg.precision || 'normal',
      imagen: b64jpeg,
      contexto: contextoDelUsuario(),
      cache: cacheDeAnalisis,
      onProgreso: mostrarAvance,
      señal: analisisEnCurso.signal,
      ...opciones
    });
  } finally {
    analisisEnCurso = null;
  }
}

/** Mientras el modelo escribe, se van mostrando los alimentos que ya nombró. */
function mostrarAvance(textoParcial) {
  const nombres = alimentosParciales(textoParcial);
  if (!nombres.length) return;
  detenerFrases();
  $('loadingTxt').textContent = nombres.join(' · ');
}

/* Las frases genéricas se cortan apenas hay avance real que mostrar. */
let frenarFrases = null;
function detenerFrases() {
  if (frenarFrases) { frenarFrases(); frenarFrases = null; }
}

function cancelarAnalisis() {
  if (analisisEnCurso) {
    analisisEnCurso.abort();
    analisisEnCurso = null;
  }
}

/* ---------------- modal ---------------- */

function abrirModal() {
  if ($('avisoModo')) $('avisoModo').hidden = true;
  abrirCapa('modal');
}

/** Hay algo cargado que se perdería al cerrar sin guardar. */
function hayDatosSinGuardar() {
  if (!pendiente || !pendiente.items) return false;
  if ($('analisisResult').hidden) return false;   // solo cuenta el editor abierto

  return pendiente.items.some(i => String(i.nombre || '').trim() || Number(i.calorias) > 0);
}

/** `forzar` salta la confirmación: lo usa el guardado, que ya persistió todo. */
function cerrarModal(forzar = false) {
  if (typeof detenerCamara === 'function') detenerCamara();
  if (!forzar && hayDatosSinGuardar()) {
    const nombre = pendiente.titulo?.trim() || 'esta comida';
    if (!confirm(`¿Descartar ${nombre}? Lo que cargaste no se guarda.`)) return;
  }

  cancelarAnalisis();
  $('modal').classList.remove('open');
  pendiente = null;
  // los dos, o repetir la misma foto no vuelve a disparar el onchange
  $('fileInput').value = '';
  $('camaraInput').value = '';
}

function mostrarEstado(cual) {
  $('analisisLoading').hidden = cual !== 'loading';
  $('analisisResult').hidden = cual !== 'result';
  $('analisisRepetir').hidden = cual !== 'repetir';
  $('analisisSugerencias').hidden = cual !== 'sugerencias';
  $('panelEscaner').hidden = cual !== 'escaner';
  $('panelProducto').hidden = cual !== 'producto';
  $('btnGuardarProducto').hidden = cual !== 'producto';
  $('analisisError').hidden = cual !== 'error';
  $('btnGuardarComida').disabled = cual !== 'result';
  $('btnGuardarComida').hidden = ['repetir', 'sugerencias', 'escaner', 'producto'].includes(cual);
}

$('modalClose').onclick = () => cerrarModal();
$('btnCancelar').onclick = () => cerrarModal();
$('modal').onclick = e => { if (e.target.id === 'modal') cerrarModal(); };
$('btnCancelarAnalisis').onclick = () => cerrarModal();

$('btnCorregir').onclick = () => {
  const txt = $('inputCorreccion').value;
  if (!txt.trim()) { toast('Escribí qué estuvo mal'); return; }
  $('inputCorreccion').value = '';
  reanalizarConCorreccion(txt);
};
$('inputCorreccion').onkeydown = (e) => { if (e.key === 'Enter') $('btnCorregir').click(); };

/* ---------------- flujo foto ---------------- */

let ultimaImagen = null;   // base64 del último análisis, para poder corregirlo
let ultimaComidaId = null; // la última guardada, para poder abrirla desde el aviso
let modoAnalisis = 'plato';

function pedirFoto(modo) {
  if (topeAlcanzado()) return;
  if (!hayAcceso(state.cfg)) {
    state.cfg.avisoKeyOculto = false;   // si la busca, la tarjeta vuelve a aparecer
    save(); renderSinKey();
    toast(SIN_ACCESO, { texto: 'Cargarla', accion: () => irTab('ajustes') });
    return;
  }
  modoAnalisis = modo;

  // En la compu no hay "sacar una foto": el explorador es la única opción real.
  if (!esTactil()) { $('fileInput').click(); return; }

  /* Directo a la cámara. Sacar la foto del plato que tenés adelante es lo que se
     hace casi siempre; elegir de la galería es la excepción y vive en la
     flechita, no en un menú que aparece cada vez. */
  $('camaraInput').click();
}

/** La flechita: acá sí se pregunta, porque justamente se pidió elegir. */
function elegirOrigenFoto(modo = 'plato') {
  if (topeAlcanzado()) return;
  if (!hayAcceso(state.cfg)) {
    toast(SIN_ACCESO, { texto: 'Cargarla', accion: () => irTab('ajustes') });
    return;
  }

  modoAnalisis = modo;
  $('tituloOrigenFoto').textContent = modo === 'etiqueta' ? 'Leer etiqueta' : 'Analizar foto';
  abrirCapa('modalOrigenFoto');
  tomarFoco($('modalOrigenFoto'));
}

/** Pantalla táctil = celular o tablet, que es donde tiene sentido abrir la cámara. */
function esTactil() {
  return typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
}

function cerrarOrigenFoto() { $('modalOrigenFoto').classList.remove('open'); devolverFoco(); }

$('btnCerrarOrigenFoto').onclick = cerrarOrigenFoto;
$('modalOrigenFoto').onclick = (e) => { if (e.target.id === 'modalOrigenFoto') cerrarOrigenFoto(); };

$('btnDesdeCamara').onclick = () => { cerrarOrigenFoto(); $('camaraInput').click(); };
$('btnDesdeGaleria').onclick = () => { cerrarOrigenFoto(); $('fileInput').click(); };

$('btnFoto').onclick = () => pedirFoto('plato');
$('btnOrigenFoto').onclick = (e) => { e.stopPropagation(); elegirOrigenFoto('plato'); };
$('btnEtiqueta').onclick = () => pedirFoto('etiqueta');

const FRASES = {
  plato: [
    'Analizando…',
    'Identificando los alimentos…',
    'Estimando las porciones…',
    'Calculando calorías y macros…'
  ],
  etiqueta: [
    'Leyendo la etiqueta…',
    'Buscando la tabla nutricional…',
    'Pasando los valores a una porción…'
  ]
};

/** Rota las frases de espera y devuelve la función para frenarlas. */
function animarEspera(modo) {
  const frases = FRASES[modo] || FRASES.plato;
  let i = 0;
  $('loadingTxt').textContent = frases[0];
  const t = setInterval(() => { i = (i + 1) % frases.length; $('loadingTxt').textContent = frases[i]; }, 2600);
  const frenar = () => clearInterval(t);
  frenarFrases = frenar;
  return frenar;
}

/*
 * Lo que se le manda al modelo, guardado aparte.
 *
 * Existe para poder REINTENTAR sin volver a sacar la foto. Cuando el analisis
 * falla —se corto el wifi, el proxy devolvio 500— lo que se perdia no era el
 * intento sino la foto: habia que cerrar, volver a abrir la camara y sacarla de
 * nuevo, con el plato ya a medio comer. Las imagenes ya estan procesadas y en
 * memoria; no hay ninguna razon para pedirlas otra vez.
 */
let ultimoIntento = null;

async function correrAnalisis(intento) {
  ultimoIntento = intento;
  const { imagenes, modo, foto, thumb, preview, varias } = intento;

  $('modalTitle').textContent = modo === 'etiqueta' ? 'Leyendo etiqueta'
    : (varias ? `Analizando ${imagenes.length} fotos` : 'Analizando foto');
  $('btnReintentar').hidden = true;
  mostrarEstado('loading');
  abrirModal();
  const frenar = animarEspera(modo);

  try {
    $('preview').src = preview;
    ultimaImagen = imagenes[0];
    ultimasImagenes = imagenes;

    const r = await analizarFoto(null, { modo, imagenes });
    frenar();
    registrarUso(r, modo === 'etiqueta' ? 'etiqueta' : 'foto');
    if (r.deCache) toast('Esta foto ya la habías analizado: no gastaste API');
    pendiente = { ...r, thumb, foto, momento: momentoDe(Date.now()), kcalIA: sumarItems(r.items).calorias };

    /*
     * Guardado directo. Confirmar cada foto era el peaje que hacia abandonar:
     * sacas la foto, esperas, y encima tenes que revisar y apretar Guardar.
     *
     * La excepcion es la confianza baja: ahi el propio modelo esta avisando que
     * no vio bien, y meter ese numero a ciegas seria ensuciar el historial sin
     * que la persona se entere. Eso si se revisa.
     */
    /*
     * Un número imposible tampoco entra solo.
     *
     * Antes cualquier cosa que devolviera el modelo se guardaba en silencio: un
     * plato de 12.000 kcal arruinaba el día, el promedio de la semana y de paso
     * el TDEE adaptativo, que aprende de esos números. No se rechaza nada —la
     * app no sabe más que el modelo sobre lo que comiste— pero se muestra antes
     * de que ensucie el historial.
     */
    /*
     * Se guarda SIEMPRE, incluso cuando el número es raro.
     *
     * Antes, la confianza baja o un total imposible abrían la pantalla de
     * revisión y frenaban todo hasta que alguien apretara Guardar. La idea era
     * no ensuciar el historial, pero el precio es peor que la enfermedad: la
     * comida queda sin cargar si en ese momento no se puede atender el
     * teléfono, y una comida que no se registró vale menos que una registrada
     * mal, porque la mal cargada por lo menos se puede corregir.
     *
     * El aviso no se pierde: se guarda y se dice qué está raro, con el botón
     * para ir a arreglarlo al lado.
     */
    const raros = revisarAnalisis(r);
    const dudoso = raros[0] || (r.confianza === 'baja' ? 'No se vio del todo bien: revisá si está OK' : '');

    guardarComidaPendiente({ avisar: true, dudoso });
  } catch (err) {
    frenar();
    if (err.name === 'AbortError') return;   // lo canceló la persona: el modal ya se cerró

    /*
     * Sin señal la foto NO se pierde: se guarda y se analiza cuando vuelva.
     *
     * Una foto de un plato tiene una ventana de treinta segundos; después el
     * plato está a medio comer o ya te levantaste. Contestar "no hay conexión"
     * en un subte o en un restaurante con wifi malo significa que ese almuerzo
     * no se registra nunca.
     */
    if (!navigator.onLine || /red|conexi|fetch|network/i.test(err.message || '')) {
      state.colaAnalisis = encolarAnalisis(state.colaAnalisis, intento);
      save();
      cerrarModal(true);
      toast(textoCola(state.colaAnalisis));
      pintarCola();
      return;
    }

    $('modalTitle').textContent = 'No salió';
    $('errorTxt').textContent = err.message;
    $('btnReintentar').hidden = false;
    mostrarEstado('error');
  }
}

/*
 * Vaciar la cola cuando vuelve la red.
 *
 * De a una y en orden: cuatro análisis en paralelo contra el proxy es la forma
 * más rápida de comerse un límite de tasa justo cuando la conexión recién
 * vuelve y encima está mala.
 */
let vaciando = false;

async function vaciarCola() {
  if (vaciando || !navigator.onLine || !(state.colaAnalisis || []).length) return;
  vaciando = true;

  try {
    while ((state.colaAnalisis || []).length && navigator.onLine) {
      const siguiente = state.colaAnalisis[state.colaAnalisis.length - 1];   // la más vieja
      /* Se saca ANTES de analizar: si el análisis falla de nuevo, el catch la
         vuelve a encolar. Dejarla puesta mientras corre es la receta para que
         una foto que siempre falla trabe la cola para siempre. */
      state.colaAnalisis = sacarDeCola(state.colaAnalisis, siguiente.id);
      save();
      await correrAnalisis(siguiente);
    }
  } finally {
    vaciando = false;
    pintarCola();
  }
}

/** El aviso de que hay fotos esperando. */
function pintarCola() {
  const el = $('avisoCola');
  if (!el) return;
  const txt = textoCola(state.colaAnalisis);
  el.hidden = !txt;
  el.textContent = txt;
}

addEventListener('online', vaciarCola);

/* Los dos inputs hacen exactamente lo mismo con lo que devuelven: uno trae la
   foto de la cámara y el otro de la galería, pero de ahí en adelante es igual. */
const recibirFotos = async (e) => {
  const archivos = [...(e.target.files || [])].slice(0, 4);   // 4 fotos ya es de sobra
  if (!archivos.length) return;

  const modo = modoAnalisis;

  const procesadas = [];
  for (const file of archivos) {
    const pesa = avisoPorPeso(file.size);
    if (pesa) { toast(pesa); return; }

    const original = await leerArchivo(file);
    procesadas.push({
      /* 768 px alcanza para ver un plato: la porción se estima por el tamaño
         relativo a los cubiertos, no por el detalle fino. Bajar de 1024 a 768
         recorta casi la mitad de los tokens de entrada de cada análisis. */
      grande: await redimensionar(original, 768, 0.78),
      foto: await redimensionar(original, 384, 0.62),   // para el visor
      thumb: await redimensionar(original, 128, 0.55)   // para la lista
    });
  }

  await correrAnalisis({
    imagenes: procesadas.map(p => p.grande.split(',')[1]),
    modo,
    varias: archivos.length > 1,
    foto: procesadas[0].foto,
    thumb: procesadas[0].thumb,
    preview: procesadas[0].grande
  });
};

$('btnReintentar').onclick = () => {
  if (ultimoIntento) correrAnalisis(ultimoIntento);
};

$('fileInput').onchange = recibirFotos;
$('camaraInput').onchange = recibirFotos;

