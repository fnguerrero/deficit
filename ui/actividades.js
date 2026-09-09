/* ============================================================
   ui/actividades.js — elegir y ajustar las actividades.

   Salió de ui/ajustes.js cuando ese archivo pasó su límite de tamaño. El
   control de tamaños existe justamente para que el corte se decida cuando
   corresponde y no cuando el archivo ya es inmanejable.
   ============================================================ */

/* ---------------- editar las actividades ---------------- */

/**
 * Elegir cuáles van primero.
 *
 * Antes esto decidia cuales se VEIAN en Hoy —tres— y las otras ocho quedaban
 * guardadas donde nadie las encontraba. Ahora salen todas y esto decide el
 * orden: las tres primeras son las que se ven sin recorrer la lista.
 *
 * Los minutos por actividad se fueron con el mismo cambio: el tiempo se elige
 * arriba de la lista, uno para todas, asi que un minutaje propio por ejercicio
 * era un campo que ya no movia nada.
 */
const MAX_FAVORITAS = 3;
const REFERENCIA_MIN = 30;

function renderActividadesEditar() {
  const cont = $('listaActEditar');
  if (!cont) return;

  const favoritas = state.cfg.favoritasActividad || FAVORITAS_DEFECTO;
  const peso = state.perfil.peso;

  $('actPill').textContent = `${favoritas.length} primeras`;
  cont.innerHTML = '';

  for (const a of actividadesDe(state)) {
    const esFav = favoritas.includes(a.id);
    const fila = document.createElement('div');
    fila.className = 'act-fila' + (esFav ? ' fav' : '');

    /* Media hora es la referencia para comparar un ejercicio con otro: sin un
       tiempo fijo, "Caminata 158" y "Boxeo 351" estarian diciendo cosas de
       ratos distintos y no se podrian leer en la misma columna. */
    const kcal = peso ? caloriasActividad(a, peso, REFERENCIA_MIN) : null;
    fila.innerHTML =
      `<button class="act-nombre" aria-pressed="${esFav}">${a.emoji || '🏃'} ${a.nombre}` +
      `<small>${kcal ? fmtNum(kcal) + ' kcal cada ' + REFERENCIA_MIN + '′' : 'Cargá tu peso'}</small></button>`;

    // el nombre alterna favorita
    fila.querySelector('.act-nombre').onclick = () => {
      const actuales = [...(state.cfg.favoritasActividad || FAVORITAS_DEFECTO)];
      const i = actuales.indexOf(a.id);

      if (i >= 0) actuales.splice(i, 1);
      else if (actuales.length >= MAX_FAVORITAS) {
        toast(`Adelante van ${MAX_FAVORITAS}: sacá una antes`);
        return;
      } else actuales.push(a.id);

      state.cfg.favoritasActividad = actuales;
      save();
      renderActividadesEditar();
    };

    cont.appendChild(fila);
  }
}

$('btnAgregarAct').onclick = () => {
  const nombre = $('actNombre').value.trim();
  const met = Number($('actMet').value) || 6;

  if (!nombre) { toast('Ponele un nombre'); return; }

  // el id sale del nombre: sin espacios ni acentos, y sin pisar uno que ya exista
  const base = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '') || 'act';
  const usados = actividadesDe(state).map(a => a.id);
  let id = base;
  let n = 2;
  while (usados.includes(id)) id = base + n++;

  state.cfg.actividades = [...(state.cfg.actividades || []), { id, nombre, met, emoji: '⭐' }];

  /* Y va a los favoritos si hay lugar.
     Se agregaba a la lista general y nada más: desde el modal de Ejercicio
     decía "agregada" y no aparecía por ningún lado. Hoy ya se ve igual, porque
     salen todas: esto solo la pone adelante si queda lugar. */
  const favs = [...(state.cfg.favoritasActividad || FAVORITAS_DEFECTO)];
  const entraSola = favs.length < MAX_FAVORITAS;
  if (entraSola) {
    favs.push(id);
    state.cfg.favoritasActividad = favs;
  }
  save();

  $('actNombre').value = '';
  renderActividadesEditar();
  if (typeof renderActividades === 'function') renderActividades();
  toast(entraSola
    ? `${nombre} agregada`
    : `${nombre} agregada. Elegila en Ajustes para tenerla a mano`);
};

