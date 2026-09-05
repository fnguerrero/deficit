/* ============================================================
   ui/logros.js — nivel, rachas y logros, y el festejo cuando entra uno nuevo.

   Vive dentro de Progreso en vez de tener pestaña propia: la barra de abajo ya
   tiene cinco botones, y "cómo venís" y "qué ganaste" son la misma pregunta.
   ============================================================ */

function renderLogros() {
  const cont = $('logrosGrilla');
  if (!cont) return;

  pintarNivel();
  pintarRachasGrandes();

  const ganados = new Set(state.juego?.logros || []);

  const fechas = state.juego?.fechasLogros || {};

  cont.innerHTML = LOGROS.map(l => {
    /* Los ganados dicen cuando. Un logro es algo que paso un dia concreto, y sin
       la fecha la tarjeta solo repite lo que ya dice el color. Los de antes de
       que se guardara la fecha se quedan con el detalle de siempre. */
    const cuando = ganados.has(l.id) && fechas[l.id] ? etiquetaFecha(fechas[l.id]) : null;
    return `
    <div class="logro${ganados.has(l.id) ? ' ganado' : ''}" title="${l.detalle}">
      <i>${l.icono}</i><b>${l.nombre}</b><small>${cuando || l.detalle}</small>
    </div>`;
  }).join('');

  $('logrosPill').textContent = `${ganados.size} de ${LOGROS.length}`;
  pintarProximoLogro();
}

/*
 * El logro más cerca de ganarse.
 *
 * Dieciséis medallas grises no dicen por dónde seguir. Una sola, con cuánto
 * falta, sí — y es lo único de esta pantalla que se puede accionar hoy.
 */
function pintarProximoLogro() {
  let caja = $('proximoLogro');
  if (!caja) {
    caja = document.createElement('p');
    caja.id = 'proximoLogro';
    caja.className = 'hint proximo-logro';
    $('logrosGrilla').parentElement.insertBefore(caja, $('logrosGrilla'));
  }

  const c = logroMasCerca(state.dias, state.juego, { ...metasDelJuego() });
  caja.hidden = !c;
  if (!c) return;

  caja.innerHTML = `<b>${c.logro.icono} ${c.logro.nombre}</b> — te falta ` +
    `${fmtNum(c.falta)} de ${fmtNum(c.meta)}. <i>${c.logro.detalle}.</i>`;
}

function pintarNivel() {
  const lvl = nivelDe(state.juego?.xp || 0);

  $('nivelPill').textContent = `Nv ${lvl.nivel} · ${lvl.nombre}`;
  $('nivelBarra').style.width = Math.round(lvl.pct * 100) + '%';
  $('nivelNota').textContent = lvl.siguiente == null
    ? `${fmtNum(lvl.xp)} XP. Llegaste al último nivel.`
    : `${fmtNum(lvl.xp)} XP · faltan ${fmtNum(lvl.faltan)} para el nivel ${lvl.nivel + 1}.`;
}

function pintarRachasGrandes() {
  const cont = $('rachasGrande');
  if (!cont) return;

  const rachas = todasLasRachas(state.dias, {
    ...metasDelJuego(),
    juego: state.juego
  });

  cont.innerHTML = rachas.map(r => `
    <div class="racha-g${r.actual > 0 ? ' viva' : ''}">
      <i>${r.icono}</i>
      <b>${r.actual}</b>
      <small>${r.nombre}</small>
      ${r.mejor > r.actual ? `<em>récord ${r.mejor}</em>` : ''}
    </div>`).join('');

  const escudos = escudosDisponibles(state.dias, state.juego);
  const faltan = DIAS_POR_ESCUDO - (diasRegistrados(state.dias) % DIAS_POR_ESCUDO);

  /* Explicar para qué sirve el escudo cada vez que se muestra: un ícono suelto
     que nadie entiende no protege nada porque nadie sabe que existe. */
  $('escudosNota').textContent = escudos > 0
    ? `🛡️ ${escudos} ${escudos === 1 ? 'escudo' : 'escudos'}: tapan un día perdido y salvan la racha. ` +
      `El próximo, en ${faltan} ${faltan === 1 ? 'día' : 'días'}.`
    : `Sin escudos. Se gana uno cada ${DIAS_POR_ESCUDO} días registrados; faltan ${faltan}.`;
}

/* ---------------- el festejo ---------------- */

/*
 * Los logros nuevos se muestran de a uno y en cola: dos carteles encimados no
 * se leen, y ganar dos juntos pasa seguido (el primer día desbloquea varios).
 */
let colaFestejos = [];
let festejando = false;

function festejar({ icono, titulo, texto, sonido = 'logro' }) {
  colaFestejos.push({ icono, titulo, texto, sonido });
  if (!festejando) siguienteFestejo();
}

function siguienteFestejo() {
  const f = colaFestejos.shift();
  if (!f) { festejando = false; return; }

  festejando = true;
  if (typeof sonidos !== 'undefined') sonidos.sonar(f.sonido);

  const capa = document.createElement('div');
  capa.className = 'festejo';
  capa.innerHTML = `<div class="festejo-caja">
      <div class="icono">${f.icono}</div>
      <h3>${f.titulo}</h3>
      <p>${f.texto}</p>
    </div>`;

  const cerrar = () => {
    if (!capa.isConnected) return;
    capa.remove();
    clearTimeout(reloj);
    siguienteFestejo();
  };

  capa.onclick = cerrar;
  const reloj = setTimeout(cerrar, 2600);
  document.body.appendChild(capa);
}

/**
 * Anuncia lo que haya aparecido desde la última vez.
 *
 * Se marca como anunciado ANTES de mostrarlo: si se marcara después y la app se
 * cierra en el medio, el mismo logro se festejaría para siempre.
 */
function anunciarNovedades(r, nivelPrevio) {
  const nuevos = (r?.nuevos || []).filter(id => !(state.juego.anunciados || []).includes(id));

  if (nuevos.length) {
    state.juego.anunciados = (state.juego.anunciados || []).concat(nuevos);
    save();

    for (const id of nuevos) {
      const l = logro(id);
      if (l) festejar({ icono: l.icono, titulo: l.nombre, texto: celebrarLogro(id) || l.detalle });
    }
  }

  const ahora = nivelDe(state.juego?.xp || 0);
  if (nivelPrevio != null && ahora.nivel > nivelPrevio) {
    festejar({ icono: '🎉', titulo: `Nivel ${ahora.nivel}`, texto: celebrarNivel(ahora), sonido: 'nivel' });
  }

  for (const s of (r?.salvadas || [])) {
    toast(contarEscudo(s));
  }
}
