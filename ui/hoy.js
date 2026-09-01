/* ============================================================
   Pantalla Hoy: anillo, macros, comidas del día, favoritos,
   agua, ejercicio, nota y peso.
   ============================================================ */

/* ---------------- render: HOY ---------------- */

/*
 * Que boton conviene ahora.
 *
 * Los tres botones de carga pesan lo mismo visualmente, y no lo son: a la hora
 * de comer se saca una foto, en el super se escanea un codigo. Marcar el
 * probable ahorra un toque y, sobre todo, una decision.
 */
function marcarAccionSugerida() {
  const fila = document.querySelector('.acciones-fila');
  if (!fila) return;

  const hora = new Date().getHours();
  /* En las franjas de comida, la foto. Fuera de ellas no se sugiere nada:
     sugerir siempre algo es lo mismo que no sugerir nada. */
  const enComida = (hora >= 7 && hora <= 10) || (hora >= 12 && hora <= 15) || (hora >= 19 && hora <= 22);

  for (const b of fila.querySelectorAll('button')) b.classList.remove('sugerido');
  if (enComida) $('btnFoto')?.classList.add('sugerido');
}

function renderHoy() {
  if (typeof renderObjetivos === 'function') renderObjetivos();
  if (typeof renderMascota === 'function') renderMascota();
  $('dateLabel').textContent = etiquetaFecha(fecha);
  $('nextDay').disabled = fecha >= hoyISO();

  /*
   * Estar parado en otro día se dice en la fecha misma, no en un cartel.
   *
   * El cartel ocupaba dos renglones y un botón para repetir lo que la fecha ya
   * decía: si arriba dice "Ayer", estás en ayer. Ahora esa palabra se pone
   * ámbar y se puede tocar para volver, que es todo lo que el cartel hacía.
   */
  const esOtroDia = fecha !== hoyISO();
  $('avisoDia').hidden = true;
  $('dateLabel').classList.toggle('otro-dia', esOtroDia);
  $('dateLabel').title = esOtroDia ? 'Lo que cargues se guarda en este día. Tocá para volver a hoy.' : '';
  $('dateLabel').onclick = esOtroDia ? () => { fecha = hoyISO(); renderAll(); } : null;

  renderPesoTira();

  const calc = calcular();
  marcarAccionSugerida();

  const t = totalesDia();
  const d = dia();
  // lo quemado con ejercicio amplía el margen del día
  const objetivo = calc ? objetivoEfectivo(calc.objetivo, d.ejercicio) : 0;

  /* El numero cuenta hasta el valor nuevo: 1.200 que salta a 1.450 es un dato
     que cambio, pero 1.200 subiendo hasta 1.450 es algo que paso, y ademas se ve
     cuanto subio sin acordarse del anterior. Ver animar.js. */
  contarHasta($('ringKcal'), t.kcal, { formato: (v) => fmtNum(Math.round(v)) });
  /*
   * Cuando hay ejercicio, el objetivo se muestra sumado en vez de fundido.
   *
   * "/ 2.492 kcal" con 420 de ejercicio adentro es el número que hace pensar
   * que la app cuenta las calorías quemadas como si fueran comida. Escrito
   * "2.072 + 420" se ve de dónde sale cada parte y que lo segundo AMPLÍA el
   * margen, que es justamente lo que hace.
   */
  const quemadas = Math.round(Number(d.ejercicio) || 0);
  const base = calc ? calc.objetivo : 0;
  $('ringGoal').textContent = !objetivo ? 'sin objetivo'
    : (quemadas ? `/ ${fmtNum(base)} + ${fmtNum(quemadas)}` : `/ ${fmtKcal(objetivo)}`);
  $('ringGoal').title = quemadas
    ? `${fmtNum(base)} kcal de objetivo más ${fmtNum(quemadas)} que quemaste hoy`
    : '';

  const C = 2 * Math.PI * 52;
  const pct = objetivo ? Math.min(t.kcal / objetivo, 1) : 0;
  const ring = $('ringFg');
  ring.style.strokeDasharray = C;
  ring.style.strokeDashoffset = C * (1 - pct);
  ring.classList.toggle('over', objetivo > 0 && t.kcal > objetivo);
  ring.classList.toggle('near', objetivo > 0 && t.kcal <= objetivo && t.kcal > objetivo * 0.85);

  /* Pasarse quedaba escondido: el anillo se llenaba y "restantes" mostraba 0,
     igual que si hubieras cerrado justo. Ahora el numero se pone en negativo y
     dice cuanto te pasaste, que es el dato que sirve. */
  const sobra = objetivo ? objetivo - t.kcal : 0;
  /* Dentro del anillo y no en una fila aparte: el objetivo y el consumido ya
     están ahí arriba, así que esa fila repetía dos de sus tres números. El
     gasto estimado se mira una vez cada tanto y vive en Progreso. */
  const resta = $('ringResta');
  resta.textContent = !objetivo ? ''
    : (sobra >= 0 ? `quedan ${fmtNum(Math.round(sobra))}` : `+${fmtNum(Math.round(-sobra))} de más`);
  resta.classList.toggle('pasado', objetivo > 0 && sobra < 0);

  const m = calc ? calc.macros : { prot: 0, carb: 0, gras: 0 };
  /*
   * `mas` dice si en ese macro la meta es llegar o no pasarse, y cambia todo lo
   * que se lee debajo. En keto y low carb el carbohidrato es un techo —pasarse
   * es EL problema—; en el resto de los modos es un reparto y quedarse corto
   * tampoco está bien.
   */
  const carbEsTecho = !!modoDe(state.perfil.modo)?.carbosMaxDia;

  const setMacro = (k, val, meta, mas = true) => {
    $(`m${k}Txt`).textContent = meta ? `${fmtNum(val)} / ${fmtNum(meta)} g` : `${fmtNum(val)} g`;
    crecerBarra($(`m${k}Bar`), meta ? Math.min((val / meta) * 100, 100) : 0);

    /* Y la lectura del número, que es lo que evita hacer la resta de cabeza. */
    const lee = $(`m${k}Lee`);
    if (!lee) return;
    const r = leerMacro(val, meta, { mas });
    lee.textContent = r.texto;
    lee.className = 'macro-lee' + (r.nivel ? ' ' + r.nivel : '');
  };
  setMacro('Prot', t.prot, m.prot);
  setMacro('Carb', t.carb, m.carb, !carbEsTecho);
  setMacro('Gras', t.gras, m.gras);

  // comidas
  const ul = $('listaComidas');
  const comidas = dia().comidas;
  ul.innerHTML = '';
  $('comidasCount').textContent = comidas.length;
  $('comidasVacio').hidden = comidas.length > 0;

  pintarComidasDelDia(comidas, ul);

  renderNutrientes(t, calc);
  renderSinKey();
  renderAvisoProteina();
  renderAvisoModo();
  renderNota();
  renderFavoritos();
  if (typeof pintarCola === 'function') pintarCola();
  renderFaltaSiempre();
  renderAgua();
  renderEjercicio();

  // Peso: si hoy no lo cargaste, viene el ultimo conocido. Casi nunca cambia
  // mas de unos gramos de un dia al otro, asi que tipear los tres digitos
  // enteros de nuevo es trabajo al pedo.
  const pesos = seriePesos();
  $('pesoHoy').value = dia().peso ?? (pesos.length ? pesos.at(-1).kg : (state.perfil.peso ?? ''));
  if (pesos.length >= 2) {
    const delta = +(pesos.at(-1).kg - pesos[0].kg).toFixed(1);
    $('pesoInfo').textContent = `${delta <= 0 ? '▼' : '▲'} ${fmtPeso(Math.abs(delta))} desde el ${etiquetaFecha(pesos[0].f)} (${pesos.length} registros)`;
  } else {
    $('pesoInfo').textContent = 'Pesate siempre a la misma hora, en ayunas.';
  }
}

