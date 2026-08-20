/* ============================================================
   core.js — lógica pura de Déficit: cálculo, fechas y estado.
   No toca el DOM. Es lo que testea tests.html.
   ============================================================ */

const ESQUEMA = 2;

const DEFAULT_STATE = {
  esquema: ESQUEMA,
  perfil: {
    sexo: 'm', edad: null, altura: null, peso: null, pesoObj: null,
    actividad: 1.55, ritmo: 0.5, manual: null
  },
  dias: {},
  frecuentes: [],
  uso: { llamadas: 0, costo: 0, tokens: 0 },
  cfg: { apiKey: '', modelo: 'claude-opus-5', avisoKeyOculto: false, onboardingHecho: false }
};

const MAX_FRECUENTES = 200;

/* ---------------- estado ---------------- */

function clonar(o) {
  return JSON.parse(JSON.stringify(o));
}

/** Lleva cualquier state guardado al esquema actual sin perder datos. */
function migrar(guardado) {
  const s = clonar(DEFAULT_STATE);
  if (!guardado || typeof guardado !== 'object') return s;

  s.perfil = { ...s.perfil, ...(guardado.perfil || {}) };
  s.cfg = { ...s.cfg, ...(guardado.cfg || {}) };
  s.dias = {};

  for (const [f, d] of Object.entries(guardado.dias || {})) {
    if (!d || typeof d !== 'object') continue;
    s.dias[f] = {
      peso: typeof d.peso === 'number' ? d.peso : null,
      agua: Number(d.agua) || 0,
      ejercicio: Number(d.ejercicio) || 0,
      comidas: (d.comidas || []).map(c => ({
        id: c.id || (f + '-' + Math.random().toString(36).slice(2, 8)),
        ts: c.ts || Date.parse(f) || Date.now(),
        titulo: c.titulo || 'Comida',
        items: c.items || [],
        kcal: Number(c.kcal) || 0,
        prot: Number(c.prot) || 0,
        carb: Number(c.carb) || 0,
        gras: Number(c.gras) || 0,
        momento: c.momento || momentoDe(c.ts || Date.now()),
        thumb: c.thumb || null,
        notas: c.notas || ''
      }))
    };
  }

  s.frecuentes = (guardado.frecuentes || []).filter(f => f && f.nombre).map(f => ({
    nombre: String(f.nombre),
    porcion: f.porcion || '',
    calorias: Number(f.calorias) || 0,
    proteinas: Number(f.proteinas) || 0,
    carbohidratos: Number(f.carbohidratos) || 0,
    grasas: Number(f.grasas) || 0,
    usos: Number(f.usos) || 1,
    ultimoUso: Number(f.ultimoUso) || 0
  }));

  s.uso = {
    llamadas: Number(guardado.uso?.llamadas) || 0,
    costo: Number(guardado.uso?.costo) || 0,
    tokens: Number(guardado.uso?.tokens) || 0
  };

  s.esquema = ESQUEMA;
  return s;
}

/* ---------------- validación ---------------- */

const LIMITES = {
  edad: { min: 10, max: 100, unidad: 'años' },
  altura: { min: 100, max: 250, unidad: 'cm' },
  peso: { min: 30, max: 400, unidad: 'kg' },
  pesoObj: { min: 30, max: 400, unidad: 'kg' },
  manual: { min: 800, max: 6000, unidad: 'kcal' }
};

/**
 * Revisa el perfil y devuelve un mensaje por campo con problemas.
 * Los campos vacíos no son error salvo los tres que hacen falta para calcular.
 */
function validarPerfil(p) {
  const errores = {};
  const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v));

  for (const campo of ['edad', 'altura', 'peso']) {
    if (num(p[campo]) == null) errores[campo] = 'Falta este dato para poder calcular tu objetivo.';
  }

  for (const [campo, lim] of Object.entries(LIMITES)) {
    const v = num(p[campo]);
    if (v == null) continue;
    if (isNaN(v)) errores[campo] = 'Tiene que ser un número.';
    else if (v < lim.min || v > lim.max) {
      errores[campo] = `Tiene que estar entre ${lim.min} y ${lim.max} ${lim.unidad}.`;
    }
  }

  const peso = num(p.peso), obj = num(p.pesoObj);
  if (!errores.pesoObj && peso != null && obj != null) {
    if (obj > peso) errores.pesoObj = 'Tu meta está por encima de tu peso actual: esta app calcula déficit, no aumento.';
    else if (peso - obj > peso * 0.4) errores.pesoObj = 'Es una baja muy grande de una sola vez. Mejor ponete una meta intermedia.';
  }

  return { ok: Object.keys(errores).length === 0, errores };
}

