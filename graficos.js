/* ============================================================
   graficos.js — las series y su dibujo.

   Sin librerías: los gráficos son SVG armado a mano. Una librería de charts
   pesa más que toda esta app junta, y acá hacen falta tres tipos de gráfico,
   no cuarenta.

   La parte que importa de verdad es el agrupado por período: mirar el peso día
   a día es mirar ruido —agua, sal, la hora de la balanza—, y por semana recién
   ahí aparece la tendencia.
   ============================================================ */

/*
 * Cuánto se mira hacia atrás. Uno solo para Historial y para Progreso.
 *
 * Antes cada pantalla preguntaba otra cosa: Progreso ofrecía "Días / Semanas /
 * Meses" —que es cómo se agrupan los puntos— e Historial "7 / 30 / 90 / todo"
 * —que es cuánto se mira—. Dos preguntas parecidas con respuestas distintas,
 * y ninguna era la que uno se hace, que es simplemente cuánto tiempo mirar.
 *
 * La agrupación deja de preguntarse y se deduce: en tres meses no entran
 * noventa puntos legibles, así que se agrupa por semana; en "todo", por mes.
 */
const RANGOS = [
  { id: 7, nombre: '7 días', dias: 7, periodo: 'dia', detalle: 'Últimos 7 días' },
  { id: 30, nombre: '1 mes', dias: 30, periodo: 'dia', detalle: 'Último mes' },
  { id: 90, nombre: '3 meses', dias: 90, periodo: 'semana', detalle: 'Últimos 3 meses' },
  { id: 0, nombre: 'Todo', dias: 0, periodo: 'mes', detalle: 'Todo el historial' }
];

/** El rango elegido, compartido por las dos pantallas. */
function rangoActual() {
  const g = Number(state.cfg.rango);
  return RANGOS.find(r => r.id === g) || RANGOS[1];
}

/*
 * El selector, igual en las dos pantallas.
 *
 * `alCambiar` corre después de guardar: cada pantalla redibuja lo suyo.
 */
function pintarSelRango(cont, alCambiar) {
  if (!cont) return;

  const actual = rangoActual();
  cont.innerHTML = '';

  for (const r of RANGOS) {
    const b = document.createElement('button');
    b.className = 'periodo' + (r.id === actual.id ? ' activo' : '');
    b.textContent = r.nombre;
    b.setAttribute('aria-pressed', String(r.id === actual.id));
    b.onclick = (e) => {
      if (e.detail > 0) e.currentTarget.blur();
      state.cfg.rango = r.id;
      save();
      alCambiar();
    };
    cont.appendChild(b);
  }
}

const PERIODOS = [
  { id: 'dia', nombre: 'Días', puntos: 14, dias: 14, detalle: 'Últimos 14 días' },
  { id: 'semana', nombre: 'Semanas', puntos: 8, dias: 56, detalle: 'Últimas 8 semanas' },
  { id: 'mes', nombre: 'Meses', puntos: 6, dias: 180, detalle: 'Últimos 6 meses' }
];

function periodoDe(id) {
  return PERIODOS.find(p => p.id === id) || PERIODOS[0];
}

/** La etiqueta con la que se agrupa cada fecha según el período. */
function claveDePeriodo(fecha, periodo) {
  if (periodo === 'mes') return fecha.slice(0, 7);
  if (periodo === 'semana') {
    // el lunes de esa semana: agrupar por número de semana da saltos raros
    // entre diciembre y enero, y esto no.
    const d = new Date(fecha + 'T00:00:00');
    const dia = (d.getDay() + 6) % 7;   // lunes = 0
    d.setDate(d.getDate() - dia);
    return d.toISOString().slice(0, 10);
  }
  return fecha;
}

/** Cómo se muestra esa clave en el eje. */
function etiquetaDePeriodo(clave, periodo) {
  if (periodo === 'mes') {
    const [a, m] = clave.split('-');
    return ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'][Number(m) - 1] || m;
  }
  const [, m, d] = clave.split('-');
  return periodo === 'semana' ? `${Number(d)}/${Number(m)}` : `${Number(d)}`;
}

/**
 * Arma las series de un período.
 *
 * Devuelve un punto por grupo con lo que hace falta para los tres gráficos.
 * Los días sin datos NO se inventan: quedan con null y el gráfico corta la
 * línea ahí, que es lo honesto — dibujar una recta entre dos pesos con una
 * semana de hueco es inventar una tendencia que nadie midió.
 */
