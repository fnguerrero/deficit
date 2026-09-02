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

/*
 * Guardar, agrupado.
 *
 * `save()` serializa el estado ENTERO —dias, comidas, cache de analisis— y eso
 * en un historial de meses son cientos de kilobytes. Tocar cinco vasos de agua
 * seguidos hacia cinco serializaciones completas y cinco escrituras a disco.
 * Ahora se junta todo lo que pase en el mismo cuarto de segundo.
 *
 * `guardarYa()` existe para los momentos en que no se puede esperar: cerrar la
 * pestana, cambiar de dia, sincronizar.
 */
const MS_AGRUPAR_GUARDADO = 250;
let relojGuardado = null;

function save() {
  clearTimeout(relojGuardado);
  relojGuardado = setTimeout(guardarYa, MS_AGRUPAR_GUARDADO);
}

/* Antes de que se cierre la pestana no hay proxima vuelta: se escribe ya. */
if (typeof addEventListener === 'function') {
  addEventListener('pagehide', () => { if (relojGuardado) guardarYa(); });
  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && relojGuardado) guardarYa();
  });
}

/*
 * Cuándo se tocó el perfil por última vez.
 *
 * Sin este número no hay forma de decidir qué perfil gana cuando la compu y el
 * celular tienen dos versiones distintas, y el sync no puede fusionar a ciegas.
 *
 * Se calcula acá y no en cada lugar que edita el perfil —hay cinco: el
 * formulario, el modo, el ritmo, el plazo y la cintura— justamente para que
 * agregar un sexto no obligue a acordarse de nada. Comparar once campos en cada
 * guardado no se nota; olvidarse de marcar uno hace que un cambio no viaje
 * nunca, y eso no se nota hasta que ya perdiste el dato.
 */
let firmaPerfil = null;

function marcarPerfil() {
  const p = state.perfil || {};
  const firma = JSON.stringify(CAMPOS_QUE_VIAJAN.map(c => p[c] ?? null));
  /* La primera vez solo se toma la foto: recién cargado del disco, el perfil no
     cambió por nada que haya hecho nadie, y marcarlo lo haría ganar contra un
     perfil remoto más nuevo sin motivo. */
  if (firmaPerfil !== null && firma !== firmaPerfil) state.perfil.act = Date.now();
  firmaPerfil = firma;
}

function guardarYa() {
  clearTimeout(relojGuardado);
  relojGuardado = null;
  marcarPerfil();
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
      catch { toast('No entra más: probá borrar las fotos viejas desde Ajustes → Datos'); }
    }
  }

  /* Los horarios de las comidas se re-aprenden con cada guardado: es donde
     puede haber una comida nueva que corra los cortes. */
  if (typeof aprenderMomentos === 'function') aprenderMomentos(state.dias);

  // Un solo enganche para todo: cargar una comida, editarla, borrarla, anotar el
  // peso. Engancharlo en cada pantalla habría dejado agujeros.
  if (typeof sincronizarTrasCambio === 'function') sincronizarTrasCambio();
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

/* ============================================================
   El respaldo de un paso irreversible

   `deficit.backup` guarda la versión anterior en CADA save(), así que a los
   pocos segundos de uso ya no sirve para volver atrás de nada: lo que tiene es
   el estado de hace un vaso de agua.

   Hay un solo momento en la app que no se puede deshacer, y es entrar con la
   cuenta por primera vez: ahí el servidor adopta las filas que estaban sueltas
   y todo lo que hay allá se fusiona con lo de acá. Si eso sale mal —una
   fusión rara, datos de otra cuenta, lo que sea— no hay vuelta, y justo es el
   único punto donde el historial entero está en juego de una sola vez.

   Este respaldo se escribe una vez, antes de ese paso, y se queda hasta que
   se lo descarte a mano.
   ============================================================ */

const KEY_HITO = 'deficit.antes-de';

/*
 * Las fotos no entran. Son el 95 % del peso y guardarlas duplicaría el
 * almacenamiento entero justo cuando ya está lleno; lo que importa recuperar
 * son las comidas y los pesos, no las imágenes.
 */
function sinFotos(estado) {
  const copia = clonar(estado);
  for (const d of Object.values(copia.dias || {})) {
    (d.comidas || []).forEach(c => { c.foto = null; c.thumb = null; });
  }
  return copia;
}

/** Devuelve false si no entró: un respaldo que no se pudo escribir no frena el paso. */
function guardarRespaldoDeHito(motivo) {
  try {
    localStorage.setItem(KEY_HITO, JSON.stringify({
      motivo, cuando: Date.now(), datos: JSON.stringify(sinFotos(state))
    }));
    return true;
  } catch {
    return false;
  }
}

function hayRespaldoDeHito() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY_HITO) || 'null');
    if (!r || !r.datos) return null;

    const s = JSON.parse(r.datos);
    return {
      motivo: String(r.motivo || ''),
      cuando: Number(r.cuando) || 0,
      texto: r.datos,
      dias: Object.keys(s.dias || {}).length,
      comidas: Object.values(s.dias || {}).reduce((a, d) => a + (d.comidas || []).length, 0)
    };
  } catch {
    return null;
  }
}

function restaurarRespaldoDeHito() {
  const r = hayRespaldoDeHito();
  if (!r) { toast('No hay copia para volver'); return false; }

  state = migrar(JSON.parse(r.texto));
  guardarYa();
  renderAll();
  toast('Volviste a como estaba antes');
  return true;
}

function olvidarRespaldoDeHito() {
  try { localStorage.removeItem(KEY_HITO); } catch { /* da igual */ }
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

/*
 * El objetivo del dia ahora lo decide el modo (ver modos.js). Se siguen
 * devolviendo `objetivo` y `macros` porque la UI vieja los lee por ese nombre:
 * renombrarlos en 8 pantallas de una sola vez seria buscarse un problema.
 */
function calcular() {
  const o = objetivoDeModo(state.perfil, state.perfil.modo);
  if (!o) return null;

  // un objetivo puesto a mano le gana al del modo: es una decision de la persona
  const manual = Number(state.perfil.manual) || 0;
  const kcal = manual > 0 ? manual : o.kcal;

  const deficitReal = o.tdee - kcal;
  const kgSemana = +((deficitReal * 7) / 7700).toFixed(2);

  let semanas = null;
  const p = state.perfil;
  if (p.pesoObj && p.peso > p.pesoObj && kgSemana > 0) {
    semanas = Math.ceil((p.peso - p.pesoObj) / kgSemana);
  }

  return {
    ...o,
    kcal,
    objetivo: kcal,
    deficitReal,
    kgSemana,
    semanas,
    piso: Math.max(o.tmb, PISO_KCAL[p.sexo === 'f' ? 'f' : 'm']),
    macros: { prot: o.prot, carb: o.carb, gras: o.gras }
  };
}

function totalesDia(f = fecha) {
  return sumarComidas(dia(f).comidas);
}
