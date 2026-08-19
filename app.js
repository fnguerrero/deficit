/* ============================================================
   Déficit — app de déficit calórico con análisis de foto (Claude)
   Datos 100% locales (localStorage). Sin backend.
   ============================================================ */

const KEY = 'deficit.v1';
const $ = (id) => document.getElementById(id);

const DEFAULT_STATE = {
  perfil: { sexo: 'm', edad: null, altura: null, peso: null, pesoObj: null, actividad: 1.55, ritmo: 0.5, manual: null },
  dias: {},
  cfg: { apiKey: '', modelo: 'claude-opus-5' }
};

let state = load();
let fecha = hoyISO();          // fecha visible
let pendiente = null;          // resultado del análisis en curso

/* ---------------- persistencia ---------------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const s = JSON.parse(raw);
    return {
      perfil: { ...DEFAULT_STATE.perfil, ...(s.perfil || {}) },
      dias: s.dias || {},
      cfg: { ...DEFAULT_STATE.cfg, ...(s.cfg || {}) }
    };
  } catch {
    return structuredClone(DEFAULT_STATE);
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    // storage lleno: tiramos las miniaturas más viejas y reintentamos
    purgarThumbs();
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { toast('No se pudo guardar: almacenamiento lleno'); }
  }
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

/* ---------------- fechas ---------------- */

function hoyISO(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return hoyISO(dt);
}

