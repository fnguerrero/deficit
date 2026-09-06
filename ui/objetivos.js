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
  /* Cuantas comidas del dia entran en el modo. Se pregunta una sola vez: la
     cuenta recorre todas las comidas del dia y el casillero se repinta seguido.
     Con la fecha del dia que se esta mirando, no la de hoy: un dia anterior al
     corte se juzga con la regla que regia entonces. */
  const comidasDeHoy = d.comidas || [];
  const entranHoy = !comidasDeHoy.length ? 0
    : (fecha < DESDE_APTAS ? comidasDeHoy.length
      : comidasQueEntran(comidasDeHoy, state.perfil.modo || MODO_DEFECTO, calcular()));

  return [
    /*
     * Cuatro casilleros, no siete.
     *
     * Las comidas salieron de la grilla: estan justo abajo, con su barra de
     * momentos, su color por momento y el anillo con las calorias del dia. El
     * casillero era una cuarta forma de decir lo mismo, y la mas pobre —un
     * numero— de las cuatro.
     *
     * El peso subio a la tira de arriba, donde ya vivia su tendencia: pesarse
     * no es un habito diario. Entre dos dias hay hasta un kilo de agua y sal,
     * asi que pedirlo todos los dias para completar el dia empujaba a mirar
     * ruido y a sacar conclusiones de el.
     *
     * Y el animo se metio adentro del sueno: son la misma pregunta hecha dos
     * veces —como estuvo la noche y como estas— y se contestan en el mismo
     * momento, con las mismas caritas.
     */
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
      /* Las horas son lo que lo da por cargado; el animo va adentro y suma a lo
         que se ve, pero no se exige: hay dias en que uno no quiere contestarlo
         y eso no es un dia incompleto. */
      listo: !!(d.sueno && d.sueno.horas),
      nivel: nivelSueno(d.sueno?.horas),
      valor: [
        d.sueno?.horas ? d.sueno.horas + ' h' : '',
        d.animo ? (CARITAS.find(c => c.id === d.animo)?.emoji || '') : ''
      ].filter(Boolean).join(' ')
    },
    {
      /* Los pasos van a mano: ver pasosObjetivo() en habitos.js. */
      id: 'pasos',
      emoji: '👟',
      nombre: 'Pasos',
      /* Anotarlos alcanza: no hay objetivo contra el cual quedar corto. */
      listo: (d.pasos || 0) > 0,
      nivel: nivelPasos(d.pasos),
      valor: d.pasos ? fmtNum(d.pasos) : ''
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
  /* Los opcionales no festejan: el confeti es del habito cumplido, y pesarse no
     es uno. Tampoco entran en la cuenta de "cuantos van". */
  listosAhora = new Set(objetivosDelDia().filter(o => o.listo && !o.opcional).map(o => o.id));
  const recien = [...listosAhora].filter(id => !yaEstaban.has(id));

  /* Cuántos hábitos van, ahora en el título de la fila y no en un renglón
     propio: los casilleros ya dicen cuáles están y cuáles no, así que era una
     segunda copia de lo mismo ocupando alto en la pantalla que tiene que
     entrar entera. */
  cont.title = resumenHabitos(objetivosDelDia().filter(o => !o.opcional)).texto || '';

  cont.innerHTML = '';
  for (const o of objetivosDelDia()) {
    const b = document.createElement('button');
    /* El color sale del nivel; `listo` solo pone el tilde y el estado. Un
       casillero cargado con un dato malo tiene que verse malo. */
    b.className = 'objetivo' + (o.listo ? ' listo' : '') + (o.nivel ? ' nivel-' + o.nivel : '') +
      (o.opcional ? ' opcional' : '');
    /* El color no puede ser el único que lo diga: quien no lo distingue, o usa
       un lector de pantalla, se perdería justo el aviso. */
    const comoEstuvo = { bien: '', flojo: ', flojo', mal: ', mal' }[o.nivel] || '';
    b.setAttribute('aria-label', `${o.nombre}${o.valor ? ': ' + o.valor : ', sin cargar'}${comoEstuvo}`);
    /* El casillero es un interruptor con estado, no un boton suelto: sin esto un
       lector de pantalla no distingue el cumplido del pendiente. */
    b.setAttribute('role', o.opcional ? 'button' : 'switch');
    if (!o.opcional) b.setAttribute('aria-checked', String(!!o.listo));
    /* El opcional no lleva tilde aunque este cargado: el tilde dice "casillero
       del dia hecho", y este no es uno. */
    b.innerHTML = `<span aria-hidden="true">${o.listo && !o.opcional ? '✓' : o.emoji}</span>` +
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
  sueno: 'Sueño y ánimo'
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
  /* El ajuste de tiempo arranca cerrado en cada visita: quedo abierto de la vez
     pasada seria una pregunta que nadie hizo. */
  if (id === 'ejercicio') { ajustando = null; renderEjercicio(); renderActividades(); }
  if (id === 'ayuno') renderAyuno();
  if (id === 'sueno') { renderSueno(); renderCaritas(); }

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
 * Cuantos pasos se cargan de un toque.
 *
 * Es una lista fija y no una escala calculada sobre un objetivo, porque ya no
 * hay objetivo: los pasos se anotan, no se aprueban. Empieza en 4.000 —menos
 * que eso es lo que se camina yendo a la esquina— y llega a 15.000, que es mas
 * de lo que camina casi nadie; para cualquier otro numero esta el campo.
 */
const ESCALONES_PASOS = [4000, 6000, 8000, 10000, 12000, 15000];

function renderPasos() {
  const hechos = dia().pasos || 0;

  const cont = $('pasosEscalones');
  if (!cont) return;
  cont.innerHTML = '';

  for (const n of ESCALONES_PASOS) {
    const b = document.createElement('button');
    /* Se marca EL que cargaste, no todos los de abajo: no es una barra que se
       llena hasta un objetivo, es cuanto caminaste. */
    const puesto = hechos === n;
    b.className = 'chip' + (puesto ? ' activo' : '');
    b.textContent = fmtNum(n);
    b.setAttribute('aria-pressed', String(puesto));
    b.setAttribute('aria-label', `${fmtNum(n)} pasos`);
    /* Volver a tocar el que ya estaba lo borra: es la unica forma de deshacer
       sin escribir el numero a mano. Y ahi no se cierra, que cerrarse despues
       de borrar se lee como que se guardo algo. */
    b.onclick = () => {
      ponerPasos(puesto ? 0 : n);
      if (!puesto) cerrarTrasCargar();
    };
    cont.appendChild(b);
  }

  $('pasosHoy').value = hechos || '';
  $('pasosInfo').textContent = hechos
    ? `${fmtNum(hechos)} pasos anotados`
    : 'Tocá cuántos caminaste, o escribí el número.';
}

function ponerPasos(n) {
  const d = dia();
  d.pasos = Math.max(0, Math.min(PASOS_MAX * 3, Math.round(Number(n) || 0)));
  d.act = Date.now();
  save();
  renderPasos();
  renderHoy();
}

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

/**
 * Todos los ejercicios juntos, cada uno con lo que quema en el tiempo elegido
 * arriba.
 *
 * Antes se veian solo tres —las favoritas— y el resto del catalogo estaba
 * escondido en Ajustes: para anotar una caminata, que es de las cosas que uno
 * mas hace, habia que ir a buscarla y ponerla en la lista corta. Ahora estan
 * las once, y las favoritas siguen sirviendo: son las que van PRIMERO.
 */
function renderActividades() {
  const cont = $('listaActividades');
  if (!cont) return;

  const peso = state.perfil.peso;
  cont.innerHTML = '';

  if (!peso) {
    cont.innerHTML = '<p class="hint">Cargá tu peso en Perfil para que pueda estimar las calorías.</p>';
    return;
  }

  for (const a of actividadesOrdenadas(state)) {
    cont.appendChild(chipActividad(a, peso));
  }
}

/* Agregar uno nuevo sin salir del modal.
   Antes había que ir a Ajustes, buscar la sección de actividades, cargarlo,
   volver a Hoy y recién ahí tocarlo: cinco pasos para anotar que saliste a
   andar en bici. Vive fuera de la fila de chips: era el cuarto chip de una
   fila de tres y se leia como un ejercicio mas. */
$('btnOtroEjercicio').onclick = (e) => {
  if (e.detail > 0) e.currentTarget.blur();
  abrirAltaActividad();
};

/*
 * Un ejercicio, un toque.
 *
 * El chip dice lo que quema en su rato —una hora, o media si es correr— y
 * tocarlo lo carga. El tiempo dejo de estar arriba, igual para todos: era un
 * dato que habia que decidir antes de poder cargar nada, y la respuesta era
 * siempre la misma. Quien entrena distinto lo cambia manteniendo apretado el
 * ejercicio, y queda guardado para la proxima.
 */
function chipActividad(a, peso) {
  const minutos = minutosActividad(state, a);
  const kcal = caloriasActividad(a, peso, minutos);

  const b = document.createElement('button');
  b.className = 'chip act-uno';
  b.innerHTML = `${a.emoji} ${a.nombre} <small>${minutos}′ · ${fmtNum(kcal)} kcal</small>`;
  b.setAttribute('aria-label', `${a.nombre}, ${minutos} minutos, ${fmtNum(kcal)} calorías. Mantenélo apretado para cambiar el tiempo.`);

  /* Mantener apretado abre el tiempo. El click de despues se ignora: al soltar
     el dedo el navegador lo dispara igual, y sin esto abrir el tiempo cargaria
     el ejercicio al mismo tiempo. */
  let largo = null;
  let abrio = false;

  const empezar = () => {
    abrio = false;
    clearTimeout(largo);
    largo = setTimeout(() => { abrio = true; abrirTiempoDe(a); }, DEMORA_LARGO);
  };
  const soltar = () => clearTimeout(largo);

  b.addEventListener('pointerdown', empezar);
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, soltar);
  // en el celular, mantener apretado abre el menu del navegador arriba de todo
  b.addEventListener('contextmenu', (e) => e.preventDefault());

  b.onclick = () => {
    if (abrio) { abrio = false; return; }
    cargarActividad(a, minutos, kcal);
  };
  return b;
}

/* Medio segundo: menos se dispara al tocar rapido, mas se siente colgado. */
const DEMORA_LARGO = 480;

function cargarActividad(a, minutos, kcal) {
  recordarCambio('el ejercicio');
  anotarMovimiento({ nombre: a.nombre, emoji: a.emoji, minutos, kcal });
  renderHoy();
  toast(`${a.nombre} ${minutos}′: +${fmtNum(kcal)} kcal`);
  /* Cierra, como el peso, el agua y lo que hacia el boton Sumar: cargar el
     ejercicio es el tramite entero. Los dos ratos de un dia se anotan
     entrando dos veces, y el ticket de adentro los muestra sumados. */
  cerrarObjetivo();
}

/**
 * El alta de un ejercicio nuevo, dentro del mismo modal.
 *
 * Se usa `prompt` a propósito y no un formulario más: son dos datos, se usa
 * una vez cada tanto, y armar un tercer modal encima de este —con su foco, su
 * Escape y su botón atrás— cuesta más de lo que resuelve.
 */
function abrirAltaActividad() {
  const nombre = (prompt('¿Qué ejercicio?') || '').trim();
  if (!nombre) return;

  /* El id sale del nombre, sin acentos ni espacios y sin pisar uno existente. */
  const base = nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '') || 'act';
  const usados = actividadesDe(state).map(x => x.id);
  let id = base;
  let n = 2;
  while (usados.includes(id)) id = base + n++;

  /* Un solo dato: el nombre. Una hora, como todos —y si dura otra cosa se
     cambia manteniendolo apretado, igual que los del catalogo. */
  state.cfg.actividades = [...(state.cfg.actividades || []), { id, nombre, met: 6, minutos: 60, emoji: '⭐' }];

  /* Y queda adelante: si ya hay tres, entra sacando el más viejo. */
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

/* El sueño pide dos cosas —cuanto y como— y se guarda sola cada una: la
   ventana se va cuando estan las dos, que ahi si termino. Cerrarla con la
   primera obligaria a volver a abrirla para la segunda. */
function cerrarSiElSuenoEstaCompleto() {
  const s = dia().sueno;
  if (s?.horas && s?.calidad) cerrarTrasCargar();
}

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
      cerrarSiElSuenoEstaCompleto();
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
      cerrarSiElSuenoEstaCompleto();
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
