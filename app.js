/* ============================================================
   Déficit — app de déficit calórico con análisis de foto (Claude)
   Datos 100% locales (localStorage). Sin backend.
   ============================================================ */

const KEY = 'deficit.v1';
const $ = (id) => document.getElementById(id);

let state = load();
let fecha = hoyISO();          // fecha visible
let pendiente = null;          // resultado del análisis en curso

/* ---------------- persistencia ---------------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return migrar(raw ? JSON.parse(raw) : null);
  } catch {
    // el state principal quedó ilegible: se intenta con la última copia buena
    try {
      const copia = localStorage.getItem('deficit.backup');
      if (copia) {
        const s = migrar(JSON.parse(copia));
        setTimeout(() => toast('Los datos estaban dañados: restauré la última copia'), 400);
        return s;
      }
    } catch { /* la copia tampoco sirve */ }
    return migrar(null);
  }
}

const KEY_BACKUP = 'deficit.backup';

function save() {
  const texto = JSON.stringify(state);

  try {
    // antes de pisar lo guardado, la versión anterior queda como copia de respaldo
    const anterior = localStorage.getItem(KEY);
    if (anterior && anterior !== texto) localStorage.setItem(KEY_BACKUP, anterior);

    localStorage.setItem(KEY, texto);
  } catch (e) {
    // almacenamiento lleno: primero se sueltan las miniaturas viejas
    purgarThumbs();
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      toast('Liberé espacio borrando fotos viejas');
    } catch {
      // si sigue sin entrar, la copia de respaldo es lo primero que se sacrifica
      localStorage.removeItem(KEY_BACKUP);
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch { toast('No se pudo guardar: almacenamiento lleno'); }
    }
  }
}

/** La copia de respaldo permite volver atrás si el state principal se corrompe. */
function hayBackup() {
  const b = localStorage.getItem(KEY_BACKUP);
  if (!b) return null;
  try {
    const s = JSON.parse(b);
    const dias = Object.keys(s.dias || {}).length;
    return { texto: b, dias, kb: Math.round(b.length / 1024) };
  } catch {
    return null;
  }
}

function restaurarBackup() {
  const b = hayBackup();
  if (!b) { toast('No hay copia guardada'); return; }
  state = migrar(JSON.parse(b.texto));
  localStorage.setItem(KEY, JSON.stringify(state));
  renderAll();
  toast('Copia restaurada');
}

function purgarThumbs() {
  const fechas = Object.keys(state.dias).sort();
  for (const f of fechas.slice(0, Math.max(1, fechas.length - 7))) {
    (state.dias[f].comidas || []).forEach(c => delete c.thumb);
  }
}

function dia(f = fecha) {
  if (!state.dias[f]) state.dias[f] = { comidas: [], peso: null };
  if (!state.dias[f].comidas) state.dias[f].comidas = [];
  return state.dias[f];
}

/* ---------------- cálculo (envuelve a core.js) ---------------- */

function calcular() {
  return calcularPlan(state.perfil);
}

function totalesDia(f = fecha) {
  return sumarComidas(dia(f).comidas);
}

/* ---------------- render: HOY ---------------- */

function renderHoy() {
  $('dateLabel').textContent = etiquetaFecha(fecha);
  $('nextDay').disabled = fecha >= hoyISO();

  // al estar parado en otro día, que quede claro que lo que cargues va ahí
  const esOtroDia = fecha !== hoyISO();
  $('avisoDia').hidden = !esOtroDia;
  if (esOtroDia) $('avisoDiaTxt').textContent = `Estás editando ${etiquetaFecha(fecha)}. Lo que cargues se guarda en ese día.`;

  const calc = calcular();
  const t = totalesDia();
  const d = dia();
  // lo quemado con ejercicio amplía el margen del día
  const objetivo = calc ? objetivoEfectivo(calc.objetivo, d.ejercicio) : 0;

  $('ringKcal').textContent = fmtNum(t.kcal);
  $('ringGoal').textContent = objetivo ? `/ ${fmtKcal(objetivo)}` : 'sin objetivo';

  const C = 2 * Math.PI * 52;
  const pct = objetivo ? Math.min(t.kcal / objetivo, 1) : 0;
  const ring = $('ringFg');
  ring.style.strokeDasharray = C;
  ring.style.strokeDashoffset = C * (1 - pct);
  ring.classList.toggle('over', objetivo > 0 && t.kcal > objetivo);
  ring.classList.toggle('near', objetivo > 0 && t.kcal <= objetivo && t.kcal > objetivo * 0.85);

  $('statRestante').textContent = objetivo ? fmtNum(Math.max(objetivo - t.kcal, 0)) : '—';
  $('statObjetivo').textContent = objetivo ? fmtNum(objetivo) : '—';
  $('statTdee').textContent = calc ? fmtNum(calc.tdee) : '—';

  const m = calc ? calc.macros : { prot: 0, carb: 0, gras: 0 };
  const setMacro = (k, val, meta) => {
    $(`m${k}Txt`).textContent = meta ? `${fmtNum(val)} / ${fmtNum(meta)} g` : `${fmtNum(val)} g`;
    $(`m${k}Bar`).style.width = meta ? Math.min((val / meta) * 100, 100) + '%' : '0%';
  };
  setMacro('Prot', t.prot, m.prot);
  setMacro('Carb', t.carb, m.carb);
  setMacro('Gras', t.gras, m.gras);

  // comidas
  const ul = $('listaComidas');
  const comidas = dia().comidas;
  ul.innerHTML = '';
  $('comidasCount').textContent = comidas.length;
  $('comidasVacio').hidden = comidas.length > 0;

  for (const grupo of agruparPorMomento(comidas)) {
    const cab = document.createElement('li');
    cab.className = 'grupo';
    const gn = document.createElement('b');
    gn.textContent = `${grupo.icono} ${grupo.nombre}`;
    const gk = document.createElement('span');
    gk.textContent = fmtKcal(grupo.kcal);
    cab.append(gn, gk);
    ul.appendChild(cab);

    for (const c of grupo.comidas) {
      const li = document.createElement('li');
      const hora = new Date(c.ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const detalle = (c.items || []).map(i => i.nombre).join(', ');

      if (c.thumb) {
        const img = document.createElement('img');
        img.className = 'thumb'; img.src = c.thumb; img.alt = '';
        li.appendChild(img);
      }

      const info = document.createElement('div');
      info.className = 'info';
      const b = document.createElement('b'); b.textContent = c.titulo || 'Comida';
      const sm = document.createElement('small');
      sm.textContent = `${hora} · P ${fmtNum(c.prot)}g · C ${fmtNum(c.carb)}g · G ${fmtNum(c.gras)}g` +
        (detalle ? ` · ${detalle}` : '');
      info.append(b, sm);

      const kcal = document.createElement('span');
      kcal.className = 'kcal'; kcal.textContent = fmtNum(Math.round(c.kcal));

      const del = document.createElement('button');
      del.className = 'del'; del.textContent = '×';
      del.title = 'Borrar'; del.setAttribute('aria-label', 'Borrar ' + (c.titulo || 'comida'));
      del.onclick = (e) => { e.stopPropagation(); borrarComida(c.id); };

      li.className = 'clicable';
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-label', 'Editar ' + (c.titulo || 'comida'));
      li.onclick = () => editarComida(c.id);
      li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editarComida(c.id); } };

      li.append(info, kcal, del);
      ul.appendChild(li);
    }
  }

  renderSinKey();
  renderAgua();
  renderEjercicio();

  // peso
  $('pesoHoy').value = dia().peso ?? '';
  const pesos = seriePesos();
  if (pesos.length >= 2) {
    const delta = +(pesos.at(-1).kg - pesos[0].kg).toFixed(1);
    $('pesoInfo').textContent = `${delta <= 0 ? '▼' : '▲'} ${fmtPeso(Math.abs(delta))} desde el ${etiquetaFecha(pesos[0].f)} (${pesos.length} registros)`;
  } else {
    $('pesoInfo').textContent = 'Pesate siempre a la misma hora, en ayunas.';
  }
}

