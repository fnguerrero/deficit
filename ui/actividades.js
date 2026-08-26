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
  save();

  $('actNombre').value = '';
  $('actMinutos').value = '';
  renderActividadesEditar();
  toast(`${nombre} agregada`);
};