/** El editor del peso se abre desde el tablero y necesita pintarse solo. */
function renderPeso() {
  const pesos = seriePesos();
  $('pesoHoy').value = dia().peso ?? (pesos.length ? pesos.at(-1).kg : (state.perfil.peso ?? ''));

  if (pesos.length >= 2) {
    const delta = +(pesos.at(-1).kg - pesos[0].kg).toFixed(1);
    $('pesoInfo').textContent = (delta <= 0 ? '▼' : '▲') + ' ' + fmtPeso(Math.abs(delta)) +
      ' desde el ' + etiquetaFecha(pesos[0].f) + ' (' + pesos.length + ' registros)';
  } else {
    $('pesoInfo').textContent = 'Pesate siempre a la misma hora, en ayunas.';
  }
}

/* ---------------- visor de fotos ---------------- */

function abrirVisor(comida) {
  const src = comida.foto || comida.thumb;
  if (!src) return;

  $('visorImg').src = src;
  $('visorImg').alt = 'Foto de ' + (comida.titulo || 'la comida');

  const partes = [comida.titulo, fmtKcal(comida.kcal)];
  if (!comida.foto) partes.push('solo queda la miniatura de esta comida');
  if (comida.notas) partes.push(comida.notas);
  $('visorPie').textContent = partes.filter(Boolean).join(' · ');

  $('visorFoto').hidden = false;
}