/** Sin API key la app sigue andando: solo se avisa, y una sola vez. */
function renderSinKey() {
  $('cardSinKey').hidden = !!state.cfg.apiKey || !!state.cfg.avisoKeyOculto;
}

$('btnIrAjustes').onclick = () => irTab('ajustes');
$('btnOcultarKey').onclick = () => {
  state.cfg.avisoKeyOculto = true;
  save(); renderSinKey();
};

/* ---------------- agua y ejercicio ---------------- */

function renderAgua() {
  const meta = objetivoAgua(state.perfil.peso);
  const vasos = dia().agua || 0;

  $('aguaCount').textContent = `${vasos} / ${meta}`;
  $('aguaMenos').disabled = vasos <= 0;

  const cont = $('aguaVasos');
  cont.innerHTML = '';
  for (let i = 0; i < meta; i++) {
    const v = document.createElement('i');
    v.className = i < vasos ? 'lleno' : '';
    cont.appendChild(v);
  }
  // los vasos de más se muestran igual, no se pierden
  for (let i = meta; i < vasos; i++) {
    const v = document.createElement('i');
    v.className = 'lleno extra';
    cont.appendChild(v);
  }

  const litros = (vasos * ML_POR_VASO) / 1000;
  $('aguaInfo').textContent = vasos >= meta
    ? `${fmtNum(litros, 2)} L — objetivo cumplido`
    : `${fmtNum(litros, 2)} L de ${fmtNum((meta * ML_POR_VASO) / 1000, 2)} L`;
}

function cambiarAgua(delta) {
  const d = dia();
  d.agua = Math.max(0, (d.agua || 0) + delta);
  save(); renderAgua();
}

$('aguaMas').onclick = () => cambiarAgua(1);
$('aguaMenos').onclick = () => cambiarAgua(-1);

function renderEjercicio() {
  const kcal = dia().ejercicio || 0;
  $('ejercicioPill').textContent = fmtKcal(kcal);
  $('ejercicioHoy').value = kcal || '';
  $('ejercicioInfo').textContent = kcal
    ? `Tu objetivo de hoy sube a ${fmtKcal(objetivoEfectivo(calcular()?.objetivo || 0, kcal))}.`
    : 'Lo que quemes se suma al objetivo del día.';
}

$('btnEjercicio').onclick = () => {
  const v = parseInt($('ejercicioHoy').value, 10);
  if (isNaN(v) || v < 0 || v > 5000) { toast('Valor inválido'); return; }
  dia().ejercicio = v;
  save(); renderHoy();
  toast('Ejercicio guardado');
};

function editarComida(id) {
  const c = dia().comidas.find(x => x.id === id);
  if (!c) return;

  // una comida vieja sin desglose se edita como un único alimento
  const items = (c.items && c.items.length)
    ? clonar(c.items)
    : [{ nombre: c.titulo || 'Comida', porcion: '', calorias: c.kcal, proteinas: c.prot, carbohidratos: c.carb, grasas: c.gras }];

  pendiente = {
    editandoId: c.id,
    titulo: c.titulo || '',
    momento: c.momento || momentoDe(c.ts),
    confianza: 'alta',
    notas: c.notas || '',
    thumb: c.thumb || null,
    items
  };

  $('modalTitle').textContent = 'Editar comida';
  mostrarResultado(pendiente);
  mostrarEstado('result');
  abrirModal();
}