function etiquetaFecha(iso) {
  if (iso === hoyISO()) return 'Hoy';
  if (iso === sumarDias(hoyISO(), -1)) return 'Ayer';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/* ---------------- cálculo nutricional ---------------- */

function calcular() {
  const p = state.perfil;
  if (!p.edad || !p.altura || !p.peso) return null;

  // Mifflin-St Jeor
  const tmb = Math.round(10 * p.peso + 6.25 * p.altura - 5 * p.edad + (p.sexo === 'm' ? 5 : -161));
  const tdee = Math.round(tmb * Number(p.actividad));

  // 1 kg de grasa ≈ 7700 kcal
  const deficitDia = Math.round((Number(p.ritmo) * 7700) / 7);
  let objetivo = tdee - deficitDia;

  // piso de seguridad: nunca por debajo de la TMB ni de 1200/1500 kcal
  const piso = Math.max(tmb, p.sexo === 'm' ? 1500 : 1200);
  const ajustado = objetivo < piso;
  if (ajustado) objetivo = piso;

  if (p.manual) objetivo = Number(p.manual);

  const deficitReal = tdee - objetivo;
  const kgSemana = +((deficitReal * 7) / 7700).toFixed(2);

  let semanas = null, fechaMeta = null;
  if (p.pesoObj && p.peso > p.pesoObj && kgSemana > 0) {
    semanas = Math.ceil((p.peso - p.pesoObj) / kgSemana);
    fechaMeta = new Date(Date.now() + semanas * 7 * 86400000)
      .toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // macros objetivo: 30% proteína / 40% carbos / 30% grasas
  const macros = {
    prot: Math.round((objetivo * 0.30) / 4),
    carb: Math.round((objetivo * 0.40) / 4),
    gras: Math.round((objetivo * 0.30) / 9)
  };

  return { tmb, tdee, objetivo, deficitReal, kgSemana, semanas, fechaMeta, macros, ajustado, piso };
}

function totalesDia(f = fecha) {
  const t = { kcal: 0, prot: 0, carb: 0, gras: 0 };
  for (const c of dia(f).comidas) {
    t.kcal += c.kcal || 0; t.prot += c.prot || 0; t.carb += c.carb || 0; t.gras += c.gras || 0;
  }
  return { kcal: Math.round(t.kcal), prot: Math.round(t.prot), carb: Math.round(t.carb), gras: Math.round(t.gras) };
}

/* ---------------- render: HOY ---------------- */

function renderHoy() {
  $('dateLabel').textContent = etiquetaFecha(fecha);
  $('nextDay').disabled = fecha >= hoyISO();

  const calc = calcular();
  const t = totalesDia();
  const objetivo = calc ? calc.objetivo : 0;

  $('ringKcal').textContent = t.kcal;
  $('ringGoal').textContent = objetivo ? `/ ${objetivo} kcal` : 'sin objetivo';

  const C = 2 * Math.PI * 52;
  const pct = objetivo ? Math.min(t.kcal / objetivo, 1) : 0;
  const ring = $('ringFg');
  ring.style.strokeDasharray = C;
  ring.style.strokeDashoffset = C * (1 - pct);
  ring.classList.toggle('over', objetivo > 0 && t.kcal > objetivo);
  ring.classList.toggle('near', objetivo > 0 && t.kcal <= objetivo && t.kcal > objetivo * 0.85);

  $('statRestante').textContent = objetivo ? Math.max(objetivo - t.kcal, 0) : '—';
  $('statObjetivo').textContent = objetivo || '—';
  $('statTdee').textContent = calc ? calc.tdee : '—';

  const m = calc ? calc.macros : { prot: 0, carb: 0, gras: 0 };
  const setMacro = (k, val, meta) => {
    $(`m${k}Txt`).textContent = meta ? `${val} / ${meta} g` : `${val} g`;
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

  for (const c of comidas) {
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
    sm.textContent = `${hora} · P ${Math.round(c.prot)}g · C ${Math.round(c.carb)}g · G ${Math.round(c.gras)}g` +
      (detalle ? ` · ${detalle}` : '');
    info.append(b, sm);

    const kcal = document.createElement('span');
    kcal.className = 'kcal'; kcal.textContent = Math.round(c.kcal);

    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×'; del.title = 'Borrar';
    del.onclick = () => {
      dia().comidas = dia().comidas.filter(x => x.id !== c.id);
      save(); renderHoy(); toast('Comida borrada');
    };

    li.append(info, kcal, del);
    ul.appendChild(li);
  }

  // peso
  $('pesoHoy').value = dia().peso ?? '';
  const pesos = seriePesos();
  if (pesos.length >= 2) {
    const delta = +(pesos.at(-1).kg - pesos[0].kg).toFixed(1);
    $('pesoInfo').textContent = `${delta <= 0 ? '▼' : '▲'} ${Math.abs(delta)} kg desde el ${etiquetaFecha(pesos[0].f)} (${pesos.length} registros)`;
  } else {
    $('pesoInfo').textContent = 'Pesate siempre a la misma hora, en ayunas.';
  }
}

/* ---------------- render: HISTORIAL ---------------- */

function seriePesos() {
  return Object.entries(state.dias)
    .filter(([, d]) => typeof d.peso === 'number')
    .map(([f, d]) => ({ f, kg: d.peso }))
    .sort((a, b) => a.f.localeCompare(b.f));
}

function renderHistorial() {
  const pesos = seriePesos();
  const svg = $('chartPeso');
  $('chartVacio').hidden = pesos.length >= 2;
  svg.innerHTML = '';

  if (pesos.length >= 2) {
    const W = 320, H = 120, pad = 22;
    const objetivo = state.perfil.pesoObj;
    const vals = pesos.map(p => p.kg).concat(objetivo ? [objetivo] : []);
    const min = Math.min(...vals), max = Math.max(...vals);
    const span = (max - min) || 1;
    const x = i => pad + (i * (W - pad * 2)) / (pesos.length - 1);
    const y = v => H - pad - ((v - min) / span) * (H - pad * 2);

    const pts = pesos.map((p, i) => `${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`);
    const ns = 'http://www.w3.org/2000/svg';
    const mk = (tag, attrs) => {
      const el = document.createElementNS(ns, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      return el;
    };

    svg.appendChild(mk('polygon', {
      class: 'area',
      points: `${pad},${H - pad} ${pts.join(' ')} ${x(pesos.length - 1)},${H - pad}`
    }));
    svg.appendChild(mk('polyline', { class: 'line', points: pts.join(' ') }));

    if (objetivo) {
      svg.appendChild(mk('line', { class: 'goal', x1: pad, x2: W - pad, y1: y(objetivo), y2: y(objetivo) }));
      const tg = mk('text', { x: W - pad, y: y(objetivo) - 4, 'text-anchor': 'end' });
      tg.textContent = `meta ${objetivo} kg`;
      svg.appendChild(tg);
    }

    pesos.forEach((p, i) => svg.appendChild(mk('circle', { class: 'dot', cx: x(i), cy: y(p.kg), r: 2.6 })));

    const t1 = mk('text', { x: pad, y: 12 }); t1.textContent = `${pesos[0].kg} kg`;
    const t2 = mk('text', { x: W - pad, y: 12, 'text-anchor': 'end' }); t2.textContent = `${pesos.at(-1).kg} kg`;
    svg.append(t1, t2);

    const delta = +(pesos.at(-1).kg - pesos[0].kg).toFixed(1);
    $('pesoDelta').textContent = `${delta > 0 ? '+' : ''}${delta} kg`;
  } else {
    $('pesoDelta').textContent = '';
  }

  // días
  const calc = calcular();
  const objetivo = calc ? calc.objetivo : 0;
  const fechas = Object.keys(state.dias).filter(f => (state.dias[f].comidas || []).length).sort().reverse().slice(0, 30);
  const ul = $('listaDias');
  ul.innerHTML = '';
  $('diasVacio').hidden = fechas.length > 0;

  for (const f of fechas) {
    const t = totalesDia(f);
    const li = document.createElement('li');
    const info = document.createElement('div');
    info.className = 'info';
    const b = document.createElement('b'); b.textContent = etiquetaFecha(f);
    const sm = document.createElement('small');
    sm.textContent = `${state.dias[f].comidas.length} comidas` +
      (objetivo ? ` · ${t.kcal > objetivo ? '+' : ''}${t.kcal - objetivo} vs objetivo` : '');
    const bar = document.createElement('div');
    bar.className = 'dia-bar';
    const i = document.createElement('i');
    i.style.width = objetivo ? Math.min((t.kcal / objetivo) * 100, 100) + '%' : '0%';
    if (objetivo && t.kcal > objetivo) i.classList.add('over');
    bar.appendChild(i);
    info.append(b, sm, bar);

    const kcal = document.createElement('span');
    kcal.className = 'kcal'; kcal.textContent = t.kcal;

    li.append(info, kcal);
    li.onclick = () => { fecha = f; irTab('hoy'); };
    ul.appendChild(li);
  }

  // resumen
  const res = $('resumenSemana');
  res.innerHTML = '';
  const ult7 = [...Array(7)].map((_, i) => sumarDias(hoyISO(), -i)).filter(f => (state.dias[f]?.comidas || []).length);
  const prom = ult7.length ? Math.round(ult7.reduce((a, f) => a + totalesDia(f).kcal, 0) / ult7.length) : 0;
  const filas = [
    ['Días registrados (7d)', `${ult7.length} / 7`],
    ['Promedio diario', prom ? `${prom} kcal` : '—'],
    ['Objetivo', objetivo ? `${objetivo} kcal` : '—'],
    ['Balance promedio', (prom && objetivo) ? `${prom - objetivo > 0 ? '+' : ''}${prom - objetivo} kcal/día` : '—'],
    ['Ritmo real estimado', (prom && calc) ? `${(((calc.tdee - prom) * 7) / 7700).toFixed(2)} kg/semana` : '—']
  ];
  for (const [k, v] of filas) {
    const li = document.createElement('li');
    const s = document.createElement('span'); s.textContent = k;
    const b = document.createElement('b'); b.textContent = v;
    li.append(s, b); res.appendChild(li);
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
    ['Metabolismo basal (TMB)', `${calc.tmb} kcal`],
    ['Gasto total estimado (TDEE)', `${calc.tdee} kcal`],
    ['Objetivo diario', `${calc.objetivo} kcal`],
    ['Déficit', `${calc.deficitReal} kcal/día`],
    ['Pérdida estimada', `${calc.kgSemana} kg/semana`],
    ['Proteínas / Carbos / Grasas', `${calc.macros.prot} / ${calc.macros.carb} / ${calc.macros.gras} g`]
  ];
  if (calc.semanas) filas.push(['Llegás a la meta en', `${calc.semanas} semanas (~${calc.fechaMeta})`]);

  for (const [k, v] of filas) {
    const li = document.createElement('li');
    const s = document.createElement('span'); s.textContent = k;
    const b = document.createElement('b'); b.textContent = v;
    li.append(s, b); ul.appendChild(li);
  }

  $('calcAviso').textContent = state.perfil.manual
    ? 'Estás usando un objetivo manual; el ritmo de pérdida se recalcula a partir de ese valor.'
    : calc.ajustado
      ? `El ritmo elegido daba por debajo del piso seguro (${calc.piso} kcal). Se ajustó el objetivo.`
      : 'Mifflin-St Jeor. Es una estimación: ajustala según cómo evolucione tu peso real.';
}

/* ---------------- render: AJUSTES ---------------- */

function renderAjustes() {
  $('apiKey').value = state.cfg.apiKey || '';
  $('modelo').value = state.cfg.modelo || 'claude-opus-5';
  const nDias = Object.keys(state.dias).length;
  const nCom = Object.values(state.dias).reduce((a, d) => a + (d.comidas?.length || 0), 0);
  const kb = Math.round((localStorage.getItem(KEY) || '').length / 1024);
  $('statsInfo').textContent = `${nDias} días · ${nCom} comidas · ${kb} KB usados`;
}

function renderAll() {
  renderHoy(); renderHistorial(); renderPerfil(); renderAjustes();
}

/* ---------------- navegación ---------------- */

function irTab(name) {
  document.querySelectorAll('.tab').forEach(s => s.classList.toggle('active', s.id === 'tab-' + name));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  if (name === 'historial') renderHistorial();
  if (name === 'hoy') renderHoy();
  if (name === 'ajustes') renderAjustes();
  window.scrollTo(0, 0);
}

document.querySelectorAll('.tab-btn').forEach(b => b.onclick = () => irTab(b.dataset.tab));
$('prevDay').onclick = () => { fecha = sumarDias(fecha, -1); renderHoy(); };
$('nextDay').onclick = () => { if (fecha < hoyISO()) { fecha = sumarDias(fecha, 1); renderHoy(); } };

/* ---------------- toast ---------------- */

let toastT;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('show'), 2200);
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

const SCHEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string', description: 'Nombre corto del plato, ej: "Milanesa con puré"' },
    confianza: { type: 'string', enum: ['alta', 'media', 'baja'] },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          porcion: { type: 'string', description: 'Cantidad estimada, ej: "150 g", "1 taza"' },
          calorias: { type: 'number' },
          proteinas: { type: 'number' },
          carbohidratos: { type: 'number' },
          grasas: { type: 'number' }
        },
        required: ['nombre', 'porcion', 'calorias', 'proteinas', 'carbohidratos', 'grasas'],
        additionalProperties: false
      }
    },
    notas: { type: 'string', description: 'Qué supuestos hiciste o qué no se ve bien en la foto' }
  },
  required: ['titulo', 'confianza', 'items', 'notas'],
  additionalProperties: false
};