function cerrarVisor() {
  $('visorFoto').hidden = true;
  $('visorImg').src = '';
  marcarAtras();
}

$('visorCerrar').onclick = cerrarVisor;
$('visorFoto').onclick = (e) => { if (e.target.id !== 'visorImg') cerrarVisor(); };

/* ---------------- nota del día ---------------- */

function renderNota() {
  const nota = dia().nota || '';
  $('notaDia').value = nota;
}

let guardarNotaT;
$('notaDia').oninput = () => {
  // se guarda sola, con una pausa para no escribir en cada tecla
  clearTimeout(guardarNotaT);
  guardarNotaT = setTimeout(() => {
    dia().nota = $('notaDia').value;
    save();
  }, 500);
};

$('notaDia').onblur = () => {
  clearTimeout(guardarNotaT);
  dia().nota = $('notaDia').value;
  save();
};

/* ---------------- suma rápida ---------------- */

/** Para cuando sabés las calorías y no querés cargar el detalle. */
function sumaRapida(kcal) {
  const valor = Math.round(Number(kcal) || 0);
  if (valor <= 0 || valor > 10000) { toast('Poné un número entre 1 y 10.000'); return; }

  const momento = fecha === hoyISO() ? momentoDe(Date.now()) : 'almuerzo';
  const comida = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: tsParaFecha(fecha, momento),
    titulo: 'Suma rápida',
    items: [],
    momento,
    kcal: valor, prot: 0, carb: 0, gras: 0,
    thumb: null,
    notas: 'Cargado sin desglose'
  };

  dia().comidas.push(comida);
  save(); renderHoy();
  $('quickKcal').value = '';

  toast(`+${fmtKcal(valor)}`, {
    texto: 'Deshacer',
    accion: () => { borrarComidaSilencioso(comida.id); toast('Deshecho'); }
  });
}

/* Cierra el menú al sumar: es la única opción del menú que no abre otra capa,
   así que sin esto la suma se guardaba con el menú todavía en pantalla. */
$('btnQuick').onclick = () => { sumaRapida($('quickKcal').value); cerrarOrigenFoto(); };
$('quickKcal').onkeydown = (e) => { if (e.key === 'Enter') sumaRapida($('quickKcal').value); };

/* ---------------- favoritos ---------------- */