function borrarComida(id) {
  const d = dia();
  const pos = d.comidas.findIndex(x => x.id === id);
  if (pos < 0) return;

  const [borrada] = d.comidas.splice(pos, 1);
  const fechaBorrado = fecha;
  save(); renderHoy();

  toast('Comida borrada', {
    texto: 'Deshacer',
    accion: () => {
      // vuelve a su día y a su posición original, aunque hayas cambiado de fecha
      const destino = dia(fechaBorrado);
      destino.comidas.splice(Math.min(pos, destino.comidas.length), 0, borrada);
      save(); renderHoy(); renderHistorial();
      toast('Restaurada');
    }
  });
}

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
  renderChartPeso();
  renderProgresoMeta();
  renderChartKcal();
  renderListaDias();
  renderResumen();
}

/* --- curva de peso con media móvil --- */

function renderChartPeso() {
  const pesos = seriePesos();
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

/* ---------------- render: PERFIL ---------------- */

function renderPerfil() {
  const p = state.perfil;
  $('pSexo').value = p.sexo;
  $('pEdad').value = p.edad ?? '';
  $('pAltura').value = p.altura ?? '';
  $('pPeso').value = p.peso ?? '';
  $('pPesoObj').value = p.pesoObj ?? '';
  $('pActividad').value = p.actividad;
  $('pRitmo').value = p.ritmo;
  $('pManual').value = p.manual ?? '';

  const calc = calcular();
  const ul = $('calcLista');
  ul.innerHTML = '';

  if (!calc) {
    $('calcAviso').textContent = 'Completá edad, altura y peso para ver tu objetivo.';
    return;
  }

  const filas = [
    ['Metabolismo basal (TMB)', fmtKcal(calc.tmb)],
    ['Gasto total estimado (TDEE)', fmtKcal(calc.tdee)],
    ['Objetivo diario', fmtKcal(calc.objetivo)],
    ['Déficit', `${fmtNum(calc.deficitReal)} kcal/día`],
    ['Pérdida estimada', `${fmtNum(calc.kgSemana, 2)} kg/semana`],
    ['Proteínas / Carbos / Grasas', `${fmtNum(calc.macros.prot)} / ${fmtNum(calc.macros.carb)} / ${fmtNum(calc.macros.gras)} g`]
  ];
  if (calc.semanas) {
    const meta = new Date(Date.now() + calc.semanas * 7 * 86400000)
      .toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    filas.push(['Llegás a la meta en', `${calc.semanas} semanas (~${meta})`]);
  }

  for (const [k, v] of filas) {
    const li = document.createElement('li');
    const s = document.createElement('span'); s.textContent = k;
    const b = document.createElement('b'); b.textContent = v;
    li.append(s, b); ul.appendChild(li);
  }

  $('calcAviso').textContent = state.perfil.manual
    ? 'Estás usando un objetivo manual; el ritmo de pérdida se recalcula a partir de ese valor.'
    : calc.ajustado
      ? `El ritmo elegido daba por debajo del piso seguro (${fmtKcal(calc.piso)}). Se ajustó el objetivo.`
      : 'Mifflin-St Jeor. Es una estimación: ajustala según cómo evolucione tu peso real.';
}

/* ---------------- render: AJUSTES ---------------- */

function renderAjustes() {
  $('apiKey').value = state.cfg.apiKey || '';
  $('modelo').value = state.cfg.modelo || 'claude-opus-5';
  const nDias = Object.keys(state.dias).length;
  const nCom = Object.values(state.dias).reduce((a, d) => a + (d.comidas?.length || 0), 0);
  const kb = Math.round((localStorage.getItem(KEY) || '').length / 1024);
  $('statsInfo').textContent = `${fmtNum(nDias)} días · ${fmtNum(nCom)} comidas · ${fmtNum(kb)} KB usados`;

  // aviso de cuota antes de que un guardado falle
  const uso = usoAlmacenamiento(localStorage.getItem(KEY) || '');
  const barra = $('barraCuota');
  barra.style.width = Math.min(uso.pct, 100) + '%';
  barra.className = uso.critico ? 'critico' : (uso.alerta ? 'alerta' : '');

  const thumbs = pesoDeThumbs(state.dias);
  $('avisoCuota').hidden = !uso.alerta;
  $('btnLiberar').hidden = !uso.alerta || !thumbs.cantidad;
  if (uso.alerta) {
    $('avisoCuota').textContent = uso.critico
      ? `Estás al ${uso.pct}% del espacio disponible. Liberá lugar o exportá y borrá días viejos.`
      : `Vas por el ${uso.pct}% del espacio. Las ${fmtNum(thumbs.cantidad)} fotos guardadas ocupan ${fmtNum(thumbs.kb)} KB.`;
  }

  const backup = hayBackup();
  $('btnRestaurar').hidden = !backup;
  $('backupInfo').textContent = backup
    ? `Copia de respaldo: ${fmtNum(backup.dias)} días, ${fmtNum(backup.kb)} KB.`
    : 'Todavía no hay copia de respaldo.';

  const u = state.uso;
  $('usoInfo').textContent = u.llamadas
    ? `${fmtNum(u.llamadas)} ${u.llamadas === 1 ? 'análisis' : 'análisis'} · ${fmtNum(u.tokens)} tokens · US$ ${fmtNum(u.costo, 4)} en total`
    : 'Todavía no analizaste ninguna foto.';
}

function renderAll() {
  renderHoy(); renderHistorial(); renderPerfil(); renderAjustes();
}

/* ---------------- navegación ---------------- */

function irTab(name) {
  document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + name));
  document.querySelectorAll('.tab-btn').forEach(b => {
    const activo = b.dataset.tab === name;
    b.classList.toggle('active', activo);
    b.setAttribute('aria-selected', String(activo));
  });
  if (name === 'historial') renderHistorial();
  if (name === 'hoy') renderHoy();
  if (name === 'ajustes') renderAjustes();
  window.scrollTo(0, 0);
}

