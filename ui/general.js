/* El reproductor de sonidos, uno solo para toda la app. Arranca apagado: hasta
   que Nico lo prenda en Ajustes, `activo()` devuelve false y ni siquiera se
   crea el AudioContext. */
const sonidos = crearSonidos({
  activo: () => !!state.cfg.sonido,
  reducido: prefiereQuieto
});

/* ============================================================
   Transversales: navegación entre pestañas, toast, atajos de teclado,
   cambio de día, onboarding y service worker.
   ============================================================ */

/* ---------------- atajos de teclado ---------------- */

/* Solo tienen sentido en la compu; en el celular no molestan a nadie. */
const ATAJOS = {
  f: { desc: 'Analizar una foto', accion: () => $('btnFoto').click() },
  m: { desc: 'Carga manual', accion: () => $('btnManual').click() },
  e: { desc: 'Leer una etiqueta', accion: () => $('btnEtiqueta').click() },
  r: { desc: 'Repetir una comida', accion: () => $('btnRepetir').click() },
  q: { desc: 'Sumar calorías sueltas', accion: () => { irTab('hoy'); $('quickKcal').focus(); } },
  '/': { desc: 'Buscar', accion: () => { irTab('historial'); $('inputBuscar').focus(); } },
  1: { desc: 'Ir a Hoy', accion: () => irTab('hoy') },
  2: { desc: 'Ir a Historial', accion: () => irTab('historial') },
  3: { desc: 'Ir a Perfil', accion: () => irTab('perfil') },
  4: { desc: 'Ir a Ajustes', accion: () => irTab('ajustes') },
  ArrowLeft: { desc: 'Día anterior', accion: () => $('prevDay').click() },
  ArrowRight: { desc: 'Día siguiente', accion: () => { if (!$('nextDay').disabled) $('nextDay').click(); } }
};

/** Si estás escribiendo, la tecla es texto y no un atajo. */
function escribiendo() {
  const el = document.activeElement;
  if (!el) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}

function hayModalAbierto() {
  return $('modal').classList.contains('open') ||
    /* El de objetivos faltaba, y era el que mas se usa: cargar el peso, tocar
       un vaso, marcar el sueno. Sin el, la app se consideraba ociosa con el
       modal en pantalla y aplicaba la actualizacion pendiente; la recarga
       cerraba el modal justo despues de guardar y parecia que el boton
       "Guardar" era el que cerraba la ventana. */
    $('modalObjetivo').classList.contains('open') ||
    $('modalOrigenFoto').classList.contains('open') ||
    $('modalResumen').classList.contains('open') ||
    !$('visorFoto').hidden ||
    !$('onboarding').hidden;
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  // Escape cierra lo que esté abierto, incluso desde un campo de texto
  if (e.key === 'Escape') {
    if (!$('visorFoto').hidden) { cerrarVisor(); e.preventDefault(); return; }
    if ($('modalResumen').classList.contains('open')) { cerrarResumen(); e.preventDefault(); return; }
    if ($('modalOrigenFoto').classList.contains('open')) { cerrarOrigenFoto(); e.preventDefault(); return; }
    if ($('modal').classList.contains('open')) { cerrarModal(); e.preventDefault(); return; }
    if (escribiendo()) document.activeElement.blur();
    return;
  }

  if (escribiendo() || hayModalAbierto()) return;

  const atajo = ATAJOS[e.key];
  if (!atajo) return;

  e.preventDefault();
  atajo.accion();
});

/* ---------------- el botón atrás del celular ---------------- */

/*
 * Atrás cierra lo que esté abierto, no la app.
 *
 * En una PWA instalada el botón atrás de Android sale directo, sin preguntar.
 * Con un modal en pantalla eso es peor que perder la navegación: se sale de la
 * app en el gesto que uno usa justamente para volver, y lo que estabas
 * cargando se pierde.
 *
 * La técnica es empujar una entrada al historial cuando hay algo abierto y
 * consumirla en `popstate`. Se usa UNA sola entrada por vez y se repone
 * después de cerrar: así una pila de capas se va destapando de a una, sin
 * tener que llevar la cuenta de cuántas entradas se metieron.
 *
 * Si no hay nada abierto no se empuja nada, y ahí atrás sale como siempre: un
 * "atrás" que no hace nada es peor que salir.
 */
