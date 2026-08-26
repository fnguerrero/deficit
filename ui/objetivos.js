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
      listo: (d.agua || 0) >= vasosObjetivo(peso),
      valor: `${d.agua || 0}/${vasosObjetivo(peso)}`
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
  chipModo.innerHTML = `<i>${m?.emoji || '🎯'}</i>${m?.nombre || 'Sin modo'}`;
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

  cont.innerHTML = '';
  for (const o of objetivosDelDia()) {
    const b = document.createElement('button');
    b.className = 'objetivo' + (o.listo ? ' listo' : '');
    b.setAttribute('aria-label', `${o.nombre}${o.valor ? ': ' + o.valor : ', sin cargar'}`);
    b.innerHTML = `<span aria-hidden="true">${o.listo ? '✓' : o.emoji}</span>` +
      `<b>${o.nombre}</b><small>${o.valor || '—'}</small>`;
    b.onclick = () => abrirObjetivo(o.id);
    cont.appendChild(b);
  }
}

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

  $('modalObjetivo').classList.add('open');
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

$('btnMas').onclick = () => { $('modalMas').classList.add('open'); tomarFoco($('modalMas')); };
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

function renderMascota() {
  const cont = $('mascotaDibujo');
  if (!cont) return;

  actualizarJuego();

  const d = dia();
  const racha = rachaActual(state.dias);
  const est = estadoMascota(d, {
    objetivo: calcular(),
    objetivoVasos: vasosObjetivo(state.perfil.peso),
    racha
  });

  /* El cuerpo sale de la balanza y de los entrenamientos; la cara, del dia de
     hoy. Son dos fuentes distintas a proposito: ver arriba de personaje.js. */
  const perfectos = diasPerfectos(state.dias, { vasos: vasosObjetivo(state.perfil.peso) });
  const fase = faseDe(perfectos);
  const cuerpo = cuerpoDe(state.perfil, state.dias, hoyISO(), { bonus: bonusDePerfectos(perfectos) });

  cont.innerHTML = svgPersonaje(est.animo, 70, cuerpo, fase);
  pintarFase(fase, perfectos);
  $('mascotaTitulo').textContent = est.titulo;

  /* Sin peso no se puede dibujar SU cuerpo: se dibuja uno medio y se pide el
     dato, en vez de disimular que el muneco es cualquiera. */
  $('mascotaDetalle').textContent = !cuerpo.hayDatos
    ? 'Cargá tu peso y el muñeco va a tener tu cuerpo, no uno cualquiera.'
    : (fraseDelDia(d) || est.texto);

  const lvl = nivelDe(state.juego?.xp || 0);
  $('mascotaBarra').style.width = Math.round(lvl.pct * 100) + '%';
  /* En Hoy va solo el número: el nombre del nivel no entra al lado de las
     cuatro rachas, y está entero en Progreso. */
  $('mascotaLvl').textContent = `Nv ${lvl.nivel}`;

  pintarRachas();

  $('mascotaCard').onclick = () => abrirObjetivo(est.dim === 'sueno' ? 'sueno' : (est.dim || 'animo'));
}

/* ---------------- lo que dice la app ---------------- */

/*
 * La frase se elige cuando CAMBIA la situación, no en cada render.
 *
 * Sin esto, cada vez que se toca un vaso de agua el personaje diría otra cosa,
 * y un personaje que cambia de opinión cada segundo no se lee como un
 * personaje: se lee como un cartel rotativo.
 */
let vozActual = { situacion: null, texto: '', desde: 0, insistido: 0, falta: null };

/* Cuánto aguanta antes de volver a la carga con lo mismo. Doce minutos es
   suficiente para que se note que insiste y poco para que canse. */
const MS_INSISTENCIA = 12 * 60 * 1000;

function fraseDelDia(d, ahora = Date.now()) {
  const r = reclamoDelDia(d, { vasos: vasosObjetivo(state.perfil.peso) });

  if (r.situacion !== vozActual.situacion) {
    vozActual = { situacion: r.situacion, texto: r.texto, desde: ahora, insistido: 0, falta: r.falta || null };
    return vozActual.texto;
  }

  const desdeCuando = Math.max(vozActual.desde, vozActual.insistido);
  if (r.situacion && ahora - desdeCuando > MS_INSISTENCIA) {
    vozActual.insistido = ahora;
    vozActual.texto = decir('insiste', { que: NOMBRE_ACTIVIDAD[r.falta] || 'lo que te falta' });
  }

  return vozActual.texto;
}