function renderFavoritos() {
  const lista = favoritos(state.frecuentes);
  $('cardFavoritos').hidden = !lista.length;
  if (!lista.length) return;

  const cont = $('listaFavoritos');
  cont.innerHTML = '';
  for (const f of lista) {
    const b = document.createElement('button');
    b.type = 'button';
    const n = document.createElement('span'); n.textContent = f.nombre;
    const k = document.createElement('em'); k.textContent = fmtNum(Math.round(f.calorias));
    b.append(n, k);
    b.setAttribute('aria-label', `Agregar ${f.nombre}, ${fmtKcal(f.calorias)}`);
    b.onclick = () => cargarFavorito(f);
    cont.appendChild(b);
  }
}

/** Un favorito se carga entero, sin abrir el modal: ese es todo el punto. */
function cargarFavorito(f) {
  const momento = fecha === hoyISO() ? momentoDe(Date.now()) : 'almuerzo';
  const item = {
    nombre: f.nombre, porcion: f.porcion,
    calorias: f.calorias, proteinas: f.proteinas,
    carbohidratos: f.carbohidratos, grasas: f.grasas
  };

  const comida = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: tsParaFecha(fecha, momento),
    titulo: f.nombre,
    items: [item],
    momento,
    kcal: f.calorias, prot: f.proteinas, carb: f.carbohidratos, gras: f.grasas,
    thumb: null, notas: ''
  };

  dia().comidas.push(comida);
  state.frecuentes = registrarFrecuentes(state.frecuentes, [item]);
  save(); renderHoy();

  toast(`${f.nombre} · ${fmtKcal(f.calorias)}`, {
    texto: 'Deshacer',
    accion: () => { borrarComidaSilencioso(comida.id); toast('Listo'); }
  });
}

function borrarComidaSilencioso(id) {
  const d = dia();
  d.comidas = d.comidas.filter(x => x.id !== id);
  save(); renderHoy();
}

/**
 * Fibra, azúcar y sodio. Solo aparecen si hay datos: el análisis por foto
 * muchas veces no los devuelve, y una fila de ceros no le sirve a nadie.
 */
function renderNutrientes(totales, calc) {
  const conDatos = nutrientesConDatos(totales);
  const caja = $('listaNutrientes');

  caja.hidden = !conDatos.length;
  if (!conDatos.length) return;

  const objetivos = objetivosNutrientes(calc ? calc.objetivo : 2000);
  caja.innerHTML = '';

  for (const n of conDatos) {
    const valor = totales[n.id];
    const meta = objetivos[n.id];

    const div = document.createElement('div');
    const etiqueta = document.createElement('span');
    etiqueta.textContent = n.nombre;

    const b = document.createElement('b');
    b.textContent = `${fmtNum(valor)} ${n.unidad}`;

    // en fibra conviene llegar; en azúcar y sodio, no pasarse
    if (!n.mas && valor > meta) {
      b.className = 'pasado';
      b.title = `Recomendado: hasta ${fmtNum(meta)} ${n.unidad}`;
    } else {
      b.title = n.mas ? `Objetivo: ${fmtNum(meta)} ${n.unidad}` : `Hasta ${fmtNum(meta)} ${n.unidad}`;
    }

    div.append(etiqueta, b);
    caja.appendChild(div);
  }
}

/** Sin API key la app sigue andando: solo se avisa, y una sola vez. */
function renderSinKey() {
  $('cardSinKey').hidden = hayAcceso(state.cfg) || !!state.cfg.avisoKeyOculto;
}

$('btnIrAjustes').onclick = () => irTab('ajustes');
$('btnOcultarKey').onclick = () => {
  state.cfg.avisoKeyOculto = true;
  save(); renderSinKey();
};

/* ---------------- agua y ejercicio ---------------- */

/*
 * Vasos tactiles: se toca aquel al que llegaste y se llenan todos hasta ahi.
 * Antes eran dos botones de + y -, o sea un toque por vaso, y eso no lo sostiene
 * nadie. Volver a tocar el ultimo lleno baja uno, que es la unica forma de
 * corregirse sin agregar un boton de menos.
 */
