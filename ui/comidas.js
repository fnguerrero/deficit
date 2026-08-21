/* ============================================================
   Todo lo que carga una comida: el modal, el análisis por foto,
   las sugerencias, repetir, recetas y el editor de alimentos.
   ============================================================ */

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

/**
 * Frena antes de gastar. Un aviso que no bloquea no evita la sorpresa a fin
 * de mes; esto sí, y deja andando todo lo que no cuesta plata.
 */
function topeAlcanzado() {
  const e = estadoGasto(state.historialAnalisis, { tope: state.cfg.topeGasto });
  if (!e.bloqueado) return false;

  toast('Llegaste al tope del mes', { texto: 'Ver', accion: () => irTab('ajustes') });
  return true;
}

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

/** El cache vive en el state, así sobrevive a recargas y a cerrar la app. */
const cacheDeAnalisis = {
  huella: (imagen, modo) => huellaImagen(imagen) + ':' + modo,
  leer: (h) => leerDeCache(state.cacheAnalisis, h),
  guardar: (h, valor) => {
    state.cacheAnalisis = guardarEnCache(state.cacheAnalisis, h, valor);
    save();
  }
};

/** Llama a la API con la imagen actual. `opciones` permite corregir o leer etiquetas. */
let ultimasImagenes = [];

async function analizarFoto(b64jpeg, opciones = {}) {
  analisisEnCurso = new AbortController();
  try {
    return await analizarImagen({
      fetchFn: (...a) => fetch(...a),
      ...accesoApi(state.cfg),
      modelo: state.cfg.modelo || MODELO_DEFAULT,
      precision: state.cfg.precision || 'normal',
      imagen: b64jpeg,
      contexto: contextoDelUsuario(),
      cache: cacheDeAnalisis,
      onProgreso: mostrarAvance,
      señal: analisisEnCurso.signal,
      ...opciones
    });
  } finally {
    analisisEnCurso = null;
  }
}

/** Mientras el modelo escribe, se van mostrando los alimentos que ya nombró. */
function mostrarAvance(textoParcial) {
  const nombres = alimentosParciales(textoParcial);
  if (!nombres.length) return;
  detenerFrases();
  $('loadingTxt').textContent = nombres.join(' · ');
}

/* Las frases genéricas se cortan apenas hay avance real que mostrar. */
let frenarFrases = null;
function detenerFrases() {
  if (frenarFrases) { frenarFrases(); frenarFrases = null; }
}

function cancelarAnalisis() {
  if (analisisEnCurso) {
    analisisEnCurso.abort();
    analisisEnCurso = null;
  }
}

/* ---------------- modal ---------------- */

function abrirModal() { $('modal').classList.add('open'); }

/** Hay algo cargado que se perdería al cerrar sin guardar. */
function hayDatosSinGuardar() {
  if (!pendiente || !pendiente.items) return false;
  if ($('analisisResult').hidden) return false;   // solo cuenta el editor abierto

  return pendiente.items.some(i => String(i.nombre || '').trim() || Number(i.calorias) > 0);
}

/** `forzar` salta la confirmación: lo usa el guardado, que ya persistió todo. */
function cerrarModal(forzar = false) {
  if (typeof detenerCamara === 'function') detenerCamara();
  if (!forzar && hayDatosSinGuardar()) {
    const nombre = pendiente.titulo?.trim() || 'esta comida';
    if (!confirm(`¿Descartar ${nombre}? Lo que cargaste no se guarda.`)) return;
  }

  cancelarAnalisis();
  $('modal').classList.remove('open');
  pendiente = null;
  $('fileInput').value = '';
}

function mostrarEstado(cual) {
  $('analisisLoading').hidden = cual !== 'loading';
  $('analisisResult').hidden = cual !== 'result';
  $('analisisRepetir').hidden = cual !== 'repetir';
  $('analisisSugerencias').hidden = cual !== 'sugerencias';
  $('panelEscaner').hidden = cual !== 'escaner';
  $('panelProducto').hidden = cual !== 'producto';
  $('btnGuardarProducto').hidden = cual !== 'producto';
  $('analisisError').hidden = cual !== 'error';
  $('btnGuardarComida').disabled = cual !== 'result';
  $('btnGuardarComida').hidden = ['repetir', 'sugerencias', 'escaner', 'producto'].includes(cual);
}

$('modalClose').onclick = () => cerrarModal();
$('btnCancelar').onclick = () => cerrarModal();
$('modal').onclick = e => { if (e.target.id === 'modal') cerrarModal(); };
$('btnCancelarAnalisis').onclick = () => cerrarModal();

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
  if (topeAlcanzado()) return;
  if (!hayAcceso(state.cfg)) {
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
  const frenar = () => clearInterval(t);
  frenarFrases = frenar;
  return frenar;
}