/* ---------------- almacenamiento ---------------- */

/* localStorage suele rondar los 5 MB por origen. */
const CUOTA_BYTES = 5 * 1024 * 1024;

/**
 * Uso del almacenamiento a partir del tamaño del state serializado.
 * Sirve para avisar antes de que falle un guardado, no después.
 */
function usoAlmacenamiento(textoState, cuota = CUOTA_BYTES) {
  const bytes = new Blob([textoState || '']).size;
  const pct = Math.round((bytes / cuota) * 100);
  return {
    bytes,
    kb: Math.round(bytes / 1024),
    pct,
    // dos umbrales: uno para avisar, otro para empezar a soltar miniaturas
    alerta: pct >= 75,
    critico: pct >= 90
  };
}

/** Cuántas miniaturas hay guardadas y cuánto pesan (son el 90% del volumen). */
function pesoDeThumbs(dias) {
  let cantidad = 0, bytes = 0;
  for (const d of Object.values(dias || {})) {
    for (const c of d.comidas || []) {
      if (c.thumb) { cantidad++; bytes += c.thumb.length; }
    }
  }
  return { cantidad, kb: Math.round(bytes / 1024) };
}

/* ---------------- exportación ---------------- */

/** Escapa un valor para CSV: comillas dobles y separadores. */
function celdaCSV(valor) {
  const txt = String(valor == null ? '' : valor);
  return /[";\n]/.test(txt) ? '"' + txt.replace(/"/g, '""') + '"' : txt;
}

/**
 * CSV de todas las comidas, una fila por alimento.
 * Separador `;` y coma decimal: es lo que abre bien Excel en español.
 */
function armarCSV(dias) {
  const cabecera = ['fecha', 'hora', 'momento', 'comida', 'alimento', 'porcion', 'kcal', 'proteinas', 'carbohidratos', 'grasas', 'peso_del_dia', 'agua_vasos', 'ejercicio_kcal'];
  const filas = [cabecera.join(';')];

  for (const f of Object.keys(dias || {}).sort()) {
    const d = dias[f];
    for (const c of d.comidas || []) {
      const hora = new Date(c.ts).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const items = (c.items && c.items.length) ? c.items : [{
        nombre: c.titulo, porcion: '', calorias: c.kcal,
        proteinas: c.prot, carbohidratos: c.carb, grasas: c.gras
      }];

      for (const it of items) {
        filas.push([
          f, hora, nombreMomento(c.momento), c.titulo, it.nombre, it.porcion,
          String(Math.round(it.calorias || 0)),
          String(Math.round(it.proteinas || 0)),
          String(Math.round(it.carbohidratos || 0)),
          String(Math.round(it.grasas || 0)),
          d.peso != null ? String(d.peso).replace('.', ',') : '',
          String(d.agua || 0),
          String(d.ejercicio || 0)
        ].map(celdaCSV).join(';'));
      }
    }
  }

  return filas.join('\r\n');
}

/* ---------------- formato ---------------- */

/** Números con separador de miles y coma decimal, como se escriben en Argentina. */
function fmtNum(valor, decimales = 0) {
  const n = Number(valor);
  if (!isFinite(n)) return '—';
  return n.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales });
}

function fmtKcal(valor) {
  return `${fmtNum(Math.round(Number(valor) || 0))} kcal`;
}

/** Con signo adelante: sirve para balances y diferencias contra el objetivo. */
function fmtDelta(valor, decimales = 0, unidad = '') {
  const n = Number(valor) || 0;
  const signo = n > 0 ? '+' : '';
  return `${signo}${fmtNum(n, decimales)}${unidad ? ' ' + unidad : ''}`;
}

function fmtPeso(kg) {
  return `${fmtNum(kg, 1)} kg`;
}

/* ---------------- análisis de la serie ---------------- */

/**
 * Media móvil hacia atrás. El peso diario tiene mucho ruido (sal, agua, digestión):
 * la media de 7 días es lo que muestra la tendencia real.
 */
function mediaMovil(serie, ventana = 7) {
  return (serie || []).map((punto, i) => {
    const desde = Math.max(0, i - ventana + 1);
    const trozo = serie.slice(desde, i + 1);
    const suma = trozo.reduce((a, p) => a + p.kg, 0);
    return { f: punto.f, kg: +(suma / trozo.length).toFixed(2), muestras: trozo.length };
  });
}