function seriesDe(dias, { periodo = 'dia', objetivo = null, hasta = hoyISO(), lapso = 0 } = {}) {
  const p = periodoDe(periodo);
  const grupos = new Map();

  /* Se recorre hacia atrás desde hoy para no depender de qué hay cargado.
     `lapso` lo fija el rango elegido; sin él se usa el largo propio del
     período, que es como venía funcionando. */
  const diasHaciaAtras = lapso || (periodo === 'dia' ? p.puntos : (periodo === 'semana' ? p.puntos * 7 : p.puntos * 31));

  for (let i = diasHaciaAtras - 1; i >= 0; i--) {
    const f = sumarDias(hasta, -i);
    const clave = claveDePeriodo(f, periodo);
    if (!grupos.has(clave)) grupos.set(clave, { clave, pesos: [], kcal: [], carb: [], prot: [], dentro: 0, conComidas: 0 });

    const g = grupos.get(clave);
    const d = dias?.[f];
    if (!d) continue;

    if (Number(d.peso) > 0) g.pesos.push(Number(d.peso));

    const comidas = d.comidas || [];
    if (comidas.length) {
      const t = comidas.reduce((a, c) => ({
        kcal: a.kcal + (Number(c.kcal) || 0),
        carb: a.carb + (Number(c.carb) || 0),
        prot: a.prot + (Number(c.prot) || 0)
      }), { kcal: 0, carb: 0, prot: 0 });

      g.kcal.push(t.kcal);
      g.carb.push(t.carb);
      g.prot.push(t.prot);
      g.conComidas++;
      if (objetivo?.kcal && t.kcal <= objetivo.kcal * 1.05) g.dentro++;
    }
  }

  const prom = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

  const puntos = [...grupos.values()].slice(-p.puntos).map(g => ({
    clave: g.clave,
    etiqueta: etiquetaDePeriodo(g.clave, periodo),
    peso: prom(g.pesos),
    kcal: prom(g.kcal),
    carb: prom(g.carb),
    prot: prom(g.prot),
    adherencia: g.conComidas ? Math.round((g.dentro / g.conComidas) * 100) : null,
    dias: g.conComidas
  }));

  return { periodo: p, puntos, hayDatos: puntos.some(x => x.peso != null || x.kcal != null) };
}

/* ---------------- el dibujo ---------------- */

const G = { ancho: 320, alto: 130, padL: 34, padR: 8, padT: 10, padB: 20 };

function escala(valores, { desdeCero = false } = {}) {
  const nums = valores.filter(v => v != null && isFinite(v));
  if (!nums.length) return null;

  let min = desdeCero ? 0 : Math.min(...nums);
  let max = Math.max(...nums);

  if (min === max) { min -= 1; max += 1; }
  else if (!desdeCero) {
    // un poco de aire arriba y abajo, o la línea toca los bordes
    const aire = (max - min) * 0.15;
    min -= aire; max += aire;
  } else {
    max *= 1.1;
  }
  return { min, max };
}

function coordX(i, total) {
  const util = G.ancho - G.padL - G.padR;
  return total <= 1 ? G.padL + util / 2 : G.padL + (i / (total - 1)) * util;
}

function coordY(v, esc) {
  const util = G.alto - G.padT - G.padB;
  return G.padT + util - ((v - esc.min) / (esc.max - esc.min)) * util;
}

function ejes(esc, puntos) {
  if (!esc) return '';
  const util = G.alto - G.padT - G.padB;
  let out = '';

  // tres líneas de referencia alcanzan: más es ruido en 130 px de alto
  for (let i = 0; i <= 2; i++) {
    const y = G.padT + (i / 2) * util;
    const valor = esc.max - (i / 2) * (esc.max - esc.min);
    /* Con un rango chico —el peso se mueve menos de un kilo— redondear a entero
       imprime el mismo número tres veces. Ahí van decimales. */
    const rango = esc.max - esc.min;
    const txt = rango < 5 ? fmtNum(valor, 1) : fmtNum(Math.round(valor));

    out += `<line x1="${G.padL}" y1="${y}" x2="${G.ancho - G.padR}" y2="${y}" stroke="var(--line)" stroke-width="1"/>` +
      `<text x="${G.padL - 4}" y="${y + 3}" text-anchor="end" font-size="8" fill="var(--dim)">${txt}</text>`;
  }

  // solo algunas etiquetas del eje, o se pisan entre ellas
  const paso = Math.ceil(puntos.length / 7);
  puntos.forEach((p, i) => {
    if (i % paso !== 0 && i !== puntos.length - 1) return;
    out += `<text x="${coordX(i, puntos.length)}" y="${G.alto - 6}" text-anchor="middle" font-size="8" fill="var(--dim)">${p.etiqueta}</text>`;
  });

  return out;
}