let anclaAtras = false;
let volviendoSolo = false;
let procesandoAtras = false;

function tabActiva() {
  const el = document.querySelector('.tab.active');
  return el ? el.id.replace('tab-', '') : 'hoy';
}

function hayAlgoQueCerrar() {
  return hayModalAbierto() || tabActiva() !== 'hoy';
}

/** Cierra la capa de más arriba. Devuelve false si no había nada. */
function cerrarLoDeArriba() {
  /* En orden de "qué está más arriba": el visor tapa al resumen, el resumen al
     modal de análisis, y las pestañas están abajo de todo. */
  if (!$('visorFoto').hidden) { cerrarVisor(); return true; }
  if ($('modalResumen').classList.contains('open')) { cerrarResumen(); return true; }
  if ($('modalOrigenFoto').classList.contains('open')) { cerrarOrigenFoto(); return true; }
  if ($('modalObjetivo').classList.contains('open')) { cerrarObjetivo(); return true; }

  /* Sin forzar: si hay una comida a medio cargar, pregunta antes de tirarla.
     Perder eso por un gesto de navegación sería exactamente lo que este
     arreglo viene a evitar. */
  if ($('modal').classList.contains('open')) { cerrarModal(); return true; }

  // el onboarding se termina, no se esquiva
  if (!$('onboarding').hidden) return false;

  if (tabActiva() !== 'hoy') { irTab('hoy'); return true; }
  return false;
}

/** Pone o saca la entrada del historial según si hay algo abierto. */
function marcarAtras() {
  if (procesandoAtras) return;

  const hay = hayAlgoQueCerrar();
  if (hay && !anclaAtras) {
    history.pushState({ deficit: 1 }, '');
    anclaAtras = true;
  } else if (!hay && anclaAtras) {
    /* Se cerró a mano, con la ✕ o con Escape: la entrada que habíamos metido
       sobra, y hay que sacarla o el próximo atrás no haría nada. */
    volviendoSolo = true;
    anclaAtras = false;
    history.back();
  }
}

addEventListener('popstate', () => {
  if (volviendoSolo) { volviendoSolo = false; return; }

  anclaAtras = false;
  procesandoAtras = true;
  const cerro = cerrarLoDeArriba();
  procesandoAtras = false;

  // si quedó otra capa abajo, se repone la entrada para el próximo atrás
  if (cerro) marcarAtras();
});

/* ---------------- cambio de día ---------------- */

let timerMedianoche = null;

/**
 * Con la app abierta toda la noche, a las 00:00 la vista tiene que pasar al
 * día nuevo. Si estabas mirando un día pasado, no se toca: estabas ahí a propósito.
 */
function programarCambioDeDia() {
  clearTimeout(timerMedianoche);

  timerMedianoche = setTimeout(() => {
    cruzarMedianoche();
    programarCambioDeDia();
  }, msHastaMedianoche());
}

function cruzarMedianoche() {
  const hoy = hoyISO();
  const estabaEnHoy = fecha < hoy && diasEntre(fecha, hoy) === 1;

  if (estabaEnHoy) {
    fecha = hoy;
    renderAll();
    toast('Arrancó un día nuevo');
  } else {
    // aunque no cambie la vista, los cálculos de "hoy" quedaron viejos
    renderAll();
  }

  programarRecordatorios();
}

/*
 * Dos pestañas abiertas sobre el mismo `localStorage` se pisaban: la que
 * guardaba último ganaba, y la otra seguía mostrando —y guardando— un estado
 * viejo. Cargar una comida en el celular y otra en la compu perdía una de las
 * dos sin avisar.
 *
 * `storage` solo dispara en las OTRAS pestañas, nunca en la que escribió, así
 * que no hay riesgo de bucle.
 */
