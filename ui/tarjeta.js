/* ============================================================
   ui/tarjeta.js — la tarjeta del personaje: lo que dice, en qué fase está,
   las rachas y los festejos.

   Salió de ui/objetivos.js, que se pasó de su límite al sumarle las
   animaciones. Ahí quedaron los casilleros del día y sus modales; acá, todo lo
   que la tarjeta cuenta sobre cómo venís.
   ============================================================ */

function renderMascota() {
  const cont = $('mascotaDibujo');
  if (!cont) return;

  actualizarJuego();

  const d = dia();
  const racha = rachaActual(state.dias);
  const est = estadoMascota(d, {
    objetivo: calcular(),
    objetivoVasos: metaVasos(),
    racha
  });

  /* El cuerpo sale de la balanza y de los entrenamientos; la cara, del dia de
     hoy. Son dos fuentes distintas a proposito: ver arriba de personaje.js. */
  const perfectos = diasPerfectos(state.dias, { vasos: metaVasos() });
  const fase = faseDe(perfectos);
  /* cuerpoDelDia y no cuerpoDe: el primero suma el agua, el sueño y el ánimo
     de hoy, que es lo que hace que el muñeco sea el de este día y no el de
     esta balanza. */
  const cuerpo = cuerpoDelDia(state.perfil, state.dias, hoyISO(), {
    bonus: bonusDePerfectos(perfectos),
    meta: metaVasos()
  });

  /* 86 y no 70: el lienzo crecio para que entren las puntas del pelo y el aura,
     asi que a 70 la figura en si quedaba en 43 px de ancho. */
  /* El SVG son unos 8 kB de string armado a mano. Re-generarlo y volver a
     parsearlo cuando nada cambio es trabajo puro al pedo, y en el celular se
     nota al tocar un vaso. */
  const firmaSvg = [
    est.animo, fase.n, cuerpo.efectiva, cuerpo.musculatura,
    cuerpo.hidratacion, cuerpo.descanso
  ].join('|');
  if (cont.dataset.firma !== firmaSvg) {
    /* El SVG dibujado y no el sprite de imágenes: es el único de los dos que
       puede reaccionar a algo que no sea el peso. Un sprite tiene los cuerpos
       que tiene, y el agua o el sueño no se pueden dibujar eligiendo archivo. */
    cont.innerHTML = svgPersonaje(est.animo, 76, cuerpo, fase);
    cont.dataset.firma = firmaSvg;
  }
  /* El SVG solo dice el animo. Quien no ve el dibujo necesita lo mismo que el
     dibujo cuenta: como venis, en que fase estas y de que esta hecho el cuerpo. */
  cont.setAttribute('role', 'img');
  cont.setAttribute('aria-label', [
    est.titulo,
    est.texto,
    fase.n ? `Fase ${fase.n}: ${fase.nombre}, por ${perfectos} días perfectos seguidos.` : '',
    cuerpo.hayDatos ? `Cuerpo dibujado con tu IMC de ${fmtNum(cuerpo.imc, 1)}.` : 'Sin peso cargado.',
    cuerpo.hidratacion < 0.4 ? 'Se lo ve seco: falta agua.' : '',
    cuerpo.descanso < 0.55 ? 'Se lo ve cansado: falta sueño.' : ''
  ].filter(Boolean).join(' '));
  /*
   * El personaje reacciona: salta cuando sube de fase, se sacude cuando entra
   * una comida. Es la diferencia entre un dibujo que ilustra un estado y algo
   * que se entera de lo que hiciste.
   */
  const dibujo = $('mascotaDibujo');
  if (faseAnterior != null && fase.n > faseAnterior) saltar(dibujo);
  faseAnterior = fase.n;

  pintarFase(fase, perfectos);
  /* El emoji va con el titulo porque el cuerpo es un dibujo fijo y ya no pone
     cara. Ver EMOJI_ANIMO en sprite.js. */
  $('mascotaTitulo').textContent = emojiDeAnimo(est.animo) + ' ' + est.titulo;

  /* Sin peso no se puede dibujar SU cuerpo: se dibuja uno medio y se pide el
     dato, en vez de disimular que el muneco es cualquiera. */
  /* El texto se corta en dos lineas por CSS; el completo queda en el title para
     el que quiera leerlo entero. */
  $('mascotaDetalle').title = est.texto || '';
  $('mascotaDetalle').textContent = !cuerpo.hayDatos
    ? 'Cargá tu peso y el muñeco va a tener tu cuerpo, no uno cualquiera.'
    : (cuerpo.aviso || fraseDelDia(d) || est.texto);

  /* Queda la barra, que muestra el avance sin ocupar un renglón. El número de
     nivel, la XP que falta y las cuatro rachas se fueron: estaban completos en
     Progreso y acá eran una segunda copia, más chica y menos legible. */
  $('mascotaBarra').style.width = Math.round(nivelDe(state.juego?.xp || 0).pct * 100) + '%';

  avisarRachasEnPeligro();

  /*
   * Tocar la tarjeta lleva a lo que la mascota está señalando.
   *
   * Las dimensiones que mira la mascota y los objetivos que se editan no se
   * llaman igual: `movimiento` se edita en "ejercicio" y `comida` no es un
   * objetivo, es la lista del día. Sin esta traducción, dos de los cuatro
   * temas abrían el modal con el título genérico y el cuerpo vacío.
   */
  $('mascotaCard').onclick = () => irAlTemaDe(est.dim);
}