/**
 * Recalcula rachas, XP y logros contra el historial y guarda si algo cambió.
 *
 * Se recalcula entero en vez de acumular: así borrar una comida cargada por
 * error no deja XP fantasma, y un logro no se puede ganar dos veces. Solo se
 * guarda cuando hay diferencia, o cada render dispararía una escritura.
 */
function actualizarJuego() {
  const antes = JSON.stringify(state.juego || {});
  const nivelPrevio = nivelDe(state.juego?.xp || 0).nivel;

  const r = recalcularJuego(state.dias, state.juego, {
    vasos: vasosObjetivo(state.perfil.peso)
  });

  state.juego = { ...r.juego, anunciados: (state.juego?.anunciados || []).slice() };

  if (JSON.stringify(state.juego) !== antes) save();
  sonarObjetivosNuevos();
  anunciarNovedades(r, nivelPrevio);
  anunciarFase();
  return r;
}

/* La fase anterior, para saber si subió o se cayó. Arranca en null y no en 0
   para que abrir la app ya en fase 3 no festeje tres veces de golpe. */
let fasePrevia = null;

function anunciarFase() {
  const n = diasPerfectos(state.dias, { vasos: vasosObjetivo(state.perfil.peso) });
  const fase = faseDe(n);

  if (fasePrevia === null) { fasePrevia = fase.n; return; }
  if (fase.n === fasePrevia) return;

  if (fase.n > fasePrevia) {
    festejar({ icono: '⚡', titulo: fase.nombre, texto: decir('fase', { fase: fase.nombre, n }), sonido: 'nivel' });
  } else {
    toast(decir('faseCaida'));
    sonidos.sonar('fallo');
  }
  fasePrevia = fase.n;
}

/* Qué actividades ya estaban cumplidas la última vez que se miró. Empieza en
   null y no en vacío: si empezara vacío, abrir la app con el día ya completo
   dispararía cuatro sonidos de golpe. */
let cumplidasPrevias = null;

function sonarObjetivosNuevos() {
  const ahora = todasLasRachas(state.dias, {
    vasos: vasosObjetivo(state.perfil.peso),
    juego: state.juego
  }).filter(r => r.hoyCumplido).map(r => r.id);

  if (cumplidasPrevias === null) { cumplidasPrevias = ahora; return; }

  const nuevas = ahora.filter(id => !cumplidasPrevias.includes(id));
  cumplidasPrevias = ahora;

  if (!nuevas.length) return;

  sonidos.sonar(nuevas.length === RACHAS.length ? 'racha' : 'objetivo');
  for (const id of nuevas) festejarObjetivo(OBJETIVO_DE_RACHA[id]);
}

/* Las rachas y los objetivos no se llaman igual: la racha de comidas se llama
   "registro" y no tiene casillero propio en la grilla. */
const OBJETIVO_DE_RACHA = { agua: 'agua', entrenamiento: 'ejercicio', sueno: 'sueno', registro: null };

/**
 * El casillero pega un salto y sube un +XP.
 *
 * Ponerse verde y nada más no se sentía como cumplir algo. Es medio segundo de
 * animación y es la diferencia entre marcar una casilla y ganar algo.
 */
function festejarObjetivo(id) {
  if (!id) return;

  const botones = [...($('objetivosDia')?.children || [])];
  const b = botones.find(x => (x.getAttribute('aria-label') || '').toLowerCase().startsWith(NOMBRE_OBJETIVO[id]));
  if (!b) return;

  b.classList.remove('festeja');
  void b.offsetWidth;          // reinicia la animación si se repite
  b.classList.add('festeja');

  const burbuja = document.createElement('span');
  burbuja.className = 'xp-flotante';
  burbuja.textContent = '+' + XP.objetivo;
  b.appendChild(burbuja);
  setTimeout(() => burbuja.remove(), 1200);
}

const NOMBRE_OBJETIVO = { agua: 'agua', ejercicio: 'ejercicio', sueno: 'sueño', peso: 'peso', animo: 'ánimo' };

/**
 * Las cuatro rachas, chiquitas.
 *
 * Se apagan en vez de desaparecer cuando están en cero: un hueco donde antes
 * había un número dice más que no mostrar nada.
 */
function pintarRachas() {
  const cont = $('rachasFila');
  if (!cont) return;

  const rachas = todasLasRachas(state.dias, {
    vasos: vasosObjetivo(state.perfil.peso),
    juego: state.juego
  });

  cont.innerHTML = rachas.map(r => {
    const viva = r.actual > 0;
    return `<span class="racha${viva ? ' viva' : ''}${r.hoyCumplido ? ' hoy' : ''}" title="${r.nombre}: ${r.actual} días">
      <i>${r.icono}</i>${viva ? r.actual : '–'}</span>`;
  }).join('');
}

/* ---------------- sueño ---------------- */

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