function renderAgua() {
  const meta = metaVasos();
  const vasos = dia().agua || 0;
  /* Se dibujan los vasos del objetivo mas un poco de margen para poder pasarse,
     pero no uno por cada vaso tomado: con el objetivo en 4 y doce tomados salian
     doce vasos y la fila se comia el modal. */
  const total = Math.min(VASOS_MAX, Math.max(meta, Math.min(vasos, meta + 4)));

  const cont = $('aguaVasos');
  cont.innerHTML = '';

  for (let i = 1; i <= total; i++) {
    const b = document.createElement('button');
    b.className = 'vaso' + (i <= vasos ? ' lleno' : '');
    b.textContent = i;
    /* "4 vasos" no dice nada: hace falta saber si ese vaso esta lleno y cual es
       el objetivo, que es lo unico que el dibujo comunica de un vistazo. */
    b.setAttribute('aria-label', i <= vasos
      ? `Vaso ${i} de ${meta}, tomado. Tocar para bajar a ${i - 1}.`
      : `Vaso ${i} de ${meta}, sin tomar. Tocar para marcar ${i}.`);
    b.setAttribute('aria-pressed', String(i <= vasos));
    b.onclick = () => ponerAgua(i === vasos ? i - 1 : i);
    cont.appendChild(b);
  }

  /* Sin litros ni mililitros: un vaso es un vaso. Nadie mide lo que toma, y
     pedirle una medida al que solo quiere marcar que tomó agua es la clase de
     friccion que hace que el objetivo se abandone. */
  $('aguaInfo').textContent = vasos >= meta
    ? `${vasos} de ${meta} vasos — objetivo cumplido`
    : `${vasos} de ${meta} vasos. Tocá hasta dónde llegaste.`;

  pintarMetaAgua(meta);
}

/*
 * El objetivo se cambia acá y arranca bajo.
 *
 * La referencia médica para 86 kg son 12 vasos, y nadie que hoy toma dos pasa a
 * doce: el casillero quedaba sin marcar todos los días y terminaba ignorado. Un
 * objetivo que se ignora no mueve nada. Cuatro se cumple, y cuando se cumple
 * sin esfuerzo se sube de a uno.
 */
function pintarMetaAgua(meta) {
  if (!$('aguaMeta')) return;

  $('aguaMeta').textContent = meta + (meta === 1 ? ' vaso' : ' vasos');
  $('aguaMenos').disabled = meta <= VASOS_MIN;
  $('aguaMas').disabled = meta >= VASOS_MAX;

  const reco = vasosRecomendados(state.perfil.peso);
  $('aguaReco').textContent = meta >= reco
    ? `Ya estás en la referencia para tu peso (${reco} vasos).`
    : `La referencia para tu peso son ${reco} vasos. Esto es el próximo paso, no la meta final.`;

  const mover = (delta) => {
    state.cfg.vasosMeta = Math.min(VASOS_MAX, Math.max(VASOS_MIN, meta + delta));
    save();
    renderAgua();
    if (typeof renderObjetivos === 'function') renderObjetivos();
  };

  $('aguaMenos').onclick = () => mover(-1);
  $('aguaMas').onclick = () => mover(1);
}

function ponerAgua(cantidad) {
  recordarCambio('el agua');
  const d = dia();
  d.agua = Math.max(0, cantidad);
  d.act = Date.now();
  save();
  renderAgua();
  if (typeof renderObjetivos === 'function') renderObjetivos();
}

function renderEjercicio() {
  const kcal = dia().ejercicio || 0;
  $('ejercicioHoy').value = kcal || '';
  $('ejercicioInfo').textContent = kcal
    ? `Tu objetivo de hoy sube a ${fmtKcal(objetivoEfectivo(calcular()?.objetivo || 0, kcal))}.`
    : 'Lo que quemes se suma al objetivo del día.';
}