addEventListener('storage', (e) => {
  if (e.key !== KEY || !e.newValue) return;

  try {
    const otro = migrar(JSON.parse(e.newValue));

    /* El aviso solo si cambió algo que se ve. La otra pestaña también escribe
       al sincronizar —hora del último sync, resumen, errores— y avisar por eso
       llenaba la pantalla de toasts que no correspondían a nada que la persona
       hubiera hecho. */
    const cambioVisible = JSON.stringify(otro.dias || {}) !== JSON.stringify(state.dias || {});

    Object.assign(state, otro);
    renderAll();
    if (cambioVisible) toast('Se actualizó con lo que cargaste en otra pestaña');
  } catch {
    /* Un JSON roto en la otra pestaña no puede tirar abajo esta. */
  }
});

/* la pestaña dormida no ejecuta timers: al volver se revisa la fecha */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (fecha !== hoyISO() && diasEntre(fecha, hoyISO()) === 1) cruzarMedianoche();
  programarCambioDeDia();
});

/* ---------------- navegación ---------------- */

const NOMBRE_TAB = {
  hoy: 'Hoy', historial: 'Historial', progreso: 'Progreso',
  perfil: 'Perfil', ajustes: 'Ajustes'
};

function irTab(name) {
  document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + name));
  /* La que entra se anuncia con un movimiento corto. Sin esto el cambio de
     pestana es un corte seco y cuesta ver que cambio todo el contenido. */
  repetirClase($('tab-' + name), 'tab-entrando', 260);
  document.querySelectorAll('.tab-btn').forEach(b => {
    const activo = b.dataset.tab === name;
    b.classList.toggle('active', activo);
    b.setAttribute('aria-selected', String(activo));
  });
  anunciar(NOMBRE_TAB[name] || name);

  /* Progreso siempre se recalcula: sus graficos dependen del periodo elegido y
     de todo el historial, asi que no hay nada barato que cachear. El resto solo
     si quedo vencido desde la ultima vez. */
  if (name === 'progreso') { renderProgreso(); renderLogros(); vencidas.delete('progreso'); }
  else if (!refrescarSiHaceFalta(name)) {
    if (name === 'historial') renderHistorial();
    if (name === 'hoy') renderHoy();
  }
  if (name === 'ajustes') renderAjustes();
  window.scrollTo(0, 0);
  marcarAtras();
}

document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => irTab(b.dataset.tab));
$('volverHoy').onclick = () => { fecha = hoyISO(); renderHoy(); };
$('prevDay').onclick = () => { fecha = sumarDias(fecha, -1); renderHoy(); };
$('nextDay').onclick = () => { if (fecha < hoyISO()) { fecha = sumarDias(fecha, 1); renderHoy(); } };

/* ---------------- toast ---------------- */

let toastT;

/** toast('guardado') o toast('borrado', { texto: 'Deshacer', accion: fn }) */
function toast(msg, opcion) {
  const el = $('toast');
  el.innerHTML = '';
  el.appendChild(document.createTextNode(msg));

  if (opcion) {
    const b = document.createElement('button');
    b.textContent = opcion.texto;
    b.onclick = () => {
      clearTimeout(toastT);
      el.classList.remove('show');
      opcion.accion();
    };
    el.appendChild(b);
  }

  /* Se saca y se vuelve a poner para que el rebote se repita: un toast que
     aparece mientras hay otro en pantalla no re-dispara su animacion. */
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), opcion ? 6000 : 2200);
}

/* ---------------- onboarding ---------------- */

let pasoOnb = 1;
const TOTAL_PASOS = 3;