/* ============================================================
   La carga del ejercicio del dia.

   Vivia en ui/hoy.js y se mudo entera cuando ese archivo se paso de su
   limite: esto es interaccion con actividades, que es lo que este archivo ya
   hacia.
   ============================================================ */



/** Deja el rato anotado y vuelve a sumar el total del dia. */
function anotarMovimiento(m) {
  const d = dia();
  /* El resto se mide ANTES de agregar: despues, el rato nuevo ya esta contado
     entre los renglones y `restoSinDesglosar` da cero. Con eso, sumar un
     ejercicio sobre un total puesto a mano borraba ese total. */
  const resto = restoSinDesglosar(d);
  d.movimientos = [...movimientosDe(d), { ...m, ts: Date.now() }];
  /* El total es lo anotado MAS lo que ya habia sin desglosar: los dias viejos
     y los totales puestos a mano no se pierden al sumar uno nuevo. */
  d.ejercicio = resto + kcalDeMovimientos(d);
  d.act = Date.now();
  save();
  renderEjercicio();
}

/** Saca un rato y baja el total en lo que ese rato aportaba. */
function borrarMovimiento(ts) {
  const d = dia();
  const resto = restoSinDesglosar(d);
  d.movimientos = movimientosDe(d).filter(m => m.ts !== ts);
  d.ejercicio = resto + kcalDeMovimientos(d);
  d.act = Date.now();
  save();
  renderEjercicio();
  renderHoy();
}

/*
 * El ejercicio al que le estan cambiando el tiempo, o null.
 *
 * Aparece al mantener apretado y se va al elegir: el tiempo dejo de ser una
 * pregunta que hay que contestar antes de cargar nada —la respuesta era
 * siempre la misma— y paso a ser un ajuste que se hace una vez.
 */
let ajustando = null;