/*
 * Guardar cierra el modal. El boton es el final del tramite: quien lo toca ya
 * dijo todo lo que tenia que decir, y quedarse mirando la misma ventana con el
 * dato adentro obliga a un segundo toque en la X para volver a ver el dia.
 * El toast queda igual, asi que la confirmacion no se pierde al cerrar.
 */
$('btnEjercicio').onclick = () => {
  const v = parseInt($('ejercicioHoy').value, 10);
  if (isNaN(v) || v < 0 || v > 5000) { toast('Valor inválido'); return; }
  recordarCambio('el ejercicio');
  dia().ejercicio = v;
  save(); renderHoy();
  toast('Ejercicio guardado');
  cerrarObjetivo();
};

function editarComida(id) {
  const c = dia().comidas.find(x => x.id === id);
  if (!c) return;

  // una comida vieja sin desglose se edita como un único alimento
  const items = (c.items && c.items.length)
    ? clonar(c.items)
    : [{ nombre: c.titulo || 'Comida', porcion: '', calorias: c.kcal, proteinas: c.prot, carbohidratos: c.carb, grasas: c.gras }];

  pendiente = {
    editandoId: c.id,
    fechaOriginal: fecha,
    fechaDestino: fecha,
    titulo: c.titulo || '',
    momento: c.momento || momentoDe(c.ts),
    confianza: 'alta',
    notas: c.notas || '',
    thumb: c.thumb || null,
    foto: c.foto || null,
    items
  };

  $('modalTitle').textContent = 'Editar comida';
  mostrarResultado(pendiente);
  mostrarEstado('result');
  abrirModal();
}

function borrarComida(id) {
  const d = dia();
  const pos = d.comidas.findIndex(x => x.id === id);
  if (pos < 0) return;

  const [borrada] = d.comidas.splice(pos, 1);
  const fechaBorrado = fecha;
  save(); renderHoy();

  toast('Comida borrada', {
    texto: 'Deshacer',
    accion: () => {
      // vuelve a su día y a su posición original, aunque hayas cambiado de fecha
      const destino = dia(fechaBorrado);
      destino.comidas.splice(Math.min(pos, destino.comidas.length), 0, borrada);
      save(); renderHoy(); renderHistorial();
      toast('Restaurada');
    }
  });
}

/* ---------------- peso ---------------- */

$('btnPeso').onclick = () => {
  const v = parseFloat($('pesoHoy').value);
  if (!v || v < 20 || v > 400) { toast('Peso inválido'); return; }
  recordarCambio('el peso');
  dia().peso = v;
  if (fecha === hoyISO()) state.perfil.peso = v;
  save(); renderHoy(); renderPerfil(); renderHistorial();
  toast('Peso guardado');
  cerrarObjetivo();
};

/*
 * El aviso de "próxima comida" y las sugerencias de "lo de siempre a esta
 * hora" se sacaron de Hoy.
 *
 * Eran dos renglones seguidos de texto informativo arriba de los casilleros y
 * ninguno pedía una acción: el primero decía con qué etiqueta se iba a guardar
 * lo que cargaras —algo que ya se ve en la lista y que se corrige editando— y
 * el segundo declaraba "de siempre" con dos apariciones, que no es una
 * costumbre. Repetir una comida sigue estando, en el menú de Cargar comida.
 */


/** Vuelve a cargar la última vez que se comió eso, tal cual estaba. */
function repetirPorTitulo(titulo) {
  const clave = String(titulo || '').toLowerCase();
  let mejor = null;

  for (const d of Object.values(state.dias || {})) {
    for (const c of (d.comidas || [])) {
      if (String(c.titulo || '').toLowerCase() !== clave) continue;
      if (!mejor || (c.ts || 0) > (mejor.ts || 0)) mejor = c;
    }
  }
  if (!mejor) return;

  const copia = {
    ...clonar(mejor),
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ts: Date.now(),
    act: Date.now(),
    momento: momentoDe(Date.now())
  };

  dia().comidas.push(copia);
  save(); renderHoy(); renderHistorial();
  toast(`Cargué ${mejor.titulo}`, { texto: 'Deshacer', accion: () => borrarComida(copia.id) });
}

