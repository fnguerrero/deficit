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

  /*
   * `listo` y `nivel` responden dos preguntas distintas, y por eso son dos.
   *
   * `listo` es "¿lo cargaste?", y de ahí salen la racha, los días perfectos y
   * la fase del muñeco. `nivel` es "¿cómo estuvo?", y solo decide el color.
   * Mezclarlos rompería el juego: tres horas de sueño están mal, pero el día
   * quedó registrado igual, y esa racha se ganó.
   */
  const ref = referenciaDePeso(state.dias, fecha);

  return [
    {
      /*
       * Las comidas: el unico habito que contaba sin verse.
       *
       * Era la primera de las rachas del dia perfecto y no tenia casillero,
       * asi que se podia tener la grilla entera en verde y el dia sin
       * completar. No abre un editor propio —las comidas se cargan abajo, con
       * su lista y su boton— pero ocupa su lugar y dice como viene.
       */
      id: 'registro',
      emoji: '🍽️',
      nombre: 'Comidas',
      listo: (d.comidas || []).length > 0,
      nivel: (d.comidas || []).length ? 'bien' : '',
      valor: (d.comidas || []).length ? String((d.comidas || []).length) : ''
    },
    {
      id: 'peso',
      emoji: '⚖️',
      nombre: 'Peso',
      listo: typeof d.peso === 'number' && d.peso > 0,
      nivel: nivelPeso(d.peso, ref, state.perfil.pesoObj),
      valor: d.peso ? fmtNum(d.peso) + ' kg' : ''
    },
    {
      id: 'agua',
      emoji: '💧',
      nombre: 'Agua',
      listo: (d.agua || 0) >= metaVasos(),
      nivel: nivelAgua(d.agua, metaVasos()),
      valor: `${d.agua || 0}/${metaVasos()}`
    },
    {
      id: 'ejercicio',
      emoji: '🏃',
      nombre: 'Ejercicio',
      listo: (d.ejercicio || 0) > 0,
      nivel: nivelEjercicio(d.ejercicio),
      valor: d.ejercicio ? fmtNum(d.ejercicio) + ' kcal' : ''
    },
    {
      id: 'sueno',
      emoji: '😴',
      nombre: 'Sueño',
      listo: !!(d.sueno && d.sueno.horas),
      nivel: nivelSueno(d.sueno?.horas),
      valor: d.sueno?.horas ? d.sueno.horas + ' h' : ''
    },
    {
      /* Los pasos van a mano: ver pasosObjetivo() en habitos.js. */
      id: 'pasos',
      emoji: '👟',
      nombre: 'Pasos',
      listo: (d.pasos || 0) >= metaPasos(),
      nivel: nivelPasos(d.pasos, metaPasos()),
      valor: d.pasos ? fmtNum(d.pasos) : ''
    },
    {
      id: 'animo',
      emoji: '🙂',
      nombre: 'Ánimo',
      listo: !!d.animo,
      nivel: nivelAnimo(d.animo),
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
function pintarFase(fase, perfectos, enRiesgo = false) {
  const chip = $('mascotaFase');
  if (!chip) return;

  chip.hidden = !fase.n;
  if (!fase.n) return;

  /* Con el día todavía en blanco la fase es de ayer, y la pantalla lo decía
     todo junto: el muñeco en llamas al lado de "el día está en blanco". No se
     esconde —te la ganaste— pero se muestra apagada y con su fecha, que es la
     diferencia entre un premio y un premio que se está por caer. */
  chip.classList.toggle('en-riesgo', !!enRiesgo);
  chip.textContent = enRiesgo
    ? `${fase.nombre} · ${perfectos} · de ayer`
    : `${fase.nombre} · ${perfectos}`;
  chip.title = enRiesgo
    ? 'La ganaste con los días anteriores. Si hoy no completás el día, la perdés.'
    : `${perfectos} ${perfectos === 1 ? 'día perfecto' : 'días perfectos'} seguidos.`;
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

  /*
   * El modo se lee arriba de todo, donde antes decia "Deficit".
   *
   * El nombre de la app no aporta nada: quien la abre ya sabe cual es. En que
   * modo estas, en cambio, decide el objetivo del dia y si una comida entra o
   * no, y estaba en un chip que competia con el ayuno por el mismo renglon.
   */
  const titulo = $('tituloModo');
  if (titulo) {
    titulo.textContent = m?.nombre || 'Déficit';
    titulo.title = m?.detalle || m?.resumen || 'Tocá para cambiar de modo';
    // el chip llevaba a Perfil; el título hereda eso, que es de donde se cambia
    titulo.onclick = () => irTab('perfil');
    titulo.style.cursor = 'pointer';
  }

  /*
   * El ayuno, siempre.
   *
   * Estuvo un tiempo escondido hasta que hubiera uno corriendo, y así no había
   * forma de arrancarlo desde Hoy: había que entrar a Perfil para algo que se
   * decide justo cuando se está mirando la pantalla del día.
   */
  cont.hidden = false;

  const chipAyuno = document.createElement('button');
  chipAyuno.className = 'tira' + (enCurso ? ' corriendo' : '');
  chipAyuno.innerHTML = `<i>⏱️</i>${ayunoTexto}` +
    (enCurso ? '' : '<small>' + (d.ayuno ? 'hecho' : 'tocá para arrancar') + '</small>');
  chipAyuno.onclick = () => abrirObjetivo('ayuno');
  cont.appendChild(chipAyuno);
}

function renderObjetivos() {
  renderPrimerosPasos();

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

  /* Cuántos hábitos van, ahora en el título de la fila y no en un renglón
     propio: los casilleros ya dicen cuáles están y cuáles no, así que era una
     segunda copia de lo mismo ocupando alto en la pantalla que tiene que
     entrar entera. */
  cont.title = resumenHabitos(objetivosDelDia()).texto || '';

  cont.innerHTML = '';
  for (const o of objetivosDelDia()) {
    const b = document.createElement('button');
    /* El color sale del nivel; `listo` solo pone el tilde y el estado. Un
       casillero cargado con un dato malo tiene que verse malo. */
    b.className = 'objetivo' + (o.listo ? ' listo' : '') + (o.nivel ? ' nivel-' + o.nivel : '');
    /* El color no puede ser el único que lo diga: quien no lo distingue, o usa
       un lector de pantalla, se perdería justo el aviso. */
    const comoEstuvo = { bien: '', flojo: ', flojo', mal: ', mal' }[o.nivel] || '';
    b.setAttribute('aria-label', `${o.nombre}${o.valor ? ': ' + o.valor : ', sin cargar'}${comoEstuvo}`);
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

  /* Y el aviso fijo, que muestra esto mismo afuera de la app. Va acá porque
     este render corre al abrir y en cada toque de un objetivo, que es cuando
     el estado del día cambia. */
  if (typeof actualizarObjetivosFijos === 'function') actualizarObjetivosFijos();
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
  pasos: 'Pasos de hoy',
  ejercicio: 'Ejercicio',
  ayuno: 'Ayuno',
  sueno: 'Sueño',
  animo: '¿Cómo venís hoy?'
};

function abrirObjetivo(id) {
  /* Las comidas no tienen editor en este modal: se cargan abajo, en su propia
     lista. El casillero lleva hasta ahi en vez de no hacer nada, que desde
     afuera se ve igual que un boton roto. */
  if (id === 'registro') {
    document.getElementById('listaComidas')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const secciones = [...document.querySelectorAll('#modalObjetivo [data-obj]')];

  /* Sin sección no hay nada que editar, y abrir igual deja una hoja vacía con
     un título genérico: desde afuera se ve como que la app se colgó. */
  if (!secciones.some(s => s.dataset.obj === id)) return;

  $('tituloObjetivo').textContent = TITULOS_OBJ[id] || 'Objetivo';
  secciones.forEach(s => { s.hidden = s.dataset.obj !== id; });

  if (id === 'pasos') renderPasos();
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
  marcarAtras();
}

$('btnCerrarObjetivo').onclick = cerrarObjetivo;
$('modalObjetivo').onclick = (e) => { if (e.target.id === 'modalObjetivo') cerrarObjetivo(); };

/* ---------------- pasos ---------------- */

/*
 * Los escalones, en vez de un teclado numerico.
 *
 * El dato viene de mirar el reloj, no de contar: quien camino 9.847 lee "casi
 * 10 mil" y eso es lo que quiere anotar. Escribir cinco digitos para un dato
 * que se redondea igual es friccion pura, y la friccion es lo que hace que un
 * objetivo se abandone a la semana. El numero exacto sigue estando abajo para
 * el que lo tiene.
 */
function escalonesPasos(meta) {
  const paso = Math.max(1000, Math.round(meta / 5 / 500) * 500);
  const lista = [];
  for (let i = 1; i <= 5; i++) lista.push(paso * i);
  /* Que la meta este siempre, aunque no caiga justo en un escalon: es el unico
     que cierra el casillero. */
  if (!lista.includes(meta)) lista.push(meta);
  return [...new Set(lista)].sort((a, b) => a - b);
}

function renderPasos() {
  const meta = metaPasos();
  const hechos = dia().pasos || 0;

  const cont = $('pasosEscalones');
  if (!cont) return;
  cont.innerHTML = '';

  for (const n of escalonesPasos(meta)) {
    const b = document.createElement('button');
    b.className = 'chip' + (hechos >= n ? ' activo' : '');
    b.textContent = fmtNum(n);
    b.setAttribute('aria-pressed', String(hechos >= n));
    b.setAttribute('aria-label', `${fmtNum(n)} pasos, objetivo ${fmtNum(meta)}`);
    /* Volver a tocar el escalon al que ya estabas lo baja al anterior: es la
       unica forma de deshacer sin escribir el numero a mano. */
    b.onclick = () => ponerPasos(hechos === n ? 0 : n);
    cont.appendChild(b);
  }

  $('pasosHoy').value = hechos || '';
  $('pasosInfo').textContent = hechos >= meta
    ? `${fmtNum(hechos)} pasos — objetivo cumplido`
    : (hechos
      ? `${fmtNum(hechos)} de ${fmtNum(meta)}. Faltan ${fmtNum(meta - hechos)}.`
      : 'Tocá hasta dónde llegaste, o escribí el número.');

  pintarMetaPasos(meta);
}

function pintarMetaPasos(meta) {
  if (!$('pasosMeta')) return;

  $('pasosMeta').textContent = fmtNum(meta) + ' pasos';
  $('pasosMenos').disabled = meta <= PASOS_MIN;
  $('pasosMas').disabled = meta >= PASOS_MAX;

  /* Los 10.000 no salen de ningun estudio: son de una campaña publicitaria
     japonesa de 1965 para un podometro que se llamaba asi. Lo que si esta
     medido es que el beneficio grande aparece bastante antes. Decirlo importa
     porque un objetivo que no se alcanza nunca termina ignorado. */
  $('pasosReco').textContent = meta > 8000
    ? 'Los 10.000 son de una publicidad de 1965, no de un estudio. La mayor parte del beneficio está entre 6.000 y 8.000.'
    : 'Entre 6.000 y 8.000 pasos está la mayor parte del beneficio medido.';
}

function ponerPasos(n) {
  const d = dia();
  d.pasos = Math.max(0, Math.min(PASOS_MAX * 3, Math.round(Number(n) || 0)));
  d.act = Date.now();
  save();
  renderPasos();
  renderHoy();
}

function cambiarMetaPasos(delta) {
  const meta = metaPasos() + delta;
  state.cfg.pasosMeta = Math.min(PASOS_MAX, Math.max(PASOS_MIN, meta));
  save();
  renderPasos();
  renderObjetivos();
}

$('pasosMenos').onclick = () => cambiarMetaPasos(-PASOS_SALTO);
$('pasosMas').onclick = () => cambiarMetaPasos(PASOS_SALTO);

$('btnPasos').onclick = () => {
  const v = Number($('pasosHoy').value);
  if (!(v >= 0)) { toast('Poné un número'); return; }
  ponerPasos(v);
  toast(v ? `${fmtNum(Math.round(v))} pasos` : 'Pasos borrados');
};

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

  if (!peso) {
    cont.innerHTML = '<p class="hint">Cargá tu peso en Perfil para que pueda estimar las calorías.</p>';
    return;
  }

  for (const a of actividadesFavoritas(state)) {
    cont.appendChild(chipActividad(a, peso));
  }

  /* Agregar uno nuevo sin salir del modal.
     Antes había que ir a Ajustes, buscar la sección de actividades, cargarlo,
     volver a Hoy y recién ahí tocarlo: cinco pasos para anotar que saliste a
     andar en bici. */
  const nuevo = document.createElement('button');
  nuevo.className = 'chip chip-nuevo';
  nuevo.innerHTML = '＋ Otro ejercicio';
  nuevo.onclick = (e) => { if (e.detail > 0) e.currentTarget.blur(); abrirAltaActividad(); };
  cont.appendChild(nuevo);
}

/**
 * Un ejercicio, con sus minutos editables ahí mismo.
 *
 * Los minutos son lo que más cambia de un día para el otro —hoy corriste 30 y
 * ayer 50— y eran justo lo único que había que ir a cambiar a Ajustes. Con el
 * − y el + al lado, las calorías se recalculan solas y el chip queda listo
 * para tocarlo.
 */
function chipActividad(a, peso) {
  const caja = document.createElement('div');
  caja.className = 'act-chip';

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

  const menos = document.createElement('button');
  menos.className = 'act-mas';
  menos.textContent = '−';
  menos.title = 'Cinco minutos menos';
  menos.setAttribute('aria-label', `Cinco minutos menos de ${a.nombre}`);
  menos.onclick = (e) => { if (e.detail > 0) e.currentTarget.blur(); cambiarMinutos(a, -5); };

  const mas = document.createElement('button');
  mas.className = 'act-mas';
  mas.textContent = '+';
  mas.title = 'Cinco minutos más';
  mas.setAttribute('aria-label', `Cinco minutos más de ${a.nombre}`);
  mas.onclick = (e) => { if (e.detail > 0) e.currentTarget.blur(); cambiarMinutos(a, 5); };

  caja.append(menos, b, mas);
  return caja;
}

/** Cambia los minutos de una actividad y los deja guardados para la próxima. */
function cambiarMinutos(a, delta) {
  const min = Math.max(5, Math.min(600, (Number(a.minutos) || 30) + delta));

  const propias = [...(state.cfg.actividades || [])];
  const i = propias.findIndex(x => x.id === a.id);
  if (i >= 0) propias[i] = { ...propias[i], minutos: min };
  else propias.push({ id: a.id, nombre: a.nombre, minutos: min, met: a.met, emoji: a.emoji });

  state.cfg.actividades = propias;
  save();
  renderActividades();
}

/*
 * El alta de un ejercicio nuevo, dentro del mismo modal.
 *
 * Se usa `prompt` a propósito y no un formulario más: son dos datos, se usa
 * una vez cada tanto, y armar un tercer modal encima de este —con su foco, su
 * Escape y su botón atrás— cuesta más de lo que resuelve.
 */
function abrirAltaActividad() {
  const nombre = (prompt('¿Qué ejercicio?') || '').trim();
  if (!nombre) return;

  const minutos = Math.max(5, Math.min(600, parseInt(prompt('¿Cuántos minutos?', '45'), 10) || 45));

  /* El id sale del nombre, sin acentos ni espacios y sin pisar uno existente. */
  const base = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '') || 'act';
  const usados = actividadesDe(state).map(x => x.id);
  let id = base;
  let n = 2;
  while (usados.includes(id)) id = base + n++;

  state.cfg.actividades = [...(state.cfg.actividades || []), { id, nombre, minutos, met: 6, emoji: '⭐' }];

  /* Y queda listo en Hoy: agregarlo sin que aparezca sería agregarlo a un
     cajón. Si ya hay tres, entra sacando el más viejo. */
  const favs = [...(state.cfg.favoritasActividad || FAVORITAS_DEFECTO)];
  favs.push(id);
  state.cfg.favoritasActividad = favs.slice(-MAX_FAVORITAS);

  save();
  renderActividades();
  if (typeof renderActividadesEditar === 'function') renderActividadesEditar();
  toast(`${nombre} agregado`);
}

/* ---------------- más opciones ---------------- */

/* El modal de "Más opciones" se fue: sus cuatro formas de cargar una comida
   viven ahora en el menú de la flechita del botón Foto, que ya tenía la foto,
   la galería, el código y la etiqueta. Eran dos menús para lo mismo. */


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
    /* En HOY, no en el día que se esté mirando: el ayuno se corta cuando se
       corta, y desde el historial de la semana pasada el registro iba a parar
       a ese día. */
    const d = dia(hoyISO());
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


/* ---------------- los primeros pasos ---------------- */

function renderPrimerosPasos() {
  const caja = $('primerosPasos');
  if (!caja) return;

  const pasos = pasosQueFaltan(state);
  const faltan = pasos.filter(x => !x.hecho);

  /* Con todo hecho desaparece para siempre, sin que haya que cerrarla. */
  caja.hidden = !faltan.length;
  if (!faltan.length) return;

  $('pasosPill').textContent = `${pasos.length - faltan.length} de ${pasos.length}`;

  const cont = $('listaPasos');
  cont.innerHTML = '';

  for (const paso of pasos) {
    const fila = document.createElement('div');
    fila.className = 'paso' + (paso.hecho ? ' hecho' : '');

    const txt = document.createElement('div');
    txt.innerHTML = `<b>${paso.hecho ? '✓ ' : ''}${paso.texto}</b>` +
      (paso.hecho ? '' : `<small>${paso.porque}</small>`);
    fila.appendChild(txt);

    if (!paso.hecho) {
      const b = document.createElement('button');
      b.className = 'ghost small';
      b.textContent = paso.boton;
      b.onclick = (e) => {
        if (e.detail > 0) e.currentTarget.blur();
        if (paso.id === 'comida') $('btnFoto').click();
        else irTab('perfil');
      };
      fila.appendChild(b);
    }

    cont.appendChild(fila);
  }
}