const PROMPT = `Sos un nutricionista analizando la foto de una comida.

Identificá cada alimento del plato y estimá su porción real usando las referencias visuales disponibles (tamaño del plato, cubiertos, vaso, mano). Para cada alimento devolvé calorías y macros (proteínas, carbohidratos y grasas en gramos) de la porción estimada, no por 100 g.

Pautas:
- Contexto argentino: usá alimentos y preparaciones típicas de Argentina cuando corresponda.
- Tené en cuenta el método de cocción y el aceite o la grasa visible: fritura, salteado, plancha, horno.
- Incluí también bebidas, aderezos y salsas visibles si aportan calorías.
- Si algo no se ve con claridad, asumí la porción más probable y aclaralo en las notas.
- Poné confianza "baja" si la foto es ambigua, tiene mala luz o el alimento está tapado.
- Los números tienen que ser realistas y coherentes: 4 kcal por gramo de proteína y de carbohidratos, 9 por gramo de grasa.
- Respondé todo en español.`;

function armarBody(modelo, b64jpeg, conSchema) {
  const body = {
    model: modelo,
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: b64jpeg } },
        {
          type: 'text',
          text: conSchema
            ? PROMPT
            : PROMPT + '\n\nRespondé únicamente con un objeto JSON válido, sin texto alrededor y sin bloques de código, con esta forma exacta:\n' +
              '{"titulo":string,"confianza":"alta"|"media"|"baja","items":[{"nombre":string,"porcion":string,"calorias":number,"proteinas":number,"carbohidratos":number,"grasas":number}],"notas":string}'
        }
      ]
    }]
  };

  if (conSchema) body.output_config = { format: { type: 'json_schema', schema: SCHEMA } };

  // effort solo existe en los modelos de la generación 4.6 en adelante
  if (/opus-5|sonnet-5|opus-4-[678]|sonnet-4-6|fable-5/.test(modelo)) {
    body.output_config = { ...(body.output_config || {}), effort: 'medium' };
  }
  return body;
}

