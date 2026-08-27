/* ============================================================
   ui/edicion.js — el resultado del análisis, editable, y lo que pasa
   cuando se guarda.

   Salió de ui/comidas.js, que se pasó de tamaño: cargar una comida (elegir la
   foto, mandarla, esperar) y corregirla (tocar los alimentos, cambiar
   cantidades, ver el total) son dos momentos distintos y no se pisan.
   ============================================================ */

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

/*
 * Cuando se guarda a mano —desde la pantalla de revisión— y la comida rompe el
 * modo, se avisa antes de cerrar. No bloquea: la persona come lo que quiere y la
 * app registra, no vigila. Pero enterarse después de guardar no sirve de nada.
 */
$('btnGuardarComida').onclick = () => {
  if (pendiente && !pendiente.avisado) {
    const items = (pendiente.items || []).filter(i => i.nombre?.trim() || i.calorias);
    const suma = (k) => items.reduce((a, i) => a + (Number(i[k]) || 0), 0);

    const v = comidaApta({
      kcal: suma('calorias'), prot: suma('proteinas'),
      carb: suma('carbohidratos'), gras: suma('grasas'),
      sodio: suma('sodio'), perfil: pendiente.perfil || null
    }, state.perfil.modo, calcular(), totalesDia());

    if (v.nivel === 'no') {
      pendiente.avisado = true;   // al segundo toque guarda sin repetir el aviso
      $('avisoModo').textContent = `${etiquetaApta(v, state.perfil.modo)}: ${v.motivo} Tocá Guardar de nuevo si va igual.`;
      $('avisoModo').hidden = false;
      return;
    }
  }

  guardarComidaPendiente();
};

/**
 * Guarda lo que quedo en `pendiente`. La usan el boton y el guardado directo.
 */
function guardarComidaPendiente({ avisar = false } = {}) {
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

  const nuevoId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  ultimaComidaId = nuevoId;

  dia().comidas.push({
    id: nuevoId,
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
    notas: pendiente.notas || '',
    // de qué está hecho el plato: es lo que permite decir si entra en el modo
    perfil: pendiente.perfil || null
  });

  save();

  /* Lo que hace falta para el aviso se toma ANTES de cerrar: cerrarModal limpia
     `pendiente`, y leerlo despues dejaba el resumen con el nombre del primer
     alimento en vez del titulo del plato. */
  const datosAviso = avisar ? {
    titulo: pendiente.titulo?.trim() || items[0]?.nombre || 'Comida',
    kcal: suma('calorias'),
    comida: {
      kcal: suma('calorias'),
      prot: suma('proteinas'),
      carb: suma('carbohidratos'),
      gras: suma('grasas'),
      perfil: pendiente.perfil || null
    },
    id: ultimaComidaId
  } : null;

  cerrarModal(true);
  renderHoy();
  programarRecordatorios();
  // con datos cargados ya vale la pena pedirle al navegador que no los borre
  if (typeof pedirPersistencia === 'function') pedirPersistencia();

  if (datosAviso) avisarComidaGuardada(datosAviso);
  else toast('Comida guardada');
}

/**
 * El resumen de lo que se guardó solo.
 *
 * Como ya no hay pantalla de revisión, este aviso es lo único que la persona ve
 * del análisis: tiene que decir qué entendió, cuánto sumó, si entra en el modo,
 * y dejar la puerta abierta para corregirlo.
 */
function avisarComidaGuardada({ titulo, kcal, comida, id }) {
  /* El resto del día ya incluye esta comida, así que para juzgarla se descuenta:
     si no, en keto una comida se compararía contra sus propios carbohidratos. */
  const hoy = totalesDia();
  const previo = { carb: Math.max(0, (hoy.carb || 0) - (comida.carb || 0)) };

  const v = comidaApta(comida, state.perfil.modo, calcular(), previo);
  mostrarResumenComida({ titulo, kcal, veredicto: v, etiqueta: etiquetaApta(v, state.perfil.modo), id });
}

/* ---------------- el resumen de lo que se guardó ---------------- */

function mostrarResumenComida({ titulo, kcal, veredicto, etiqueta, id }) {
  $('resumenTitulo').textContent = titulo;
  $('resumenKcal').textContent = fmtNum(Math.round(kcal));

  const marca = $('resumenApta');
  if (etiqueta) {
    marca.textContent = etiqueta;
    marca.className = 'marca-apta grande ' + (veredicto.nivel === 'si' ? '' : veredicto.nivel);
    marca.hidden = false;
  } else {
    marca.hidden = true;
  }

  $('resumenIcono').textContent = veredicto?.nivel === 'no' ? '⚠️' : '✓';
  $('resumenMotivo').textContent = veredicto?.motivo || '';

  $('btnResumenEditar').onclick = () => {
    cerrarResumen();
    if (id) editarComida(id);
  };

  abrirCapa('modalResumen');
  tomarFoco($('modalResumen'));
}

function cerrarResumen() {
  $('modalResumen').classList.remove('open');
  devolverFoco();
}

$('btnResumenListo').onclick = cerrarResumen;
$('modalResumen').onclick = (e) => { if (e.target.id === 'modalResumen') cerrarResumen(); };