/** Días consecutivos con comidas cargadas, contando hacia atrás desde hoy. */
function rachaDias(dias, hoy = hoyISO()) {
  let racha = 0;
  let f = hoy;

  // el día de hoy todavía puede estar vacío sin cortar la racha
  if (!(dias[f]?.comidas || []).length) f = sumarDias(f, -1);

  while ((dias[f]?.comidas || []).length) {
    racha++;
    f = sumarDias(f, -1);
  }
  return racha;
}

/** Porcentaje recorrido entre el peso inicial y la meta. */
function progresoPeso(inicial, actual, meta) {
  if (inicial == null || actual == null || meta == null) return null;
  const total = inicial - meta;
  if (Math.abs(total) < 0.05) return actual <= meta ? 100 : 0;

  const hecho = inicial - actual;
  const pct = Math.round((hecho / total) * 100);
  return Math.max(0, Math.min(100, pct));
}

/** Balance de los últimos N días: cuánto se comió contra cuánto se gastó. */
function balanceSemanal(dias, tdee, hasta = hoyISO(), cantidad = 7) {
  let consumido = 0, gastado = 0, conDatos = 0;

  for (let i = 0; i < cantidad; i++) {
    const f = sumarDias(hasta, -i);
    const d = dias[f];
    if (!d || !(d.comidas || []).length) continue;

    conDatos++;
    consumido += sumarComidas(d.comidas).kcal;
    gastado += (Number(tdee) || 0) + (Number(d.ejercicio) || 0);
  }

  const balance = consumido - gastado;
  return {
    dias: conDatos,
    consumido,
    gastado,
    balance,                                  // negativo = déficit
    kg: +(balance / 7700).toFixed(2),
    promedio: conDatos ? Math.round(consumido / conDatos) : 0
  };
}

/**
 * TDEE real estimado a partir de lo que pasó, no de una fórmula:
 * gasto = consumo promedio + (peso perdido × 7700 / días).
 * Necesita al menos 10 días con comidas y dos pesos separados.
 */
function tdeeAdaptativo(dias, minDias = 10) {
  const fechas = Object.keys(dias).sort();

  const pesos = fechas.filter(f => typeof dias[f].peso === 'number');
  if (pesos.length < 2) return null;

  const primero = pesos[0], ultimo = pesos.at(-1);
  const lapso = diasEntre(primero, ultimo);
  if (lapso < minDias) return null;

  // solo cuentan los días del tramo que tienen comidas cargadas
  const conComidas = fechas.filter(f => f >= primero && f <= ultimo && (dias[f].comidas || []).length);
  if (conComidas.length < minDias) return null;

  // sin cobertura suficiente el promedio miente: la mitad de los días sin cargar
  const cobertura = conComidas.length / (lapso + 1);
  if (cobertura < 0.6) return null;

  const consumoTotal = conComidas.reduce((a, f) => a + sumarComidas(dias[f].comidas).kcal, 0);
  const consumoPromedio = consumoTotal / conComidas.length;
  const deltaPeso = dias[primero].peso - dias[ultimo].peso;   // positivo = bajó

  const tdee = Math.round(consumoPromedio + (deltaPeso * 7700) / lapso);

  return {
    tdee,
    dias: lapso,
    diasCargados: conComidas.length,
    cobertura: +cobertura.toFixed(2),
    consumoPromedio: Math.round(consumoPromedio),
    deltaPeso: +deltaPeso.toFixed(2)
  };
}

/* ---------------- porciones ---------------- */

const FACTORES = [0.5, 1, 1.5, 2];

/**
 * Reescala un alimento por un factor de porción.
 * Siempre se aplica sobre el item base, así ×2 dos veces no termina en ×4.
 */
function escalarItem(base, factor) {
  const f = Number(factor) || 1;
  const n = (v) => Math.round((Number(v) || 0) * f);
  return {
    ...base,
    porcion: escalarPorcion(base.porcion, f),
    calorias: n(base.calorias),
    proteinas: n(base.proteinas),
    carbohidratos: n(base.carbohidratos),
    grasas: n(base.grasas)
  };
}

/** "150 g" ×2 -> "300 g". Si no hay número reconocible, se anota el factor. */
function escalarPorcion(porcion, factor) {
  const txt = String(porcion || '').trim();
  if (!txt) return factor === 1 ? '' : `×${factor}`.replace('.', ',');
  if (factor === 1) return txt;

  const m = txt.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return `${txt} (×${String(factor).replace('.', ',')})`;

  const valor = parseFloat(m[1].replace(',', '.')) * factor;
  const redondeado = Math.round(valor * 100) / 100;
  return `${String(redondeado).replace('.', ',')}${m[2] ? ' ' + m[2] : ''}`;
}

/* ---------------- agua y ejercicio ---------------- */

