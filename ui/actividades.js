/* ============================================================
   ui/actividades.js — elegir y ajustar las actividades.

   Salió de ui/ajustes.js cuando ese archivo pasó su límite de tamaño. El
   control de tamaños existe justamente para que el corte se decida cuando
   corresponde y no cuando el archivo ya es inmanejable.
   ============================================================ */

/* ---------------- editar las actividades ---------------- */

/**
 * Elegir cuáles van en Hoy y cuánto duran.
 *
 * Las favoritas son las que aparecen a un toque en el tablero, y son tres
 * porque más no entran en la pantalla sin apretar todo.
 */
const MAX_FAVORITAS = 3;

function renderActividadesEditar() {
  const cont = $('listaActEditar');
  if (!cont) return;

  const favoritas = state.cfg.favoritasActividad || FAVORITAS_DEFECTO;
  const peso = state.perfil.peso;

  $('actPill').textContent = `${favoritas.length} en Hoy`;
  cont.innerHTML = '';

  for (const a of actividadesDe(state)) {
    const esFav = favoritas.includes(a.id);
    const fila = document.createElement('div');
    fila.className = 'act-fila' + (esFav ? ' fav' : '');

    const kcal = peso ? caloriasActividad(a, peso) : null;
    fila.innerHTML =
      `<button class="act-nombre" aria-pressed="${esFav}">${a.emoji || '🏃'} ${a.nombre}` +
      `<small>${a.minutos}′${kcal ? ' · ' + fmtNum(kcal) + ' kcal' : ''}</small></button>` +
      `<input type="number" class="act-min" value="${a.minutos}" inputmode="numeric" aria-label="Minutos de ${a.nombre}">`;

    // el nombre alterna favorita
    fila.querySelector('.act-nombre').onclick = () => {
      const actuales = [...(state.cfg.favoritasActividad || FAVORITAS_DEFECTO)];
      const i = actuales.indexOf(a.id);

      if (i >= 0) actuales.splice(i, 1);
      else if (actuales.length >= MAX_FAVORITAS) {
        toast(`En Hoy entran ${MAX_FAVORITAS}: sacá una antes`);
        return;
      } else actuales.push(a.id);

      state.cfg.favoritasActividad = actuales;
      save();
      renderActividadesEditar();
    };

    // los minutos se guardan como ajuste propio de esa actividad
    fila.querySelector('.act-min').onchange = (e) => {
      const min = parseInt(e.target.value, 10);
      if (!min || min < 1 || min > 600) { toast('Poné entre 1 y 600 minutos'); renderActividadesEditar(); return; }

      const propias = [...(state.cfg.actividades || [])];
      const i = propias.findIndex(x => x.id === a.id);
      if (i >= 0) propias[i] = { ...propias[i], minutos: min };
      else propias.push({ id: a.id, nombre: a.nombre, minutos: min });

      state.cfg.actividades = propias;
      save();
      renderActividadesEditar();
    };

    cont.appendChild(fila);
  }
}

$('btnAgregarAct').onclick = () => {
  const nombre = $('actNombre').value.trim();
  const minutos = parseInt($('actMinutos').value, 10) || 45;
  const met = Number($('actMet').value) || 6;

  if (!nombre) { toast('Ponele un nombre'); return; }

  // el id sale del nombre: sin espacios ni acentos, y sin pisar uno que ya exista
  const base = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '') || 'act';
  const usados = actividadesDe(state).map(a => a.id);
  let id = base;
  let n = 2;
  while (usados.includes(id)) id = base + n++;

  state.cfg.actividades = [...(state.cfg.actividades || []), { id, nombre, minutos, met, emoji: '⭐' }];

  /* Y va a los favoritos si hay lugar.
     Se agregaba a la lista general y nada más: desde el modal de Ejercicio
     decía "agregada" y no aparecía por ningún lado, porque en Hoy solo salen
     las tres favoritas. Había que ir a Ajustes a marcarla, y eso no lo dice
     ningún cartel. */
  const favs = [...(state.cfg.favoritasActividad || FAVORITAS_DEFECTO)];
  const entraSola = favs.length < MAX_FAVORITAS;
  if (entraSola) {
    favs.push(id);
    state.cfg.favoritasActividad = favs;
  }
  save();

  $('actNombre').value = '';
  $('actMinutos').value = '';
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


const EMOJI_INTENSIDAD = { suave: '🚶', medio: '🏃', fuerte: '💨' };

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

/* Lo elegido en el modal, hasta que se toca Sumar. */
let ejMinutos = 30;
let ejIntensidad = 'medio';

function renderEjercicio() {
  const kcal = dia().ejercicio || 0;
  $('ejercicioHoy').value = kcal || '';
  $('ejercicioInfo').textContent = kcal
    ? `Tu objetivo de hoy sube a ${fmtKcal(objetivoEfectivo(calcular()?.objetivo || 0, kcal))}.`
    : 'Lo que quemes se suma al objetivo del día.';

  pintarChips($('minutosEjercicio'), MINUTOS_EJERCICIO.map(m => ({
    id: m, texto: m + ' min'
  })), ejMinutos, (id) => { ejMinutos = id; renderEjercicio(); });

  pintarChips($('intensidadEjercicio'), INTENSIDADES.map(i => ({
    id: i.id, texto: i.nombre, detalle: i.detalle
  })), ejIntensidad, (id) => { ejIntensidad = id; renderEjercicio(); });

  /* El número antes de tocar nada: es lo que convierte "media hora moderada" en
     algo que se puede comparar con lo que comiste. */
  const peso = state.perfil.peso;
  const suma = caloriasDeMovimiento(ejMinutos, ejIntensidad, peso);
  const calc = $('ejercicioCalculo');
  if (calc) {
    calc.textContent = peso
      ? `${fmtNum(suma)} kcal para tus ${fmtPeso(peso)}`
      : 'Cargá tu peso en Perfil para estimar las calorías.';
  }
  const btn = $('btnSumarEjercicio');
  if (btn) btn.disabled = !peso;

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
 * Sumar, no reemplazar: si saliste a caminar a la mañana y a la tarde hiciste
 * pesas, son dos ratos de movimiento y no uno que pisa al otro.
 */
$('btnSumarEjercicio').onclick = () => {
  const peso = state.perfil.peso;
  const suma = caloriasDeMovimiento(ejMinutos, ejIntensidad, peso);
  if (!suma) { toast('Cargá tu peso en Perfil'); return; }

  recordarCambio('el ejercicio');
  const nombre = intensidadDe(ejIntensidad).nombre;
  anotarMovimiento({ nombre, emoji: EMOJI_INTENSIDAD[ejIntensidad] || '🏃', minutos: ejMinutos, kcal: suma });
  renderHoy();
  toast(`+${fmtNum(suma)} kcal · ${ejMinutos} min de ${nombre.toLowerCase()}`);
  cerrarObjetivo();
};

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
