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
  recetas: [],
  cacheAnalisis: {},
  historialAnalisis: [],
  errores: [],
  uso: { llamadas: 0, costo: 0, tokens: 0 },
  cfg: {
    apiKey: '', modelo: 'claude-opus-5', precision: 'normal', tema: 'auto',
    recordatorios: false, horarios: null,
    avisoKeyOculto: false, onboardingHecho: false
  }
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
  if (!Array.isArray(s.cfg.horarios) || !s.cfg.horarios.length) s.cfg.horarios = clonar(RECORDATORIOS_DEFAULT);
  s.dias = {};

  for (const [f, d] of Object.entries(guardado.dias || {})) {
    if (!d || typeof d !== 'object') continue;
    s.dias[f] = {
      peso: typeof d.peso === 'number' ? d.peso : null,
      agua: Number(d.agua) || 0,
      ejercicio: Number(d.ejercicio) || 0,
      nota: String(d.nota || ''),
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
        foto: c.foto || null,
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
    ultimoUso: Number(f.ultimoUso) || 0,
    favorito: !!f.favorito
  }));

  s.recetas = (guardado.recetas || []).filter(r => r && r.nombre && Array.isArray(r.items)).map(r => ({
    id: r.id || ('r' + Math.random().toString(36).slice(2, 10)),
    nombre: String(r.nombre),
    items: r.items,
    kcal: Number(r.kcal) || 0,
    prot: Number(r.prot) || 0,
    carb: Number(r.carb) || 0,
    gras: Number(r.gras) || 0,
    usos: Number(r.usos) || 0,
    creada: Number(r.creada) || 0
  }));

  s.cacheAnalisis = (guardado.cacheAnalisis && typeof guardado.cacheAnalisis === 'object')
    ? guardado.cacheAnalisis : {};

  s.historialAnalisis = (Array.isArray(guardado.historialAnalisis) ? guardado.historialAnalisis : [])
    .filter(a => a && a.ts)
    .slice(0, MAX_HISTORIAL_ANALISIS);

  s.errores = (Array.isArray(guardado.errores) ? guardado.errores : [])
    .filter(e => e && e.ts && e.mensaje)
    .slice(0, MAX_ERRORES);

  s.uso = {
    llamadas: Number(guardado.uso?.llamadas) || 0,
    costo: Number(guardado.uso?.costo) || 0,
    tokens: Number(guardado.uso?.tokens) || 0
  };

  s.esquema = ESQUEMA;
  return s;
}

/* ---------------- fusión de estados ---------------- */

/** Dos comidas son la misma aunque tengan ids distintos si coinciden en todo lo demás. */
function mismaComida(a, b) {
  return Math.abs((a.ts || 0) - (b.ts || 0)) < 60000 &&
    normalizar(a.titulo) === normalizar(b.titulo) &&
    Math.round(a.kcal || 0) === Math.round(b.kcal || 0);
}

/**
 * Junta un backup con lo que ya hay en el dispositivo.
 * Regla: lo importado completa, nunca pisa. El perfil y la configuración de
 * este dispositivo mandan, salvo que estén vacíos.
 */
function fusionarEstados(actual, importado) {
  const base = migrar(actual);
  const otro = migrar(importado);
  const salida = clonar(base);

  const resumen = { diasNuevos: 0, comidasNuevas: 0, comidasRepetidas: 0, frecuentesNuevos: 0, recetasNuevas: 0 };

  // --- días ---
  for (const [f, dOtro] of Object.entries(otro.dias)) {
    const dActual = salida.dias[f];

    if (!dActual) {
      salida.dias[f] = clonar(dOtro);
      resumen.diasNuevos++;
      resumen.comidasNuevas += dOtro.comidas.length;
      continue;
    }

    for (const c of dOtro.comidas) {
      const yaEsta = dActual.comidas.some(x => x.id === c.id || mismaComida(x, c));
      if (yaEsta) { resumen.comidasRepetidas++; continue; }
      dActual.comidas.push(clonar(c));
      resumen.comidasNuevas++;
    }

    dActual.comidas.sort((a, b) => a.ts - b.ts);

    // los escalares solo se completan si acá no había nada
    if (dActual.peso == null && dOtro.peso != null) dActual.peso = dOtro.peso;
    if (!dActual.agua && dOtro.agua) dActual.agua = dOtro.agua;
    if (!dActual.ejercicio && dOtro.ejercicio) dActual.ejercicio = dOtro.ejercicio;
    if (!dActual.nota && dOtro.nota) dActual.nota = dOtro.nota;
  }

  // --- frecuentes: se suman los usos ---
  for (const f of otro.frecuentes) {
    const clave = normalizar(f.nombre);
    const ya = salida.frecuentes.find(x => normalizar(x.nombre) === clave);

    if (ya) {
      ya.usos += f.usos;
      ya.favorito = ya.favorito || f.favorito;
      if (f.ultimoUso > ya.ultimoUso) {
        ya.ultimoUso = f.ultimoUso;
        ya.calorias = f.calorias;
        ya.porcion = f.porcion || ya.porcion;
      }
    } else {
      salida.frecuentes.push(clonar(f));
      resumen.frecuentesNuevos++;
    }
  }
  salida.frecuentes.sort((a, b) => (b.usos - a.usos) || (b.ultimoUso - a.ultimoUso));
  salida.frecuentes = salida.frecuentes.slice(0, MAX_FRECUENTES);

  // --- recetas: por nombre, gana la más usada ---
  for (const r of otro.recetas) {
    const clave = normalizar(r.nombre);
    const ya = salida.recetas.find(x => normalizar(x.nombre) === clave);
    if (!ya) {
      salida.recetas.push(clonar(r));
      resumen.recetasNuevas++;
    } else if (r.usos > ya.usos) {
      ya.usos = r.usos;
      ya.items = clonar(r.items);
      ya.kcal = r.kcal; ya.prot = r.prot; ya.carb = r.carb; ya.gras = r.gras;
    }
  }
  salida.recetas = salida.recetas.slice(0, MAX_RECETAS);

  // --- perfil: lo del dispositivo manda, pero se completan los huecos ---
  for (const campo of ['edad', 'altura', 'peso', 'pesoObj']) {
    if (salida.perfil[campo] == null && otro.perfil[campo] != null) salida.perfil[campo] = otro.perfil[campo];
  }
  if (!salida.cfg.apiKey && otro.cfg.apiKey) salida.cfg.apiKey = otro.cfg.apiKey;

  // --- uso acumulado: se suma, es historia de gasto real ---
  salida.uso = {
    llamadas: base.uso.llamadas + otro.uso.llamadas,
    costo: +(base.uso.costo + otro.uso.costo).toFixed(6),
    tokens: base.uso.tokens + otro.uso.tokens
  };

  return { estado: salida, resumen };
}

