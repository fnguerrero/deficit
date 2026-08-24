/* ============================================================
   ui/objetivos.js — el tablero del día.

   La idea de fondo: cada cosa que cargás se marca y deja de pedirte atención.
   La pantalla se vacía a medida que avanza el día en vez de llenarse, que es lo
   contrario de lo que hacía antes con cuatro tarjetas siempre abiertas.
   ============================================================ */

const CARITAS = [
  { id: 'mal', emoji: '😞', texto: 'Mal' },
  { id: 'flojo', emoji: '😕', texto: 'Flojo' },
  { id: 'normal', emoji: '🙂', texto: 'Normal' },
  { id: 'bien', emoji: '😄', texto: 'Bien' },
  { id: 'genial', emoji: '💪', texto: 'Genial' }
];

/** Qué objetivos del día hay y cuáles están cumplidos. */
function objetivosDelDia() {
  const d = dia();
  const peso = state.perfil.peso || null;

  return [
    {
      id: 'peso',
      emoji: '⚖️',
      nombre: 'Peso',
      listo: typeof d.peso === 'number' && d.peso > 0,
      valor: d.peso ? fmtNum(d.peso) + ' kg' : ''
    },
    {
      id: 'agua',
      emoji: '💧',
      nombre: 'Agua',
      listo: (d.agua || 0) >= vasosObjetivo(peso),
      valor: `${d.agua || 0}/${vasosObjetivo(peso)}`
    },
    {
      id: 'ejercicio',
      emoji: '🏃',
      nombre: 'Ejercicio',
      listo: (d.ejercicio || 0) > 0,
      valor: d.ejercicio ? fmtNum(d.ejercicio) + ' kcal' : ''
    },
    {
      id: 'animo',
      emoji: '🙂',
      nombre: 'Ánimo',
      listo: !!d.animo,
      valor: d.animo ? (CARITAS.find(c => c.id === d.animo)?.emoji || '') : ''
    }
  ];
}

function renderObjetivos() {
  const cont = $('objetivosDia');
  if (!cont) return;

  cont.innerHTML = '';
  for (const o of objetivosDelDia()) {
    const b = document.createElement('button');
    b.className = 'objetivo' + (o.listo ? ' listo' : '');
    b.setAttribute('aria-label', `${o.nombre}${o.valor ? ': ' + o.valor : ', sin cargar'}`);
    b.innerHTML = `<span aria-hidden="true">${o.listo ? '✓' : o.emoji}</span>` +
      `<b>${o.nombre}</b><small>${o.valor || '—'}</small>`;
    b.onclick = () => abrirObjetivo(o.id);
    cont.appendChild(b);
  }
}

/* ---------------- el editor de cada objetivo ---------------- */

const TITULOS_OBJ = {
  peso: 'Peso de hoy',
  agua: 'Agua',
  ejercicio: 'Ejercicio',
  animo: '¿Cómo venís hoy?'
};

function abrirObjetivo(id) {
  $('tituloObjetivo').textContent = TITULOS_OBJ[id] || 'Objetivo';

  document.querySelectorAll('#modalObjetivo [data-obj]').forEach(s => {
    s.hidden = s.dataset.obj !== id;
  });

  if (id === 'peso') renderPeso();
  if (id === 'agua') renderAgua();
  if (id === 'ejercicio') { renderEjercicio(); renderActividades(); }
  if (id === 'animo') renderCaritas();

  $('modalObjetivo').classList.add('open');
  tomarFoco($('modalObjetivo'));
}

function cerrarObjetivo() {
  $('modalObjetivo').classList.remove('open');
  devolverFoco();
  renderObjetivos();
}

$('btnCerrarObjetivo').onclick = cerrarObjetivo;
$('modalObjetivo').onclick = (e) => { if (e.target.id === 'modalObjetivo') cerrarObjetivo(); };

/* ---------------- ánimo ---------------- */

function renderCaritas() {
  const cont = $('listaCaritas');
  const d = dia();
  cont.innerHTML = '';

  for (const c of CARITAS) {
    const b = document.createElement('button');
    b.className = 'carita' + (d.animo === c.id ? ' elegida' : '');
    b.textContent = c.emoji;
    b.title = c.texto;
    b.setAttribute('aria-label', c.texto);
    b.onclick = () => {
      // volver a tocar la misma la saca: no hay forma de deshacer si no
      d.animo = d.animo === c.id ? null : c.id;
      d.act = Date.now();
      save();
      renderCaritas();
      renderObjetivos();
    };
    cont.appendChild(b);
  }

  $('notaDia').value = d.nota || '';
}

/* ---------------- actividades ---------------- */

function renderActividades() {
  const cont = $('listaActividades');
  if (!cont) return;

  const peso = state.perfil.peso;
  cont.innerHTML = '';

  for (const a of actividadesFavoritas(state)) {
    const kcal = caloriasActividad(a, peso);
    const b = document.createElement('button');
    b.className = 'chip';
    b.innerHTML = `${a.emoji} ${a.nombre} <small>${a.minutos}′ · ${fmtNum(kcal)} kcal</small>`;
    b.onclick = () => {
      const d = dia();
      d.ejercicio = (d.ejercicio || 0) + kcal;
      d.act = Date.now();
      save();
      renderEjercicio();
      renderHoy();
      toast(`${a.nombre}: +${fmtNum(kcal)} kcal`);
    };
    cont.appendChild(b);
  }

  if (!peso) {
    cont.innerHTML = '<p class="hint">Cargá tu peso en Perfil para que pueda estimar las calorías.</p>';
  }
}

/* ---------------- más opciones ---------------- */

function cerrarMas() { $('modalMas').classList.remove('open'); devolverFoco(); }

$('btnMas').onclick = () => { $('modalMas').classList.add('open'); tomarFoco($('modalMas')); };
$('btnCerrarMas').onclick = cerrarMas;
$('modalMas').onclick = (e) => { if (e.target.id === 'modalMas') cerrarMas(); };
