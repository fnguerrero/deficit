/* ============================================================
   ui/progreso.js — la pantalla de progreso.

   Tres gráficos fijos —peso, calorías y adherencia— más uno que depende del
   modo: en keto se miran los carbohidratos, en definición la proteína.
   ============================================================ */

function renderProgreso() {
  const cont = $('selPeriodo');
  if (!cont) return;

  const actual = state.cfg.periodo || 'dia';

  cont.innerHTML = '';
  for (const p of PERIODOS) {
    const b = document.createElement('button');
    b.className = 'periodo' + (p.id === actual ? ' activo' : '');
    b.textContent = p.nombre;
    b.setAttribute('aria-pressed', String(p.id === actual));
    b.onclick = () => { state.cfg.periodo = p.id; save(); renderProgreso(); };
    cont.appendChild(b);
  }

  const objetivo = calcular();
  const s = seriesDe(state.dias, { periodo: actual, objetivo });

  pintarPeso(s, actual);
  pintarKcal(s, objetivo);
  pintarAdherencia(s);
  pintarDelModo(s);
  pintarSueno(objetivo);
}

/**
 * La pregunta que más se hace quien registra: "¿cuando duermo mal como peor?".
 * Los datos de cada uno pueden contestarla, pero solo con suficientes días de
 * los dos tipos — y decir que no alcanza es parte de contestarla bien.
 */
function pintarSueno(objetivo) {
  const card = $('cardSueno');
  if (!card) return;

  const r = efectoDelSueno(state.dias, objetivo);

  $('suenoTitulo').textContent = r.titulo;
  $('suenoTexto').textContent = r.texto;
  $('suenoPill').textContent = r.hayDatos ? `${r.datos.cortos} vs ${r.datos.largos} días` : 'sin datos';
  card.className = 'card' + (r.estado === 'come-mas' ? ' lento' : '');
}

function pintarPeso(s, periodo) {
  $('grPeso').innerHTML = graficoLinea(s.puntos, 'peso', { color: 'var(--acc)' });

  const conPeso = s.puntos.filter(p => p.peso != null);
  if (conPeso.length >= 2) {
    const delta = +(conPeso.at(-1).peso - conPeso[0].peso).toFixed(1);
    $('pesoDelta').textContent = `${delta <= 0 ? '▼' : '▲'} ${fmtNum(Math.abs(delta), 1)} kg`;
    $('pesoNota').textContent = periodo === 'dia'
      ? 'Día a día el peso es ruido: agua, sal y la hora de la balanza. Mirá la tendencia, no el salto.'
      : `Promedio por ${periodo === 'semana' ? 'semana' : 'mes'}, que es donde se ve la tendencia real.`;
  } else {
    $('pesoDelta').textContent = '';
    $('pesoNota').textContent = 'Con dos registros de peso ya se puede ver algo.';
  }
}

function pintarKcal(s, objetivo) {
  $('grKcal').innerHTML = graficoBarras(s.puntos, 'kcal', { meta: objetivo?.kcal || null });

  const conKcal = s.puntos.filter(p => p.kcal != null);
  $('kcalPill').textContent = conKcal.length
    ? `${fmtNum(Math.round(conKcal.reduce((a, p) => a + p.kcal, 0) / conKcal.length))} promedio`
    : '';
}

function pintarAdherencia(s) {
  $('grAdherencia').innerHTML = graficoBarras(s.puntos, 'adherencia', { meta: 80, color: 'var(--acc)', pasarEsMalo: false });

  const con = s.puntos.filter(p => p.adherencia != null);
  $('adhPill').textContent = con.length
    ? `${Math.round(con.reduce((a, p) => a + p.adherencia, 0) / con.length)}%`
    : '';
}

function pintarDelModo(s) {
  const g = graficoDelModo(state.perfil.modo);
  const card = $('cardGrModo');

  if (!g) { card.hidden = true; return; }

  card.hidden = false;
  $('grModoTitulo').textContent = g.titulo;
  $('grModo').innerHTML = graficoLinea(s.puntos, g.campo, { color: g.color, desdeCero: true, meta: g.meta });

  const con = s.puntos.filter(p => p[g.campo] != null);
  $('grModoPill').textContent = con.length
    ? `${fmtNum(Math.round(con.reduce((a, p) => a + p[g.campo], 0) / con.length))} g`
    : '';

  $('grModoNota').textContent = g.meta
    ? `La línea punteada es tu tope de ${g.meta} g por día.`
    : 'Cuanto más parejo entre los días, mejor.';
}