/* ---------------- errores ---------------- */

const MAX_ERRORES = 10;

/**
 * Guarda los últimos errores para poder mirarlos después.
 * Sin esto, un error en el celular no deja rastro y no hay forma de saber qué pasó.
 */
function registrarError(errores, entrada, max = MAX_ERRORES) {
  const fila = {
    ts: Number(entrada.ts) || Date.now(),
    mensaje: String(entrada.mensaje || 'Error sin mensaje').slice(0, 300),
    origen: String(entrada.origen || '').slice(0, 120),
    linea: Number(entrada.linea) || 0
  };

  const lista = errores || [];

  // el mismo error repitiéndose no tiene que tapar a los demás
  const ultimo = lista[0];
  if (ultimo && ultimo.mensaje === fila.mensaje && fila.ts - ultimo.ts < 5000) return lista;

  return [fila, ...lista].slice(0, max);
}

/** Resumen del estado de la app, para mirar o para copiar y pegar. */
function armarDiagnostico({ version, sw, cuota, state: st, online, pantalla, agente }) {
  return {
    version: version || '—',
    serviceWorker: sw || 'sin datos',
    conexion: online ? 'con conexión' : 'sin conexión',
    almacenamiento: cuota ? `${cuota.kb} KB (${cuota.pct}%)` : '—',
    dias: Object.keys(st.dias || {}).length,
    comidas: Object.values(st.dias || {}).reduce((a, d) => a + (d.comidas || []).length, 0),
    frecuentes: (st.frecuentes || []).length,
    recetas: (st.recetas || []).length,
    analisis: (st.uso || {}).llamadas || 0,
    gasto: `US$ ${((st.uso || {}).costo || 0).toFixed(4)}`,
    tema: (st.cfg || {}).tema || 'auto',
    precision: (st.cfg || {}).precision || 'normal',
    apiKey: (st.cfg || {}).apiKey ? 'cargada' : 'sin cargar',
    errores: (st.errores || []).length,
    pantalla: pantalla || '—',
    agente: (agente || '').slice(0, 120)
  };
}