/** Línea con puntos. Los huecos cortan la línea en vez de inventar el tramo. */
function graficoLinea(puntos, campo, { color = 'var(--acc)', desdeCero = false, meta = null } = {}) {
  const vals = puntos.map(p => p[campo]);
  const esc = escala(meta != null ? [...vals, meta] : vals, { desdeCero });
  if (!esc) return svgVacio();

  let d = '';
  let abierto = false;
  let circulos = '';

  puntos.forEach((p, i) => {
    const v = p[campo];
    if (v == null) { abierto = false; return; }
    const x = coordX(i, puntos.length);
    const y = coordY(v, esc);
    d += (abierto ? ' L' : ' M') + x.toFixed(1) + ' ' + y.toFixed(1);
    abierto = true;
    circulos += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${color}"/>`;
  });

  const lineaMeta = meta != null
    ? `<line x1="${G.padL}" y1="${coordY(meta, esc)}" x2="${G.ancho - G.padR}" y2="${coordY(meta, esc)}"
         stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="4 3" opacity=".8"/>`
    : '';

  return `<svg viewBox="0 0 ${G.ancho} ${G.alto}" class="gr" preserveAspectRatio="none">
    ${ejes(esc, puntos)}${lineaMeta}
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>
    ${circulos}
  </svg>`;
}

/** Barras. Se usa para calorías contra objetivo: la barra que se pasa se pinta distinto. */
function graficoBarras(puntos, campo, { meta = null, color = 'var(--acc)', pasarEsMalo = true } = {}) {
  const vals = puntos.map(p => p[campo]);
  const esc = escala(meta != null ? [...vals, meta] : vals, { desdeCero: true });
  if (!esc) return svgVacio();

  const util = G.ancho - G.padL - G.padR;
  const ancho = Math.max(4, (util / puntos.length) * 0.62);
  let barras = '';

  puntos.forEach((p, i) => {
    const v = p[campo];
    if (v == null) return;
    const x = coordX(i, puntos.length) - ancho / 2;
    const y = coordY(v, esc);
    const alto = Math.max(1, (G.alto - G.padB) - y);
    /* En calorías pasarse del objetivo es malo y va en rojo. En adherencia es al
       revés: superar la meta es justamente lo que se busca. */
    const mal = meta != null && (pasarEsMalo ? v > meta * 1.05 : v < meta);
    barras += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${ancho.toFixed(1)}" height="${alto.toFixed(1)}"
      rx="2" fill="${mal ? 'var(--err)' : color}" opacity="${mal ? '.85' : '.8'}"/>`;
  });

  const lineaMeta = meta != null
    ? `<line x1="${G.padL}" y1="${coordY(meta, esc)}" x2="${G.ancho - G.padR}" y2="${coordY(meta, esc)}"
         stroke="var(--warn)" stroke-width="1.5" stroke-dasharray="4 3"/>`
    : '';

  return `<svg viewBox="0 0 ${G.ancho} ${G.alto}" class="gr" preserveAspectRatio="none">
    ${ejes(esc, puntos)}${barras}${lineaMeta}
  </svg>`;
}

function svgVacio() {
  return `<svg viewBox="0 0 ${G.ancho} ${G.alto}" class="gr" preserveAspectRatio="none">
    <text x="${G.ancho / 2}" y="${G.alto / 2}" text-anchor="middle" font-size="11" fill="var(--dim)">Sin datos todavía</text>
  </svg>`;
}

/**
 * Qué gráficos mostrar según el modo.
 *
 * En keto o low carb lo que importa mirar son los carbohidratos, y en los modos
 * de proteína alta, la proteína. Mostrar siempre lo mismo sería ignorar para
 * qué está usando la app la persona.
 */
function graficoDelModo(idModo) {
  const modo = modoDe(idModo);
  if (modo.carbosMaxDia) {
    return { campo: 'carb', titulo: 'Carbohidratos por día', meta: modo.carbosMaxDia, color: 'var(--warn)' };
  }
  if (modo.proteinaPorKg >= 2) {
    return { campo: 'prot', titulo: 'Proteína por día', meta: null, color: '#7aa7ff' };
  }
  return null;
}