function abrirTiempoDe(a) {
  ajustando = a;
  renderEjercicio();
  $('ajusteTiempo')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderEjercicio() {
  const kcal = dia().ejercicio || 0;
  $('ejercicioHoy').value = kcal || '';
  $('ejercicioInfo').textContent = kcal
    ? `Tu objetivo de hoy sube a ${fmtKcal(objetivoEfectivo(calcular()?.objetivo || 0, kcal))}.`
    : 'Lo que quemes se suma al objetivo del día.';

  /* Contra que leer el numero del dia: cuanto pide la OMS, traducido a las
     calorias de ESTA persona. Sin peso cargado no se puede, y ahi no se dice
     nada en vez de inventar un numero de folleto. */
  const ref = referenciaEjercicio(state.perfil.peso);
  const cajaRef = $('ejercicioReferencia');
  if (cajaRef) {
    cajaRef.hidden = !ref;
    if (ref) {
      /* Primero lo de hoy, que es lo accionable: cuanto falta para la estrella.
         La referencia de la OMS queda atras, que explica de donde sale el
         numero pero no se mira dos veces. */
      const hecho = Number(dia().ejercicio) || 0;
      const falta = (typeof OPTIMO_EJERCICIO_KCAL === 'number' ? OPTIMO_EJERCICIO_KCAL : 0) - hecho;
      const linea = falta > 0
        ? `Te faltan ${fmtNum(Math.round(falta))} kcal para la estrella del día.`
        : '⭐ Llegaste al óptimo del día.';

      cajaRef.textContent = linea +
        ` La OMS pide ${ref.minutos[0]} a ${ref.minutos[1]} minutos de ejercicio ` +
        `por semana: para tu peso son ${fmtNum(ref.semana[0])} a ${fmtNum(ref.semana[1])} kcal semanales, ` +
        `unas ${fmtNum(ref.dia[0])} a ${fmtNum(ref.dia[1])} por día.`;
    }
  }

  const caja = $('ajusteTiempo');
  if (caja) {
    caja.hidden = !ajustando;
    if (ajustando) {
      const a = ajustando;
      $('ajusteTiempoTitulo').textContent = `${a.emoji} ${a.nombre}: ¿cuánto te dura?`;
      pintarChips($('minutosEjercicio'), MINUTOS_EJERCICIO.map(m => ({
        id: m, texto: m + ' min'
      })), minutosActividad(state, a), (m) => {
        /* Queda guardado: el que entrena cuarenta minutos lo dice una vez y no
           vuelve a mantener apretado nunca mas. */
        state.cfg.actividades = conMinutos(state.cfg.actividades, a, m);
        ajustando = null;
        save();
        renderEjercicio();
        const peso = state.perfil.peso;
        if (peso) cargarActividad(a, m, caloriasActividad(a, peso, m));
      });
    }
  }

  renderActividades();
  renderCarritoEjercicio();
}

/**
 * Lo que llevas sumado hoy, como un ticket.
 *
 * El dia mostraba "583 kcal" y nada mas: ni de donde salian, ni como sacar un
 * rato cargado de mas. Cada renglon dice que fue, cuanto duro y cuanto sumo,
 * con su ✕ para borrarlo, y abajo el total.
 */
function renderCarritoEjercicio() {
  const caja = $('carritoEjercicio');
  if (!caja) return;

  const d = dia();
  const ratos = movimientosDe(d);
  const resto = restoSinDesglosar(d);
  const total = Number(d.ejercicio) || 0;

  caja.hidden = !total;
  caja.innerHTML = '';
  if (!total) return;

  for (const m of ratos) {
    const fila = document.createElement('div');
    fila.className = 'carrito-fila';

    const que = document.createElement('span');
    que.className = 'cf-que';
    que.textContent = `${m.emoji || '🏃'} ${m.nombre}`;

    const cuanto = document.createElement('small');
    cuanto.className = 'cf-cuanto';
    cuanto.textContent = m.minutos ? `${fmtNum(m.minutos)}′` : '';

    const kcal = document.createElement('b');
    kcal.className = 'cf-kcal';
    kcal.textContent = `${fmtNum(Math.round(m.kcal))} kcal`;

    const x = document.createElement('button');
    x.className = 'cf-x';
    x.textContent = '✕';
    x.title = `Sacar ${m.nombre}`;
    x.setAttribute('aria-label', `Sacar ${m.nombre}`);
    x.onclick = (e) => {
      if (e.detail > 0) e.currentTarget.blur();
      borrarMovimiento(m.ts);
      toast(`${m.nombre} sacado`);
    };

    fila.append(que, cuanto, kcal, x);
    caja.appendChild(fila);
  }

  /* Lo que no tiene renglon —un dia viejo, o un total escrito a mano— se dice
     igual: si no, los numeros no cierran y parece un error. */
  if (resto > 0) {
    const fila = document.createElement('div');
    fila.className = 'carrito-fila';
    const que = document.createElement('span');
    que.className = 'cf-que';
    que.textContent = ratos.length ? '✍️ Cargado a mano' : '✍️ Ya cargado';
    const kcal = document.createElement('b');
    kcal.className = 'cf-kcal';
    kcal.textContent = `${fmtNum(resto)} kcal`;
    fila.append(que, document.createElement('small'), kcal);
    caja.appendChild(fila);
  }

  const pie = document.createElement('div');
  pie.className = 'carrito-total';
  const et = document.createElement('span');
  et.textContent = 'Total del día';
  const n = document.createElement('b');
  n.textContent = `${fmtNum(total)} kcal`;
  pie.append(et, n);
  caja.appendChild(pie);
}

/* Una fila de chips con uno elegido. Se repite en minutos y en intensidad. */
function pintarChips(cont, opciones, elegido, alTocar) {
  if (!cont) return;
  cont.innerHTML = '';
  for (const o of opciones) {
    const b = document.createElement('button');
    b.className = 'chip' + (o.id === elegido ? ' activo' : '');
    b.innerHTML = o.detalle
      ? `${o.texto} <small>${o.detalle}</small>`
      : o.texto;
    b.setAttribute('aria-pressed', String(o.id === elegido));
    b.onclick = (e) => { if (e.detail > 0) e.currentTarget.blur(); alTocar(o.id); };
    cont.appendChild(b);
  }
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
  /* Un total puesto a mano manda sobre los renglones: no se puede decir "500"
     y a la vez mostrar tres ratos que suman 583. Los anotados se borran y el
     numero queda como lo que es, uno solo sin desglose. */
  const d = dia();
  d.ejercicio = v;
  d.movimientos = [];
  d.act = Date.now();
  save(); renderHoy(); renderEjercicio();
  toast('Ejercicio guardado');
  cerrarObjetivo();
};
