/* ============================================================
   ui/progreso.js — la pantalla de progreso.

   Tres gráficos fijos —peso, calorías y adherencia— más uno que depende del
   modo: en keto se miran los carbohidratos, en definición la proteína.
   ============================================================ */

/* `pesoDeltaProgreso` y no `pesoDelta`: las tarjetas de Peso de Historial y de
   Progreso tenían el MISMO id, así que `$('pesoDelta')` devolvía siempre el
   primero del documento —el de Historial— y esta tarjeta mostraba el número de
   la otra pestaña, o ninguno. */
function renderProgreso() {
  /* El mismo rango que Historial: 7 días, 1 mes, 3 meses o todo. Cuánto se
     mira es la pregunta; cómo se agrupan los puntos lo decide el rango. */
  const r = rangoActual();

  renderBrecha();
  renderSemana(r);
  pintarSelRango($('selPeriodo'), renderProgreso);

  const objetivo = calcular();
  const s = seriesDe(state.dias, { periodo: r.periodo, objetivo, lapso: r.dias || diasDeHistorial() });

  /* Las curvas del peso, la cintura y las calorias se dibujan en Historial:
     son la evolucion dia a dia. Aca quedan las lecturas de esos datos. */
  renderVeredicto();
  renderRecomendaciones();
  renderComoVenis();
  pintarAdherencia(s);
  pintarDelModo(s);
  pintarSueno(objetivo);
  abrirLoQueSeMira();
}

/* Se hace una sola vez: si corriera en cada render, una tarjeta que cerraste
   se te volveria a abrir al tocar el selector de periodo. */
let progresoAbierto = false;

/**
 * Que se ve al entrar a Progreso.
 *
 * Once tarjetas apiladas eran cuatro pantallas de scroll. Quedan abiertas las
 * que contestan "como voy": el veredicto y la adherencia. El resto esta a un
 * toque, con su titulo y su numero a la vista. Los dos avisos —la balanza y la
 * semana— aparecen solo cuando hay algo que decir, asi que cuando aparecen se
 * abren.
 */
function abrirLoQueSeMira() {
  if (progresoAbierto) return;
  progresoAbierto = true;

  /* `#cardComoVenis` salio de la lista: con datos cargados mide 655 px —casi la
     pantalla entera— y adentro tiene cuatro bloques que se leen de a uno. Su
     pastilla ya dice cuantos dias resume, que es lo que hace falta para decidir
     si abrirla. */
  for (const sel of ['#cardBrecha', '#cardSemana', '#cardVeredicto']) {
    document.querySelector(sel)?.closest('.plegable')?.setAttribute('open', '');
  }
}

/** Cuántos días abarca todo el historial, para el rango "Todo". */
function diasDeHistorial() {
  const fechas = Object.keys(state.dias || {}).filter(f => (state.dias[f].comidas || []).length).sort();
  if (!fechas.length) return 30;
  return Math.max(7, diasEntre(fechas[0], hoyISO()) + 1);
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
  /* classList y no className: la tarjeta tambien lleva 'plegable', y pisar el
     atributo entero se la borraba —dejaba de plegarse y de abrirse sola. */
  card.classList.toggle('lento', r.estado === 'come-mas');
}


/* El grafico entro en la tarjeta de los numeros, debajo de la barra que mide lo
   mismo. La pastilla del promedio se fue con la tarjeta: la de la tarjeta nueva
   dice cuantos dias son, que es el dato que le faltaba al porcentaje. */
