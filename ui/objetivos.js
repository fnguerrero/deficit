/* ============================================================
   ui/objetivos.js — el tablero del día.

   La idea de fondo: cada cosa que cargás se marca y deja de pedirte atención.
   La pantalla se vacía a medida que avanza el día en vez de llenarse, que es lo
   contrario de lo que hacía antes con cuatro tarjetas siempre abiertas.
   ============================================================ */

const CARITAS = [
  { id: 'mal', emoji: '😞', texto: 'Mal' },
  { id: 'flojo', emoji: '😕', texto: 'Flojo' },
  { id: 'normal', emoji: '🙂', texto: 'Normal' },
  { id: 'bien', emoji: '😄', texto: 'Bien' },
  { id: 'genial', emoji: '💪', texto: 'Genial' }
];

/*
 * El ayuno NO está acá a propósito.
 *
 * Un objetivo es algo que la app te pide todos los días; el ayuno es algo que
 * hacés cuando querés. Mientras estuvo en la grilla, cada día que no ayunabas
 * te marcaba un casillero sin cumplir, que es reprocharte no hacer algo que
 * nunca prometiste. Ahora vive en un chip arriba, al lado del modo.
 */

/** Qué objetivos del día hay y cuáles están cumplidos. */
function objetivosDelDia() {
  const d = dia();
  const peso = state.perfil.peso || null;

  return [
    {
      id: 'peso',
      emoji: '⚖️',
      nombre: 'Peso',
      listo: typeof d.peso === 'number' && d.peso > 0,
      valor: d.peso ? fmtNum(d.peso) + ' kg' : ''
    },
    {
      id: 'agua',
      emoji: '💧',
      nombre: 'Agua',
      listo: (d.agua || 0) >= metaVasos(),
      valor: `${d.agua || 0}/${metaVasos()}`
    },
    {
      id: 'ejercicio',
      emoji: '🏃',
      nombre: 'Ejercicio',
      listo: (d.ejercicio || 0) > 0,
      valor: d.ejercicio ? fmtNum(d.ejercicio) + ' kcal' : ''
    },
    {
      id: 'sueno',
      emoji: '😴',
      nombre: 'Sueño',
      listo: !!(d.sueno && d.sueno.horas),
      valor: d.sueno?.horas ? d.sueno.horas + ' h' : ''
    },
    {
      id: 'animo',
      emoji: '🙂',
      nombre: 'Ánimo',
      listo: !!d.animo,
      valor: d.animo ? (CARITAS.find(c => c.id === d.animo)?.emoji || '') : ''
    }
  ];
}

/*
 * La fase, que sube con los días perfectos seguidos.
 *
 * Se muestra al lado del título porque es lo que más rápido cambia y lo que más
 * ganas dan de mirar: el nivel sube en semanas, la fase en días.
 */
function pintarFase(fase, perfectos) {
  const chip = $('mascotaFase');
  if (!chip) return;

  chip.hidden = !fase.n;
  if (!fase.n) return;

  chip.textContent = `${fase.nombre} · ${perfectos}`;
  chip.style.color = fase.color;
  chip.style.borderColor = fase.color;
}

/**
 * Los chips de arriba: en qué modo estás y si hay un ayuno corriendo.
 *
 * El modo decidía el objetivo del día y las comidas aptas sin aparecer en
 * ningún lado de Hoy: había que entrar a Perfil para saber en cuál estabas.
 */
function renderTiras() {
  const cont = $('tirasHoy');
  if (!cont) return;

  const m = modoDe(state.perfil.modo);
  const enCurso = enCursoAyuno();
  const d = dia();

  const ayunoTexto = enCurso
    ? estadoAyuno(state.cfg.ayunoInicio, Date.now(), horasAyuno()).texto
    : (d.ayuno ? d.ayuno.horas.toFixed(1) + ' h' : 'Ayuno');

  cont.innerHTML = '';

  const chipModo = document.createElement('button');
  chipModo.className = 'tira activa';
  /* El nombre del modo solo no dice nada operativo. El numero que importa es
     cuantas calorias te deja hoy, y estaba tres pantallas mas adentro. */
  const obj = calcular();
  chipModo.innerHTML = `<i>${m?.emoji || '🎯'}</i>${m?.nombre || 'Sin modo'}` +
    (obj ? `<small>${fmtNum(obj.objetivo)} kcal</small>` : '');
  chipModo.onclick = () => irTab('perfil');
  cont.appendChild(chipModo);

  const chipAyuno = document.createElement('button');
  chipAyuno.className = 'tira' + (enCurso ? ' corriendo' : '');
  chipAyuno.innerHTML = `<i>⏱️</i>${ayunoTexto}` +
    (enCurso ? '' : '<small>' + (d.ayuno ? 'hecho' : 'tocá para arrancar') + '</small>');
  chipAyuno.onclick = () => abrirObjetivo('ayuno');
  cont.appendChild(chipAyuno);
}

