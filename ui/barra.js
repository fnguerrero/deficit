/* ============================================================
   La barra de arriba: el modo, el ayuno y los datos de la persona.

   Salio de ui/objetivos.js cuando el desplegable de modos lo paso de su
   limite. El corte cayo donde ya estaba la costura: objetivos.js habla de los
   casilleros del dia y este archivo, de lo que se ve sobre ellos.
   ============================================================ */

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
    titulo.textContent = nombreCortoDeModo(m);
    titulo.title = m?.detalle || m?.resumen || 'Tocá para cambiar de modo';
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
  /* El "tocá para arrancar" se fue al subir la tira a la barra del titulo:
     comia setenta pixeles del renglon para decir lo que un boton ya dice, y los
     que faltaban eran justo los que le cortaban el nombre al modo. El "hecho"
     queda, porque ese si informa —distingue las 16 h que llevas de las 16 h que
     cerraste— y va solo cuando hay un ayuno del dia. */
  /* El texto en su propio span: en pantallas de 320 px la palabra "Ayuno" es lo
     que le come al nombre del modo los ultimos pixeles, y ahi se esconde. El
     reloj queda, y con un ayuno corriendo el texto vuelve porque entonces dice
     cuanto llevas, que no lo dice ninguna otra cosa en pantalla. */
  chipAyuno.innerHTML = `<i>⏱️</i><span>${ayunoTexto}</span>` +
    (!enCurso && d.ayuno ? '<small>hecho</small>' : '');
  chipAyuno.title = enCurso ? 'Ayuno en curso' : (d.ayuno ? 'Ayuno de hoy, ya cerrado' : 'Tocá para arrancar un ayuno');
  chipAyuno.onclick = () => abrirObjetivo('ayuno');
  cont.appendChild(chipAyuno);
}

/* ---------------- el modo, desde la barra ---------------- */

/*
 * En la barra, "Deficit moderado" se escribe "Moderado".
 *
 * Los tres deficit se llaman igual salvo por la ultima palabra, y "Deficit" es
 * el nombre de la app: no distingue nada y son los pixeles que hacen falta para
 * que el nombre entre entero al lado del icono de datos. Cortado con puntos
 * suspensivos se leia "Deficit modera...", que es justo la mitad que no sirve.
 * El nombre completo sigue en el desplegable y en Perfil.
 */
function nombreCortoDeModo(m) {
  const n = m?.nombre || 'Déficit';
  const corto = n.replace(/^Déficit\s+/i, '');
  return corto ? corto[0].toUpperCase() + corto.slice(1) : n;
}

/*
 * Los dieciséis se despliegan donde se lee el que está puesto.
 *
 * El titulo llevaba a Perfil, y ahi habia que encontrar la tarjeta del modo y
 * tocarla de nuevo: dos pantallas y tres toques para una decision que ya estaba
 * tomada en el primero. La lista la arma pintarListaDeModos(), la misma que usa
 * Perfil, para que no haya dos listas que se separen con el tiempo.
 */
let modosBarraAbierta = false;

function abrirModosBarra(abrir = !modosBarraAbierta) {
  const caja = $('modosBarra');
  if (!caja) return;

  modosBarraAbierta = abrir;
  caja.hidden = !abrir;
  const h1 = $('tituloModo');
  h1?.setAttribute('aria-expanded', String(abrir));
  h1?.parentElement?.classList.toggle('abierta', abrir);
  if (abrir) pintarListaDeModos(caja, cerrarModosBarra);
  marcarAtras();
}

function cerrarModosBarra() {
  if (modosBarraAbierta) abrirModosBarra(false);
}

$('tituloModo').onclick = () => abrirModosBarra();
$('tituloModo').onkeydown = (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrirModosBarra(); }
};

/* Tocar en cualquier otro lado la cierra, como cualquier desplegable: quedarse
   abierta tapando la pantalla del dia seria peor que el viaje a Perfil. */
document.addEventListener('click', (e) => {
  if (!modosBarraAbierta) return;
  if (e.target.closest('#modosBarra') || e.target.closest('#tituloModo')) return;
  cerrarModosBarra();
});

/* Los datos de la persona, aparte: se cargan una vez cada tanto y no tienen
   nada que ver con mirar el dia. */
$('btnDatos').onclick = () => { cerrarModosBarra(); irTab('perfil'); };