document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => irTab(b.dataset.tab));
$('volverHoy').onclick = () => { fecha = hoyISO(); renderHoy(); };
$('prevDay').onclick = () => { fecha = sumarDias(fecha, -1); renderHoy(); };
$('nextDay').onclick = () => { if (fecha < hoyISO()) { fecha = sumarDias(fecha, 1); renderHoy(); } };

/* ---------------- toast ---------------- */

let toastT;

/** toast('guardado') o toast('borrado', { texto: 'Deshacer', accion: fn }) */
function toast(msg, opcion) {
  const el = $('toast');
  el.innerHTML = '';
  el.appendChild(document.createTextNode(msg));

  if (opcion) {
    const b = document.createElement('button');
    b.textContent = opcion.texto;
    b.onclick = () => {
      clearTimeout(toastT);
      el.classList.remove('show');
      opcion.accion();
    };
    el.appendChild(b);
  }

  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), opcion ? 6000 : 2200);
}

/* ---------------- imagen ---------------- */

function leerArchivo(file) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = () => rej(new Error('No se pudo leer la imagen'));
    fr.readAsDataURL(file);
  });
}

function redimensionar(dataUrl, max, calidad) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const esc = Math.min(1, max / Math.max(img.width, img.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(img.width * esc);
      cv.height = Math.round(img.height * esc);
      cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
      res(cv.toDataURL('image/jpeg', calidad));
    };
    img.onerror = () => rej(new Error('Imagen inválida'));
    img.src = dataUrl;
  });
}

/* ---------------- análisis con Claude ---------------- */

let analisisEnCurso = null;   // AbortController del análisis activo

/** Contexto que se le manda al modelo para que nombre mejor los alimentos. */
function contextoDelUsuario() {
  const calc = calcular();
  return {
    momento: nombreMomento(momentoDe(Date.now())),
    objetivo: calc ? objetivoEfectivo(calc.objetivo, dia().ejercicio) : null,
    consumido: totalesDia().kcal,
    frecuentes: (state.frecuentes || []).slice(0, 15).map(f => f.nombre)
  };
}

/** Llama a la API con la imagen actual. `opciones` permite corregir o leer etiquetas. */
async function analizarFoto(b64jpeg, opciones = {}) {
  analisisEnCurso = new AbortController();
  try {
    return await analizarImagen({
      fetchFn: (...a) => fetch(...a),
      apiKey: state.cfg.apiKey,
      modelo: state.cfg.modelo || MODELO_DEFAULT,
      imagen: b64jpeg,
      contexto: contextoDelUsuario(),
      señal: analisisEnCurso.signal,
      ...opciones
    });
  } finally {
    analisisEnCurso = null;
  }
}

function cancelarAnalisis() {
  if (analisisEnCurso) {
    analisisEnCurso.abort();
    analisisEnCurso = null;
  }
}

/* ---------------- modal ---------------- */

function abrirModal() { $('modal').classList.add('open'); }
function cerrarModal() {
  cancelarAnalisis();
  $('modal').classList.remove('open');
  pendiente = null;
  $('fileInput').value = '';
}

function mostrarEstado(cual) {
  $('analisisLoading').hidden = cual !== 'loading';
  $('analisisResult').hidden = cual !== 'result';
  $('analisisRepetir').hidden = cual !== 'repetir';
  $('analisisError').hidden = cual !== 'error';
  $('btnGuardarComida').disabled = cual !== 'result';
  $('btnGuardarComida').hidden = cual === 'repetir';
}

$('modalClose').onclick = cerrarModal;
$('btnCancelar').onclick = cerrarModal;
$('modal').onclick = e => { if (e.target.id === 'modal') cerrarModal(); };
$('btnCancelarAnalisis').onclick = cerrarModal;

$('btnCorregir').onclick = () => {
  const txt = $('inputCorreccion').value;
  if (!txt.trim()) { toast('Escribí qué estuvo mal'); return; }
  $('inputCorreccion').value = '';
  reanalizarConCorreccion(txt);
};
$('inputCorreccion').onkeydown = (e) => { if (e.key === 'Enter') $('btnCorregir').click(); };

/* ---------------- flujo foto ---------------- */

let ultimaImagen = null;   // base64 del último análisis, para poder corregirlo
let modoAnalisis = 'plato';

function pedirFoto(modo) {
  if (!state.cfg.apiKey) {
    state.cfg.avisoKeyOculto = false;   // si la busca, la tarjeta vuelve a aparecer
    save(); renderSinKey();
    toast('Falta la API key', { texto: 'Cargarla', accion: () => irTab('ajustes') });
    return;
  }
  modoAnalisis = modo;
  $('fileInput').click();
}

$('btnFoto').onclick = () => pedirFoto('plato');
$('btnEtiqueta').onclick = () => pedirFoto('etiqueta');

const FRASES = {
  plato: [
    'Claude está mirando el plato…',
    'Identificando los alimentos…',
    'Estimando las porciones…',
    'Calculando calorías y macros…'
  ],
  etiqueta: [
    'Leyendo la etiqueta…',
    'Buscando la tabla nutricional…',
    'Pasando los valores a una porción…'
  ]
};

/** Rota las frases de espera y devuelve la función para frenarlas. */
function animarEspera(modo) {
  const frases = FRASES[modo] || FRASES.plato;
  let i = 0;
  $('loadingTxt').textContent = frases[0];
  const t = setInterval(() => { i = (i + 1) % frases.length; $('loadingTxt').textContent = frases[i]; }, 2600);
  return () => clearInterval(t);
}