async function pedirAClaude(body, apiKey) {
  try {
    return await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error('No se pudo conectar con la API. Revisá tu conexión a internet.');
  }
}

async function analizarFoto(b64jpeg) {
  const { apiKey } = state.cfg;
  const modelo = state.cfg.modelo || 'claude-opus-5';
  if (!apiKey) throw new Error('Falta la API key. Cargala en Ajustes.');

  let res = await pedirAClaude(armarBody(modelo, b64jpeg, true), apiKey);

  if (!res.ok) {
    let detalle = '';
    try { detalle = (await res.clone().json())?.error?.message || ''; } catch { /* ignorado */ }

    // si el modelo no soporta structured outputs, reintentamos pidiendo JSON en el prompt
    if (res.status === 400 && /output_config|format|schema|effort/i.test(detalle)) {
      res = await pedirAClaude(armarBody(modelo, b64jpeg, false), apiKey);
      if (!res.ok) {
        let d2 = '';
        try { d2 = (await res.json())?.error?.message || ''; } catch { /* ignorado */ }
        throw new Error(`Error ${res.status}${d2 ? ': ' + d2 : ''}`);
      }
    } else {
      if (res.status === 401) throw new Error('API key inválida o vencida. Revisala en Ajustes.');
      if (res.status === 429) throw new Error('Límite de uso alcanzado. Esperá un momento y probá de nuevo.');
      if (/credit|balance/i.test(detalle)) throw new Error('Tu cuenta de Anthropic no tiene saldo.');
      throw new Error(`Error ${res.status}${detalle ? ': ' + detalle : ''}`);
    }
  }

  const data = await res.json();
  if (data.stop_reason === 'refusal') throw new Error('Claude no pudo procesar esta imagen. Probá con otra foto.');

  const texto = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('').trim();
  let parsed;
  try {
    parsed = JSON.parse(texto);
  } catch {
    // fallback: el modelo pudo haber envuelto el JSON en texto o en un bloque de código
    const ini = texto.indexOf('{'), fin = texto.lastIndexOf('}');
    try { parsed = JSON.parse(texto.slice(ini, fin + 1)); }
    catch { throw new Error('La respuesta no se pudo interpretar. Probá de nuevo.'); }
  }
  if (!parsed || !Array.isArray(parsed.items) || !parsed.items.length) {
    throw new Error('Claude no reconoció ningún alimento en la foto. Probá con otra imagen.');
  }

  parsed.items = (parsed.items || []).map(i => ({
    nombre: String(i.nombre || 'Alimento'),
    porcion: String(i.porcion || ''),
    calorias: Number(i.calorias) || 0,
    proteinas: Number(i.proteinas) || 0,
    carbohidratos: Number(i.carbohidratos) || 0,
    grasas: Number(i.grasas) || 0
  }));
  return parsed;
}