function renderObjetivos() {
  const cont = $('objetivosDia');
  if (!cont) return;

  renderTiras();

  cont.setAttribute('role', 'group');
  cont.setAttribute('aria-label', 'Objetivos del día');

  /*
   * Cuáles estaban cumplidos ANTES de este render.
   *
   * Es lo que permite festejar solo el que se acaba de completar. Sin esta
   * comparación, la única opción sería festejar todos los cumplidos en cada
   * render y la pantalla explotaría de confeti cada vez que tocás un vaso.
   */
  const yaEstaban = listosAhora;
  listosAhora = new Set(objetivosDelDia().filter(o => o.listo).map(o => o.id));
  const recien = [...listosAhora].filter(id => !yaEstaban.has(id));

  cont.innerHTML = '';
  for (const o of objetivosDelDia()) {
    const b = document.createElement('button');
    b.className = 'objetivo' + (o.listo ? ' listo' : '');
    b.setAttribute('aria-label', `${o.nombre}${o.valor ? ': ' + o.valor : ', sin cargar'}`);
    /* El casillero es un interruptor con estado, no un boton suelto: sin esto un
       lector de pantalla no distingue el cumplido del pendiente. */
    b.setAttribute('role', 'switch');
    b.setAttribute('aria-checked', String(!!o.listo));
    b.innerHTML = `<span aria-hidden="true">${o.listo ? '✓' : o.emoji}</span>` +
      `<b>${o.nombre}</b><small>${o.valor || '—'}</small>`;
    b.onclick = () => abrirObjetivo(o.id);
    cont.appendChild(b);

    if (recien.includes(o.id)) { pop(b); particulas(b); }
  }
}

/* Los cumplidos del render anterior. Arranca vacío a propósito: en la primera
   pintada del día no hay nada que festejar, solo estado que mostrar. */
let listosAhora = new Set();

/* La fase del render anterior, para saber cuándo saltar. */
let faseAnterior = null;

/* ---------------- el editor de cada objetivo ---------------- */

const TITULOS_OBJ = {
  peso: 'Peso de hoy',
  agua: 'Agua',
  ejercicio: 'Ejercicio',
  ayuno: 'Ayuno',
  sueno: 'Sueño',
  animo: '¿Cómo venís hoy?'
};

function abrirObjetivo(id) {
  $('tituloObjetivo').textContent = TITULOS_OBJ[id] || 'Objetivo';

  document.querySelectorAll('#modalObjetivo [data-obj]').forEach(s => {
    s.hidden = s.dataset.obj !== id;
  });

  if (id === 'peso') renderPeso();
  if (id === 'agua') renderAgua();
  if (id === 'ejercicio') { renderEjercicio(); renderActividades(); }
  if (id === 'ayuno') renderAyuno();
  if (id === 'sueno') renderSueno();
  if (id === 'animo') renderCaritas();

  abrirCapa('modalObjetivo');
  tomarFoco($('modalObjetivo'));
}

function cerrarObjetivo() {
  $('modalObjetivo').classList.remove('open');
  devolverFoco();
  renderObjetivos();
  renderMascota();
}

$('btnCerrarObjetivo').onclick = cerrarObjetivo;
$('modalObjetivo').onclick = (e) => { if (e.target.id === 'modalObjetivo') cerrarObjetivo(); };

/* ---------------- ánimo ---------------- */

function renderCaritas() {
  const cont = $('listaCaritas');
  const d = dia();
  cont.innerHTML = '';

  for (const c of CARITAS) {
    const b = document.createElement('button');
    b.className = 'carita' + (d.animo === c.id ? ' elegida' : '');
    b.textContent = c.emoji;
    b.title = c.texto;
    b.setAttribute('aria-label', c.texto);
    b.onclick = () => {
      // volver a tocar la misma la saca: no hay forma de deshacer si no
      d.animo = d.animo === c.id ? null : c.id;
      d.act = Date.now();
      save();
      renderCaritas();
      renderObjetivos();
    };
    cont.appendChild(b);
  }

  $('notaDia').value = d.nota || '';
}

/* ---------------- actividades ---------------- */

function renderActividades() {
  const cont = $('listaActividades');
  if (!cont) return;

  const peso = state.perfil.peso;
  cont.innerHTML = '';

  for (const a of actividadesFavoritas(state)) {
    const kcal = caloriasActividad(a, peso);
    const b = document.createElement('button');
    b.className = 'chip';
    b.innerHTML = `${a.emoji} ${a.nombre} <small>${a.minutos}′ · ${fmtNum(kcal)} kcal</small>`;
    b.onclick = () => {
      const d = dia();
      d.ejercicio = (d.ejercicio || 0) + kcal;
      d.act = Date.now();
      save();
      renderEjercicio();
      renderHoy();
      toast(`${a.nombre}: +${fmtNum(kcal)} kcal`);
    };
    cont.appendChild(b);
  }

  if (!peso) {
    cont.innerHTML = '<p class="hint">Cargá tu peso en Perfil para que pueda estimar las calorías.</p>';
  }
}

/* ---------------- más opciones ---------------- */

function cerrarMas() { $('modalMas').classList.remove('open'); devolverFoco(); }