$('fileInput').onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const modo = modoAnalisis;
  $('modalTitle').textContent = modo === 'etiqueta' ? 'Leyendo etiqueta' : 'Analizando foto';
  mostrarEstado('loading');
  abrirModal();
  const frenar = animarEspera(modo);

  try {
    const original = await leerArchivo(file);
    const grande = await redimensionar(original, 1024, 0.82);
    const thumb = await redimensionar(original, 128, 0.55);
    $('preview').src = grande;
    ultimaImagen = grande.split(',')[1];

    const r = await analizarFoto(ultimaImagen, { modo });
    frenar();
    registrarUso(r);
    pendiente = { ...r, thumb, momento: momentoDe(Date.now()) };
    $('modalTitle').textContent = 'Revisá y guardá';
    mostrarResultado(pendiente);
    mostrarEstado('result');
  } catch (err) {
    frenar();
    if (err.name === 'AbortError') return;   // lo canceló la persona: el modal ya se cerró
    $('modalTitle').textContent = 'No salió';
    $('errorTxt').textContent = err.message;
    mostrarEstado('error');
  }
};

/* ---------------- corregir la estimación ---------------- */

async function reanalizarConCorreccion(texto) {
  if (!ultimaImagen || !texto.trim()) return;

  const previo = {
    titulo: pendiente.titulo,
    confianza: pendiente.confianza,
    items: pendiente.items.map(({ factor, base, ...i }) => i),
    notas: pendiente.notas || ''
  };
  const thumb = pendiente.thumb;

  $('modalTitle').textContent = 'Corrigiendo';
  mostrarEstado('loading');
  const frenar = animarEspera('plato');
  $('loadingTxt').textContent = 'Rehaciendo la estimación con tu corrección…';

  try {
    const r = await analizarFoto(ultimaImagen, { correccion: texto, previo, modo: modoAnalisis });
    frenar();
    registrarUso(r);
    pendiente = { ...r, thumb, momento: pendiente.momento };
    $('modalTitle').textContent = 'Revisá y guardá';
    mostrarResultado(pendiente);
    mostrarEstado('result');
    toast('Estimación corregida');
  } catch (err) {
    frenar();
    if (err.name === 'AbortError') return;
    $('modalTitle').textContent = 'No salió';
    $('errorTxt').textContent = err.message;
    mostrarEstado('error');
  }
}

/* ---------------- uso y costo ---------------- */

function registrarUso(r) {
  if (!r || !r.costo) return;
  const u = state.uso;
  u.llamadas += 1;
  u.costo = +(u.costo + r.costo).toFixed(6);
  u.tokens += (r.tokens?.entrada || 0) + (r.tokens?.salida || 0);
  save();
  renderAjustes();
}

/* ---------------- carga manual ---------------- */

$('btnManual').onclick = () => {
  pendiente = {
    titulo: '', confianza: 'alta', notas: '',
    momento: fecha === hoyISO() ? momentoDe(Date.now()) : 'almuerzo',
    items: [{ nombre: '', porcion: '', calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }]
  };
  $('modalTitle').textContent = 'Carga manual';
  mostrarResultado(pendiente);
  mostrarEstado('result');
  abrirModal();
};

/* ---------------- repetir una comida ---------------- */

/** Comidas de los últimos días, sin repetir títulos, la más reciente primero. */
function comidasRecientes(limite = 20, dias = 14) {
  const desde = sumarDias(hoyISO(), -dias);
  const vistas = new Set();
  const salida = [];

  const fechas = Object.keys(state.dias).filter(f => f >= desde).sort().reverse();
  for (const f of fechas) {
    for (const c of [...(state.dias[f].comidas || [])].sort((a, b) => b.ts - a.ts)) {
      const clave = normalizar(c.titulo) + '|' + Math.round(c.kcal);
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      salida.push({ comida: c, fecha: f });
      if (salida.length >= limite) return salida;
    }
  }
  return salida;
}

$('btnRepetir').onclick = () => {
  const recientes = comidasRecientes();
  const ul = $('listaRepetir');
  ul.innerHTML = '';
  $('repetirVacio').hidden = recientes.length > 0;

  for (const { comida, fecha: f } of recientes) {
    const li = document.createElement('li');
    li.className = 'clicable';
    li.tabIndex = 0;

    if (comida.thumb) {
      const img = document.createElement('img');
      img.className = 'thumb'; img.src = comida.thumb; img.alt = '';
      li.appendChild(img);
    }

    const info = document.createElement('div');
    info.className = 'info';
    const b = document.createElement('b'); b.textContent = comida.titulo;
    const sm = document.createElement('small');
    sm.textContent = `${etiquetaFecha(f)} · ${nombreMomento(comida.momento)}`;
    info.append(b, sm);

    const kcal = document.createElement('span');
    kcal.className = 'kcal'; kcal.textContent = fmtNum(Math.round(comida.kcal));

    const usar = () => precargarRepetida(comida);
    li.onclick = usar;
    li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); usar(); } };

    li.append(info, kcal);
    ul.appendChild(li);
  }

  $('modalTitle').textContent = 'Repetir una comida';
  mostrarEstado('repetir');
  abrirModal();
};

/** Carga la comida elegida en el editor, como comida nueva del momento actual. */
function precargarRepetida(c) {
  const items = (c.items && c.items.length)
    ? clonar(c.items)
    : [{ nombre: c.titulo, porcion: '', calorias: c.kcal, proteinas: c.prot, carbohidratos: c.carb, grasas: c.gras }];

  pendiente = {
    titulo: c.titulo,
    momento: momentoDe(Date.now()),
    confianza: 'alta',
    notas: '',
    thumb: c.thumb || null,
    items
  };

  $('modalTitle').textContent = 'Revisá y guardá';
  mostrarResultado(pendiente);
  mostrarEstado('result');
}

