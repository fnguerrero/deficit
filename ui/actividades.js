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
  const d = dia();
  d.ejercicio = (d.ejercicio || 0) + suma;
  d.act = Date.now();
  save(); renderHoy();
  toast(`+${fmtNum(suma)} kcal · ${ejMinutos} min ${intensidadDe(ejIntensidad).nombre.toLowerCase()}`);
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
  dia().ejercicio = v;
  save(); renderHoy();
  toast('Ejercicio guardado');
  cerrarObjetivo();
};