/** El aviso de que se pasó la hora de la comida que siempre cargás. */
function renderFaltaSiempre() {
  const el = $('faltaSiempre');
  if (!el) return;

  const f = fecha === hoyISO() ? faltaLaDeSiempre(state.dias) : null;
  el.hidden = !f;
  if (f) el.textContent = f.texto;
}


/*
 * La tira del peso, arriba de todo.
 *
 * Muestra la tendencia y no el peso de hoy: entre dos días hay hasta un kilo de
 * diferencia por sal y agua, y poner ese número arriba invita a mirarlo todas
 * las mañanas y a sacar conclusiones del ruido.
 *
 * Sin peso cargado no aparece: una barra de progreso vacía sobre un objetivo
 * que no existe no informa nada y ocupa lugar.
 */
function renderPesoTira() {
  const el = $('pesoTira');
  if (!el) return;

  const r = resumenPeso(state.dias, state.perfil, { rango: rangoActual().dias || 30 });
  el.hidden = !r;
  if (!r) return;

  $('pesoTiraKg').textContent = fmtNum(r.actual, 1) + ' kg';
  $('pesoTiraMeta').textContent = r.meta ? `objetivo ${fmtNum(r.meta, 1)}` : 'sin objetivo';

  const barra = $('pesoTiraBarra');
  barra.style.width = (r.pct == null ? 0 : r.pct) + '%';
  barra.parentElement.hidden = r.pct == null;

  /* El signo del cambio no alcanza para saber si es bueno: bajar es avanzar
     cuando la meta está debajo, y lo contrario cuando querés ganar masa. */
  const d = $('pesoTiraDelta');
  if (!r.cambio) {
    d.textContent = 'estable';
    d.className = 'peso-tira-delta';
  } else {
    const bueno = Math.sign(r.cambio) === r.mejora;
    d.textContent = (r.cambio > 0 ? '+' : '') + fmtNum(r.cambio, 1) + ' kg';
    d.className = 'peso-tira-delta ' + (r.mejora === 0 ? '' : (bueno ? 'bien' : 'mal'));
  }

  el.title = r.faltan != null
    ? `Te faltan ${fmtNum(Math.abs(r.faltan), 1)} kg · ${r.mediciones} mediciones`
    : 'Cargá un objetivo de peso en Perfil';
  el.onclick = (e) => { if (e.detail > 0) e.currentTarget.blur(); irTab('historial'); };
}


/*
 * El aviso de que el modo no cuadra hace días.
 *
 * Aparece una vez y se puede callar por una semana. La app no puede saber si
 * elegiste keto en serio y venís desviándote, o si lo pusiste para probar y el
 * rojo de cada comida es ruido; lo único honesto es decir lo que ve y dejar la
 * decisión, que es lo que hacen los dos botones.
 */
function renderAvisoModo() {
  const caja = $('avisoModoDias');
  if (!caja) return;

  const calladoHasta = state.cfg.avisoModoHasta || '';
  if (calladoHasta && hoyISO() < calladoHasta) { caja.hidden = true; return; }

  const r = modoQueNoCuadra(state.dias, state.perfil.modo, calcular());
  caja.hidden = !r;
  if (!r) return;

  $('avisoModoTxt').textContent = r.texto;
}

$('btnCambiarModo').onclick = (e) => {
  if (e.detail > 0) e.currentTarget.blur();
  irTab('perfil');
};

$('btnModoSigo').onclick = (e) => {
  if (e.detail > 0) e.currentTarget.blur();
  /* Una semana de silencio: si de verdad estás yendo hacia el modo, en una
     semana el propio dato deja de disparar el aviso. */
  state.cfg.avisoModoHasta = sumarDias(hoyISO(), 7);
  save();
  renderAvisoModo();
};
