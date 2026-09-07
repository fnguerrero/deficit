/* ============================================================
   informe.js — el resumen del mes, en HTML para imprimir o guardar.

   Salio de analisis.js, que se estaba pasando de largo. Es lo unico de ese
   archivo que no calcula nada para la pantalla: arma un documento aparte, con
   su propio HTML y su propio escapado.
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
  /* El objetivo del MODO, que es el que ve la persona todos los dias.
     Antes salia de calcularPlan(), que lo despeja del ritmo de perdida en
     kg/semana: dos numeros distintos para lo mismo. Con el ritmo en "muy
     agresivo" el informe del mes usaba 1.763 donde Hoy decia 1.939, asi que
     dias que la app habia dado por cumplidos figuraban pasados en el informe
     que uno imprime. El ritmo decide la FECHA de llegada, no lo que se come:
     esa es toda su influencia y no puede filtrarse a otro lado. */
  const calc = objetivoDeModo(state.perfil, state.perfil?.modo);
  const objetivo = calc ? calc.kcal : 0;

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

if (typeof window !== 'undefined') {
  window.__informe = { escaparHTML, datosDelMes, armarInforme };
}