/* ---------------- resultado editable ---------------- */

function mostrarResultado(r) {
  const desc = $('resDescripcion');
  desc.innerHTML = '';
  const inp = document.createElement('input');
  inp.value = r.titulo || '';
  inp.placeholder = 'Nombre de la comida';
  inp.oninput = () => { r.titulo = inp.value; };
  desc.appendChild(inp);

  const conf = $('resConfianza');
  conf.className = 'conf';
  conf.innerHTML = '';
  if (r.thumb) {
    const c = { alta: 'Estimación confiable', media: 'Estimación aproximada', baja: 'Estimación poco confiable' };
    const b = document.createElement('b');
    b.className = r.confianza || 'media';
    b.textContent = c[r.confianza] || 'Estimación aproximada';
    conf.appendChild(b);
  }

  pintarMomentos(r);
  pintarItems(r);
  $('resNotas').textContent = r.notas || '';

  const costo = r.costo ? `${r.modelo === 'claude-opus-5' ? 'Opus 5' : r.modelo} · ${fmtNum(r.tokens.entrada + r.tokens.salida)} tokens · ${formatearCosto(r.costo)}` : '';
  $('resCosto').textContent = costo;
  $('resCosto').hidden = !costo;

  // corregir solo tiene sentido sobre una estimación de la IA
  $('cajaCorreccion').hidden = !ultimaImagen || !r.confianza || !r.costo;
}

function pintarMomentos(r) {
  const cont = $('selMomento');
  cont.innerHTML = '';
  for (const m of MOMENTOS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `${m.icono} ${m.nombre}`;
    b.className = r.momento === m.id ? 'sel' : '';
    b.setAttribute('aria-pressed', String(r.momento === m.id));
    b.onclick = () => { r.momento = m.id; pintarMomentos(r); };
    cont.appendChild(b);
  }
}

function pintarItems(r) {
  const ul = $('resItems');
  ul.innerHTML = '';

  r.items.forEach((it, i) => {
    const li = document.createElement('li');

    const top = document.createElement('div');
    top.className = 'item-top';

    const nom = document.createElement('input');
    nom.className = 'nombre'; nom.value = it.nombre; nom.placeholder = 'Alimento';
    nom.autocomplete = 'off';

    // sugerencias desde los alimentos ya usados: completar sin gastar una llamada a la API
    const sugeridos = document.createElement('div');
    sugeridos.className = 'sugerencias';
    sugeridos.hidden = true;

    const cerrarSugerencias = () => { sugeridos.hidden = true; sugeridos.innerHTML = ''; };

    const mostrarSugerencias = () => {
      const texto = nom.value.trim();
      if (texto.length < 2) return cerrarSugerencias();

      const encontrados = buscarFrecuentes(state.frecuentes, texto, 5)
        .filter(f => normalizar(f.nombre) !== normalizar(texto));
      if (!encontrados.length) return cerrarSugerencias();

      sugeridos.innerHTML = '';
      for (const f of encontrados) {
        const b = document.createElement('button');
        b.type = 'button';
        const n = document.createElement('span'); n.textContent = f.nombre;
        const k = document.createElement('em'); k.textContent = `${Math.round(f.calorias)} kcal${f.porcion ? ' · ' + f.porcion : ''}`;
        b.append(n, k);
        b.onmousedown = (e) => e.preventDefault();   // que no se cierre por el blur antes del click
        b.onclick = () => {
          Object.assign(it, {
            nombre: f.nombre, porcion: f.porcion,
            calorias: f.calorias, proteinas: f.proteinas,
            carbohidratos: f.carbohidratos, grasas: f.grasas,
            factor: 1, base: null
          });
          cerrarSugerencias();
          pintarItems(r);
        };
        sugeridos.appendChild(b);
      }
      sugeridos.hidden = false;
    };

    nom.oninput = () => { it.nombre = nom.value; mostrarSugerencias(); };
    nom.onfocus = mostrarSugerencias;
    nom.onblur = () => setTimeout(cerrarSugerencias, 120);

    const kcal = document.createElement('input');
    kcal.className = 'kcal'; kcal.type = 'number'; kcal.inputMode = 'numeric';
    kcal.value = Math.round(it.calorias); kcal.placeholder = 'kcal';
    kcal.oninput = () => { it.calorias = Number(kcal.value) || 0; actualizarTotal(r); };

    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×';
    del.onclick = () => { r.items.splice(i, 1); pintarItems(r); };

    top.append(nom, kcal, del);

    const sub = document.createElement('div');
    sub.className = 'item-sub';
    const campos = [
      ['Porción', 'porcion', 'text'],
      ['Prot (g)', 'proteinas', 'number'],
      ['Carb (g)', 'carbohidratos', 'number'],
      ['Gras (g)', 'grasas', 'number']
    ];
    for (const [lbl, key, tipo] of campos) {
      const l = document.createElement('label');
      l.textContent = lbl;
      const inp = document.createElement('input');
      inp.type = tipo;
      inp.value = tipo === 'number' ? Math.round(it[key]) : it[key];
      inp.oninput = () => { it[key] = tipo === 'number' ? (Number(inp.value) || 0) : inp.value; };
      l.appendChild(inp);
      sub.appendChild(l);
    }

    // multiplicador de porción: siempre sobre el valor base, no sobre el ya escalado
    const escalas = document.createElement('div');
    escalas.className = 'escalas';
    for (const f of FACTORES) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = '×' + String(f).replace('.', ',');
      b.className = (it.factor || 1) === f ? 'sel' : '';
      b.onclick = () => {
        if (!it.base) it.base = clonar({ ...it, factor: undefined, base: undefined });
        const escalado = escalarItem(it.base, f);
        Object.assign(it, escalado, { factor: f, base: it.base });
        pintarItems(r);
      };
      escalas.appendChild(b);
    }

    li.append(top, sugeridos, sub, escalas);
    ul.appendChild(li);
  });

  actualizarTotal(r);
}