function pintarAdherencia(s) {
  $('grAdherencia').innerHTML = graficoBarras(s.puntos, 'adherencia', { meta: 80, color: 'var(--acc)', pasarEsMalo: false });
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
function renderSemana(rango = null) {
  const caja = $('cardSemana');
  if (!caja) return;

  /* El resumen sigue al rango elegido. Antes eran siete días fijos, así que
     con "3 meses" arriba la tarjeta seguía hablando de la última semana y los
     números de la pantalla contaban dos historias distintas. */
  const p = rango || rangoActual();
  const largo = p.dias || diasDeHistorial();
  const calc = calcular();
  const r = resumenPeriodo(state.dias, { largo, objetivo: calc?.objetivo || null });

  caja.hidden = !r.hay;
  if (!r.hay) return;

  const titulo = caja.querySelector('h2');
  if (titulo) titulo.textContent = p.detalle;
  $('semanaPill').textContent = `${r.dias} de ${largo} días`;

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

function renderComoVenis() {
  const calc = calcular();
  const objetivo = calc ? calc.objetivo : 0;

  const ad = adherencia(state.dias, objetivo);
  const reparto = repartoPorMomento(state.dias);
  const comp = compararSemanas(state.dias);
  const patron = patronSemanal(state.dias);

  $('cardComoVenis').hidden = !(ad || reparto.length || comp || patron);

  // adherencia
  $('bloqueAdherencia').hidden = !ad;
  if (ad) {
    $('adherenciaPct').textContent = ad.pct + '%';
    $('adherenciaBar').style.width = ad.pct + '%';
    $('adherenciaPill').textContent = `${fmtNum(ad.dias)} ${ad.dias === 1 ? 'día' : 'días'}`;
    const partes = [`${fmtNum(ad.dentro)} dentro del objetivo`];
    if (ad.excedidos) partes.push(`${fmtNum(ad.excedidos)} por encima`);
    if (ad.muyPorDebajo) partes.push(`${fmtNum(ad.muyPorDebajo)} muy por debajo`);
    $('adherenciaTxt').textContent = partes.join(' · ');
  } else {
    $('adherenciaPill').textContent = '';
  }

  // reparto por momento
  $('bloqueReparto').hidden = !reparto.length;
  const cont = $('listaReparto');
  cont.innerHTML = '';
  for (const m of reparto) {
    const fila = document.createElement('div');
    fila.className = 'reparto-fila';

    const nombre = document.createElement('span');
    nombre.className = 'nombre'; nombre.textContent = `${m.icono} ${m.nombre}`;

    const barra = document.createElement('div');
    barra.className = 'bar';
    const i = document.createElement('i');
    i.style.width = m.pct + '%';
    barra.appendChild(i);

    const pct = document.createElement('span');
    pct.className = 'pct'; pct.textContent = m.pct + '%';

    fila.append(nombre, barra, pct);
    cont.appendChild(fila);
  }

  // semana contra semana
  $('bloqueSemanas').hidden = !comp;
  if (comp) {
    const ul = $('comparacionSemanas');
    ul.innerHTML = '';
    const filas = [
      ['Promedio diario', `${fmtKcal(comp.actual.promedio)} (${fmtDelta(comp.deltaPromedio)})`],
      ['Días cargados', `${fmtNum(comp.actual.dias)} (${fmtDelta(comp.deltaDias)})`]
    ];
    if (comp.deltaPeso != null) filas.push(['Peso promedio', `${fmtPeso(comp.actual.peso)} (${fmtDelta(comp.deltaPeso, 1, 'kg')})`]);

    for (const [k, v] of filas) {
      const li = document.createElement('li');
      const s = document.createElement('span'); s.textContent = k;
      const b = document.createElement('b'); b.textContent = v;
      li.append(s, b);
      ul.appendChild(li);
    }
  }

  // día de la semana
  $('bloquePatron').hidden = !patron;
  if (patron) {
    $('patronTxt').textContent =
      `Los ${pluralDia(patron.peor.nombre)} son tu día más alto (${fmtKcal(patron.peor.promedio)} de promedio) ` +
      `y los ${pluralDia(patron.mejor.nombre)} el más bajo (${fmtKcal(patron.mejor.promedio)}).`;
  }
}

/**
 * Lo primero que se ve al entrar. Es honesto por diseño: cuando no hay datos
 * suficientes lo dice, en vez de dar un veredicto de cortesía que llevaría a
 * decidir mal.
 */
const ETIQUETA_VEREDICTO = {
  bien: 'en camino',
  lento: 'más lento',
  rapido: 'muy rápido',
  mal: 'atención',
  'sin-datos': 'sin datos'
};

/* Para poder sacar el estado anterior sin barrer las demas clases de la
   tarjeta. */
const ESTADOS_VEREDICTO = Object.keys(ETIQUETA_VEREDICTO);

function renderVeredicto() {
  const card = $('cardVeredicto');
  if (!card) return;

  const v = veredictoProgreso(state.dias, calcular());

  /* Solo el estado, sin tocar el resto de las clases: ver la nota de
     pintarSueno(). */
  card.classList.remove(...ESTADOS_VEREDICTO);
  if (v.estado) card.classList.add(v.estado);
  $('veredictoTitulo').textContent = v.titulo || '¿Cómo venís?';
  $('veredictoPill').textContent = ETIQUETA_VEREDICTO[v.estado] || '';
  $('veredictoDetalle').textContent = v.detalle;

  const datos = $('veredictoDatos');
  if (v.datos && v.datos.kgSemanaReal != null) {
    const baja = -v.datos.kgSemanaReal;
    datos.innerHTML =
      `<div><span>${baja >= 0 ? '−' : '+'}${Math.abs(baja).toFixed(2)}</span><small>kg / semana</small></div>` +
      `<div><span>${v.datos.kgSemanaEsperado.toFixed(2)}</span><small>previsto</small></div>` +
      `<div><span>${v.datos.adherencia}%</span><small>días cumplidos</small></div>`;
    datos.hidden = false;
  } else {
    datos.hidden = true;
  }
}

/** Qué conviene hacer en el modo elegido. Cambian juntas con el modo. */
function renderRecomendaciones() {
  const ul = $('listaReco');
  if (!ul) return;

  const modo = modoDe(state.perfil.modo);
  $('recoPill').textContent = modo.nombre;

  ul.innerHTML = '';
  for (const texto of recomendacionesDeModo(modo.id)) {
    const li = document.createElement('li');
    li.textContent = texto;
    ul.appendChild(li);
  }
}

