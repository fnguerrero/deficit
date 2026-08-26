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

/* la pestaña dormida no ejecuta timers: al volver se revisa la fecha */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (fecha !== hoyISO() && diasEntre(fecha, hoyISO()) === 1) cruzarMedianoche();
  programarCambioDeDia();
});

/* ---------------- navegación ---------------- */

function irTab(name) {
  document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + name));
  document.querySelectorAll('.tab-btn').forEach(b => {
    const activo = b.dataset.tab === name;
    b.classList.toggle('active', activo);
    b.setAttribute('aria-selected', String(activo));
  });
  if (name === 'historial') renderHistorial();
  if (name === 'hoy') renderHoy();
  if (name === 'progreso') { renderProgreso(); renderLogros(); }
  if (name === 'ajustes') renderAjustes();
  window.scrollTo(0, 0);
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

    state.perfil = propuesto;
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
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
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
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
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
