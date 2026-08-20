/* ============================================================
   Lo que propone la app: sugerencias con lo que queda del día,
   corregir una estimación, repetir comidas, recetas y copiar días.
   ============================================================ */

/* ---------------- qué comer con lo que queda ---------------- */

/** Lo que falta para cerrar el día, en calorías y en cada macro. */
function margenDelDia() {
  const calc = calcular();
  if (!calc) return null;

  const t = totalesDia();
  const objetivo = objetivoEfectivo(calc.objetivo, dia().ejercicio);

  return {
    kcal: Math.max(0, objetivo - t.kcal),
    prot: Math.max(0, calc.macros.prot - t.prot),
    carb: Math.max(0, calc.macros.carb - t.carb),
    gras: Math.max(0, calc.macros.gras - t.gras)
  };
}

$('btnSugerir').onclick = async () => {
  if (topeAlcanzado()) return;
  if (!state.cfg.apiKey) {
    toast('Falta la API key', { texto: 'Cargarla', accion: () => irTab('ajustes') });
    return;
  }

  const margen = margenDelDia();
  if (!margen) { toast('Cargá tu perfil para saber cuánto te queda'); irTab('perfil'); return; }
  if (margen.kcal < 100) { toast('Ya casi no te quedan calorías para hoy'); return; }

  $('modalTitle').textContent = 'Buscando opciones';
  mostrarEstado('loading');
  $('preview').src = '';
  abrirModal();
  const frenar = animarEspera('plato');
  $('loadingTxt').textContent = `Buscando algo de ${fmtKcal(margen.kcal)}…`;

  analisisEnCurso = new AbortController();

  try {
    const r = await sugerirComida({
      fetchFn: (...args) => fetch(...args),
      apiKey: state.cfg.apiKey,
      modelo: resolverPrecision(state.cfg.precision || 'normal', state.cfg.modelo || MODELO_DEFAULT).modelo,
      margen,
      momento: nombreMomento(momentoDe(Date.now())).toLowerCase(),
      // la proteína es lo que más se descuida en déficit
      faltaProteina: margen.prot > (calcular()?.macros.prot || 0) * 0.35,
      frecuentes: (state.frecuentes || []).slice(0, 12).map(f => f.nombre),
      señal: analisisEnCurso.signal
    });

    frenar();
    registrarUso(r, 'sugerencia');
    mostrarSugerencias(r, margen);
  } catch (err) {
    frenar();
    if (err.name === 'AbortError') return;
    $('modalTitle').textContent = 'No salió';
    $('errorTxt').textContent = err.message;
    mostrarEstado('error');
  } finally {
    analisisEnCurso = null;
  }
};

function mostrarSugerencias(r, margen) {
  $('modalTitle').textContent = 'Opciones para hoy';
  $('sugerenciasMargen').textContent =
    `Te quedan ${fmtKcal(margen.kcal)} · ${fmtNum(margen.prot)} g de proteína`;

  const ul = $('listaSugerencias');
  ul.innerHTML = '';

  for (const o of r.opciones) {
    const kcal = o.items.reduce((acc, i) => acc + (Number(i.calorias) || 0), 0);

    const li = document.createElement('li');
    li.className = 'clicable sugerencia';
    li.tabIndex = 0;

    const cab = document.createElement('div');
    cab.className = 'sugerencia-cab';
    const b = document.createElement('b'); b.textContent = o.titulo;
    const k = document.createElement('span'); k.className = 'kcal'; k.textContent = fmtNum(Math.round(kcal));
    cab.append(b, k);

    const porque = document.createElement('span');
    porque.className = 'sugerencia-porque'; porque.textContent = o.porque;

    const items = document.createElement('span');
    items.className = 'sugerencia-items';
    items.textContent = o.items.map(i => `${i.nombre}${i.porcion ? ' (' + i.porcion + ')' : ''}`).join(' · ');

    const elegir = () => {
      pendiente = {
        titulo: o.titulo,
        momento: fecha === hoyISO() ? momentoDe(Date.now()) : 'almuerzo',
        confianza: 'alta',
        notas: o.porque,
        thumb: null,
        items: clonar(o.items)
      };
      $('modalTitle').textContent = 'Revisá y guardá';
      mostrarResultado(pendiente);
      mostrarEstado('result');
    };

    li.onclick = elegir;
    li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(); } };

    li.append(cab, porque, items);
    ul.appendChild(li);
  }

  $('sugerenciasCosto').textContent = r.costo ? `${formatearCosto(r.costo)} esta consulta` : '';
  mostrarEstado('sugerencias');
}

/* ---------------- corregir la estimación ---------------- */

