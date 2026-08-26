/* ============================================================
   analisis.js — lo que lee los datos ya guardados: tendencias,
   patrones, búsqueda, revisión de coherencia y el informe del mes.
   Todo puro, sin DOM y sin red.
   ============================================================ */

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
      fibra: t.fibra,
      azucar: t.azucar,
      sodio: t.sodio,
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
    // solo se informan si alguien los cargó alguna vez en el mes
    conNutrientes: filas.some(f => f.fibra || f.azucar || f.sodio),
    promedioFibra: filas.length ? Math.round(filas.reduce((a, f) => a + f.fibra, 0) / filas.length) : 0,
    promedioAzucar: filas.length ? Math.round(filas.reduce((a, f) => a + f.azucar, 0) / filas.length) : 0,
    promedioSodio: filas.length ? Math.round(filas.reduce((a, f) => a + f.sodio, 0) / filas.length) : 0,
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
    d.adherencia ? tarjeta('Adherencia', d.adherencia.pct + '%', `${d.adherencia.dentro} de ${d.adherencia.dias} días`) : '',
    d.conNutrientes ? tarjeta('Fibra promedio', `${fmtNum(d.promedioFibra)} g`, '') : '',
    d.conNutrientes ? tarjeta('Azúcar promedio', `${fmtNum(d.promedioAzucar)} g`, '') : '',
    d.conNutrientes ? tarjeta('Sodio promedio', `${fmtNum(d.promedioSodio)} mg`, '') : ''
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

if (typeof window !== 'undefined') {
  window.__analisis = {
    escaparHTML, datosDelMes, armarInforme,
    mediaMovil, recortarSerie, rachaDias, progresoPeso, balanceSemanal, tdeeAdaptativo,
    pendienteLineal, proyectarPeso, adherencia, pluralDia, repartoPorMomento,
    patronSemanal, compararSemanas, alertaProteina,
    buscarEnHistorial, resumenBusqueda,
    kcalDeMacros, revisarDatos, arreglarDatos
  };
}

/* ---------------- ¿el sueño te cambia el día? ---------------- */

/* Menos que esto de cada lado y no hay con qué comparar: dos días buenos
   contra uno malo no dicen nada de nadie. */
const MINIMO_POR_GRUPO = 4;

/** Un día se considera de sueño corto por debajo de esto. */
const SUENO_CORTO = 6.5;

/**
 * Compara los días que dormiste poco contra los que dormiste bien.
 *
 * Es la pregunta que más se hace la gente que registra: "¿cuando duermo mal
 * como peor?". Los datos de cada uno pueden responderla, pero solo si hay
 * suficientes de los dos lados — y la mayor parte de esta función es
 * justamente negarse a responder cuando no los hay.
 *
 * Ojo con lo que NO dice: esto es una correlación sobre pocos días, no una
 * relación causal. El texto lo refleja.
 */
function efectoDelSueno(dias, objetivo, hoy = hoyISO(), diasAtras = 60) {
  const cortos = [];
  const largos = [];

  for (let i = 0; i < diasAtras; i++) {
    const f = sumarDias(hoy, -i);
    const d = dias?.[f];
    if (!d?.sueno?.horas) continue;

    const comidas = d.comidas || [];
    if (!comidas.length) continue;

    const kcal = comidas.reduce((a, c) => a + (Number(c.kcal) || 0), 0);
    (Number(d.sueno.horas) < SUENO_CORTO ? cortos : largos).push(kcal);
  }

  if (cortos.length < MINIMO_POR_GRUPO || largos.length < MINIMO_POR_GRUPO) {
    const faltan = Math.max(MINIMO_POR_GRUPO - cortos.length, MINIMO_POR_GRUPO - largos.length);
    return {
      hayDatos: false,
      titulo: 'Todavía no se puede saber',
      texto: `Hacen falta al menos ${MINIMO_POR_GRUPO} días de cada tipo —dormido poco y dormido bien— con la comida registrada. ` +
        `Te faltan unos ${faltan}.`,
      cortos: cortos.length,
      largos: largos.length
    };
  }

  const prom = (a) => Math.round(a.reduce((x, y) => x + y, 0) / a.length);
  const kcalCortos = prom(cortos);
  const kcalLargos = prom(largos);
  const dif = kcalCortos - kcalLargos;
  const pct = Math.round((dif / kcalLargos) * 100);

  const datos = { kcalCortos, kcalLargos, dif, pct, cortos: cortos.length, largos: largos.length };

  // menos de un 8% de diferencia es ruido con estos tamaños de muestra
  if (Math.abs(pct) < 8) {
    return {
      hayDatos: true,
      estado: 'sin-efecto',
      titulo: 'El sueño no te está cambiando lo que comés',
      texto: `Los días que dormiste menos de ${fmtNum(SUENO_CORTO, 1)} h comiste ${fmtNum(kcalCortos)} kcal en promedio, ` +
        `contra ${fmtNum(kcalLargos)} los otros. La diferencia es demasiado chica para significar algo.`,
      datos
    };
  }

  if (dif > 0) {
    return {
      hayDatos: true,
      estado: 'come-mas',
      titulo: `Dormir poco te suma ${fmtNum(dif)} kcal`,
      texto: `Los días de menos de ${fmtNum(SUENO_CORTO, 1)} h comés ${pct}% más: ${fmtNum(kcalCortos)} contra ${fmtNum(kcalLargos)} kcal. ` +
        'Es lo habitual —el sueño corto sube el hambre— pero acá está pasando con tus propios días. ' +
        'Son ' + (cortos.length + largos.length) + ' días: tomalo como una pista, no como una ley.',
      datos
    };
  }

  return {
    hayDatos: true,
    estado: 'come-menos',
    titulo: 'Los días de poco sueño comés menos',
    texto: `${fmtNum(kcalCortos)} kcal contra ${fmtNum(kcalLargos)}. Va al revés de lo esperable, ` +
      'así que puede ser casualidad de estos días o que durmiendo poco te saltees comidas.',
    datos
  };
}
