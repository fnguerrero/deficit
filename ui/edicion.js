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

  /* Borrar desde acá. Antes había que cerrar el editor, encontrar la comida en
     la lista y tocar su ✕: tres pasos para deshacer lo que estabas mirando. */
  const borrar = $('btnBorrarComida');
  if (borrar) borrar.hidden = !editando;
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
      const arreglo = comoHacerlaApta({
        kcal: suma('calorias'), prot: suma('proteinas'), carb: suma('carbohidratos'),
        gras: suma('grasas'), sodio: suma('sodio'), perfil: pendiente.perfil || null, items
      }, state.perfil.modo, calcular(), totalesDia());

      $('avisoModo').textContent = `${etiquetaApta(v, state.perfil.modo)}: ${v.motivo}` +
        (arreglo.texto ? ` ${arreglo.texto}` : '') + ' Tocá Guardar de nuevo si va igual.';
      $('avisoModo').hidden = false;
      return;
    }
  }

  guardarComidaPendiente();
};

/**
 * Guarda lo que quedo en `pendiente`. La usan el boton y el guardado directo.
 */
function guardarComidaPendiente({ avisar = false, dudoso = '' } = {}) {
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
    perfil: pendiente.perfil || null,
    /* Y la duda que la foto no puede resolver, con sus variantes ya
       calculadas: se guarda para poder cambiar de opinión más tarde, no solo
       en el momento. */
    ambiguedad: pendiente.ambiguedad || null
  });

  save();

  /* Lo que hace falta para el aviso se toma ANTES de cerrar: cerrarModal limpia
     `pendiente`, y leerlo despues dejaba el resumen con el nombre del primer
     alimento en vez del titulo del plato. */
  /* Y el título también, por el mismo motivo: `pareceDuplicada` lo necesita
     después de cerrar, y leerlo de `pendiente` ahí explotaba con "Cannot read
     properties of null". La comida se guardaba igual —el save ya había
     pasado— así que el error no se veía: lo que se perdía en silencio eran el
     resumen de lo guardado y el aviso de comida repetida. */
  const tituloGuardado = pendiente.titulo?.trim() || items[0]?.nombre || 'Comida';

  const datosAviso = avisar ? {
    titulo: tituloGuardado,
    kcal: suma('calorias'),
    comida: {
      kcal: suma('calorias'),
      prot: suma('proteinas'),
      carb: suma('carbohidratos'),
      gras: suma('grasas'),
      perfil: pendiente.perfil || null,
      items,
      ambiguedad: pendiente.ambiguedad || null
    },
    id: ultimaComidaId
  } : null;

  cerrarModal(true);
  renderHoy();
  programarRecordatorios();
  // con datos cargados ya vale la pena pedirle al navegador que no los borre
  if (typeof pedirPersistencia === 'function') pedirPersistencia();

  /*
   * ¿Esto ya estaba cargado?
   *
   * Pasa de verdad: se saca la foto, no se ve el toast porque la pantalla estaba
   * apagada, se saca de nuevo. O se toca "repetir" dos veces. El día queda con
   * el doble y nadie se entera hasta que la semana no cierra. El aviso trae el
   * deshacer al lado, que es lo único que hace falta.
   */
  const gemela = pareceDuplicada(
    (dia().comidas || []).filter(c => c.id !== ultimaComidaId),
    { id: ultimaComidaId, titulo: tituloGuardado, kcal: suma('calorias') }
  );

  if (gemela) {
    toast('¿Esta comida ya la habías cargado?', {
      texto: 'Borrar la nueva',
      accion: () => { borrarComida(ultimaComidaId); }
    });
    return;
  }

  /* Se guardó igual, pero algo no cerraba: lo que hace falta es decirlo y dar
     el camino para arreglarlo, no haber frenado el guardado. */
  if (dudoso) {
    const id = ultimaComidaId;
    toast(dudoso, { texto: 'Revisar', accion: () => editarComida(id) });
    return;
  }

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
  /* La comida viaja con el veredicto: el consejo necesita los alimentos, y sin
     ellos solo se puede repetir que no entra. */
  mostrarResumenComida({ titulo, kcal, veredicto: { ...v, comida, previo }, etiqueta: etiquetaApta(v, state.perfil.modo), id });
}

/* ---------------- lo que la foto no puede mostrar ---------------- */

/*
 * La pregunta que la app no puede contestar sola.
 *
 * Unas empanadas de carne y unas de humita son la misma foto. Hasta acá el
 * modelo elegía la más probable y lo dejaba escrito en las notas, donde nadie
 * lo lee, y el número quedaba mal sin que nadie se enterara.
 *
 * Aparece DESPUÉS de guardar y no antes, a propósito. La comida ya quedó
 * registrada con la opción más probable: si nadie toca nada, no pasa nada malo.
 * Preguntar antes de guardar sería volver al peaje que sacamos ayer —foto,
 * espera, formulario— por un caso que ni siquiera es el más común.
 */