/** El diagnóstico en texto plano, listo para pegar en un mensaje. */
function diagnosticoATexto(diag, errores = []) {
  const lineas = ['Déficit — diagnóstico'];
  for (const [k, v] of Object.entries(diag)) lineas.push(`${k}: ${v}`);

  if (errores.length) {
    lineas.push('', 'Últimos errores:');
    for (const e of errores) {
      const cuando = new Date(e.ts).toLocaleString('es-AR');
      lineas.push(`- ${cuando} · ${e.mensaje}${e.origen ? ` (${e.origen}:${e.linea})` : ''}`);
    }
  }

  return lineas.join(String.fromCharCode(10));
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

/* ---------------- revisión de datos ---------------- */

/** Calorías que se deducen de los macros: 4 por proteína y carbo, 9 por grasa. */
function kcalDeMacros(prot, carb, gras) {
  return Math.round((Number(prot) || 0) * 4 + (Number(carb) || 0) * 4 + (Number(gras) || 0) * 9);
}

/**
 * Busca comidas con números que no cierran. Las estimaciones por foto a veces
 * salen incoherentes, y un dato mal cargado ensucia todos los promedios.
 */
function revisarDatos(dias, hoy = hoyISO()) {
  const problemas = [];

  for (const f of Object.keys(dias || {}).sort()) {
    const d = dias[f];

    if (f > hoy) {
      problemas.push({ tipo: 'fecha-futura', fecha: f, arreglable: false,
        detalle: `Hay datos cargados en ${f}, que todavía no llegó.` });
    }

    for (const c of d.comidas || []) {
      const kcal = Number(c.kcal) || 0;
      const macros = kcalDeMacros(c.prot, c.carb, c.gras);

      if (kcal < 0 || c.prot < 0 || c.carb < 0 || c.gras < 0) {
        problemas.push({ tipo: 'negativo', fecha: f, id: c.id, titulo: c.titulo, arreglable: false,
          detalle: 'Tiene valores negativos.' });
        continue;
      }

      if (kcal > 6000) {
        problemas.push({ tipo: 'exagerado', fecha: f, id: c.id, titulo: c.titulo, arreglable: false,
          detalle: `${kcal} kcal en una sola comida es raro.` });
        continue;
      }

      // sin macros cargados no hay con qué comparar
      if (macros === 0) continue;

      const diferencia = Math.abs(kcal - macros);
      if (kcal === 0) {
        problemas.push({ tipo: 'sin-kcal', fecha: f, id: c.id, titulo: c.titulo, arreglable: true,
          sugerido: macros, detalle: `Tiene macros pero 0 kcal; por los macros serían ${macros}.` });
      } else if (diferencia > kcal * 0.25 && diferencia > 60) {
        problemas.push({ tipo: 'no-cierra', fecha: f, id: c.id, titulo: c.titulo, arreglable: true,
          sugerido: macros, actual: kcal,
          detalle: `Dice ${kcal} kcal pero sus macros dan ${macros}.` });
      }
    }
  }

  return problemas;
}

/**
 * Aplica los arreglos que se pueden deducir solos (recalcular kcal desde los
 * macros). Devuelve días nuevos: no toca los que recibe.
 */
function arreglarDatos(dias, problemas) {
  const copia = clonar(dias || {});
  let arreglados = 0;

  for (const p of problemas || []) {
    if (!p.arreglable || !p.id) continue;

    const comida = (copia[p.fecha]?.comidas || []).find(c => c.id === p.id);
    if (!comida) continue;

    comida.kcal = p.sugerido;
    arreglados++;
  }

  return { dias: copia, arreglados };
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

/* ---------------- informe del mes ---------------- */

/** Escapa texto para meterlo en el HTML del informe. */
function escaparHTML(txt) {
  return String(txt == null ? '' : txt)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Los datos del mes `aaaa-mm`, ya resumidos. */
function datosDelMes(state, mes) {
  const fechas = Object.keys(state.dias || {})
    .filter(f => f.startsWith(mes))
    .sort();

  const conComidas = fechas.filter(f => (state.dias[f].comidas || []).length);
  const calc = calcularPlan(state.perfil);
  const objetivo = calc ? calc.objetivo : 0;

  const filas = conComidas.map(f => {
    const d = state.dias[f];
    const t = sumarComidas(d.comidas);
    return {
      fecha: f,
      dia: Number(f.slice(8)),
      kcal: t.kcal,
      prot: t.prot,
      carb: t.carb,
      gras: t.gras,
      peso: d.peso,
      agua: d.agua || 0,
      ejercicio: d.ejercicio || 0,
      nota: d.nota || '',
      comidas: d.comidas.length,
      diferencia: objetivo ? t.kcal - objetivo : null
    };
  });

  const pesos = fechas.filter(f => typeof state.dias[f].peso === 'number').map(f => state.dias[f].peso);
  const totalKcal = filas.reduce((a, f) => a + f.kcal, 0);

  return {
    mes,
    objetivo,
    filas,
    dias: filas.length,
    promedio: filas.length ? Math.round(totalKcal / filas.length) : 0,
    promedioProt: filas.length ? Math.round(filas.reduce((a, f) => a + f.prot, 0) / filas.length) : 0,
    pesoInicial: pesos.length ? pesos[0] : null,
    pesoFinal: pesos.length ? pesos.at(-1) : null,
    deltaPeso: pesos.length >= 2 ? +(pesos.at(-1) - pesos[0]).toFixed(1) : null,
    adherencia: adherencia(state.dias, objetivo, mes + '-01', mes + '-31'),
    reparto: repartoPorMomento(state.dias, mes + '-01', mes + '-31')
  };
}

/** Informe del mes en una página, pensado para imprimir o guardar en PDF. */
function armarInforme(state, mes) {
  const d = datosDelMes(state, mes);
  if (!d.dias) return null;

  const [anio, num] = mes.split('-').map(Number);
  const nombreMes = new Date(anio, num - 1, 1)
    .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });

  const tarjeta = (titulo, valor, detalle) =>
    `<div class="t"><span>${escaparHTML(titulo)}</span><b>${escaparHTML(valor)}</b>` +
    (detalle ? `<small>${escaparHTML(detalle)}</small>` : '') + '</div>';

  const tarjetas = [
    tarjeta('Días registrados', String(d.dias), d.objetivo ? `objetivo ${fmtKcal(d.objetivo)}` : ''),
    tarjeta('Promedio diario', fmtKcal(d.promedio), d.objetivo ? `${fmtDelta(d.promedio - d.objetivo)} vs objetivo` : ''),
    tarjeta('Proteína promedio', `${fmtNum(d.promedioProt)} g`, ''),
    d.deltaPeso != null
      ? tarjeta('Cambio de peso', fmtDelta(d.deltaPeso, 1, 'kg'), `${fmtPeso(d.pesoInicial)} → ${fmtPeso(d.pesoFinal)}`)
      : '',
    d.adherencia ? tarjeta('Adherencia', d.adherencia.pct + '%', `${d.adherencia.dentro} de ${d.adherencia.dias} días`) : ''
  ].filter(Boolean).join('');

  const reparto = d.reparto.length
    ? '<h2>Dónde se fueron las calorías</h2><ul class="reparto">' +
      d.reparto.map(m => `<li><span>${escaparHTML(m.nombre)}</span><b>${m.pct}%</b><small>${fmtKcal(m.kcal)}</small></li>`).join('') +
      '</ul>'
    : '';

  const filas = d.filas.map(f => `<tr>
    <td>${f.dia}</td>
    <td class="n">${fmtNum(f.kcal)}</td>
    <td class="n ${f.diferencia > 0 ? 'alto' : 'bajo'}">${f.diferencia == null ? '' : fmtDelta(f.diferencia)}</td>
    <td class="n">${fmtNum(f.prot)}</td>
    <td class="n">${fmtNum(f.carb)}</td>
    <td class="n">${fmtNum(f.gras)}</td>
    <td class="n">${f.peso == null ? '' : fmtNum(f.peso, 1)}</td>
    <td class="n">${f.ejercicio || ''}</td>
    <td class="nota">${escaparHTML(f.nota)}</td>
  </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<title>Déficit — ${escaparHTML(nombreMes)}</title>
<style>
  * { box-sizing: border-box; }
  body { font: 13px/1.5 "Segoe UI", system-ui, sans-serif; color: #1a2029; margin: 0; padding: 28px; background: #fff; }
  h1 { font-size: 22px; margin: 0 0 2px; }
  .sub { color: #667; margin: 0 0 20px; font-size: 13px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .5px; color: #667; margin: 24px 0 10px; }
  .tarjetas { display: flex; flex-wrap: wrap; gap: 10px; }
  .t { border: 1px solid #dde; border-radius: 10px; padding: 10px 14px; min-width: 140px; }
  .t span { display: block; color: #667; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
  .t b { display: block; font-size: 20px; margin-top: 2px; }
  .t small { color: #778; }
  ul.reparto { list-style: none; padding: 0; margin: 0; display: flex; gap: 10px; flex-wrap: wrap; }
  ul.reparto li { border: 1px solid #dde; border-radius: 10px; padding: 8px 12px; }
  ul.reparto b { display: block; font-size: 17px; }
  ul.reparto small { color: #778; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { padding: 5px 7px; border-bottom: 1px solid #eef; text-align: left; }
  th { color: #667; font-size: 11px; text-transform: uppercase; letter-spacing: .4px; }
  td.n { text-align: right; font-variant-numeric: tabular-nums; }
  td.alto { color: #b34; }
  td.bajo { color: #2a7; }
  td.nota { color: #667; font-size: 12px; max-width: 260px; }
  footer { margin-top: 24px; color: #889; font-size: 11px; }
  @media print { body { padding: 0; } .t, ul.reparto li { break-inside: avoid; } }
</style></head>
<body>
  <h1>Déficit — ${escaparHTML(nombreMes)}</h1>
  <p class="sub">Resumen del mes generado desde la app.</p>

  <div class="tarjetas">${tarjetas}</div>

  ${reparto}

  <h2>Día por día</h2>
  <table>
    <thead><tr>
      <th>Día</th><th class="n">kcal</th><th class="n">vs obj.</th>
      <th class="n">Prot</th><th class="n">Carb</th><th class="n">Gras</th>
      <th class="n">Peso</th><th class="n">Ejerc.</th><th>Nota</th>
    </tr></thead>
    <tbody>${filas}</tbody>
  </table>

  <footer>Los valores de las comidas analizadas por foto son estimaciones.</footer>
</body></html>`;
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

/**
 * Deja la serie en un largo manejable para dibujar.
 * Con 400 puntos en 320 px de ancho no se ve una curva sino una mancha, y
 * encima cuesta: se toma una muestra pareja y siempre se conserva el último.
 */
function recortarSerie(serie, maximo = 120) {
  const lista = serie || [];
  if (lista.length <= maximo) return lista;

  const paso = lista.length / maximo;
  const salida = [];
  for (let i = 0; i < maximo; i++) salida.push(lista[Math.floor(i * paso)]);

  const ultimo = lista.at(-1);
  if (salida.at(-1).f !== ultimo.f) salida[salida.length - 1] = ultimo;
  return salida;
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

/* ---------------- lectura de los datos ---------------- */

/**
 * Pendiente por día de una serie de pesos, por mínimos cuadrados.
 * Usa todos los puntos: tomar solo el primero y el último deja la tendencia
 * a merced de dos días sueltos, que en el peso son pura retención de agua.
 */
function pendienteLineal(serie) {
  const n = (serie || []).length;
  if (n < 2) return 0;

  const base = serie[0].f;
  const xs = serie.map(p => diasEntre(base, p.f));
  const ys = serie.map(p => p.kg);

  const mediaX = xs.reduce((a, x) => a + x, 0) / n;
  const mediaY = ys.reduce((a, y) => a + y, 0) / n;

  let arriba = 0, abajo = 0;
  for (let i = 0; i < n; i++) {
    arriba += (xs[i] - mediaX) * (ys[i] - mediaY);
    abajo += (xs[i] - mediaX) ** 2;
  }

  return abajo === 0 ? 0 : arriba / abajo;
}

/**
 * Proyección de peso según la tendencia de toda la serie.
 * Devuelve null si no hay datos suficientes para decir algo serio.
 */
function proyectarPeso(dias, semanas = 4, hoy = hoyISO()) {
  const serie = Object.keys(dias || {})
    .filter(f => typeof dias[f].peso === 'number')
    .sort()
    .map(f => ({ f, kg: dias[f].peso }));

  if (serie.length < 4) return null;

  const lapso = diasEntre(serie[0].f, serie.at(-1).f);
  if (lapso < 7) return null;

  const kgPorDia = pendienteLineal(serie);

  // el punto de partida sí se suaviza: es el valor de hoy, no la tendencia
  const media = mediaMovil(serie, 7);
  const actual = media.at(-1).kg;

  return {
    actual: +actual.toFixed(1),
    proyectado: +(actual + kgPorDia * semanas * 7).toFixed(1),
    kgPorSemana: +(kgPorDia * 7).toFixed(2),
    semanas,
    fecha: sumarDias(hoy, semanas * 7),
    diasDeDatos: lapso
  };
}

/** Cuántos días cerraron dentro del objetivo, sobre los que tienen comidas. */
function adherencia(dias, objetivo, desde = null, hasta = hoyISO()) {
  if (!objetivo) return null;

  const fechas = Object.keys(dias || {})
    .filter(f => f <= hasta && (!desde || f >= desde))
    .filter(f => (dias[f].comidas || []).length);

  if (!fechas.length) return null;

  let dentro = 0, excedidos = 0, muyPorDebajo = 0;

  for (const f of fechas) {
    const kcal = sumarComidas(dias[f].comidas).kcal;
    const meta = objetivo + (Number(dias[f].ejercicio) || 0);

    if (kcal > meta) excedidos++;
    else if (kcal < meta * 0.7) muyPorDebajo++;   // comer de menos también es un problema
    else dentro++;
  }

  return {
    dias: fechas.length,
    dentro,
    excedidos,
    muyPorDebajo,
    pct: Math.round((dentro / fechas.length) * 100)
  };
}

/** Reparto de calorías por momento del día: dónde se te va el déficit. */
function repartoPorMomento(dias, desde = null, hasta = hoyISO()) {
  const acumulado = {};
  for (const m of MOMENTOS) acumulado[m.id] = { kcal: 0, veces: 0 };

  let total = 0;

  for (const f of Object.keys(dias || {})) {
    if (f > hasta || (desde && f < desde)) continue;

    for (const c of dias[f].comidas || []) {
      const id = c.momento || momentoDe(c.ts);
      if (!acumulado[id]) acumulado[id] = { kcal: 0, veces: 0 };
      acumulado[id].kcal += Number(c.kcal) || 0;
      acumulado[id].veces++;
      total += Number(c.kcal) || 0;
    }
  }

  if (!total) return [];

  return MOMENTOS
    .map(m => ({
      id: m.id,
      nombre: m.nombre,
      icono: m.icono,
      kcal: Math.round(acumulado[m.id].kcal),
      veces: acumulado[m.id].veces,
      pct: Math.round((acumulado[m.id].kcal / total) * 100)
    }))
    .filter(m => m.veces > 0);
}

/** Lunes a viernes no cambian en plural; sábado y domingo sí. */
function pluralDia(nombre) {
  const n = String(nombre || '').toLowerCase();
  return n.endsWith('s') ? n : n + 's';
}

/** Promedio de calorías por día de la semana: los findes suelen ser otra historia. */
function patronSemanal(dias, hasta = hoyISO(), cantidad = 56) {
  const NOMBRES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const acumulado = NOMBRES.map(() => ({ kcal: 0, dias: 0 }));

  for (let i = 0; i < cantidad; i++) {
    const f = sumarDias(hasta, -i);
    const d = (dias || {})[f];
    if (!d || !(d.comidas || []).length) continue;

    const [y, m, dd] = f.split('-').map(Number);
    const diaSemana = new Date(y, m - 1, dd).getDay();
    acumulado[diaSemana].kcal += sumarComidas(d.comidas).kcal;
    acumulado[diaSemana].dias++;
  }

  const conDatos = acumulado
    .map((a, i) => ({
      dia: i,
      nombre: NOMBRES[i],
      promedio: a.dias ? Math.round(a.kcal / a.dias) : null,
      dias: a.dias
    }))
    .filter(x => x.dias > 0);

  if (conDatos.length < 2) return null;

  const ordenados = [...conDatos].sort((a, b) => b.promedio - a.promedio);
  return {
    dias: conDatos,
    peor: ordenados[0],
    mejor: ordenados.at(-1)
  };
}

/** Esta semana contra la anterior: promedio, días cargados y peso. */
function compararSemanas(dias, hasta = hoyISO()) {
  const resumen = (desde, fin) => {
    const fechas = [];
    for (let f = desde; f <= fin; f = sumarDias(f, 1)) fechas.push(f);

    const conDatos = fechas.filter(f => (dias[f]?.comidas || []).length);
    const kcal = conDatos.reduce((a, f) => a + sumarComidas(dias[f].comidas).kcal, 0);
    const pesos = fechas.filter(f => typeof dias[f]?.peso === 'number').map(f => dias[f].peso);

    return {
      desde, hasta: fin,
      dias: conDatos.length,
      promedio: conDatos.length ? Math.round(kcal / conDatos.length) : 0,
      total: kcal,
      peso: pesos.length ? +(pesos.reduce((a, p) => a + p, 0) / pesos.length).toFixed(1) : null
    };
  };

  const estaDesde = sumarDias(hasta, -6);
  const anteriorDesde = sumarDias(hasta, -13);

  const actual = resumen(estaDesde, hasta);
  const anterior = resumen(anteriorDesde, sumarDias(hasta, -7));

  if (!actual.dias || !anterior.dias) return null;

  return {
    actual,
    anterior,
    deltaPromedio: actual.promedio - anterior.promedio,
    deltaDias: actual.dias - anterior.dias,
    deltaPeso: (actual.peso != null && anterior.peso != null)
      ? +(actual.peso - anterior.peso).toFixed(1)
      : null
  };
}

/**
 * Avisa si la proteína viene corta. En déficit es lo primero que se descuida
 * y es justo lo que sostiene el músculo mientras bajás.
 */
function alertaProteina(dias, objetivoProt, hasta = hoyISO(), cantidad = 3, umbral = 0.8) {
  if (!objetivoProt) return null;

  const revisados = [];

  for (let i = 0; i < cantidad; i++) {
    const f = sumarDias(hasta, -i);
    const d = (dias || {})[f];
    if (!d || !(d.comidas || []).length) continue;
    revisados.push({ fecha: f, prot: sumarComidas(d.comidas).prot });
  }

  if (revisados.length < cantidad) return null;

  const cortos = revisados.filter(r => r.prot < objetivoProt * umbral);
  if (cortos.length < cantidad) return null;

  const promedio = Math.round(revisados.reduce((a, r) => a + r.prot, 0) / revisados.length);

  return {
    dias: revisados.length,
    promedio,
    objetivo: objetivoProt,
    falta: Math.round(objetivoProt - promedio),
    pct: Math.round((promedio / objetivoProt) * 100)
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

/* ---------------- cache de análisis ---------------- */

const MAX_CACHE = 24;

/**
 * Huella de una imagen para reconocerla sin guardarla entera.
 * FNV-1a sobre una muestra: recorrer 1 MB de base64 en cada foto sería tirar
 * tiempo, y con 4.000 caracteres repartidos ya no hay colisiones en la práctica.
 */
function huellaImagen(b64) {
  const txt = String(b64 || '');
  if (!txt) return '';

  let h = 0x811c9dc5;
  const paso = Math.max(1, Math.floor(txt.length / 4000));

  for (let i = 0; i < txt.length; i += paso) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }

  // el largo entra en la huella: dos fotos distintas rara vez pesan igual
  return (h >>> 0).toString(36) + '-' + txt.length.toString(36);
}

/** Guarda un resultado en el cache, tirando lo más viejo si se pasa del tope. */
function guardarEnCache(cache, huella, valor, ts = Date.now()) {
  if (!huella) return cache || {};
  const nuevo = { ...(cache || {}) };
  nuevo[huella] = { valor: clonar(valor), ts };

  const claves = Object.keys(nuevo).sort((a, b) => nuevo[b].ts - nuevo[a].ts);
  const recortado = {};
  for (const k of claves.slice(0, MAX_CACHE)) recortado[k] = nuevo[k];
  return recortado;
}

/** Busca en el cache. Las entradas viejas se ignoran. */
function leerDeCache(cache, huella, ts = Date.now(), diasValidez = 30) {
  const entrada = (cache || {})[huella];
  if (!entrada) return null;
  if (ts - entrada.ts > diasValidez * 86400000) return null;
  return clonar(entrada.valor);
}

/* ---------------- registro de análisis ---------------- */

const MAX_HISTORIAL_ANALISIS = 50;

/**
 * Anota qué se le pidió a la API y qué costó. Sirve para entender la factura
 * y para ver si conviene bajar la precisión.
 */
function registrarAnalisis(historial, entrada, max = MAX_HISTORIAL_ANALISIS) {
  const fila = {
    ts: Number(entrada.ts) || Date.now(),
    tipo: String(entrada.tipo || 'foto'),
    titulo: String(entrada.titulo || ''),
    modelo: String(entrada.modelo || ''),
    precision: String(entrada.precision || 'normal'),
    costo: Number(entrada.costo) || 0,
    tokens: Number(entrada.tokens) || 0,
    deCache: !!entrada.deCache
  };
  return [fila, ...(historial || [])].slice(0, max);
}

/** Totales del registro, para mostrarlos arriba de la lista. */
function resumenAnalisis(historial) {
  const lista = historial || [];
  const pagados = lista.filter(a => !a.deCache);
  return {
    total: lista.length,
    pagados: pagados.length,
    ahorrados: lista.length - pagados.length,
    costo: +pagados.reduce((a, x) => a + x.costo, 0).toFixed(5),
    tokens: pagados.reduce((a, x) => a + x.tokens, 0)
  };
}

/* ---------------- búsqueda ---------------- */

/**
 * Busca un texto en títulos, alimentos y notas. Devuelve las comidas que
 * coinciden, de la más reciente a la más vieja, con el motivo del match.
 */
function buscarEnHistorial(dias, texto, limite = 40) {
  const q = normalizar(texto);
  if (q.length < 2) return [];

  const salida = [];

  for (const f of Object.keys(dias || {}).sort().reverse()) {
    const d = dias[f];
    const notaCoincide = normalizar(d.nota).includes(q);

    for (const c of d.comidas || []) {
      const enTitulo = normalizar(c.titulo).includes(q);
      const alimentos = (c.items || []).filter(i => normalizar(i.nombre).includes(q));

      if (!enTitulo && !alimentos.length && !notaCoincide) continue;

      salida.push({
        fecha: f,
        comida: c,
        donde: enTitulo ? 'titulo' : (alimentos.length ? 'alimento' : 'nota'),
        alimentos: alimentos.map(i => i.nombre)
      });

      if (salida.length >= limite) return salida;
    }
  }

  return salida;
}

/** Cuántas veces y cuántas calorías representa lo buscado. */
function resumenBusqueda(resultados) {
  const kcal = resultados.reduce((a, r) => a + (Number(r.comida.kcal) || 0), 0);
  const dias = new Set(resultados.map(r => r.fecha)).size;
  return {
    veces: resultados.length,
    dias,
    kcal,
    promedio: resultados.length ? Math.round(kcal / resultados.length) : 0
  };
}

/* ---------------- copiar días ---------------- */

/**
 * Copia las comidas de un día a otro. Devuelve las comidas nuevas, con ids
 * propios y la hora corrida al día destino: la del origen no se toca.
 */
function comidasCopiadas(comidas, fechaDestino, ts = Date.now()) {
  return (comidas || []).map((c, i) => {
    const momento = c.momento || momentoDe(c.ts);
    return {
      ...clonar(c),
      id: 'c' + ts.toString(36) + i.toString(36) + Math.random().toString(36).slice(2, 5),
      // siempre la hora típica del momento, aunque el destino sea hoy: copiar un
      // desayuno a las 22 lo dejaría con la hora al revés que su propio momento.
      // El minuto por índice mantiene el orden entre comidas del mismo momento.
      ts: tsEnMomento(fechaDestino, momento, i)
    };
  });
}

/** Días con comidas cargadas, del más reciente al más viejo, con su total. */
function diasConComidas(dias, excluir = null, limite = 30) {
  return Object.keys(dias || {})
    .filter(f => f !== excluir && (dias[f].comidas || []).length)
    .sort().reverse()
    .slice(0, limite)
    .map(f => ({
      fecha: f,
      comidas: dias[f].comidas.length,
      kcal: sumarComidas(dias[f].comidas).kcal
    }));
}

/* ---------------- recetas ---------------- */

const MAX_RECETAS = 60;

/**
 * Guarda un conjunto de alimentos como plantilla reutilizable.
 * Si ya existe una con el mismo nombre, la reemplaza en vez de duplicar.
 */
function guardarReceta(recetas, nombre, items, ts = Date.now()) {
  const limpio = String(nombre || '').trim();
  if (!limpio) throw new Error('La receta necesita un nombre.');

  const utiles = (items || []).filter(i => i && String(i.nombre || '').trim());
  if (!utiles.length) throw new Error('La receta necesita al menos un alimento.');

  const total = sumarComidas([{
    kcal: utiles.reduce((a, i) => a + (Number(i.calorias) || 0), 0),
    prot: utiles.reduce((a, i) => a + (Number(i.proteinas) || 0), 0),
    carb: utiles.reduce((a, i) => a + (Number(i.carbohidratos) || 0), 0),
    gras: utiles.reduce((a, i) => a + (Number(i.grasas) || 0), 0)
  }]);

  const receta = {
    id: 'r' + ts.toString(36) + Math.random().toString(36).slice(2, 6),
    nombre: limpio,
    items: clonar(utiles.map(({ factor, base, ...i }) => i)),
    kcal: total.kcal, prot: total.prot, carb: total.carb, gras: total.gras,
    usos: 0,
    creada: ts
  };

  const clave = normalizar(limpio);
  const resto = (recetas || []).filter(r => normalizar(r.nombre) !== clave);
  const anterior = (recetas || []).find(r => normalizar(r.nombre) === clave);
  if (anterior) {
    receta.usos = anterior.usos;
    receta.creada = anterior.creada;
  }

  return [receta, ...resto].slice(0, MAX_RECETAS);
}

function borrarReceta(recetas, id) {
  return (recetas || []).filter(r => r.id !== id);
}

/** Devuelve los items de la receta listos para editar, y suma un uso. */
function aplicarReceta(recetas, id) {
  const receta = (recetas || []).find(r => r.id === id);
  if (!receta) return null;

  return {
    items: clonar(receta.items),
    titulo: receta.nombre,
    recetas: (recetas || []).map(r => (r.id === id ? { ...r, usos: r.usos + 1 } : r))
  };
}

/** Las recetas ordenadas por uso, y a igual uso las más nuevas. */
function recetasOrdenadas(recetas) {
  return [...(recetas || [])].sort((a, b) => (b.usos - a.usos) || (b.creada - a.creada));
}

/* ---------------- cambio de día ---------------- */

/** Cuánto falta para las 00:00 del día siguiente, más un margen chico. */
function msHastaMedianoche(ahora = new Date(), margenMs = 2000) {
  const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1, 0, 0, 0, 0);
  return (manana - ahora) + margenMs;
}

/* ---------------- recordatorios ---------------- */

const RECORDATORIOS_DEFAULT = [
  { momento: 'desayuno', hora: '09:00' },
  { momento: 'almuerzo', hora: '13:30' },
  { momento: 'cena', hora: '21:30' }
];

/** Convierte "13:30" en minutos desde medianoche. */
function minutosDeHora(hhmm) {
  const m = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]), min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Los recordatorios que todavía faltan hoy, con cuántos ms quedan.
 * Los del momento ya cargado no se avisan: la idea es recordar, no molestar.
 */
function proximosRecordatorios(horarios, ahora = new Date(), momentosCargados = []) {
  const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();

  return (horarios || [])
    .map(r => ({ ...r, minutos: minutosDeHora(r.hora) }))
    .filter(r => r.minutos != null)
    .filter(r => r.minutos > minutosAhora)
    .filter(r => !momentosCargados.includes(r.momento))
    .sort((a, b) => a.minutos - b.minutos)
    .map(r => ({ ...r, enMs: (r.minutos - minutosAhora) * 60000 }));
}

/** Texto del recordatorio, según si ya comió algo o no. */
function textoRecordatorio(momento, restante = null) {
  const cual = conArticulo(momento);
  if (restante != null && restante > 0) {
    return `¿Cargaste ${cual}? Te quedan ${Math.round(restante)} kcal para hoy.`;
  }
  return `No te olvides de cargar ${cual}.`;
}

/* ---------------- momentos del día ---------------- */

const MOMENTOS = [
  { id: 'desayuno', nombre: 'Desayuno', articulo: 'el', icono: '☕', desde: 5 * 60, hasta: 10 * 60 + 59 },
  { id: 'almuerzo', nombre: 'Almuerzo', articulo: 'el', icono: '🍽️', desde: 11 * 60, hasta: 15 * 60 + 29 },
  { id: 'merienda', nombre: 'Merienda', articulo: 'la', icono: '🥐', desde: 15 * 60 + 30, hasta: 19 * 60 + 29 },
  { id: 'cena', nombre: 'Cena', articulo: 'la', icono: '🌙', desde: 19 * 60 + 30, hasta: 23 * 60 + 59 },
  { id: 'snack', nombre: 'Snack', articulo: 'el', icono: '🍎', desde: 0, hasta: 4 * 60 + 59 }
];

/** "el almuerzo", "la cena": el artículo cambia según el momento. */
function conArticulo(id) {
  const m = MOMENTOS.find(x => x.id === id);
  return m ? `${m.articulo} ${m.nombre.toLowerCase()}` : 'la comida';
}

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

/** Timestamp del día `iso` a la hora típica de ese momento. */
function tsEnMomento(iso, momento, minutos = 0) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, horaDeMomento(momento), minutos, 0, 0).getTime();
}

/**
 * Timestamp para una comida que se está cargando ahora en el día `iso`.
 * Si es hoy, la hora real; si es otro día, la hora típica del momento.
 */
function tsParaFecha(iso, momento, ahora = new Date()) {
  if (iso === hoyISO(ahora)) return ahora.getTime();
  return tsEnMomento(iso, momento);
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
        favorito: false,
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

/** Marca o desmarca un alimento como favorito. Devuelve un array nuevo. */
function alternarFavorito(frecuentes, nombre) {
  const clave = normalizar(nombre);
  return (frecuentes || []).map(f =>
    normalizar(f.nombre) === clave ? { ...f, favorito: !f.favorito } : { ...f }
  );
}

function esFavorito(frecuentes, nombre) {
  const clave = normalizar(nombre);
  return !!(frecuentes || []).find(f => normalizar(f.nombre) === clave && f.favorito);
}

/** Los favoritos, primero los más usados. */
function favoritos(frecuentes, limite = 12) {
  return (frecuentes || [])
    .filter(f => f.favorito)
    .sort((a, b) => (b.usos - a.usos) || (b.ultimoUso - a.ultimoUso))
    .slice(0, limite);
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
    mismaComida, fusionarEstados,
    registrarFrecuentes, buscarFrecuentes, alternarFavorito, esFavorito, favoritos,
    MAX_CACHE, huellaImagen, guardarEnCache, leerDeCache,
    MAX_HISTORIAL_ANALISIS, registrarAnalisis, resumenAnalisis,
    MAX_ERRORES, registrarError, armarDiagnostico, diagnosticoATexto,
    buscarEnHistorial, resumenBusqueda,
    comidasCopiadas, diasConComidas,
    MAX_RECETAS, guardarReceta, borrarReceta, aplicarReceta, recetasOrdenadas,
    msHastaMedianoche,
    RECORDATORIOS_DEFAULT, minutosDeHora, proximosRecordatorios, textoRecordatorio,
    MOMENTOS, momentoPorHora, momentoDe, nombreMomento, conArticulo, agruparPorMomento,
    horaDeMomento, tsParaFecha, tsEnMomento,
    ML_POR_VASO, objetivoAgua, objetivoEfectivo,
    FACTORES, escalarItem, escalarPorcion,
    mediaMovil, recortarSerie, rachaDias, progresoPeso, balanceSemanal, tdeeAdaptativo,
    pendienteLineal, proyectarPeso, adherencia, pluralDia, repartoPorMomento, patronSemanal, compararSemanas, alertaProteina,
    LIMITES, validarPerfil, fmtNum, fmtKcal, fmtDelta, fmtPeso,
    CUOTA_BYTES, usoAlmacenamiento, pesoDeThumbs, kcalDeMacros, revisarDatos, arreglarDatos, armarCSV, celdaCSV,
    escaparHTML, datosDelMes, armarInforme,
    hoyISO, sumarDias, diasEntre, etiquetaFecha,
    calcularPlan, sumarComidas
  };
}
