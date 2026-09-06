/* ============================================================
   El peso: la tira de arriba, el editor y lo que se guarda.

   Salio de ui/hoy.js cuando la tira paso a avisar que hoy no te pesaste. El
   corte cayo en la costura: hoy.js es la pantalla del dia y este archivo es el
   unico dato que no se mide por dia sino por tendencia.
   ============================================================ */

$('btnPeso').onclick = () => {
  const v = parseFloat($('pesoHoy').value);
  if (!v || v < 20 || v > 400) { toast('Peso inválido'); return; }
  recordarCambio('el peso');
  dia().peso = v;
  if (fecha === hoyISO()) state.perfil.peso = v;
  save(); renderHoy(); renderPerfil(); renderHistorial();
  toast('Peso guardado');
  cerrarObjetivo();
};

/** El editor del peso se abre desde el tablero y necesita pintarse solo. */
function renderPeso() {
  const pesos = seriePesos();
  $('pesoHoy').value = dia().peso ?? (pesos.length ? pesos.at(-1).kg : (state.perfil.peso ?? ''));

  if (pesos.length >= 2) {
    const delta = +(pesos.at(-1).kg - pesos[0].kg).toFixed(1);
    $('pesoInfo').textContent = (delta <= 0 ? '▼' : '▲') + ' ' + fmtPeso(Math.abs(delta)) +
      ' desde el ' + etiquetaFecha(pesos[0].f) + ' (' + pesos.length + ' registros)';
  } else {
    $('pesoInfo').textContent = 'Pesate siempre a la misma hora, en ayunas.';
  }
}

/*
 * La tira del peso, arriba de todo.
 *
 * Muestra la tendencia y no el peso de hoy: entre dos días hay hasta un kilo de
 * diferencia por sal y agua, y ese número arriba invita a sacar conclusiones
 * del ruido. Sin nada cargado no desaparece: desde que el peso dejo de tener
 * casillero, esta tira es el unico lugar desde donde pesarse, y esconderla
 * hasta tener un peso seria una puerta cerrada por dentro.
 */
function renderPesoTira() {
  const el = $('pesoTira');
  if (!el) return;

  // toca donde se carga: la tendencia esta a un toque en Historial
  el.onclick = (e) => { if (e.detail > 0) e.currentTarget.blur(); abrirObjetivo('peso'); };

  const r = resumenPeso(state.dias, state.perfil, { rango: rangoActual().dias || 30 });
  el.hidden = false;
  el.classList.toggle('vacia', !r);

  if (!r) {
    $('pesoTiraKg').textContent = 'Pesarte';
    $('pesoTiraMeta').textContent = 'tocá para cargar tu peso';
    $('pesoTiraBarra').parentElement.hidden = true;
    $('pesoTiraDelta').textContent = '';
    $('pesoTiraDelta').className = 'peso-tira-delta';
    $('pesoTiraCargar').textContent = '⚖️+';
    el.classList.add('sin-pesar');
    return;
  }
  /*
   * El numero grande es el peso QUE CARGASTE, no la tendencia.
   *
   * Era al reves y no habia forma de entenderlo: cargabas 99, guardabas, y la
   * tira seguia diciendo 88,9 —la media de los ultimos dias, que con un dato
   * nuevo se mueve unos gramos—. Desde afuera eso es "no se guardo". La
   * tendencia sigue estando, abajo y con su nombre, que es donde se puede leer
   * como lo que es: el numero que no se mueve por medio kilo de agua.
   */
  const dePeso = typeof dia().peso === 'number' && dia().peso > 0 ? dia().peso : null;
  const kg = dePeso ?? r.actual;

  $('pesoTiraKg').textContent = fmtNum(kg, 1) + ' kg';
  /* Y el IMC al lado, que es el número que le da sentido a los kilos: 90 kg
     no dicen nada sin la altura. */
  const imc = imcDe(kg, state.perfil?.altura);
  const banda = bandaIMC(imc);
  const partes = [r.meta ? `objetivo ${fmtNum(r.meta, 1)}` : 'sin objetivo'];
  if (imc != null) partes.push(`IMC ${fmtNum(imc, 1)}`);
  /* La tendencia solo cuando dice algo distinto del numero de arriba. */
  if (dePeso != null && Math.abs(dePeso - r.actual) >= 0.1) {
    partes.push(`tendencia ${fmtNum(r.actual, 1)}`);
  }
  const el2 = $('pesoTiraMeta');
  el2.textContent = partes.join(' · ');
  el2.title = imc == null ? '' : `IMC ${fmtNum(imc, 1)} — ${banda ? banda.nombre : ''}`;

  const barra = $('pesoTiraBarra');
  barra.style.width = (r.pct == null ? 0 : r.pct) + '%';
  barra.parentElement.hidden = r.pct == null;

  /*
   * Si hoy no te pesaste, la tira lo dice y ese es el lugar donde hacerlo.
   *
   * Mostrar la tendencia y nada mas la convertia en un cartel: el numero de
   * arriba cambia solo cada varios dias y no se lee como algo que se toca.
   */
  const hoyPesado = dePeso != null;
  $('pesoTiraCargar').textContent = hoyPesado ? '⚖️' : '⚖️+';
  el.classList.toggle('sin-pesar', !hoyPesado);

  /* El signo del cambio no alcanza para saber si es bueno: bajar es avanzar
     cuando la meta está debajo, y lo contrario cuando querés ganar masa. */
  const d = $('pesoTiraDelta');
  if (!hoyPesado) {
    d.textContent = 'pesarte hoy';
    d.className = 'peso-tira-delta pesarte';
  } else if (!r.cambio) {
    d.textContent = 'estable';
    d.className = 'peso-tira-delta';
  } else {
    const bueno = Math.sign(r.cambio) === r.mejora;
    d.textContent = (r.cambio > 0 ? '+' : '') + fmtNum(r.cambio, 1) + ' kg';
    d.className = 'peso-tira-delta ' + (r.mejora === 0 ? '' : (bueno ? 'bien' : 'mal'));
  }

  el.title = r.faltan != null
    ? `Te faltan ${fmtNum(Math.abs(r.faltan), 1)} kg · ${r.mediciones} mediciones`
    : 'Cargá un objetivo de peso en Perfil';
}