const ML_POR_VASO = 250;

/** Vasos de 250 ml recomendados: ~35 ml por kg de peso. */
function objetivoAgua(pesoKg) {
  if (!pesoKg) return 8;
  return Math.max(6, Math.round((pesoKg * 35) / ML_POR_VASO));
}

/** Las calorías quemadas por ejercicio se suman al objetivo del día. */
function objetivoEfectivo(objetivo, ejercicio) {
  return Math.round((Number(objetivo) || 0) + (Number(ejercicio) || 0));
}

/* ---------------- momentos del día ---------------- */

const MOMENTOS = [
  { id: 'desayuno', nombre: 'Desayuno', icono: '☕', desde: 5 * 60, hasta: 10 * 60 + 59 },
  { id: 'almuerzo', nombre: 'Almuerzo', icono: '🍽️', desde: 11 * 60, hasta: 15 * 60 + 29 },
  { id: 'merienda', nombre: 'Merienda', icono: '🥐', desde: 15 * 60 + 30, hasta: 19 * 60 + 29 },
  { id: 'cena', nombre: 'Cena', icono: '🌙', desde: 19 * 60 + 30, hasta: 23 * 60 + 59 },
  { id: 'snack', nombre: 'Snack', icono: '🍎', desde: 0, hasta: 4 * 60 + 59 }
];

/** Momento probable según la hora del día (0-23 y minutos). */
function momentoPorHora(hora, minutos = 0) {
  const t = hora * 60 + minutos;
  const m = MOMENTOS.find(x => t >= x.desde && t <= x.hasta);
  return m ? m.id : 'snack';
}

function momentoDe(ts) {
  const d = new Date(ts);
  return momentoPorHora(d.getHours(), d.getMinutes());
}

function nombreMomento(id) {
  const m = MOMENTOS.find(x => x.id === id);
  return m ? m.nombre : 'Otro';
}

/** Hora representativa de un momento, para fechar comidas cargadas a destiempo. */
function horaDeMomento(id) {
  const horas = { desayuno: 8, almuerzo: 13, merienda: 17, cena: 21, snack: 23 };
  return horas[id] != null ? horas[id] : 12;
}

/**
 * Timestamp para una comida del día `iso`. Si es hoy, la hora real;
 * si es un día pasado, la hora típica del momento elegido.
 */
function tsParaFecha(iso, momento, ahora = new Date()) {
  if (iso === hoyISO(ahora)) return ahora.getTime();
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, horaDeMomento(momento), 0, 0, 0).getTime();
}

/** Agrupa comidas por momento, en el orden natural del día. */
function agruparPorMomento(comidas) {
  const orden = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack'];
  const grupos = [];

  for (const id of orden) {
    const delGrupo = (comidas || []).filter(c => (c.momento || momentoDe(c.ts)) === id);
    if (delGrupo.length) {
      grupos.push({
        id,
        nombre: nombreMomento(id),
        icono: (MOMENTOS.find(m => m.id === id) || {}).icono || '',
        comidas: delGrupo.sort((a, b) => a.ts - b.ts),
        kcal: sumarComidas(delGrupo).kcal
      });
    }
  }
  return grupos;
}

/* ---------------- alimentos frecuentes ---------------- */