function pintarDuda(comida, id) {
  const caja = $('resumenDuda');
  if (!caja) return;

  const amb = comida?.ambiguedad;
  caja.hidden = !hayQuePreguntar(amb);
  if (caja.hidden) return;

  $('resumenDudaTxt').textContent = amb.pregunta;

  const cont = $('resumenDudaOpciones');
  cont.innerHTML = '';

  amb.opciones.forEach((op, i) => {
    const b = document.createElement('button');
    /* La elegida se marca: sin eso, después de tocar una no hay forma de saber
       cuál quedó, y la pregunta parece seguir abierta. */
    const elegida = (amb.elegida ?? 0) === i;
    b.className = 'duda-opcion' + (elegida ? ' elegida' : '');
    b.innerHTML = `${op.etiqueta}<small>${fmtNum(Math.round(op.calorias))} kcal</small>`;
    b.onclick = () => elegirOpcion(id, i);
    cont.appendChild(b);
  });
}

/**
 * Aplica la opción sobre la comida YA guardada y vuelve a pintar el resumen.
 *
 * Todo local: los números de cada variante vinieron en el mismo análisis, así
 * que cambiar de opción no cuesta una llamada ni una espera.
 */
function elegirOpcion(id, indice) {
  const d = dia();
  const pos = (d.comidas || []).findIndex(c => c.id === id);
  if (pos < 0) return;

  const nueva = aplicarOpcion(d.comidas[pos], indice);
  d.comidas[pos] = { ...d.comidas[pos], ...nueva };
  d.act = Date.now();
  save();
  renderHoy();

  /* Se vuelve a pintar el resumen entero y no solo el número: el veredicto del
     modo puede haber cambiado con la elección, que es medio el punto —unas de
     humita tienen bastante más carbohidrato que unas de carne. */
  const c = d.comidas[pos];
  avisarComidaGuardada({ titulo: c.titulo, kcal: c.kcal, comida: c, id });
  toast(c.ambiguedad?.opciones?.[indice]?.etiqueta || 'Actualizado');
}

/* ---------------- el resumen de lo que se guardó ---------------- */

