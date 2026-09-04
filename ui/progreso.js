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

  /* El peso y las calorias los dibujan renderChartPeso() y renderChartKcal(),
     que vinieron de Historial: son los mismos datos con mas detalle —el dia a
     dia, la tendencia y el objetivo marcado— que los dos graficos que esta
     pantalla tenia por su cuenta. */
  renderVeredicto();
  renderRecomendaciones();
  renderChartPeso();
  renderChartCintura();
  renderProgresoMeta();
  renderChartKcal();
  renderProyeccion();
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
 * tres que contestan "como voy": el veredicto, el peso y las calorias por dia.
 * Las otras ocho estan a un toque, con su titulo y su numero a la vista. Los
 * dos avisos —la balanza y la semana— aparecen solo cuando hay algo que decir,
 * asi que cuando aparecen se abren.
 */
function abrirLoQueSeMira() {
  if (progresoAbierto) return;
  progresoAbierto = true;

  for (const sel of ['#cardBrecha', '#cardSemana', '#cardVeredicto', '#chartPeso', '#chartKcal']) {
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


/* ============================================================
   Lo que se dibujaba en Historial: las curvas y los promedios. Vive aca
   porque esta es la pantalla de las tendencias.
   ============================================================ */

function seriePesos() {
  return Object.entries(state.dias)
    .filter(([, d]) => typeof d.peso === 'number')
    .map(([f, d]) => ({ f, kg: d.peso }))
    .sort((a, b) => a.f.localeCompare(b.f));
}

function svgEl(tag, attrs, texto) {
  const el = document.createElementNS(NS_SVG, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (texto != null) el.textContent = texto;
  return el;
}

function renderChartPeso() {
  const todos = seriePesos();
  /* También mira el rango de arriba. "Todo" sigue con el tope de 120 puntos,
     que es lo que entra sin que la curva se vuelva un borrón. */
  const dias = rangoActual().dias;
  const desde = dias ? sumarDias(hoyISO(), -(dias - 1)) : null;
  const pesos = recortarSerie(desde ? todos.filter(p => p.f >= desde) : todos, 120);
  const svg = $('chartPeso');
  svg.innerHTML = '';
  $('chartVacio').hidden = pesos.length >= 2;
  $('chartLeyenda').hidden = pesos.length < 2;

  if (pesos.length < 2) { $('pesoDelta').textContent = ''; return; }

  const W = 320, H = 120, pad = 22;
  const media = mediaMovil(pesos, 7);
  const objetivo = state.perfil.pesoObj;

  const valores = pesos.map(p => p.kg).concat(media.map(p => p.kg), objetivo ? [objetivo] : []);
  const min = Math.min(...valores), max = Math.max(...valores);
  const span = (max - min) || 1;
  /*
   * El eje X va por FECHA, no por indice.
   *
   * Con el indice, dos pesadas separadas por dos meses quedaban a la misma
   * distancia que dos de dias seguidos: el grafico deformaba el tiempo y una
   * bajada lenta parecia una caida en picada. Es peor que unir con una recta,
   * porque la recta al menos no miente sobre cuando paso cada cosa.
   */
  const t0 = Date.parse(pesos[0].f + 'T00:00:00');
  const tramo = (Date.parse(pesos.at(-1).f + 'T00:00:00') - t0) || 1;
  const x = p => pad + ((Date.parse(p.f + 'T00:00:00') - t0) / tramo) * (W - pad * 2);
  const y = v => H - pad - ((v - min) / span) * (H - pad * 2);

  const pts = (serie) => serie.map(p => `${x(p).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');

  /* Y con un hueco de mas de diez dias la linea se corta: unir dos pesos con
     dos semanas de nada en el medio es dibujar una tendencia que nadie midio. */
  const HUECO = 10 * 86400000;
  const tramos = (serie) => {
    const out = [];
    let actual = [];
    serie.forEach((p, i) => {
      const previo = serie[i - 1];
      if (previo && Date.parse(p.f + 'T00:00:00') - Date.parse(previo.f + 'T00:00:00') > HUECO) {
        if (actual.length > 1) out.push(actual);
        actual = [];
      }
      actual.push(p);
    });
    if (actual.length > 1) out.push(actual);
    return out;
  };

  svg.appendChild(svgEl('polygon', { class: 'area', points: `${pad},${H - pad} ${pts(media)} ${x(pesos.at(-1))},${H - pad}` }));
  for (const t of tramos(pesos)) svg.appendChild(svgEl('polyline', { class: 'line diario', points: pts(t) }));
  for (const t of tramos(media)) svg.appendChild(svgEl('polyline', { class: 'line media', points: pts(t) }));

  if (objetivo) {
    svg.appendChild(svgEl('line', { class: 'goal', x1: pad, x2: W - pad, y1: y(objetivo), y2: y(objetivo) }));
    svg.appendChild(svgEl('text', { x: W - pad, y: y(objetivo) - 4, 'text-anchor': 'end' }, `meta ${fmtPeso(objetivo)}`));
  }

  pesos.forEach(p => svg.appendChild(svgEl('circle', { class: 'dot', cx: x(p), cy: y(p.kg), r: 2.2 })));

  svg.appendChild(svgEl('text', { x: pad, y: 12 }, fmtPeso(pesos[0].kg)));
  svg.appendChild(svgEl('text', { x: W - pad, y: 12, 'text-anchor': 'end' }, fmtPeso(pesos.at(-1).kg)));

  // la tendencia importa más que el último número suelto
  const delta = +(media.at(-1).kg - media[0].kg).toFixed(1);
  $('pesoDelta').textContent = fmtDelta(delta, 1, 'kg');

  $('chartLeyenda').lastChild.textContent = todos.length > pesos.length
    ? ` tendencia (7 días) · ${fmtNum(todos.length)} registros`
    : ' tendencia (7 días)';
}

/*
 * La curva de la cinta métrica.
 *
 * Se parece a la del peso pero no es la misma: acá hay siete puntos en medio
 * año y no ciento cincuenta, así que no lleva media móvil —promediar siete
 * días cuando medís una vez por mes no promedia nada— y la línea une puntos
 * separados por semanas, que en la cintura es exactamente lo que corresponde.
 */
function renderChartCintura() {
  const todas = serieCinturas(state.dias);
  const dias = rangoActual().dias;
  const desde = dias ? sumarDias(hoyISO(), -(dias - 1)) : null;
  const enRango = desde ? todas.filter(p => p.f >= desde) : todas;

  /* El selector de rango está pensado para datos DIARIOS. La cintura se mide
     una vez por mes, así que "7 días" o "1 mes" casi nunca tienen dos puntos y
     la tarjeta desaparecía justo cuando había medio año de mediciones. Si el
     rango elegido no alcanza, se muestran todas y la leyenda lo aclara. */
  const recortada = enRango.length >= 2;
  const serie = recortarSerie(recortada ? enRango : todas, 60);
  const card = $('cardCintura');

  /* Con menos de dos mediciones no hay curva y la tarjeta no aparece. Un dato
     opcional no se pide con un cartel vacío ocupando pantalla. */
  card.hidden = serie.length < 2;
  if (serie.length < 2) return;

  const svg = $('chartCintura');
  svg.innerHTML = '';

  const W = 320, H = 120, pad = 22;
  const meta = cinturaObjetivo(state.perfil.altura);
  const valores = serie.map(p => p.cm).concat(meta ? [meta] : []);
  const min = Math.min(...valores), max = Math.max(...valores);
  const span = (max - min) || 1;

  const t0 = Date.parse(serie[0].f + 'T00:00:00');
  const tramo = (Date.parse(serie.at(-1).f + 'T00:00:00') - t0) || 1;
  const x = p => pad + ((Date.parse(p.f + 'T00:00:00') - t0) / tramo) * (W - pad * 2);
  const y = v => H - pad - ((v - min) / span) * (H - pad * 2);
  const pts = serie.map(p => `${x(p).toFixed(1)},${y(p.cm).toFixed(1)}`).join(' ');

  svg.appendChild(svgEl('polygon', { class: 'area', points: `${pad},${H - pad} ${pts} ${x(serie.at(-1))},${H - pad}` }));
  svg.appendChild(svgEl('polyline', { class: 'line media', points: pts }));

  /* La meta no la elige nadie a ojo: es la mitad de tu altura, que es el
     umbral 0,5 del mismo índice que la app ya muestra en el perfil. */
  if (meta) {
    svg.appendChild(svgEl('line', { class: 'goal', x1: pad, x2: W - pad, y1: y(meta), y2: y(meta) }));
    svg.appendChild(svgEl('text', { x: W - pad, y: y(meta) - 4, 'text-anchor': 'end' }, `${meta} cm · 0,5`));
  }

  serie.forEach(p => svg.appendChild(svgEl('circle', { class: 'dot', cx: x(p), cy: y(p.cm), r: 2.8 })));
  svg.appendChild(svgEl('text', { x: pad, y: 12 }, `${fmtNum(serie[0].cm)} cm`));
  svg.appendChild(svgEl('text', { x: W - pad, y: 12, 'text-anchor': 'end' }, `${fmtNum(serie.at(-1).cm)} cm`));

  $('cinturaDelta').textContent = fmtDelta(+(serie.at(-1).cm - serie[0].cm).toFixed(1), 1, 'cm');

  const ica = icaDe(serie.at(-1).cm, state.perfil.altura);
  const cuantas = recortada
    ? `${serie.length} mediciones`
    : `${serie.length} mediciones, todas las que hay`;
  $('cinturaLeyenda').textContent = ica == null
    ? cuantas
    : `${cuantas} · hoy ${fmtNum(ica, 2)} sobre tu altura — ${bandaICA(ica).nombre.toLowerCase()}`;
}

function renderProgresoMeta() {
  const pesos = seriePesos();
  const meta = state.perfil.pesoObj;
  const caja = $('progresoMeta');

  if (!meta || !pesos.length) { caja.hidden = true; return; }

  const inicial = pesos[0].kg;
  const actual = pesos.at(-1).kg;
  const pct = progresoPeso(inicial, actual, meta);
  if (pct == null) { caja.hidden = true; return; }

  caja.hidden = false;
  $('progresoPct').textContent = pct + '%';
  $('progresoBar').style.width = pct + '%';

  const faltan = +(actual - meta).toFixed(1);
  $('progresoTxt').textContent = faltan > 0
    ? `Arrancaste en ${fmtPeso(inicial)}, vas por ${fmtPeso(actual)} y te faltan ${fmtPeso(faltan)}.`
    : `Llegaste a la meta: ${fmtPeso(actual)}.`;
}

function renderChartKcal() {
  const svg = $('chartKcal');
  svg.innerHTML = '';

  const calc = calcular();
  const objetivo = calc ? calc.objetivo : 0;

  /* Obedece al selector de arriba, con tope en 30 barras: más no entran
     legibles en 320 px de ancho, y el rango largo se mira en Progreso. */
  const N = Math.min(rangoActual().dias || 30, 30);
  const fechas = Array.from({ length: N }, (_, i) => sumarDias(hoyISO(), -(N - 1 - i)));
  const datos = fechas.map(f => ({
    f,
    kcal: (state.dias[f]?.comidas || []).length ? sumarComidas(state.dias[f].comidas).kcal : null
  }));
  const conDatos = datos.filter(d => d.kcal != null);

  $('kcalVacio').hidden = conDatos.length > 0;
  /* "2 días seguidos" al lado de un gráfico de calorías se lee como dos días
     dentro del objetivo, y es otra cosa: son días seguidos cargando comidas. */
  const r = rachaDias(state.dias);
  $('rachaPill').textContent = r ? `🔥 ${r} ${r === 1 ? 'día' : 'días'} cargando` : '';
  $('rachaPill').title = r ? `Cargaste comidas ${r} ${r === 1 ? 'día' : 'días'} seguidos` : '';

  if (!conDatos.length) return;

  const W = 320, H = 140, padX = 6, padTop = 14, padBottom = 20;
  const tope = Math.max(objetivo || 0, ...conDatos.map(d => d.kcal)) * 1.1 || 1;
  const ancho = (W - padX * 2) / N;
  /* Con treinta barras las iniciales de los días se pisan: se saltean. */
  const cadaEtiqueta = Math.ceil(N / 14);
  const alto = v => (v / tope) * (H - padTop - padBottom);

  datos.forEach((d, i) => {
    const bx = padX + i * ancho;
    if (d.kcal == null) {
      // el día sin cargar deja una marca mínima, para que se note el hueco
      svg.appendChild(svgEl('rect', { class: 'barra vacia', x: bx + 2, y: H - padBottom - 3, width: ancho - 4, height: 3, rx: 1.5 }));
    } else {
      const h = Math.max(3, alto(d.kcal));
      svg.appendChild(svgEl('rect', {
        class: 'barra' + (objetivo && d.kcal > objetivo ? ' over' : ''),
        x: bx + 2, y: H - padBottom - h, width: ancho - 4, height: h, rx: 2
      }));
    }
    if (i % cadaEtiqueta === 0) {
      const [yy, mm, dd] = d.f.split('-').map(Number);
      const letra = new Date(yy, mm - 1, dd).toLocaleDateString('es-AR', { weekday: 'narrow' });
      svg.appendChild(svgEl('text', { x: bx + ancho / 2, y: H - 6, 'text-anchor': 'middle' }, letra));
    }
  });

  if (objetivo) {
    const yObj = H - padBottom - alto(objetivo);
    svg.appendChild(svgEl('line', { class: 'goal', x1: padX, x2: W - padX, y1: yObj, y2: yObj }));
    svg.appendChild(svgEl('text', { x: padX, y: yObj - 4 }, `objetivo ${fmtNum(objetivo)}`));
  }
}

function renderProyeccion() {
  const p = proyectarPeso(state.dias, 4);
  const caja = $('cardProyeccion');

  if (!p) { caja.hidden = true; return; }

  caja.hidden = false;
  const meta = state.perfil.pesoObj;
  const sentido = p.kgPorSemana < 0 ? 'bajando' : (p.kgPorSemana > 0 ? 'subiendo' : 'estable');

  if (sentido === 'estable') {
    caja.innerHTML = '';
    caja.append(`Tu peso está estable según los últimos ${plural(p.diasDeDatos, 'día')}.`);
    return;
  }

  const cuando = new Date(p.fecha + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  caja.innerHTML = '';
  caja.append(`Venís ${sentido} ${fmtNum(Math.abs(p.kgPorSemana), 2)} kg por semana. Si sigue así, el ${cuando} vas a estar en `);
  const b = document.createElement('b');
  b.textContent = fmtPeso(p.proyectado);
  caja.append(b, '.');

  if (meta && p.kgPorSemana < 0 && p.proyectado <= meta) {
    caja.append(' Llegás a tu meta antes de eso.');
  }

  pintarPlazo(caja, p);
}

/*
 * Si vas a tiempo, en fechas.
 *
 * "Vas lento" es abstracto y no dice cuánto. Contra la fecha que prometía tu
 * plan, el mismo dato se vuelve una cuenta que se entiende sola.
 */
function pintarPlazo(caja, proy) {
  const perfil = state.perfil;
  const prometida = perfil.plazo || fechaDeLlegada(perfil.peso, perfil.pesoObj, perfil.ritmo);
  if (!prometida) return;

  /* El ritmo real, con el signo dado vuelta: proyectarPeso() cuenta bajar como
     negativo y fechaDeLlegada() espera cuánto se baja por semana. */
  const real = fechaDeLlegada(perfil.peso, perfil.pesoObj, -proy.kgPorSemana);
  const v = veredictoDePlazo(prometida, real);
  if (!v) return;

  const li = document.createElement('p');
  li.className = 'plazo-veredicto ' + v.estado;

  if (v.estado === 'sin-datos') {
    /* Sin fecha real no es que vayas mal: es que a este ritmo no llegás nunca,
       y eso hay que decirlo así y no con un número inventado. */
    li.textContent = `Tu plan llegaba el ${fechaLarga(prometida)}. A este ritmo no llegás.`;
  } else if (v.estado === 'en-fecha') {
    li.textContent = `Vas en fecha: tu plan llegaba el ${fechaLarga(prometida)} y a este ritmo llegás el ${fechaLarga(v.proyectada)}.`;
  } else {
    const cuanto = v.semanas === 1 ? 'una semana' : `${v.semanas} semanas`;
    li.textContent = v.estado === 'tarde'
      ? `Ibas a llegar el ${fechaLarga(prometida)}. A este ritmo llegás el ${fechaLarga(v.proyectada)}: ${cuanto} tarde.`
      : `Ibas a llegar el ${fechaLarga(prometida)} y vas más rápido: a este ritmo llegás el ${fechaLarga(v.proyectada)}, ${cuanto} antes.`;
  }

  caja.appendChild(li);
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

