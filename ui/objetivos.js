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
  /* Una cara y no la manito: 💪 al lado de las horas de sueno se leia como
     ejercicio, y ademas era la unica de las cinco que no era una cara. La
     escala se entiende cuando todas hablan el mismo idioma. */
  { id: 'genial', emoji: '🤩', texto: 'Genial' }
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
     * Cuatro casilleros, no siete, y en el orden en que pasan las cosas: los
     * pasos y el ejercicio se cargan durante el dia, el agua se va llenando y
     * el sueno se anota a la mañana o de noche.
     *
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
      /* Los pasos van a mano: ver pasosObjetivo() en habitos.js. */
      id: 'pasos',
      emoji: '👟',
      nombre: 'Pasos',
      /* Anotarlos alcanza: no hay objetivo contra el cual quedar corto. */
      listo: (d.pasos || 0) > 0,
      nivel: nivelPasos(d.pasos),
      optimo: esOptimo('pasos', d),
      valor: d.pasos ? fmtNum(d.pasos) : ''
    },
    {
      id: 'ejercicio',
      emoji: '🏃',
      nombre: 'Ejercicio',
      listo: (d.ejercicio || 0) > 0,
      nivel: nivelEjercicio(d.ejercicio),
      optimo: esOptimo('ejercicio', d),
      valor: d.ejercicio ? fmtNum(d.ejercicio) + ' kcal' : ''
    },
    {
      id: 'agua',
      emoji: '💧',
      nombre: 'Agua',
      listo: (d.agua || 0) >= metaVasos(),
      nivel: nivelAgua(d.agua, metaVasos()),
      optimo: esOptimo('agua', d),
      valor: `${d.agua || 0}/${metaVasos()}`
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
      optimo: esOptimo('sueno', d),
      valor: [
        d.sueno?.horas ? d.sueno.horas + ' h' : '',
        d.animo ? (CARITAS.find(c => c.id === d.animo)?.emoji || '') : ''
      ].filter(Boolean).join(' ')
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

  /* El dia completo se ve de otro color, igual que en el aviso: con los cuatro
     casilleros en su OPTIMO la fila entera pasa a dorado. Verde con un casillero
     mas verde no se distingue; dorado se ve sin leer nada.

     Optimo y no "cargado": con cargado, un dia de 3.000 pasos y cinco horas de
     sueno se doraba entero, con un casillero en rojo adentro del marco. */
  const delDia = objetivosDelDia().filter(o => !o.opcional);
  cont.classList.toggle('dia-completo', delDia.length > 0 && delDia.every(o => o.optimo));

  cont.innerHTML = '';
  for (const o of objetivosDelDia()) {
    const b = document.createElement('button');
    /* El color sale del nivel; `listo` solo pone el tilde y el estado. Un
       casillero cargado con un dato malo tiene que verse malo. */
    b.className = 'objetivo' + (o.listo ? ' listo' : '') + (o.nivel ? ' nivel-' + o.nivel : '') +
      (o.optimo ? ' optimo' : '') + (o.opcional ? ' opcional' : '');
    /* El color no puede ser el único que lo diga: quien no lo distingue, o usa
       un lector de pantalla, se perdería justo el aviso. */
    const comoEstuvo = { bien: '', flojo: ', flojo', mal: ', mal' }[o.nivel] || '';
    /* La estrella no puede ser solo un dibujo: quien usa un lector de pantalla
       se perderia justo lo que la fila festeja. */
    b.setAttribute('aria-label',
      `${o.nombre}${o.valor ? ': ' + o.valor : ', sin cargar'}${comoEstuvo}${o.optimo ? ', en el óptimo' : ''}`);
    /* El casillero es un interruptor con estado, no un boton suelto: sin esto un
       lector de pantalla no distingue el cumplido del pendiente. */
    b.setAttribute('role', o.opcional ? 'button' : 'switch');
    if (!o.opcional) b.setAttribute('aria-checked', String(!!o.listo));
    /* El opcional no lleva tilde aunque este cargado: el tilde dice "casillero
       del dia hecho", y este no es uno. */
    /* La estrella manda sobre el tilde. El tilde dice "cargado" y lo dice de
       todos igual; la estrella dice que ademas llego al optimo, que es lo que
       vale la pena mirar de un dia terminado. */
    const marca = o.optimo ? '⭐' : (o.listo && !o.opcional ? '✓' : o.emoji);
    b.innerHTML = `<span aria-hidden="true">${marca}</span>` +
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

  /* El optimo del objetivo que se esta abriendo. El peso y el ayuno no tienen
     —no son casilleros del dia— y ahi el renglon no aparece en vez de decir
     una regla inventada. */
  const optimo = $('optimoObjetivo');
  if (optimo) {
    const texto = typeof textoOptimo === 'function' ? textoOptimo(id) : '';
    optimo.textContent = texto;
    optimo.hidden = !texto;
    /* Si ya esta cumplido lo dice el color, que es la misma estrella del
       casillero puesta en palabras. */
    optimo.classList.toggle('cumplido', !!texto && esOptimo(id, dia()));
  }

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
 * hay objetivo: los pasos se anotan, no se aprueban. Cinco, los que entran en
 * una fila: de 4.000 —menos que eso es lo que se camina yendo a la esquina— a
 * 12.000. Para cualquier otro numero esta el campo de abajo.
 */
const ESCALONES_PASOS = [4000, 6000, 8000, 10000, 12000];

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

  /* Igual que en el sueño: la carita elegida dice su nombre debajo. */
  const nombre = $('animoNombre');
  if (nombre) {
    const elegida = CARITAS.find(c => c.id === d.animo);
    nombre.textContent = elegida ? elegida.texto : '';
    nombre.hidden = !elegida;
  }

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
      renderMascota();
      cerrarSiElSuenoEstaCompleto();
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
  b.innerHTML = `<i aria-hidden="true">${a.emoji}</i><b>${a.nombre}</b>` +
    `<small>${minutos}′ · ${fmtNum(kcal)}</small>`;
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
  /* Sin "Deshacer": cada rato cargado tiene su ✕ en el ticket de abajo, que
     ademas dice cual es cual. El boton general aparecia por cada ejercicio para
     hacer lo mismo con menos informacion. */
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

/*
 * Como dormiste, en cinco. El bostezo reemplazo a la cara con la burbuja de
 * sueño: era casi igual a la de "Bien" —las dos son caras durmiendo— y no se
 * entendia que queria decir. Bostezar se lee sin explicacion: dormiste, pero
 * seguis cansado.
 *
 * Y el nombre de la que elegis se escribe debajo de la fila: en el celular no
 * hay donde ver el `title`, asi que cinco caras parecidas eran una adivinanza.
 */
const CALIDAD_SUENO = [
  { id: 'mal', emoji: '😵', texto: 'Pésimo — casi no pegué un ojo' },
  { id: 'flojo', emoji: '🥱', texto: 'Cortado — me desperté varias veces' },
  { id: 'normal', emoji: '😐', texto: 'Normal — ni bien ni mal' },
  { id: 'bien', emoji: '😴', texto: 'Bien — descansé' },
  { id: 'genial', emoji: '🌟', texto: 'De un tirón — me levanté entero' }
];

/* La hoja pide tres cosas —cuanto dormiste, como dormiste y como estas— y cada
   una se guarda sola al tocarla: la ventana se va cuando estan las tres, que
   ahi si termino. Cerrarla antes obligaria a volver a abrirla para el resto. */
function cerrarSiElSuenoEstaCompleto() {
  const d = dia();
  if (d.sueno?.horas && d.sueno?.calidad && d.animo) cerrarTrasCargar();
}

function renderSueno() {
  const d = dia();
  const s = d.sueno || {};

  /* A que hora acostarte, contado hacia atras desde tu desayuno. La mas tarde
     primero, que es la que se busca: la otra es la que se querria tener. */
  const v = ventanaDeDormir(horaDelMomento('desayuno', state.dias));
  const caja = $('suenoDormir');
  if (caja) {
    caja.hidden = !v;
    if (v) {
      caja.textContent = `Desayunás a las ${comoHora(horaDelMomento('desayuno', state.dias))}, ` +
        `así que lo más tarde que te podés acostar es a las ${comoHora(v.tarde)} y dormís ${v.horas[0]} h. ` +
        `Para dormir ${v.horas[1]}, a las ${comoHora(v.temprano)}.`;
    }
  }

  const horas = $('horasSueno');
  horas.innerHTML = '';

  /* Los dos extremos son "o menos" y "o mas": el que durmio tres horas no tiene
     donde marcarlas, y "4 h" a secas le pedia mentir hacia arriba. El de arriba
     ya decia "10+"; al de abajo le faltaba su mitad. */
  const menos = HORAS_SUENO[0];
  const mas = HORAS_SUENO[HORAS_SUENO.length - 1];

  for (const h of HORAS_SUENO) {
    const b = document.createElement('button');
    b.className = 'chip' + (s.horas === h ? ' activo' : '');
    b.textContent = h === mas ? `${h}+ h` : (h === menos ? `${h}− h` : `${h} h`);
    b.setAttribute('aria-label', h === mas ? `${h} horas o más` : (h === menos ? `${h} horas o menos` : `${h} horas`));
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
  const nombreCal = $('calidadNombre');
  if (nombreCal) {
    const elegida = CALIDAD_SUENO.find(c => c.id === s.calidad);
    nombreCal.textContent = elegida ? elegida.texto : '';
    nombreCal.hidden = !elegida;
  }
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
