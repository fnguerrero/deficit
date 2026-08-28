/* ============================================================
   ui/progreso.js — la pantalla de progreso.

   Tres gráficos fijos —peso, calorías y adherencia— más uno que depende del
   modo: en keto se miran los carbohidratos, en definición la proteína.
   ============================================================ */

function renderProgreso() {
  renderBrecha();
  renderSemana();
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

/*
 * El aviso de que los números propios no cuadran con la balanza.
 *
 * Se muestra en Progreso y no en Hoy a propósito: es una conclusión sobre
 * semanas, no sobre el día, y en Hoy competiría con lo único que Hoy tiene que
 * decir, que es cuánto te queda.
 */
function renderBrecha() {
  const caja = $('cardBrecha');
  if (!caja) return;

  const b = brechaConLaBalanza(state.dias, state.perfil);

  /*
   * El sesgo aprendido va acá y no solo en Calibración.
   *
   * `sesgoAprendido()` existe desde hace ciclos y solo se muestra en una
   * pantalla que hay que ir a buscar, cuando es exactamente la misma pregunta
   * que la brecha con la balanza: ¿los números de esta app son creíbles? Las
   * dos respuestas tienen que estar en el mismo lugar.
   */
  const s = sesgoAprendido(state.correcciones);
  const hayAlgo = (b && b.hayBrecha) || (s && s.avisar);

  caja.hidden = !hayAlgo;
  if (!hayAlgo) return;

  $('brechaTexto').textContent = b && b.hayBrecha
    ? b.texto
    : `Sobre ${fmtNum(s.n)} correcciones tuyas, el análisis viene estimando ${fmtNum(Math.abs(s.sesgo), 1)}% ${s.lado} de forma pareja.`;

  const detalle = [];
  if (b && b.hayBrecha) {
    detalle.push(`Son ${b.dias} días de datos: la app calculaba ${fmtKcal(b.estimado)} de gasto y la balanza dice ${fmtKcal(b.medido)}.`);
  }
  if (s && s.avisar && b && b.hayBrecha) {
    detalle.push(`Y sobre ${fmtNum(s.n)} correcciones tuyas viene estimando ${fmtNum(Math.abs(s.sesgo), 1)}% ${s.lado}.`);
  }

  $('brechaDetalle').textContent = detalle.join(' ');
  caja.classList.toggle('mala', !!(b && b.lectura === 'come-mas'));
}

/*
 * La semana de un vistazo.
 *
 * `resumenPeriodo()` estaba escrito y probado desde hacía rato y no lo mostraba
 * ninguna pantalla: los gráficos cuentan la forma de la semana, pero para saber
 * cómo viniste hay que leerlos, y nadie lee un gráfico de reojo. Cuatro números
 * grandes sí se leen.
 */
function renderSemana() {
  const caja = $('cardSemana');
  if (!caja) return;

  const calc = calcular();
  const r = resumenPeriodo(state.dias, { largo: 7, objetivo: calc?.objetivo || null });

  caja.hidden = !r.hay;
  if (!r.hay) return;

  $('semanaPill').textContent = `${r.dias} de 7 días`;

  const nums = [
    { n: fmtNum(r.promedio), t: 'kcal por día' },
    { n: r.pctCumplidos != null ? r.pctCumplidos + '%' : '—', t: 'dentro del objetivo' },
    { n: fmtNum(r.proteina) + ' g', t: 'proteína por día' },
    { n: fmtNum(r.maximo.kcal), t: 'el día más alto' }
  ];

  $('semanaNums').innerHTML = nums.map(x =>
    `<div><strong>${x.n}</strong><small>${x.t}</small></div>`).join('');

  /* El día más alto se nombra, no se reta: saber CUÁL fue es lo que permite
     acordarse de qué pasó ese día. */
  $('semanaNota').textContent = r.dias < 4
    ? 'Con menos de cuatro días registrados esto es una foto borrosa.'
    : `El más alto fue ${enFrase(etiquetaFecha(r.maximo.fecha))} y el más bajo ${enFrase(etiquetaFecha(r.minimo.fecha))}.`;
}

/* "El más alto fue el Hoy" no se puede leer. Las etiquetas relativas van en
   minúscula y sin artículo; las fechas sueltas lo llevan. */
function enFrase(etiqueta) {
  const e = String(etiqueta || '');
  return /^(hoy|ayer)$/i.test(e) ? e.toLowerCase() : 'el ' + e;
}
