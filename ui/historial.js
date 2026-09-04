/* ============================================================
   Pantalla Historial: curva de peso, barras de calorías, buscador,
   lista de días y la lectura de los datos.
   ============================================================ */

/* ---------------- render: HISTORIAL ---------------- */


/** Helper para armar nodos SVG. */
const NS_SVG = 'http://www.w3.org/2000/svg';

/* Historial son los dias, uno por uno: buscar y la lista. Las curvas y los
   promedios se fueron a Progreso, que es la pantalla de las tendencias — antes
   el peso, las calorias y el resumen del mes estaban en las dos. */
function renderHistorial() {
  renderBusqueda();
  renderListaDias();
}

/* --- curva de peso con media móvil --- */


/* --- la cintura, cuando hay con qué dibujarla --- */


/* --- progreso hacia la meta --- */


/* --- barras de calorías del rango elegido --- */


/* --- cómo venís --- */


/** El aviso de proteína va en Hoy, que es donde todavía podés hacer algo. */
function renderAvisoProteina() {
  const calc = calcular();
  const alerta = calc ? alertaProteina(state.dias, calc.macros.prot) : null;

  $('avisoProteina').hidden = !alerta;
  if (alerta) {
    $('avisoProteinaTxt').textContent =
      `Venís ${plural(alerta.dias, 'día')} con poca proteína: ${fmtNum(alerta.promedio)} g de ${fmtNum(alerta.objetivo)} g. ` +
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

/* Cuantos dias se arman de una. Antes se cortaba en 30 sin decirlo: con seis
   meses cargados el resto simplemente no existia y no habia forma de llegar. */
const DIAS_POR_PAGINA = 15;
let diasVisibles = DIAS_POR_PAGINA;

/* El boton de ver mas. Se crea una sola vez y se esconde cuando ya no queda
   nada por mostrar. */
function pintarVerMas(total) {
  let btn = $('verMasDias');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'verMasDias';
    btn.className = 'secundario ancho';
    btn.onclick = () => { diasVisibles += DIAS_POR_PAGINA; renderListaDias(); };
    $('listaDias').parentElement.appendChild(btn);
  }
  const faltan = Math.max(0, total - diasVisibles);
  btn.hidden = faltan <= 0;
  btn.textContent = `Ver ${plural(Math.min(faltan, DIAS_POR_PAGINA), 'día más', 'días más')}`;
}

/* El rango vive en graficos.js y lo comparten las dos pantallas: ver RANGOS. */

/** Las fechas con comidas que entran en el rango, de la más nueva a la más vieja. */
function fechasDelRango() {
  const todas = Object.keys(state.dias)
    .filter(f => (state.dias[f].comidas || []).length)
    .sort().reverse();

  const g = rangoActual().dias;
  if (!g) return todas;

  const desde = sumarDias(hoyISO(), -(g - 1));
  return todas.filter(f => f >= desde);
}

function renderListaDias() {
  /* Arriba de la pestaña manda sobre la pestaña entera: el gráfico de calorías
     y el de peso también miran el rango, así que se repinta todo. */
  pintarSelRango($('selRangoHist'), renderHistorial);

  const calc = calcular();
  const objetivo = calc ? calc.objetivo : 0;
  const r = rangoActual();
  const todas = fechasDelRango();
  const fechas = todas.slice(0, diasVisibles);

  const titulo = $('tituloUltimosDias');
  if (titulo) titulo.textContent = r.detalle;
  const ul = $('listaDias');
  ul.innerHTML = '';
  $('diasVacio').hidden = fechas.length > 0;
  pintarVerMas(todas.length);

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
    sm.textContent = plural(state.dias[f].comidas.length, 'comida') +
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


/* ---------------- veredicto y recomendaciones ---------------- */

const ETIQUETA_VEREDICTO = {
  bien: 'en camino',
  lento: 'más lento',
  rapido: 'muy rápido',
  mal: 'atención',
  'sin-datos': 'sin datos'
};