function actualizarTotal(r) {
  const total = r.items.reduce((a, i) => a + (Number(i.calorias) || 0), 0);
  $('resTotal').textContent = fmtKcal(total);
}

$('btnAddItem').onclick = () => {
  if (!pendiente) return;
  pendiente.items.push({ nombre: '', porcion: '', calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 });
  pintarItems(pendiente);
};

$('btnGuardarComida').onclick = () => {
  if (!pendiente) return;
  const items = pendiente.items
    .filter(i => i.nombre.trim() || i.calorias)
    // factor y base son andamiaje del editor: no se guardan
    .map(({ factor, base, ...limpio }) => limpio);
  if (!items.length) { toast('Cargá al menos un alimento'); return; }

  state.frecuentes = registrarFrecuentes(state.frecuentes, items);

  const suma = (k) => items.reduce((a, i) => a + (Number(i[k]) || 0), 0);

  // modo edición: se actualiza la comida existente y se conserva su hora
  if (pendiente.editandoId) {
    const c = dia().comidas.find(x => x.id === pendiente.editandoId);
    if (c) {
      c.titulo = pendiente.titulo?.trim() || items[0].nombre || 'Comida';
      c.items = items;
      c.momento = pendiente.momento || c.momento;
      c.kcal = suma('calorias');
      c.prot = suma('proteinas');
      c.carb = suma('carbohidratos');
      c.gras = suma('grasas');
      save(); cerrarModal(); renderHoy();
      toast('Comida actualizada');
      return;
    }
  }

  dia().comidas.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    // en un día pasado se usa la hora típica del momento, no la hora actual
    ts: tsParaFecha(fecha, pendiente.momento || momentoDe(Date.now())),
    titulo: pendiente.titulo?.trim() || items[0].nombre || 'Comida',
    items,
    momento: pendiente.momento || momentoDe(Date.now()),
    kcal: suma('calorias'),
    prot: suma('proteinas'),
    carb: suma('carbohidratos'),
    gras: suma('grasas'),
    thumb: pendiente.thumb || null,
    notas: pendiente.notas || ''
  });

  save();
  cerrarModal();
  renderHoy();
  toast('Comida guardada');
};

/* ---------------- peso ---------------- */

$('btnPeso').onclick = () => {
  const v = parseFloat($('pesoHoy').value);
  if (!v || v < 20 || v > 400) { toast('Peso inválido'); return; }
  dia().peso = v;
  if (fecha === hoyISO()) state.perfil.peso = v;
  save(); renderHoy(); renderPerfil(); renderHistorial();
  toast('Peso guardado');
};

/* ---------------- perfil ---------------- */

const CAMPOS_PERFIL = { edad: 'pEdad', altura: 'pAltura', peso: 'pPeso', pesoObj: 'pPesoObj', manual: 'pManual' };

function mostrarErroresPerfil(errores) {
  for (const [campo, id] of Object.entries(CAMPOS_PERFIL)) {
    const input = $(id);
    const label = input.parentElement;
    let msg = label.querySelector('.error-campo');

    if (errores[campo]) {
      input.classList.add('invalido');
      input.setAttribute('aria-invalid', 'true');
      if (!msg) {
        msg = document.createElement('small');
        msg.className = 'error-campo';
        label.appendChild(msg);
      }
      msg.textContent = errores[campo];
    } else {
      input.classList.remove('invalido');
      input.removeAttribute('aria-invalid');
      if (msg) msg.remove();
    }
  }
}

$('btnGuardarPerfil').onclick = () => {
  const num = (id) => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
  const propuesto = {
    sexo: $('pSexo').value,
    edad: num('pEdad'),
    altura: num('pAltura'),
    peso: num('pPeso'),
    pesoObj: num('pPesoObj'),
    actividad: parseFloat($('pActividad').value),
    ritmo: parseFloat($('pRitmo').value),
    manual: num('pManual')
  };

  const { ok, errores } = validarPerfil(propuesto);
  mostrarErroresPerfil(errores);

  if (!ok) {
    const cuantos = Object.keys(errores).length;
    toast(cuantos === 1 ? 'Revisá el campo marcado' : `Revisá los ${cuantos} campos marcados`);
    $(CAMPOS_PERFIL[Object.keys(errores)[0]])?.focus();
    return;
  }

  state.perfil = propuesto;
  save(); renderAll();
  toast('Perfil guardado');
};

/* ---------------- ajustes ---------------- */

$('btnGuardarKey').onclick = () => {
  state.cfg.apiKey = $('apiKey').value.trim();
  state.cfg.modelo = $('modelo').value;
  save();
  renderSinKey();
  toast('Guardado');
};

$('btnExport').onclick = () => {
  descargar(`deficit-${hoyISO()}.json`, JSON.stringify(state, null, 2), 'application/json');
};

/** Descarga un texto como archivo. */
function descargar(nombre, texto, tipo) {
  const blob = new Blob([texto], { type: tipo });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = nombre;
  a.click();
  URL.revokeObjectURL(a.href);
}

$('btnExportCsv').onclick = () => {
  const csv = armarCSV(state.dias);
  const filas = csv.split('\r\n').length - 1;
  if (!filas) { toast('No hay comidas para exportar'); return; }
  // BOM para que Excel reconozca los acentos
  descargar(`deficit-${hoyISO()}.csv`, '\ufeff' + csv, 'text/csv;charset=utf-8');
  toast(`${fmtNum(filas)} filas exportadas`);
};