function mostrarOnboarding() {
  // solo la primera vez: si ya cargó datos o lo cerró alguna vez, no molesta
  const sinDatos = !state.perfil.edad && !state.perfil.altura && !state.perfil.peso;
  if (state.cfg.onboardingHecho || !sinDatos) return;

  pasoOnb = 1;
  pintarPasoOnb();
  $('onboarding').hidden = false;
}

function pintarPasoOnb() {
  document.querySelectorAll('.onb-paso').forEach(s => {
    s.hidden = Number(s.dataset.paso) !== pasoOnb;
  });

  const puntos = $('onbPuntos');
  puntos.innerHTML = '';
  for (let i = 1; i <= TOTAL_PASOS; i++) {
    const p = document.createElement('i');
    if (i <= pasoOnb) p.className = 'activo';
    puntos.appendChild(p);
  }

  $('onbSiguiente').textContent = pasoOnb === 1 ? 'Empezar' : (pasoOnb === TOTAL_PASOS ? 'Listo' : 'Seguir');
  $('onbError').textContent = '';

  if (pasoOnb === TOTAL_PASOS) pintarPasoClave();
}

/**
 * El último paso pedía la clave de Claude. Con el proxy andando eso ya no hace
 * falta y pedirla sería mentir sobre lo que la app necesita: el paso pasa a
 * contar cómo se usa. Sin proxy vuelve a pedirla, que ahí sí es imprescindible.
 */
function pintarPasoClave() {
  const conProxy = hayAcceso({});   // sin clave propia: ¿alcanza con lo que trae la app?

  $('onbCampoKey').hidden = conProxy;
  $('onbIcono3').textContent = conProxy ? '📷' : '🔑';
  $('onbTitulo3').textContent = conProxy ? 'Ya está todo listo' : 'Para leer las fotos';

  $('onbTexto3').textContent = conProxy
    ? 'Sacale una foto a lo que vas a comer y la app estima las calorías y los macros. ' +
      'Podés corregir cualquier porción antes de guardar.'
    : 'El análisis por foto usa la API de Claude. Pegá tu key de console.anthropic.com y queda guardada solo acá.';

  $('onbHint3').textContent = conProxy
    ? 'También podés cargar comidas a mano o escanear un código de barras, que no gastan nada.'
    : 'Podés dejarlo para después: el registro manual funciona igual.';
}

function cerrarOnboarding() {
  state.cfg.onboardingHecho = true;
  save();
  $('onboarding').hidden = true;
  renderAll();
}

$('onbSaltear').onclick = cerrarOnboarding;

$('onbSiguiente').onclick = () => {
  if (pasoOnb === 2) {
    const num = (id) => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
    const propuesto = {
      sexo: $('onbSexo').value,
      edad: num('onbEdad'),
      altura: num('onbAltura'),
      peso: num('onbPeso'),
      pesoObj: num('onbPesoObj'),
      actividad: parseFloat($('onbActividad').value),
      ritmo: 0.5,
      manual: null
    };

    const { ok, errores } = validarPerfil(propuesto);
    if (!ok) {
      $('onbError').textContent = Object.values(errores)[0];
      return;
    }

    /* Se fusiona, como en Perfil: el formulario del onboarding no trae el modo
       ni el plazo, y asignar el objeto entero los borraba a quien lo volviera
       a correr desde Ajustes. */
    state.perfil = { ...state.perfil, ...propuesto };
    if (propuesto.peso) dia(hoyISO()).peso = propuesto.peso;
    save();
  }

  if (pasoOnb === TOTAL_PASOS) {
    const key = $('onbCampoKey').hidden ? '' : $('onbKey').value.trim();
    if (key) state.cfg.apiKey = key;
    cerrarOnboarding();
    toast('Listo, ya podés cargar tu primera comida');
    return;
  }

  pasoOnb++;
  pintarPasoOnb();
};

/* ---------------- PWA ---------------- */

let swEsperando = null;