/** Clave de comparación: sin acentos, sin mayúsculas, sin espacios de más. */
function normalizar(txt) {
  return String(txt || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Suma los items de una comida al listado de frecuentes.
 * Devuelve un array nuevo — no muta el que recibe.
 */
function registrarFrecuentes(frecuentes, items, ts = Date.now()) {
  const lista = (frecuentes || []).map(f => ({ ...f }));

  for (const it of items || []) {
    const nombre = String(it.nombre || '').trim();
    if (!nombre) continue;

    const clave = normalizar(nombre);
    const ya = lista.find(f => normalizar(f.nombre) === clave);

    if (ya) {
      // los valores del último uso ganan: la estimación más reciente es la mejor
      ya.usos += 1;
      ya.ultimoUso = ts;
      ya.porcion = it.porcion || ya.porcion;
      ya.calorias = Number(it.calorias) || ya.calorias;
      ya.proteinas = Number(it.proteinas) || ya.proteinas;
      ya.carbohidratos = Number(it.carbohidratos) || ya.carbohidratos;
      ya.grasas = Number(it.grasas) || ya.grasas;
    } else {
      lista.push({
        nombre,
        porcion: it.porcion || '',
        calorias: Number(it.calorias) || 0,
        proteinas: Number(it.proteinas) || 0,
        carbohidratos: Number(it.carbohidratos) || 0,
        grasas: Number(it.grasas) || 0,
        usos: 1,
        ultimoUso: ts
      });
    }
  }

  // ranking: primero los más usados, y a igual uso, los más recientes
  lista.sort((a, b) => (b.usos - a.usos) || (b.ultimoUso - a.ultimoUso));
  return lista.slice(0, MAX_FRECUENTES);
}

/** Busca en los frecuentes por coincidencia parcial; sin texto devuelve el top. */
function buscarFrecuentes(frecuentes, texto, limite = 8) {
  const q = normalizar(texto);
  const lista = frecuentes || [];
  if (!q) return lista.slice(0, limite);

  return lista
    .filter(f => normalizar(f.nombre).includes(q))
    .sort((a, b) => {
      // primero los que arrancan con lo tipeado
      const ea = normalizar(a.nombre).startsWith(q) ? 0 : 1;
      const eb = normalizar(b.nombre).startsWith(q) ? 0 : 1;
      return (ea - eb) || (b.usos - a.usos);
    })
    .slice(0, limite);
}

/* ---------------- fechas ---------------- */

function hoyISO(d = new Date()) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function sumarDias(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return hoyISO(new Date(y, m - 1, d + n));
}

function diasEntre(isoA, isoB) {
  const a = new Date(isoA + 'T00:00:00'), b = new Date(isoB + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

function etiquetaFecha(iso, hoy = hoyISO()) {
  if (iso === hoy) return 'Hoy';
  if (iso === sumarDias(hoy, -1)) return 'Ayer';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
}

/* ---------------- cálculo nutricional ---------------- */

/** Mifflin-St Jeor + factor de actividad + déficit, con piso de seguridad. */
function calcularPlan(p) {
  if (!p || !p.edad || !p.altura || !p.peso) return null;

  const tmb = Math.round(10 * p.peso + 6.25 * p.altura - 5 * p.edad + (p.sexo === 'm' ? 5 : -161));
  const tdee = Math.round(tmb * Number(p.actividad));

  // 1 kg de grasa ≈ 7700 kcal
  const deficitDia = Math.round((Number(p.ritmo) * 7700) / 7);
  let objetivo = tdee - deficitDia;

  const piso = Math.max(tmb, p.sexo === 'm' ? 1500 : 1200);
  const ajustado = objetivo < piso;
  if (ajustado) objetivo = piso;

  if (p.manual) objetivo = Number(p.manual);

  const deficitReal = tdee - objetivo;
  const kgSemana = +((deficitReal * 7) / 7700).toFixed(2);

  let semanas = null;
  if (p.pesoObj && p.peso > p.pesoObj && kgSemana > 0) {
    semanas = Math.ceil((p.peso - p.pesoObj) / kgSemana);
  }

  return {
    tmb, tdee, objetivo, deficitReal, kgSemana, semanas, ajustado, piso,
    macros: {
      prot: Math.round((objetivo * 0.30) / 4),
      carb: Math.round((objetivo * 0.40) / 4),
      gras: Math.round((objetivo * 0.30) / 9)
    }
  };
}

/** Suma calorías y macros de una lista de comidas. */
function sumarComidas(comidas) {
  const t = { kcal: 0, prot: 0, carb: 0, gras: 0 };
  for (const c of comidas || []) {
    t.kcal += Number(c.kcal) || 0;
    t.prot += Number(c.prot) || 0;
    t.carb += Number(c.carb) || 0;
    t.gras += Number(c.gras) || 0;
  }
  return {
    kcal: Math.round(t.kcal), prot: Math.round(t.prot),
    carb: Math.round(t.carb), gras: Math.round(t.gras)
  };
}

/* Export para los tests (en el navegador todo esto ya es global). */
if (typeof window !== 'undefined') {
  window.__core = {
    ESQUEMA, DEFAULT_STATE, MAX_FRECUENTES, clonar, migrar, normalizar,
    registrarFrecuentes, buscarFrecuentes,
    MOMENTOS, momentoPorHora, momentoDe, nombreMomento, agruparPorMomento,
    horaDeMomento, tsParaFecha,
    ML_POR_VASO, objetivoAgua, objetivoEfectivo,
    FACTORES, escalarItem, escalarPorcion,
    mediaMovil, rachaDias, progresoPeso, balanceSemanal, tdeeAdaptativo,
    LIMITES, validarPerfil, fmtNum, fmtKcal, fmtDelta, fmtPeso,
    CUOTA_BYTES, usoAlmacenamiento, pesoDeThumbs, armarCSV, celdaCSV,
    hoyISO, sumarDias, diasEntre, etiquetaFecha,
    calcularPlan, sumarComidas
  };
}