/* ---------------- modal ---------------- */

function abrirModal() { $('modal').classList.add('open'); }
function cerrarModal() {
  $('modal').classList.remove('open');
  pendiente = null;
  $('fileInput').value = '';
}

function mostrarEstado(cual) {
  $('analisisLoading').hidden = cual !== 'loading';
  $('analisisResult').hidden = cual !== 'result';
  $('analisisError').hidden = cual !== 'error';
  $('btnGuardarComida').disabled = cual !== 'result';
}

$('modalClose').onclick = cerrarModal;
$('btnCancelar').onclick = cerrarModal;
$('modal').onclick = e => { if (e.target.id === 'modal') cerrarModal(); };

/* ---------------- flujo foto ---------------- */

$('btnFoto').onclick = () => {
  if (!state.cfg.apiKey) { toast('Cargá tu API key en Ajustes'); irTab('ajustes'); return; }
  $('fileInput').click();
};

$('fileInput').onchange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  $('modalTitle').textContent = 'Analizando foto';
  mostrarEstado('loading');
  abrirModal();

  const frases = [
    'Claude está mirando el plato…',
    'Identificando los alimentos…',
    'Estimando las porciones…',
    'Calculando calorías y macros…'
  ];
  let idx = 0;
  $('loadingTxt').textContent = frases[0];
  const rot = setInterval(() => { idx = (idx + 1) % frases.length; $('loadingTxt').textContent = frases[idx]; }, 2600);

  try {
    const original = await leerArchivo(file);
    const grande = await redimensionar(original, 1024, 0.82);
    const thumb = await redimensionar(original, 128, 0.55);
    $('preview').src = grande;

    const r = await analizarFoto(grande.split(',')[1]);
    clearInterval(rot);
    pendiente = { ...r, thumb };
    $('modalTitle').textContent = 'Revisá y guardá';
    mostrarResultado(pendiente);
    mostrarEstado('result');
  } catch (err) {
    clearInterval(rot);
    $('modalTitle').textContent = 'No salió';
    $('errorTxt').textContent = err.message;
    mostrarEstado('error');
  }
};