/** Muestra el banner cuando hay una versión nueva lista para tomar el control. */
function avisarActualizacion(worker) {
  swEsperando = worker;

  // Con la app ociosa se toma sola; el banner es para cuando hay algo en juego.
  if (sePuedeActualizarSolo({
    modalAbierto: hayModalAbierto(),
    analizando: !!analisisEnCurso,
    editando: escribiendo()
  })) {
    worker.postMessage('actualizar');
    return;
  }

  $('bannerUpdate').hidden = false;
}

$('btnActualizar').onclick = () => {
  $('bannerUpdate').hidden = true;
  if (swEsperando) swEsperando.postMessage('actualizar');
  else location.reload();
};

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  /* El registro se guarda acá afuera a propósito: el listener de
     `visibilitychange` de más abajo lo necesita, y antes lo tomaba de la
     variable del `.then`, que no existe en ese alcance. El resultado era un
     ReferenceError cada vez que se volvía a la app — o sea que el chequeo de
     versión nueva no corría NUNCA, y quien deja la app abierta días en el
     celular se quedaba en una versión vieja sin enterarse. */
  let registro = null;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      registro = reg;
      // ya había una esperando de una visita anterior
      if (reg.waiting && navigator.serviceWorker.controller) avisarActualizacion(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          // "installed" con un controller activo = actualización, no primera instalación
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisarActualizacion(nuevo);
        });
      });
    }).catch(() => { /* sin offline, no es crítico */ });

    // Al volver a la app conviene mirar si hay algo nuevo: quien la deja abierta
    // días en el celular no dispara nunca el load, y se queda en una versión vieja.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && registro) registro.update().catch(() => {});
    });

    // cuando el worker nuevo toma el control, recargamos una sola vez
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recargando) return;
      recargando = true;
      location.reload();
    });
  });
}

// Chrome avisa cuándo se puede instalar; guardamos el evento para el botón de Ajustes
let promptInstalar = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptInstalar = e;
  $('cardInstalar').hidden = false;
});

$('btnInstalar').onclick = async () => {
  if (!promptInstalar) return;
  promptInstalar.prompt();
  const { outcome } = await promptInstalar.userChoice;
  promptInstalar = null;
  $('cardInstalar').hidden = true;
  if (outcome === 'accepted') toast('Instalada');
};

window.addEventListener('appinstalled', () => {
  $('cardInstalar').hidden = true;
  toast('Listo, ya la tenés instalada');
});

/* ---------------- foco dentro de los modales ---------------- */

/*
 * Sin esto, con un modal abierto el Tab sigue recorriendo la página de atrás:
 * quien navega por teclado termina escribiendo en campos que no ve. Se guarda
 * de dónde venía el foco para devolverlo al cerrar, que es lo que espera
 * cualquiera que no esté mirando la pantalla.
 */
let focoPrevio = null;

function enfocables(cont) {
  return [...cont.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter(el => !el.disabled && el.getBoundingClientRect().height > 0);
}

/** El contenedor de modal visible en este momento, si hay alguno. */
function modalActivo() {
  if (!$('visorFoto').hidden) return $('visorFoto');
  if ($('modalResumen').classList.contains('open')) return $('modalResumen');
  if ($('modalOrigenFoto').classList.contains('open')) return $('modalOrigenFoto');
  if ($('modal').classList.contains('open')) return $('modal');
  if (!$('onboarding').hidden) return $('onboarding');
  return null;
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Tab') return;

  const cont = modalActivo();
  if (!cont) return;

  const lista = enfocables(cont);
  if (!lista.length) return;

  const primero = lista[0];
  const ultimo = lista[lista.length - 1];
  const dentro = cont.contains(document.activeElement);

  // el foco arranca afuera, o llegó al borde: se lo trae de vuelta al otro extremo
  if (!dentro) { (e.shiftKey ? ultimo : primero).focus(); e.preventDefault(); return; }
  if (!e.shiftKey && document.activeElement === ultimo) { primero.focus(); e.preventDefault(); }
  else if (e.shiftKey && document.activeElement === primero) { ultimo.focus(); e.preventDefault(); }
}, true);