/** A dónde lleva cada tema del que habla la mascota. */
const OBJETIVO_DE_DIM = {
  sueno: 'sueno',
  agua: 'agua',
  movimiento: 'ejercicio',
  animo: 'animo'
};

function irAlTemaDe(dim) {
  /* De comida no se habla en un modal: lo que hay para mirar es la lista del
     día, que ya está en la misma pantalla, un poco más abajo. */
  if (dim === 'comida') {
    $('cardComidas')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  abrirObjetivo(OBJETIVO_DE_DIM[dim] || 'animo');
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
  const r = reclamoDelDia(d, { vasos: metaVasos() });

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

/* De qué rachas ya se avisó hoy. Sin esto el aviso salta en cada render y a los
   tres toques deja de leerse. */
let avisadasHoy = null;

function avisarRachasEnPeligro() {
  if (avisadasHoy?.fecha !== hoyISO()) avisadasHoy = { fecha: hoyISO(), ids: new Set() };

  const enPeligro = rachasEnPeligro(state.dias, {
    vasos: metaVasos(),
    juego: state.juego
  });

  for (const r of enPeligro) {
    if (avisadasHoy.ids.has(r.id)) continue;
    avisadasHoy.ids.add(r.id);
    toast(decir('rachaEnPeligro', { que: NOMBRE_ACTIVIDAD[r.id] || r.nombre.toLowerCase(), n: r.actual }));
    break;   // de a uno: dos avisos juntos se pisan
  }
}

/**
 * Recalcula rachas, XP y logros contra el historial y guarda si algo cambió.
 *
 * Se recalcula entero en vez de acumular: así borrar una comida cargada por
 * error no deja XP fantasma, y un logro no se puede ganar dos veces. Solo se
 * guarda cuando hay diferencia, o cada render dispararía una escritura.
 */
/*
 * Una firma barata del estado que le importa al juego.
 *
 * `recalcularJuego` recorre el historial entero —rachas, records, logros— y se
 * llamaba en CADA render de Hoy, aunque no hubiera cambiado nada. La firma
 * junta lo unico que puede alterar el resultado, y si no se movió, el recálculo
 * se saltea entero.
 */
function firmaDelJuego() {
  const d = dia();
  return [
    hoyISO(),
    Object.keys(state.dias).length,
    (d.comidas || []).length,
    d.agua || 0,
    d.ejercicio || 0,
    d.sueno?.horas || 0,
    metaVasos()
  ].join('|');
}

let ultimaFirmaJuego = null;
let ultimoResultadoJuego = null;

function actualizarJuego() {
  const firma = firmaDelJuego();
  if (firma === ultimaFirmaJuego && ultimoResultadoJuego) return ultimoResultadoJuego;

  const antes = JSON.stringify(state.juego || {});
  const nivelPrevio = nivelDe(state.juego?.xp || 0).nivel;

  const r = recalcularJuego(state.dias, state.juego, {
    vasos: metaVasos()
  });

  state.juego = { ...r.juego, anunciados: (state.juego?.anunciados || []).slice() };

  if (JSON.stringify(state.juego) !== antes) save();
  sonarObjetivosNuevos();
  anunciarNovedades(r, nivelPrevio);
  anunciarFase();

  ultimaFirmaJuego = firma;
  ultimoResultadoJuego = r;
  return r;
}

/* La fase anterior, para saber si subió o se cayó. Arranca en null y no en 0
   para que abrir la app ya en fase 3 no festeje tres veces de golpe. */
let fasePrevia = null;

function anunciarFase() {
  const n = diasPerfectos(state.dias, { vasos: metaVasos() });
  const fase = faseDe(n);

  if (fasePrevia === null) { fasePrevia = fase.n; return; }
  if (fase.n === fasePrevia) return;

  if (fase.n > fasePrevia) {
    transformarse(fase);
    festejar({ icono: '⚡', titulo: fase.nombre, texto: decir('fase', { fase: fase.nombre, n }), sonido: 'transformacion' });
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
    vasos: metaVasos(),
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
 * El momento de subir de fase: el personaje grita y suelta el ki.
 *
 * Se le fuerza la cara de furia y la pose de la fase máxima por tres cuartos de
 * segundo, aunque la fase recién ganada sea la 1. Es el único lugar donde el
 * dibujo miente sobre el estado, y vale la pena: la transformación es un
 * instante, y un instante sin nada que lo marque no se registra como un premio.
 */
function transformarse(fase) {
  const cont = $('mascotaDibujo');
  if (!cont) return;

  const cuerpo = cuerpoDe(state.perfil, state.dias, hoyISO(), {
    bonus: bonusDePerfectos(diasPerfectos(state.dias, { vasos: metaVasos() }))
  });

  const pico = { ...fase, pose: 1, musculo: Math.max(fase.musculo, 0.5), rayos: true, n: Math.max(fase.n, 2) };
  cont.innerHTML = htmlPersonaje('genial', 86, cuerpo, pico);

  cont.classList.remove('transformando');
  void cont.offsetWidth;
  cont.classList.add('transformando');

  setTimeout(() => {
    cont.classList.remove('transformando');
    renderMascota();
  }, 780);
}

/*
 * Las cuatro rachas chiquitas se fueron de Hoy.
 *
 * Estaban dentro de la tarjeta del muñeco, ilegibles y sin poder tocarse, y
 * las mismas cuatro viven en Progreso a tamaño real. Lo único que había que
 * conservar es `avisarRachasEnPeligro()`, que no dibujaba nada: avisa cuando
 * una racha larga está por cortarse, y eso sirve igual sin verlas.
 */


/* ---------------- sueño ---------------- */