$('btnLiberar').onclick = () => {
  const antes = pesoDeThumbs(state.dias);
  if (!antes.cantidad) return;
  for (const d of Object.values(state.dias)) {
    for (const c of d.comidas || []) delete c.thumb;
  }
  save(); renderAjustes();
  toast(`Liberé ${fmtNum(antes.kb)} KB`);
};

$('btnRestaurar').onclick = restaurarBackup;

$('btnImport').onclick = () => $('importInput').click();
$('importInput').onchange = async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const s = JSON.parse(await f.text());
    if (!s.dias) throw new Error();
    state = migrar(s);
    save(); renderAll();
    toast('Datos importados');
  } catch {
    toast('Archivo inválido');
  }
  e.target.value = '';
};

$('btnReset').onclick = () => {
  if (!confirm('¿Borrar todos los datos? Esto no se puede deshacer.')) return;
  const cfg = state.cfg;
  state = migrar(null);
  state.cfg = cfg;
  save(); renderAll();
  toast('Datos borrados');
};

/* ---------------- onboarding ---------------- */

let pasoOnb = 1;
const TOTAL_PASOS = 3;

function mostrarOnboarding() {
  // solo la primera vez: si ya cargó datos o lo cerró alguna vez, no molesta
  const sinDatos = !state.perfil.edad && !state.perfil.altura && !state.perfil.peso;
  if (state.cfg.onboardingHecho || !sinDatos) return;

  pasoOnb = 1;
  pintarPasoOnb();
  $('onboarding').hidden = false;
}

function pintarPasoOnb() {
  document.querySelectorAll('.onb-paso').forEach(s => {
    s.hidden = Number(s.dataset.paso) !== pasoOnb;
  });

  const puntos = $('onbPuntos');
  puntos.innerHTML = '';
  for (let i = 1; i <= TOTAL_PASOS; i++) {
    const p = document.createElement('i');
    if (i <= pasoOnb) p.className = 'activo';
    puntos.appendChild(p);
  }

  $('onbSiguiente').textContent = pasoOnb === 1 ? 'Empezar' : (pasoOnb === TOTAL_PASOS ? 'Listo' : 'Seguir');
  $('onbError').textContent = '';
}

function cerrarOnboarding() {
  state.cfg.onboardingHecho = true;
  save();
  $('onboarding').hidden = true;
  renderAll();
}

$('onbSaltear').onclick = cerrarOnboarding;

$('onbSiguiente').onclick = () => {
  if (pasoOnb === 2) {
    const num = (id) => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
    const propuesto = {
      sexo: $('onbSexo').value,
      edad: num('onbEdad'),
      altura: num('onbAltura'),
      peso: num('onbPeso'),
      pesoObj: num('onbPesoObj'),
      actividad: parseFloat($('onbActividad').value),
      ritmo: 0.5,
      manual: null
    };

    const { ok, errores } = validarPerfil(propuesto);
    if (!ok) {
      $('onbError').textContent = Object.values(errores)[0];
      return;
    }

    state.perfil = propuesto;
    if (propuesto.peso) dia(hoyISO()).peso = propuesto.peso;
    save();
  }

  if (pasoOnb === TOTAL_PASOS) {
    const key = $('onbKey').value.trim();
    if (key) state.cfg.apiKey = key;
    cerrarOnboarding();
    toast('Listo, ya podés cargar tu primera comida');
    return;
  }

  pasoOnb++;
  pintarPasoOnb();
};

/* ---------------- PWA ---------------- */

let swEsperando = null;

/** Muestra el banner cuando hay una versión nueva lista para tomar el control. */
function avisarActualizacion(worker) {
  swEsperando = worker;
  $('bannerUpdate').hidden = false;
}

$('btnActualizar').onclick = () => {
  $('bannerUpdate').hidden = true;
  if (swEsperando) swEsperando.postMessage('actualizar');
  else location.reload();
};

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      // ya había una esperando de una visita anterior
      if (reg.waiting && navigator.serviceWorker.controller) avisarActualizacion(reg.waiting);

      reg.addEventListener('updatefound', () => {
        const nuevo = reg.installing;
        if (!nuevo) return;
        nuevo.addEventListener('statechange', () => {
          // "installed" con un controller activo = actualización, no primera instalación
          if (nuevo.state === 'installed' && navigator.serviceWorker.controller) avisarActualizacion(nuevo);
        });
      });
    }).catch(() => { /* sin offline, no es crítico */ });

    // cuando el worker nuevo toma el control, recargamos una sola vez
    let recargando = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (recargando) return;
      recargando = true;
      location.reload();
    });
  });
}

// Chrome avisa cuándo se puede instalar; guardamos el evento para el botón de Ajustes
let promptInstalar = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  promptInstalar = e;
  $('cardInstalar').hidden = false;
});

$('btnInstalar').onclick = async () => {
  if (!promptInstalar) return;
  promptInstalar.prompt();
  const { outcome } = await promptInstalar.userChoice;
  promptInstalar = null;
  $('cardInstalar').hidden = true;
  if (outcome === 'accepted') toast('Instalada');
};

window.addEventListener('appinstalled', () => {
  $('cardInstalar').hidden = true;
  toast('Listo, ya la tenés instalada');
});

/* ---------------- arranque ---------------- */

renderAll();
mostrarOnboarding();

// acceso directo "Analizar foto" del ícono de la app
if (new URLSearchParams(location.search).get('accion') === 'foto') {
  history.replaceState(null, '', location.pathname);
  setTimeout(() => $('btnFoto').click(), 200);
}
