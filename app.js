/* ============================================================
   Déficit — app de déficit calórico con análisis de foto (Claude)
   Datos 100% locales (localStorage). Sin backend.
   ============================================================ */

const KEY = 'deficit.v1';
const $ = (id) => document.getElementById(id);

let state = load();

/* Los errores se anotan apenas arranca: si algo falla, queda el rastro. */
function anotarError(mensaje, origen, linea) {
  try {
    state.errores = registrarError(state.errores, { mensaje, origen, linea });
    save();
    if (typeof renderDiagnostico === 'function') renderDiagnostico();
  } catch { /* si ni esto anda, no hay mucho más que hacer */ }
}

window.addEventListener('error', (e) => {
  anotarError(e.message, (e.filename || '').split('/').pop(), e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  const m = e.reason?.message || String(e.reason || 'promesa rechazada');
  anotarError(m, 'promesa', 0);
});
let fecha = hoyISO();          // fecha visible
let pendiente = null;          // resultado del análisis en curso

/* ---------------- persistencia ---------------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return migrar(raw ? JSON.parse(raw) : null);
  } catch {
    // el state principal quedó ilegible: se intenta con la última copia buena
    try {
      const copia = localStorage.getItem('deficit.backup');
      if (copia) {
        const s = migrar(JSON.parse(copia));
        setTimeout(() => toast('Los datos estaban dañados: restauré la última copia'), 400);
        return s;
      }
    } catch { /* la copia tampoco sirve */ }
    return migrar(null);
  }
}

const KEY_BACKUP = 'deficit.backup';

function save() {
  const texto = JSON.stringify(state);

  try {
    // antes de pisar lo guardado, la versión anterior queda como copia de respaldo
    const anterior = localStorage.getItem(KEY);
    if (anterior && anterior !== texto) localStorage.setItem(KEY_BACKUP, anterior);

    localStorage.setItem(KEY, texto);
  } catch (e) {
    // almacenamiento lleno: primero se sueltan las miniaturas viejas
    purgarThumbs();
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      toast('Liberé espacio borrando fotos viejas');
    } catch {
      // si sigue sin entrar, la copia de respaldo es lo primero que se sacrifica
      localStorage.removeItem(KEY_BACKUP);
      try { localStorage.setItem(KEY, JSON.stringify(state)); }
      catch { toast('No se pudo guardar: almacenamiento lleno'); }
    }
  }
}

/** La copia de respaldo permite volver atrás si el state principal se corrompe. */
function hayBackup() {
  const b = localStorage.getItem(KEY_BACKUP);
  if (!b) return null;
  try {
    const s = JSON.parse(b);
    const dias = Object.keys(s.dias || {}).length;
    return { texto: b, dias, kb: Math.round(b.length / 1024) };
  } catch {
    return null;
  }
}

function restaurarBackup() {
  const b = hayBackup();
  if (!b) { toast('No hay copia guardada'); return; }
  state = migrar(JSON.parse(b.texto));
  localStorage.setItem(KEY, JSON.stringify(state));
  renderAll();
  toast('Copia restaurada');
}

/**
 * Libera espacio por etapas: primero las fotos de 384 px (las que pesan),
 * y solo si sigue sin entrar, las miniaturas de los días viejos.
 */
function purgarThumbs() {
  const fechas = Object.keys(state.dias).sort();

  for (const f of fechas.slice(0, Math.max(0, fechas.length - 3))) {
    (state.dias[f].comidas || []).forEach(c => { c.foto = null; });
  }

  for (const f of fechas.slice(0, Math.max(1, fechas.length - 7))) {
    (state.dias[f].comidas || []).forEach(c => { c.thumb = null; c.foto = null; });
  }
}

function dia(f = fecha) {
  if (!state.dias[f]) state.dias[f] = { comidas: [], peso: null };
  if (!state.dias[f].comidas) state.dias[f].comidas = [];
  return state.dias[f];
}

/* ---------------- cálculo (envuelve a core.js) ---------------- */

function calcular() {
  return calcularPlan(state.perfil);
}

function totalesDia(f = fecha) {
  return sumarComidas(dia(f).comidas);
}