function mostrarResumenComida({ titulo, kcal, veredicto, etiqueta, id }) {
  $('resumenTitulo').textContent = titulo;
  contarHasta($('resumenKcal'), Math.round(kcal), { formato: (v) => fmtNum(Math.round(v)) });
  pintarPorciones(id, kcal);

  const marca = $('resumenApta');
  if (etiqueta) {
    marca.textContent = etiqueta;
    marca.className = 'marca-apta grande ' + (veredicto.nivel === 'si' ? '' : veredicto.nivel);
    marca.hidden = false;
  } else {
    marca.hidden = true;
  }

  /*
   * Y qué hacer al respecto.
   *
   * Un cartel que dice "no entra" y nada más deja a la persona en el peor
   * lugar: sabe que está mal y no sabe qué hacer. Cuando el exceso es de
   * cantidad casi siempre alcanza con sacar algo, y eso se puede calcular.
   */
  pintarDuda(veredicto.comida, id);

  /* El campo para aclararle qué era: solo si la foto sigue en memoria. Sin la
     imagen no hay nada que volver a analizar, y ofrecerlo sería una promesa
     que la app no puede cumplir. */
  const aclarar = $('resumenAclarar');
  if (aclarar) {
    aclarar.hidden = !(typeof ultimaImagen !== 'undefined' && ultimaImagen);
    $('aclaraTxt').value = '';
    comidaAAclarar = id;
  }

  const consejo = $('resumenConsejo');
  if (veredicto.nivel === 'no' && veredicto.comida) {
    const c = comoHacerlaApta(veredicto.comida, state.perfil.modo, calcular(), veredicto.previo);
    consejo.textContent = c.texto;
    consejo.className = 'consejo-apta' + (c.posible ? '' : ' sin-vuelta');
    consejo.hidden = !c.texto;
  } else {
    consejo.hidden = true;
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

/*
 * Los botones de "cuánto comiste".
 *
 * Reescalan la comida YA GUARDADA, en el acto. El plato pudo estar perfectamente
 * entendido y aun así uno comió dos tercios: sin esto hay que abrir la edición y
 * dividir a mano seis números, y nadie hace eso dos veces.
 *
 * Se aplican sobre lo estimado original y no sobre lo que quedó de la última
 * vez: tocar ½ y después ¾ tiene que dar tres cuartos de la estimación, no tres
 * cuartos de la mitad.
 */
function pintarPorciones(id, kcalOriginal) {
  const cont = $('resumenPorciones');
  if (!cont) return;

  cont.innerHTML = '';
  if (!id) { cont.hidden = true; return; }
  cont.hidden = false;

  const original = comidaPorId(id);
  if (!original) { cont.hidden = true; return; }

  /*
   * La base es SIEMPRE la porción entera, reconstruida desde el factor guardado.
   *
   * Antes la base era lo que estuviera guardado, así que los factores se
   * encadenaban: media porción de media porción daba un cuarto, y tocar "1"
   * después de haber puesto "½" no devolvía a las 800 kcal originales sino a
   * las 400. La porción tiene que ser una elección reversible, no un descuento
   * que se aplica de nuevo cada vez.
   */
  const factorActual = Number(original.porcionFactor) > 0 ? Number(original.porcionFactor) : 1;
  const base = factorActual === 1 ? clonar(original) : escalarComida(clonar(original), 1 / factorActual);

  for (const p of PORCIONES) {
    const b = document.createElement('button');
    b.textContent = p.txt;
    b.setAttribute('aria-label', `Comí ${p.txt} de lo estimado`);
    /* Y queda marcada la que está puesta, no siempre la entera. */
    b.className = p.f === factorActual ? 'elegida' : '';

    b.onclick = () => {
      const d = dia();
      const pos = (d.comidas || []).findIndex(c => c.id === id);
      if (pos < 0) return;

      const escalada = escalarComida(base, p.f);
      d.comidas[pos] = { ...escalada, id, ts: d.comidas[pos].ts, porcionFactor: p.f, act: Date.now() };
      save(); renderHoy(); renderHistorial();

      contarHasta($('resumenKcal'), escalada.kcal, { formato: (v) => fmtNum(Math.round(v)) });
      cont.querySelectorAll('button').forEach(x => x.classList.toggle('elegida', x === b));
      pop(b);
    };
    cont.appendChild(b);
  }
}

/** La comida de hoy con ese id, si sigue estando. */
function comidaPorId(id) {
  return (dia().comidas || []).find(c => c.id === id) || null;
}

function cerrarResumen() {
  $('modalResumen').classList.remove('open');
  devolverFoco();
  marcarAtras();
}

$('btnResumenListo').onclick = cerrarResumen;
$('modalResumen').onclick = (e) => { if (e.target.id === 'modalResumen') cerrarResumen(); };


/*
 * Borrar la comida que se está editando.
 *
 * Sin diálogo de confirmación: `borrarComida()` deja el "Deshacer" al lado
 * durante unos segundos, que resuelve el mismo problema sin un paso extra.
 * Ver la nota de preferir deshacer sobre confirmar.
 */
$('btnBorrarComida').onclick = () => {
  const id = pendiente?.editandoId;
  if (!id) return;

  /* La fecha primero: si la comida es de otro día, hay que pararse ahí para
     que `borrarComida` la encuentre y para que el deshacer la devuelva a su
     lugar. */
  const origen = pendiente.fechaOriginal || fecha;
  if (origen !== fecha) { fecha = origen; }

  cerrarModal(true);
  borrarComida(id);
};


/* ---------------- aclararle al análisis qué era ---------------- */

/*
 * "La milanesa es de soja", "las empanadas son de humita".
 *
 * Hay cosas que ninguna foto muestra, y cuando el modelo le erra al plato —no a
 * la porción— corregir seis números a mano es peor que decirlo en tres
 * palabras y que rehaga la cuenta.
 *
 * Cuesta un análisis, por eso es un campo y un botón y no algo automático.
 */
let comidaAAclarar = null;

$('btnAclarar').onclick = async () => {
  const txt = $('aclaraTxt').value.trim();
  if (!txt || !comidaAAclarar) return;

  /* La comida ya está guardada: se la vuelve a poner como `pendiente` en modo
     edición, así el re-análisis actualiza esa misma en vez de crear otra. */
  const c = dia().comidas.find(x => x.id === comidaAAclarar);
  if (!c) return;

  pendiente = {
    ...c,
    editandoId: c.id,
    fechaOriginal: fecha,
    confianza: 'alta',
    items: (c.items || []).map(i => ({ ...i })),
    kcalIA: c.kcal
  };

  cerrarResumen();
  abrirModal();
  await reanalizarConCorreccion(txt);
};

$('aclaraTxt').onkeydown = (e) => { if (e.key === 'Enter') $('btnAclarar').click(); };