/* ---------------- carga manual ---------------- */

$('btnManual').onclick = () => {
  pendiente = {
    titulo: '', confianza: 'alta', notas: '',
    items: [{ nombre: '', porcion: '', calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 }]
  };
  $('modalTitle').textContent = 'Carga manual';
  mostrarResultado(pendiente);
  mostrarEstado('result');
  abrirModal();
};

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

  pintarItems(r);
  $('resNotas').textContent = r.notas || '';
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
    nom.oninput = () => { it.nombre = nom.value; };

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

    li.append(top, sub);
    ul.appendChild(li);
  });

  actualizarTotal(r);
}

function actualizarTotal(r) {
  const total = r.items.reduce((a, i) => a + (Number(i.calorias) || 0), 0);
  $('resTotal').textContent = Math.round(total) + ' kcal';
}

$('btnAddItem').onclick = () => {
  if (!pendiente) return;
  pendiente.items.push({ nombre: '', porcion: '', calorias: 0, proteinas: 0, carbohidratos: 0, grasas: 0 });
  pintarItems(pendiente);
};

$('btnGuardarComida').onclick = () => {
  if (!pendiente) return;
  const items = pendiente.items.filter(i => i.nombre.trim() || i.calorias);
  if (!items.length) { toast('Cargá al menos un alimento'); return; }

  const suma = (k) => items.reduce((a, i) => a + (Number(i[k]) || 0), 0);
  dia().comidas.push({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: Date.now(),
    titulo: pendiente.titulo?.trim() || items[0].nombre || 'Comida',
    items,
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

$('btnGuardarPerfil').onclick = () => {
  const num = (id) => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
  state.perfil = {
    sexo: $('pSexo').value,
    edad: num('pEdad'),
    altura: num('pAltura'),
    peso: num('pPeso'),
    pesoObj: num('pPesoObj'),
    actividad: parseFloat($('pActividad').value),
    ritmo: parseFloat($('pRitmo').value),
    manual: num('pManual')
  };
  save(); renderAll();
  toast('Perfil guardado');
};

/* ---------------- ajustes ---------------- */

$('btnGuardarKey').onclick = () => {
  state.cfg.apiKey = $('apiKey').value.trim();
  state.cfg.modelo = $('modelo').value;
  save();
  toast('Guardado');
};

$('btnExport').onclick = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `deficit-${hoyISO()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
};

$('btnImport').onclick = () => $('importInput').click();
$('importInput').onchange = async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const s = JSON.parse(await f.text());
    if (!s.dias) throw new Error();
    state = { ...structuredClone(DEFAULT_STATE), ...s };
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
  state = structuredClone(DEFAULT_STATE);
  state.cfg = cfg;
  save(); renderAll();
  toast('Datos borrados');
};

/* ---------------- PWA ---------------- */

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* sin offline, no es crítico */ });
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

// acceso directo "Analizar foto" del ícono de la app
if (new URLSearchParams(location.search).get('accion') === 'foto') {
  history.replaceState(null, '', location.pathname);
  setTimeout(() => $('btnFoto').click(), 200);
}
