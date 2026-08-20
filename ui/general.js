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
    !$('visorFoto').hidden ||
    !$('onboarding').hidden;
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  // Escape cierra lo que esté abierto, incluso desde un campo de texto
  if (e.key === 'Escape') {
    if (!$('visorFoto').hidden) { cerrarVisor(); e.preventDefault(); return; }
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
    const key = $('onbKey').value.trim();
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
