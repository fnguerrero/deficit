/* ============================================================
   ui/edicion.js — el resultado del análisis, editable, y lo que pasa
   cuando se guarda.

   Salió de ui/comidas.js, que se pasó de tamaño: cargar una comida (elegir la
   foto, mandarla, esperar) y corregirla (tocar los alimentos, cambiar
   cantidades, ver el total) son dos momentos distintos y no se pisan.
   ============================================================ */

function mostrarResultado(r) {
  // La foto de como se abrio: es contra esto que se compara al salir.
  if (typeof fijarHuella === 'function') fijarHuella();
  pintarFoto(r);

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
    /* Con la confianza baja, el cartel dice ademas que hacer: "poco confiable"
       a secas deja a la persona mirando un numero que sabe que esta mal y sin
       el paso siguiente, que es corregir los gramos o contarle lo que la foto
       no muestra. */
    const c = { alta: 'Estimación confiable', media: 'Estimación aproximada', baja: 'Estimación poco confiable · revisá los gramos' };
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

/**
 * La foto de la comida que estas editando, chica y al lado del nombre.
 *
 * El editor tenia la imagen guardada en el pendiente desde siempre y no la
 * dibujaba: para mirar el plato que estabas corrigiendo habia que cerrar el
 * editor, encontrar la tarjeta en la lista y tocar su lupa —tres pasos para ver
 * lo que ya estabas editando—. Va chica a proposito: sirve para reconocer el
 * plato de un vistazo, y el que quiera mirarlo de verdad la toca y se abre el
 * mismo visor de siempre, que tapa al modal sin cerrarlo.
 */
function pintarFoto(r) {
  const caja = $('resFoto');
  const src = typeof imagenDelVisor === 'function' ? imagenDelVisor(r) : (r.foto || r.thumb);

  caja.hidden = !src;
  if (!src) { $('resFotoImg').src = ''; return; }

  $('resFotoImg').src = src;
  $('resFotoImg').alt = 'Foto de ' + (r.titulo || 'la comida');
  caja.setAttribute('aria-label', 'Ver la foto en grande');
  caja.title = 'Ver la foto en grande';
  caja.onclick = () => abrirVisor(r);
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

/*
 * Enter pasa al campo siguiente en vez de no hacer nada.
 *
 * Corregir un analisis es escribir en ocho campos seguidos, y en el celular
 * cerrar el teclado, tocar el campo de al lado y volver a abrirlo es la mitad
 * del trabajo. En el ultimo, Enter cierra el teclado y listo.
 */
function saltarAlSiguiente(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();

  const campos = [...$('resItems').querySelectorAll('input')];
  const i = campos.indexOf(e.target);
  const siguiente = campos[i + 1];
  if (siguiente) siguiente.focus();
  else e.target.blur();
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

    nom.onkeydown = saltarAlSiguiente;
    nom.oninput = () => { it.nombre = nom.value; mostrarSugerencias(); };
    nom.onfocus = mostrarSugerencias;
    nom.onblur = () => setTimeout(cerrarSugerencias, 120);

    const kcal = document.createElement('input');
    kcal.className = 'kcal'; kcal.type = 'number'; kcal.inputMode = 'numeric';
    kcal.value = Math.round(it.calorias); kcal.placeholder = 'kcal';
    kcal.onkeydown = saltarAlSiguiente;
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

    /* Duplicar: dos tostadas iguales, dos cafes, la misma guarnicion dos veces.
       Volver a escribir nombre, porcion y cuatro macros para repetir algo que
       ya esta ahi es la parte mas tediosa de corregir un analisis. */
    const clon = document.createElement('button');
    clon.type = 'button';
    clon.className = 'del';
    clon.textContent = '⧉';
    clon.title = 'Duplicar';
    clon.setAttribute('aria-label', 'Duplicar ' + (it.nombre || 'alimento'));
    clon.onclick = () => {
      r.items.splice(i + 1, 0, clonar({ ...it, factor: undefined, base: undefined }));
      pintarItems(r);
    };

    top.append(nom, kcal, fav, clon, del);

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
      inp.onkeydown = saltarAlSiguiente;
      inp.oninput = () => {
        it[key] = tipo === 'number' ? (Number(inp.value) || 0) : inp.value;
        /* Los macros tambien suman: antes solo las kcal repintaban el total. */
        if (tipo === 'number') actualizarTotal(r);
      };
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

  /* Y los macros, que es lo que se corrige a mano cuando el analisis se
     equivoca: sin la suma hay que hacerla de cabeza para saber si el plato
     tiene la proteina que parece. */
  const caja = $('resTotalMacros');
  if (!caja) return;
  const suma = (k) => Math.round(r.items.reduce((a, i) => a + (Number(i[k]) || 0), 0));
  const p = suma('proteinas'), c = suma('carbohidratos'), g = suma('grasas');
  caja.textContent = (p || c || g) ? `${p} g proteína · ${c} g carbos · ${g} g grasas` : '';
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
      sodio: suma('sodio'), perfil: perfilDeItems(items, pendiente.perfil)
    }, state.perfil.modo, calcular(), totalesDia());

    if (v.nivel === 'no') {
      pendiente.avisado = true;   // al segundo toque guarda sin repetir el aviso
      const arreglo = comoHacerlaApta({
        kcal: suma('calorias'), prot: suma('proteinas'), carb: suma('carbohidratos'),
        gras: suma('grasas'), sodio: suma('sodio'),
        perfil: perfilDeItems(items, pendiente.perfil), items
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

  /*
   * El dia de la FOTO, no el que la pantalla este mostrando.
   *
   * Casi siempre son el mismo. Se separan cuando la foto quedo esperando senal:
   * se analiza sola cuando la red vuelve, y si eso pasa despues de medianoche
   * —o con la app abierta en otro dia— la comida caia en el dia equivocado y
   * aparecia como cargada sola. Se acepta solo un dia que exista en el
   * historial: un valor raro guardado en la cola no puede crear dias sueltos.
   */
  const fechaDeLaFoto = pendiente.fechaFoto && state.dias[pendiente.fechaFoto]
    ? pendiente.fechaFoto
    : fecha;

  dia(fechaDeLaFoto).comidas.push({
    id: nuevoId,
    // en un día pasado se usa la hora típica del momento, no la hora actual
    ts: tsParaFecha(fechaDeLaFoto, pendiente.momento || momentoDe(Date.now())),
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
    /* De que esta hecho el plato: es lo que permite decir si entra en el modo.
       Se arma con los alimentos que QUEDARON —ver perfilDeItems()— y no con el
       que trajo el analisis, que describia la foto entera. */
    perfil: perfilDeItems(items, pendiente.perfil),
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
      perfil: perfilDeItems(items, pendiente.perfil),
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