$('fileInput').onchange = async (e) => {
  const archivos = [...(e.target.files || [])].slice(0, 4);   // 4 fotos ya es de sobra
  if (!archivos.length) return;

  const modo = modoAnalisis;
  const varias = archivos.length > 1;
  $('modalTitle').textContent = modo === 'etiqueta' ? 'Leyendo etiqueta'
    : (varias ? `Analizando ${archivos.length} fotos` : 'Analizando foto');
  mostrarEstado('loading');
  abrirModal();
  const frenar = animarEspera(modo);

  try {
    const procesadas = [];
    for (const file of archivos) {
      const original = await leerArchivo(file);
      procesadas.push({
        grande: await redimensionar(original, 1024, 0.82),
        foto: await redimensionar(original, 384, 0.62),   // para el visor
        thumb: await redimensionar(original, 128, 0.55)   // para la lista
      });
    }

    // la primera foto es la que queda como imagen de la comida
    const foto = procesadas[0].foto;
    const thumb = procesadas[0].thumb;
    $('preview').src = procesadas[0].grande;

    const imagenes = procesadas.map(p => p.grande.split(',')[1]);
    ultimaImagen = imagenes[0];
    ultimasImagenes = imagenes;

    const r = await analizarFoto(null, { modo, imagenes });
    frenar();
    registrarUso(r, modo === 'etiqueta' ? 'etiqueta' : 'foto');
    if (r.deCache) toast('Esta foto ya la habías analizado: no gastaste API');
    pendiente = { ...r, thumb, foto, momento: momentoDe(Date.now()), kcalIA: sumarItems(r.items).calorias };
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

  // mover de día solo tiene sentido sobre una comida ya guardada
  const editando = !!r.editandoId;
  $('cajaFecha').hidden = !editando;
  if (editando) {
    $('fechaComida').value = r.fechaDestino || fecha;
    $('fechaComida').max = hoyISO();
    $('fechaComida').onchange = () => { r.fechaDestino = $('fechaComida').value || r.fechaDestino; };
  }

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

    const fav = document.createElement('button');
    fav.type = 'button';
    fav.className = 'estrella' + (esFavorito(state.frecuentes, it.nombre) ? ' on' : '');
    fav.textContent = '⭐';
    fav.title = 'Marcar como favorito';
    fav.setAttribute('aria-label', 'Marcar ' + (it.nombre || 'alimento') + ' como favorito');
    fav.onclick = () => {
      if (!it.nombre.trim()) { toast('Poné el nombre primero'); return; }
      // si el alimento todavía no existe en frecuentes, se registra para poder marcarlo
      if (!state.frecuentes.some(f => normalizar(f.nombre) === normalizar(it.nombre))) {
        state.frecuentes = registrarFrecuentes(state.frecuentes, [it]);
      }
      state.frecuentes = alternarFavorito(state.frecuentes, it.nombre);
      save(); pintarItems(r); renderFavoritos();
      toast(esFavorito(state.frecuentes, it.nombre) ? 'Agregado a favoritos' : 'Sacado de favoritos');
    };

    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×';
    del.onclick = () => { r.items.splice(i, 1); pintarItems(r); };

    top.append(nom, kcal, fav, del);

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

$('btnGuardarReceta').onclick = () => {
  if (!pendiente) return;
  const nombre = (pendiente.titulo || '').trim() || prompt('¿Cómo se llama la receta?') || '';
  try {
    state.recetas = guardarReceta(state.recetas, nombre, pendiente.items);
    save();
    toast(`Receta "${nombre}" guardada`);
  } catch (e) {
    toast(e.message);
  }
};

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

  // lo que la IA estimó contra lo que quedó guardado: cada diferencia es una
  // medición gratis de cuánto se equivoca
  if (pendiente.kcalIA) {
    state.correcciones = registrarCorreccion(state.correcciones, pendiente.kcalIA, sumarItems(items).calorias);
  }

  const suma = (k) => items.reduce((a, i) => a + (Number(i[k]) || 0), 0);

  // modo edición: se actualiza la comida existente y se conserva su hora
  if (pendiente.editandoId) {
    const origen = pendiente.fechaOriginal || fecha;
    const c = dia(origen).comidas.find(x => x.id === pendiente.editandoId);
    if (c) {
      const momentoAntes = c.momento;
      c.titulo = pendiente.titulo?.trim() || items[0].nombre || 'Comida';
      c.items = items;
      c.momento = pendiente.momento || c.momento;
      c.kcal = suma('calorias');
      c.prot = suma('proteinas');
      c.carb = suma('carbohidratos');
      c.gras = suma('grasas');
      c.fibra = suma('fibra');
      c.azucar = suma('azucar');
      c.sodio = suma('sodio');

      // si cambió el momento dentro del mismo día, la hora acompaña
      if (c.momento !== momentoAntes) c.ts = tsEnMomento(origen, c.momento);

      const destino = pendiente.fechaDestino || origen;
      let movida = false;
      if (destino !== origen) {
        dia(origen).comidas = dia(origen).comidas.filter(x => x.id !== c.id);
        c.ts = tsEnMomento(destino, c.momento);
        dia(destino).comidas.push(c);
        movida = true;
      }

      save(); cerrarModal(true); renderHoy(); renderHistorial();
      toast(movida ? `Movida a ${etiquetaFecha(destino)}` : 'Comida actualizada');
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
    fibra: suma('fibra'),
    azucar: suma('azucar'),
    sodio: suma('sodio'),
    thumb: pendiente.thumb || null,
    foto: pendiente.foto || null,
    notas: pendiente.notas || ''
  });

  save();
  cerrarModal(true);
  renderHoy();
  programarRecordatorios();
  // con datos cargados ya vale la pena pedirle al navegador que no los borre
  if (typeof pedirPersistencia === 'function') pedirPersistencia();
  toast('Comida guardada');
};
