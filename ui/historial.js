/* ============================================================
   Pantalla Historial: curva de peso, barras de calorías, buscador,
   lista de días y la lectura de los datos.
   ============================================================ */

/* ---------------- render: HISTORIAL ---------------- */

function seriePesos() {
  return Object.entries(state.dias)
    .filter(([, d]) => typeof d.peso === 'number')
    .map(([f, d]) => ({ f, kg: d.peso }))
    .sort((a, b) => a.f.localeCompare(b.f));
}

/** Helper para armar nodos SVG. */
const NS_SVG = 'http://www.w3.org/2000/svg';
function svgEl(tag, attrs, texto) {
  const el = document.createElementNS(NS_SVG, tag);
  for (const k in attrs) el.setAttribute(k, attrs[k]);
  if (texto != null) el.textContent = texto;
  return el;
}

function renderHistorial() {
  renderBusqueda();
  renderChartPeso();
  renderProyeccion();
  renderComoVenis();
  renderProgresoMeta();
  renderChartKcal();
  renderListaDias();
  renderResumen();
}

/* --- curva de peso con media móvil --- */

function renderChartPeso() {
  const todos = seriePesos();
  const pesos = recortarSerie(todos, 120);
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
  const x = i => pad + (i * (W - pad * 2)) / Math.max(1, pesos.length - 1);
  const y = v => H - pad - ((v - min) / span) * (H - pad * 2);

  const pts = (serie) => serie.map((p, i) => `${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join(' ');

  svg.appendChild(svgEl('polygon', { class: 'area', points: `${pad},${H - pad} ${pts(media)} ${x(pesos.length - 1)},${H - pad}` }));
  svg.appendChild(svgEl('polyline', { class: 'line diario', points: pts(pesos) }));
  svg.appendChild(svgEl('polyline', { class: 'line media', points: pts(media) }));

  if (objetivo) {
    svg.appendChild(svgEl('line', { class: 'goal', x1: pad, x2: W - pad, y1: y(objetivo), y2: y(objetivo) }));
    svg.appendChild(svgEl('text', { x: W - pad, y: y(objetivo) - 4, 'text-anchor': 'end' }, `meta ${fmtPeso(objetivo)}`));
  }

  pesos.forEach((p, i) => svg.appendChild(svgEl('circle', { class: 'dot', cx: x(i), cy: y(p.kg), r: 2.2 })));

  svg.appendChild(svgEl('text', { x: pad, y: 12 }, fmtPeso(pesos[0].kg)));
  svg.appendChild(svgEl('text', { x: W - pad, y: 12, 'text-anchor': 'end' }, fmtPeso(pesos.at(-1).kg)));

  // la tendencia importa más que el último número suelto
  const delta = +(media.at(-1).kg - media[0].kg).toFixed(1);
  $('pesoDelta').textContent = fmtDelta(delta, 1, 'kg');

  $('chartLeyenda').lastChild.textContent = todos.length > pesos.length
    ? ` tendencia (7 días) · ${fmtNum(todos.length)} registros`
    : ' tendencia (7 días)';
}

/* --- progreso hacia la meta --- */

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

/* --- barras de calorías de los últimos 14 días --- */

function renderChartKcal() {
  const svg = $('chartKcal');
  svg.innerHTML = '';

  const calc = calcular();
  const objetivo = calc ? calc.objetivo : 0;

  const fechas = Array.from({ length: 14 }, (_, i) => sumarDias(hoyISO(), -(13 - i)));
  const datos = fechas.map(f => ({
    f,
    kcal: (state.dias[f]?.comidas || []).length ? sumarComidas(state.dias[f].comidas).kcal : null
  }));
  const conDatos = datos.filter(d => d.kcal != null);

  $('kcalVacio').hidden = conDatos.length > 0;
  const r = rachaDias(state.dias);
  $('rachaPill').textContent = r ? `🔥 ${r} ${r === 1 ? 'día' : 'días'} seguidos` : '';

  if (!conDatos.length) return;

  const W = 320, H = 140, padX = 6, padTop = 14, padBottom = 20;
  const tope = Math.max(objetivo || 0, ...conDatos.map(d => d.kcal)) * 1.1 || 1;
  const ancho = (W - padX * 2) / 14;
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
    const [yy, mm, dd] = d.f.split('-').map(Number);
    const letra = new Date(yy, mm - 1, dd).toLocaleDateString('es-AR', { weekday: 'narrow' });
    svg.appendChild(svgEl('text', { x: bx + ancho / 2, y: H - 6, 'text-anchor': 'middle' }, letra));
  });

  if (objetivo) {
    const yObj = H - padBottom - alto(objetivo);
    svg.appendChild(svgEl('line', { class: 'goal', x1: padX, x2: W - padX, y1: yObj, y2: yObj }));
    svg.appendChild(svgEl('text', { x: padX, y: yObj - 4 }, `objetivo ${fmtNum(objetivo)}`));
  }
}

/* --- cómo venís --- */

function renderProyeccion() {
  const p = proyectarPeso(state.dias, 4);
  const caja = $('cardProyeccion');

  if (!p) { caja.hidden = true; return; }

  caja.hidden = false;
  const meta = state.perfil.pesoObj;
  const sentido = p.kgPorSemana < 0 ? 'bajando' : (p.kgPorSemana > 0 ? 'subiendo' : 'estable');

  if (sentido === 'estable') {
    caja.innerHTML = '';
    caja.append(`Tu peso está estable según los últimos ${fmtNum(p.diasDeDatos)} días.`);
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

/** El aviso de proteína va en Hoy, que es donde todavía podés hacer algo. */
function renderAvisoProteina() {
  const calc = calcular();
  const alerta = calc ? alertaProteina(state.dias, calc.macros.prot) : null;

  $('avisoProteina').hidden = !alerta;
  if (alerta) {
    $('avisoProteinaTxt').textContent =
      `Venís ${fmtNum(alerta.dias)} días con poca proteína: ${fmtNum(alerta.promedio)} g de ${fmtNum(alerta.objetivo)} g. ` +
      `Sumá ${fmtNum(alerta.falta)} g por día para no perder músculo mientras bajás.`;
  }
}

/* --- buscador --- */

function renderBusqueda() {
  const texto = $('inputBuscar').value;
  const ul = $('resultadosBusqueda');
  ul.innerHTML = '';
  $('btnLimpiarBusqueda').hidden = !texto;

  const buscando = normalizar(texto).length >= 2;
  $('cardUltimosDias').hidden = buscando;

  if (!buscando) {
    $('resumenBusqueda').textContent = texto ? 'Escribí al menos dos letras.' : '';
    return;
  }

  const resultados = buscarEnHistorial(state.dias, texto);
  if (!resultados.length) {
    $('resumenBusqueda').textContent = `No encontré nada con "${texto}".`;
    return;
  }

  const res = resumenBusqueda(resultados);
  $('resumenBusqueda').textContent =
    `${fmtNum(res.veces)} ${res.veces === 1 ? 'vez' : 'veces'} en ${fmtNum(res.dias)} ${res.dias === 1 ? 'día' : 'días'} · ` +
    `${fmtKcal(res.kcal)} en total · ${fmtKcal(res.promedio)} promedio`;

  for (const r of resultados) {
    const li = document.createElement('li');
    li.className = 'clicable';
    li.tabIndex = 0;

    if (r.comida.thumb) {
      const img = document.createElement('img');
      img.className = 'thumb'; img.src = r.comida.thumb; img.alt = '';
      li.appendChild(img);
    }

    const info = document.createElement('div');
    info.className = 'info';
    const b = document.createElement('b'); b.textContent = r.comida.titulo;
    const sm = document.createElement('small');
    sm.textContent = `${etiquetaFecha(r.fecha)} · ${nombreMomento(r.comida.momento)}` +
      (r.donde === 'alimento' ? ` · ${r.alimentos.join(', ')}` : '') +
      (r.donde === 'nota' ? ' · aparece en la nota del día' : '');
    info.append(b, sm);

    const kcal = document.createElement('span');
    kcal.className = 'kcal'; kcal.textContent = fmtNum(Math.round(r.comida.kcal));

    const abrir = () => { fecha = r.fecha; irTab('hoy'); };
    li.onclick = abrir;
    li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } };

    li.append(info, kcal);
    ul.appendChild(li);
  }
}

let buscarT;
$('inputBuscar').oninput = () => {
  clearTimeout(buscarT);
  buscarT = setTimeout(renderBusqueda, 180);
};

$('btnLimpiarBusqueda').onclick = () => {
  $('inputBuscar').value = '';
  renderBusqueda();
  $('inputBuscar').focus();
};

/* --- lista de días --- */

function renderListaDias() {
  const calc = calcular();
  const objetivo = calc ? calc.objetivo : 0;
  const fechas = Object.keys(state.dias).filter(f => (state.dias[f].comidas || []).length).sort().reverse().slice(0, 30);
  const ul = $('listaDias');
  ul.innerHTML = '';
  $('diasVacio').hidden = fechas.length > 0;

  for (const f of fechas) {
    const t = totalesDia(f);
    const li = document.createElement('li');
    li.className = 'clicable';
    li.tabIndex = 0;
    li.setAttribute('role', 'button');
    li.setAttribute('aria-label', 'Abrir ' + etiquetaFecha(f));

    const info = document.createElement('div');
    info.className = 'info';
    const b = document.createElement('b'); b.textContent = etiquetaFecha(f);
    const sm = document.createElement('small');
    sm.textContent = `${state.dias[f].comidas.length} comidas` +
      (objetivo ? ` · ${fmtDelta(t.kcal - objetivo)} vs objetivo` : '') +
      (state.dias[f].peso ? ` · ${fmtPeso(state.dias[f].peso)}` : '');

    const bar = document.createElement('div');
    bar.className = 'dia-bar';
    const i = document.createElement('i');
    i.style.width = objetivo ? Math.min((t.kcal / objetivo) * 100, 100) + '%' : '0%';
    if (objetivo && t.kcal > objetivo) i.classList.add('over');
    bar.appendChild(i);
    info.append(b, sm, bar);

    const kcal = document.createElement('span');
    kcal.className = 'kcal'; kcal.textContent = fmtNum(t.kcal);

    const abrir = () => { fecha = f; irTab('hoy'); };
    li.onclick = abrir;
    li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); abrir(); } };

    li.append(info, kcal);
    ul.appendChild(li);
  }
}

/* --- resumen --- */

function renderResumen() {
  const calc = calcular();
  const res = $('resumenSemana');
  res.innerHTML = '';

  const bal = balanceSemanal(state.dias, calc ? calc.tdee : 0);
  const adaptativo = tdeeAdaptativo(state.dias);

  const filas = [
    ['Días registrados (7d)', `${bal.dias} / 7`],
    ['Promedio diario', bal.promedio ? fmtKcal(bal.promedio) : '—'],
    ['Objetivo', calc ? fmtKcal(calc.objetivo) : '—'],
    ['Balance de la semana', bal.dias
      ? `${fmtDelta(bal.balance)} kcal (${fmtDelta(bal.kg, 2, 'kg')})`
      : '—'],
    ['Gasto estimado (fórmula)', calc ? fmtKcal(calc.tdee) : '—'],
    ['Gasto real (tus datos)', adaptativo ? fmtKcal(adaptativo.tdee) : 'faltan datos']
  ];

  for (const [k, v] of filas) {
    const li = document.createElement('li');
    const s = document.createElement('span'); s.textContent = k;
    const b = document.createElement('b'); b.textContent = v;
    li.append(s, b);
    res.appendChild(li);
  }

  const aviso = $('avisoTdee');
  if (adaptativo) {
    const dif = adaptativo.tdee - (calc ? calc.tdee : 0);
    aviso.textContent = Math.abs(dif) < 100
      ? `Tu gasto real coincide con la fórmula (${adaptativo.diasCargados} días medidos).`
      : `Según tus ${adaptativo.dias} días de datos gastás ${fmtKcal(Math.abs(dif))} ${dif < 0 ? 'menos' : 'más'} de lo que dice la fórmula. Si el peso no baja como esperabas, ajustá el objetivo con esto.`;
  } else {
    aviso.textContent = 'Con 10 días de comidas y dos pesos cargados puedo estimar tu gasto real, que suele diferir bastante de la fórmula.';
  }
}