$('btnMas').onclick = () => abrirCapa('modalMas');
$('btnCerrarMas').onclick = cerrarMas;
$('modalMas').onclick = (e) => { if (e.target.id === 'modalMas') cerrarMas(); };


/* ---------------- ayuno ---------------- */

function horasAyuno() {
  const v = VENTANAS_AYUNO.find(x => x.id === (state.cfg.ventanaAyuno || '16:8'));
  return v ? v.horas : 16;
}

function enCursoAyuno() { return !!state.cfg.ayunoInicio; }

let relojAyuno = null;

/**
 * El cronometro se refresca solo mientras el editor esta abierto. Fuera de ahi
 * no hace falta: el tablero se repinta cada vez que se entra.
 */
function renderAyuno() {
  const cont = $('estadoAyuno');
  if (!cont) return;

  const ventanas = $('ventanasAyuno');
  ventanas.innerHTML = '';
  for (const v of VENTANAS_AYUNO) {
    const b = document.createElement('button');
    b.className = 'chip' + (horasAyuno() === v.horas ? ' activo' : '');
    b.innerHTML = v.nombre + ' <small>' + v.detalle + '</small>';
    b.onclick = () => { state.cfg.ventanaAyuno = v.id; save(); renderAyuno(); };
    ventanas.appendChild(b);
  }

  const d = dia();

  if (enCursoAyuno()) {
    const e = estadoAyuno(state.cfg.ayunoInicio, Date.now(), horasAyuno());
    cont.innerHTML = '<div class="ayuno-reloj' + (e.completo ? ' completo' : '') + '">' + e.texto + '</div>' +
      '<p class="hint">' + (e.completo
        ? 'Objetivo cumplido. Podes cortarlo cuando quieras.'
        : 'Faltan ' + Math.ceil(e.faltan / 3600000) + ' h para las ' + e.horasObjetivo + '.') + '</p>';
    $('btnAyuno').textContent = 'Cortar el ayuno';
    $('btnAyuno').className = 'primary big';
  } else {
    cont.innerHTML = d.ayuno
      ? '<p class="hint">Hoy ayunaste ' + d.ayuno.horas.toFixed(1) + ' h de ' + d.ayuno.objetivo + '.</p>'
      : '<p class="hint">Arranca cuando termines de comer.</p>';
    $('btnAyuno').textContent = 'Empezar a ayunar';
    $('btnAyuno').className = 'ghost big';
  }
}

$('btnAyuno').onclick = () => {
  if (enCursoAyuno()) {
    const cerrado = cerrarAyuno(state.cfg.ayunoInicio, Date.now(), horasAyuno());
    const d = dia();
    d.ayuno = cerrado;
    d.act = Date.now();
    state.cfg.ayunoInicio = null;
    save();
    toast(cerrado.cumplido ? 'Ayuno cumplido: ' + cerrado.horas.toFixed(1) + ' h' : 'Ayuno de ' + cerrado.horas.toFixed(1) + ' h');
  } else {
    state.cfg.ayunoInicio = Date.now();
    save();
    toast('Ayuno arrancado');
  }
  renderAyuno();
  renderObjetivos();
};

/* ---------------- el personaje ---------------- */

const HORAS_SUENO = [4, 5, 6, 7, 8, 9, 10];

const CALIDAD_SUENO = [
  { id: 'mal', emoji: '😵', texto: 'Pésimo' },
  { id: 'flojo', emoji: '😪', texto: 'Cortado' },
  { id: 'normal', emoji: '😐', texto: 'Normal' },
  { id: 'bien', emoji: '😴', texto: 'Bien' },
  { id: 'genial', emoji: '🌟', texto: 'De un tirón' }
];

function renderSueno() {
  const d = dia();
  const s = d.sueno || {};

  const horas = $('horasSueno');
  horas.innerHTML = '';
  for (const h of HORAS_SUENO) {
    const b = document.createElement('button');
    b.className = 'chip' + (s.horas === h ? ' activo' : '');
    b.textContent = h === 10 ? '10+ h' : h + ' h';
    b.onclick = () => {
      const dd = dia();
      dd.sueno = { ...(dd.sueno || {}), horas: dd.sueno?.horas === h ? null : h };
      if (!dd.sueno.horas && !dd.sueno.calidad) dd.sueno = null;
      dd.act = Date.now();
      save(); renderSueno(); renderObjetivos(); renderMascota();
    };
    horas.appendChild(b);
  }

  const cal = $('calidadSueno');
  cal.innerHTML = '';
  for (const c of CALIDAD_SUENO) {
    const b = document.createElement('button');
    b.className = 'carita' + (s.calidad === c.id ? ' elegida' : '');
    b.textContent = c.emoji;
    b.title = c.texto;
    b.setAttribute('aria-label', c.texto);
    b.onclick = () => {
      const dd = dia();
      dd.sueno = { ...(dd.sueno || {}), calidad: dd.sueno?.calidad === c.id ? null : c.id };
      if (!dd.sueno.horas && !dd.sueno.calidad) dd.sueno = null;
      dd.act = Date.now();
      save(); renderSueno(); renderObjetivos(); renderMascota();
    };
    cal.appendChild(b);
  }
}