async function reanalizarConCorreccion(texto) {
  if (!ultimaImagen || !texto.trim()) return;
  if (topeAlcanzado()) return;

  const previo = {
    titulo: pendiente.titulo,
    confianza: pendiente.confianza,
    items: pendiente.items.map(({ factor, base, ...i }) => i),
    notas: pendiente.notas || ''
  };
  const thumb = pendiente.thumb;
  const foto = pendiente.foto;

  $('modalTitle').textContent = 'Corrigiendo';
  mostrarEstado('loading');
  const frenar = animarEspera('plato');
  $('loadingTxt').textContent = 'Rehaciendo la estimación con tu corrección…';

  try {
    const r = await analizarFoto(null, {
      imagenes: ultimasImagenes.length ? ultimasImagenes : [ultimaImagen],
      correccion: texto, previo, modo: modoAnalisis
    });
    frenar();
    registrarUso(r, 'correccion');
    pendiente = { ...r, thumb, foto, momento: pendiente.momento, kcalIA: sumarItems(r.items).calorias };
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

function registrarUso(r, tipo = 'foto') {
  if (!r) return;

  const tokens = (r.tokens?.entrada || 0) + (r.tokens?.salida || 0);

  // lo que salió del cache también se anota: es la prueba de lo que ahorraste
  state.historialAnalisis = registrarAnalisis(state.historialAnalisis, {
    ts: Date.now(),
    tipo,
    titulo: r.titulo || (r.opciones ? `${r.opciones.length} sugerencias` : ''),
    modelo: r.modelo || '',
    precision: state.cfg.precision || 'normal',
    costo: r.costo || 0,
    tokens,
    deCache: !!r.deCache
  });

  if (r.costo) {
    const u = state.uso;
    u.llamadas += 1;
    u.costo = +(u.costo + r.costo).toFixed(6);
    u.tokens += tokens;
  }

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

function pintarRecetas() {
  const lista = recetasOrdenadas(state.recetas);
  $('bloqueRecetas').hidden = !lista.length;
  const ul = $('listaRecetas');
  ul.innerHTML = '';

  for (const r of lista) {
    const li = document.createElement('li');
    li.className = 'clicable';
    li.tabIndex = 0;

    const info = document.createElement('div');
    info.className = 'info';
    const b = document.createElement('b'); b.textContent = r.nombre;
    const sm = document.createElement('small');
    sm.textContent = `${r.items.length} ${r.items.length === 1 ? 'alimento' : 'alimentos'}` +
      (r.usos ? ` · usada ${fmtNum(r.usos)} ${r.usos === 1 ? 'vez' : 'veces'}` : '');
    info.append(b, sm);

    const kcal = document.createElement('span');
    kcal.className = 'kcal'; kcal.textContent = fmtNum(r.kcal);

    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×';
    del.setAttribute('aria-label', 'Borrar la receta ' + r.nombre);
    del.onclick = (e) => {
      e.stopPropagation();
      state.recetas = borrarReceta(state.recetas, r.id);
      save(); pintarRecetas();
      toast('Receta borrada');
    };

    const usar = () => usarReceta(r.id);
    li.onclick = usar;
    li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); usar(); } };

    li.append(info, kcal, del);
    ul.appendChild(li);
  }
}

/** Una receta se abre en el editor: se puede ajustar la porción antes de guardar. */
function usarReceta(id) {
  const aplicada = aplicarReceta(state.recetas, id);
  if (!aplicada) return;

  state.recetas = aplicada.recetas;
  save();

  pendiente = {
    titulo: aplicada.titulo,
    momento: fecha === hoyISO() ? momentoDe(Date.now()) : 'almuerzo',
    confianza: 'alta',
    notas: '',
    thumb: null,
    items: aplicada.items
  };

  $('modalTitle').textContent = 'Revisá y guardá';
  mostrarResultado(pendiente);
  mostrarEstado('result');
}

function pintarDiasCopiables() {
  const lista = diasConComidas(state.dias, fecha, 10);
  $('bloqueDias').hidden = !lista.length;
  const ul = $('listaDiasCopiar');
  ul.innerHTML = '';

  for (const d of lista) {
    const li = document.createElement('li');
    li.className = 'clicable';
    li.tabIndex = 0;
    li.setAttribute('aria-label', `Copiar ${etiquetaFecha(d.fecha)} a ${etiquetaFecha(fecha)}`);

    const info = document.createElement('div');
    info.className = 'info';
    const b = document.createElement('b'); b.textContent = etiquetaFecha(d.fecha);
    const sm = document.createElement('small');
    sm.textContent = `${d.comidas} ${d.comidas === 1 ? 'comida' : 'comidas'}`;
    info.append(b, sm);

    const kcal = document.createElement('span');
    kcal.className = 'kcal'; kcal.textContent = fmtNum(d.kcal);

    const copiar = () => copiarDiaEntero(d.fecha);
    li.onclick = copiar;
    li.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copiar(); } };

    li.append(info, kcal);
    ul.appendChild(li);
  }
}

/** Copia todas las comidas de otro día al día que estás viendo. */
function copiarDiaEntero(desde) {
  const origen = state.dias[desde];
  if (!origen || !origen.comidas.length) return;

  const nuevas = comidasCopiadas(origen.comidas, fecha);
  const destino = dia();
  const habia = destino.comidas.length;
  destino.comidas.push(...nuevas);
  save();
  cerrarModal(true);
  renderHoy();

  toast(`${nuevas.length} ${nuevas.length === 1 ? 'comida copiada' : 'comidas copiadas'}`, {
    texto: 'Deshacer',
    accion: () => {
      dia().comidas = dia().comidas.slice(0, habia);
      save(); renderHoy();
      toast('Deshecho');
    }
  });
}

$('btnRepetir').onclick = () => {
  pintarRecetas();
  pintarDiasCopiables();
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