/**
 * Abrir una capa modal.
 *
 * Un solo lugar en vez de `classList.add('open')` desperdigado: eso permitia
 * abrir la misma capa dos veces —el segundo `tomarFoco` pisaba `focoPrevio` con
 * un elemento del propio modal, y al cerrar el foco se quedaba en la nada— y
 * dejaba capas encimadas cuando dos flujos abrian a la vez.
 */
function abrirCapa(id) {
  const capa = $(id);
  if (!capa || capa.classList.contains('open')) return false;

  /* Cerrar cualquier otra capa abierta: dos modales encimados no se leen y el
     Escape solo cierra uno. */
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));

  capa.classList.add('open');
  tomarFoco(capa);
  anunciar(capa.querySelector('h2')?.textContent || '');
  marcarAtras();
  return true;
}

/**
 * Lo que se le dice a un lector de pantalla cuando algo cambia sin que se mueva
 * el foco. Sin esto, cambiar de pestaña o abrir un modal es silencio total.
 */
function anunciar(texto) {
  const el = $('anuncios');
  if (!el || !texto) return;
  /* Se limpia primero: repetir el mismo texto no dispara el aria-live. */
  el.textContent = '';
  setTimeout(() => { el.textContent = texto; }, 30);
}

/** Al abrir un modal: recordar de dónde venía el foco y llevarlo adentro. */
function tomarFoco(cont) {
  focoPrevio = document.activeElement;
  const lista = enfocables(cont);
  if (lista.length) lista[0].focus();
}

/** Al cerrarlo: devolverlo a donde estaba. */
function devolverFoco() {
  if (focoPrevio && document.body.contains(focoPrevio)) focoPrevio.focus();
  focoPrevio = null;
}


/* ---------------- deshacer global ---------------- */

/*
 * La pila vive en memoria y no en el estado: deshacer es para el error que
 * acabás de cometer, no para el de anteayer. Guardarla en el localStorage la
 * llenaría de copias de días viejos que nadie va a deshacer nunca.
 */
let pilaDeshacer = [];

/** Se llama ANTES de tocar el día: guarda cómo estaba. */
function recordarCambio(que, f = fecha) {
  pilaDeshacer = apilarCambio(pilaDeshacer, f, dia(f), que);
  pintarDeshacer();
}

function deshacerUltimo() {
  const { pila, cambio } = desapilarCambio(pilaDeshacer);
  if (!cambio) { toast('No hay nada para deshacer'); return; }

  pilaDeshacer = pila;
  state.dias[cambio.fecha] = cambio.dia;
  save();
  renderAll();
  pintarDeshacer();
  toast('Deshice ' + cambio.que);
}

function pintarDeshacer() {
  const b = $('btnDeshacer');
  if (!b) return;
  b.hidden = !pilaDeshacer.length;
  b.textContent = pilaDeshacer.length ? 'Deshacer ' + pilaDeshacer[0].que : 'Deshacer';
}

/* Ctrl+Z en escritorio, salvo mientras se escribe: ahí el deshacer del sistema
   sobre el texto es el que corresponde. */
addEventListener('keydown', (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.key !== 'z' || escribiendo()) return;
  e.preventDefault();
  deshacerUltimo();
});

/*
 * El alto real de la barra de pestañas, en una variable de CSS.
 *
 * El botón de Foto se apoya justo encima de ella, y la barra no mide siempre
 * lo mismo: el `safe-area-inset` de los celulares con gesto de navegación le
 * suma unos píxeles que ningún número fijo acierta.
 */
function medirTabbar() {
  const nav = document.querySelector('.tabbar');
  if (!nav) return;
  const h = Math.round(nav.getBoundingClientRect().height);
  if (h > 0) document.documentElement.style.setProperty('--tabbar-h', h + 'px');
}

addEventListener('resize', medirTabbar);
addEventListener('DOMContentLoaded', medirTabbar);
medirTabbar();
