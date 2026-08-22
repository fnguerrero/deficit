/* ============================================================
   sync.js — sincronización con Supabase por REST.

   Sin SDK y sin login: cada instalación tiene una llave larga y
   aleatoria, y esa llave es la que agrupa los datos. Para sumar el
   celular se copia la llave desde la compu.

   El fetch se inyecta, así los tests corren sin tocar la red.
   ============================================================ */

const TABLA_DIAS = 'dias';
const TABLA_COMIDAS = 'comidas';

/* Una llave corta es adivinable y acá no hay contraseña que la respalde. */
const LARGO_LLAVE = 32;

/** Llave nueva: 32 caracteres de un alfabeto sin ambigüedades visuales. */
function generarLlave(aleatorio = null) {
  const ALFABETO = 'abcdefghijkmnpqrstuvwxyz23456789';   // sin l, o, 0, 1
  const bytes = new Uint8Array(LARGO_LLAVE);

  if (aleatorio) aleatorio(bytes);
  else if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes);
  else for (let i = 0; i < LARGO_LLAVE; i++) bytes[i] = Math.floor(Math.random() * 256);

  return [...bytes].map(b => ALFABETO[b % ALFABETO.length]).join('');
}

/** Una llave sirve si tiene el largo y el alfabeto esperados. */
function llaveValida(llave) {
  return typeof llave === 'string' && new RegExp(`^[a-km-np-z2-9]{${LARGO_LLAVE}}$`).test(llave);
}

/** Para mostrarla sin que sea un chorizo ilegible. */
function llaveLegible(llave) {
  return String(llave || '').replace(/(.{8})/g, '$1 ').trim();
}

/**
 * De dónde salen la URL y la anon key. Gana lo cargado a mano en este
 * dispositivo; si no hay nada, se usa el default que viene con la app, así el
 * celular no necesita que le carguen credenciales.
 *
 * `global` es true cuando se está usando ese default, para poder decirlo en
 * pantalla: con los campos vacíos y todo andando, si no se explica parece un error.
 */
function resolverCredenciales(local = {}, app = {}) {
  const url = String(local.url || app.url || '').replace(/\/+$/, '');
  const anonKey = String(local.anonKey || app.anonKey || '');

  return {
    url,
    anonKey,
    global: !local.url && !local.anonKey && !!(app.url && app.anonKey)
  };
}

/* ---------------- cliente REST ---------------- */

function clienteSupabase({ url, anonKey, fetchFn, señal = null }) {
  if (!url || !anonKey) throw new Error('Faltan la URL y la clave de Supabase.');

  const base = String(url).replace(/\/+$/, '') + '/rest/v1/';
  const cabeceras = {
    apikey: anonKey,
    Authorization: 'Bearer ' + anonKey,
    'Content-Type': 'application/json'
  };

  async function pedir(ruta, opciones = {}) {
    let res;
    try {
      res = await fetchFn(base + ruta, {
        ...opciones,
        headers: { ...cabeceras, ...(opciones.headers || {}) },
        signal: señal
      });
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      throw new Error('No se pudo conectar con Supabase. Revisá la conexión y la URL.');
    }

    if (!res.ok) {
      let detalle = '';
      try { detalle = (await res.json())?.message || ''; } catch { /* sin cuerpo legible */ }

      if (res.status === 401 || res.status === 403) {
        throw new Error('Supabase rechazó la clave. Revisá la anon key y las políticas de la tabla.');
      }
      if (res.status === 404) {
        throw new Error('No encontré las tablas. ¿Corriste el SQL de supabase.sql?');
      }
      throw new Error(`Supabase respondió ${res.status}${detalle ? ': ' + detalle : ''}`);
    }

    if (res.status === 204) return [];
    try { return await res.json(); } catch { return []; }
  }

  return {
    /** Inserta o actualiza filas (upsert por la clave primaria de la tabla). */
    async guardar(tabla, filas) {
      if (!filas || !filas.length) return [];
      return pedir(tabla, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(filas)
      });
    },

    /**
     * Trae las filas que llegaron al servidor después de `desde`.
     * Se filtra por `subido` y no por `act`: una comida vieja que otro
     * dispositivo recién sube tiene que llegar igual, aunque su fecha de
     * modificación sea anterior al último sync de acá.
     */
    async traer(tabla, llave, desde = 0) {
      // margen por relojes desfasados entre dispositivos
      const piso = Math.max(0, desde - 5 * 60000);
      const filtro = `?llave=eq.${encodeURIComponent(llave)}&subido=gt.${piso}&order=subido.asc`;
      return pedir(tabla + filtro);
    },

    /** Prueba de vida: si esto anda, la URL, la clave y las tablas están bien. */
    async probar(llave) {
      await pedir(`${TABLA_COMIDAS}?llave=eq.${encodeURIComponent(llave)}&limit=1`);
      return true;
    }
  };
}

/* ---------------- forma de las filas ---------------- */

/** Una comida local pasada a fila de Supabase. Las fotos no viajan: pesan y son locales. */
function comidaAFila(comida, fecha, llave, subido = Date.now()) {
  return {
    llave,
    subido,
    id: comida.id,
    fecha,
    ts: comida.ts,
    titulo: comida.titulo,
    items: comida.items || [],
    kcal: comida.kcal,
    prot: comida.prot,
    carb: comida.carb,
    gras: comida.gras,
    momento: comida.momento,
    notas: comida.notas || '',
    borrada: false,
    act: comida.act || comida.ts || 0
  };
}

/** Y al revés: fila remota a comida local, sin pisar la foto que ya haya acá. */
function filaAComida(fila, comidaLocal = null) {
  return {
    id: fila.id,
    ts: Number(fila.ts) || 0,
    titulo: String(fila.titulo || 'Comida'),
    items: Array.isArray(fila.items) ? fila.items : [],
    kcal: Number(fila.kcal) || 0,
    prot: Number(fila.prot) || 0,
    carb: Number(fila.carb) || 0,
    gras: Number(fila.gras) || 0,
    momento: fila.momento || 'almuerzo',
    notas: String(fila.notas || ''),
    // la foto vive solo en el dispositivo donde se sacó
    thumb: comidaLocal?.thumb || null,
    foto: comidaLocal?.foto || null,
    act: Number(fila.act) || 0
  };
}

function diaAFila(dia, fecha, llave, subido = Date.now()) {
  return {
    llave,
    subido,
    fecha,
    peso: dia.peso,
    agua: dia.agua || 0,
    ejercicio: dia.ejercicio || 0,
    nota: dia.nota || '',
    act: dia.act || 0
  };
}

/* ---------------- qué hay para subir ---------------- */

/**
 * Lo modificado desde el último sync. Se mira `act` de cada cosa, que es
 * cuándo se tocó por última vez en este dispositivo.
 */
function cambiosLocales(estado, desde = 0) {
  const comidas = [];
  const dias = [];

  for (const [fecha, d] of Object.entries(estado.dias || {})) {
    for (const c of d.comidas || []) {
      if ((c.act || c.ts || 0) > desde) comidas.push({ comida: c, fecha });
    }
    if ((d.act || 0) > desde) dias.push({ dia: d, fecha });
  }

  const borradas = (estado.borradas || []).filter(b => (b.act || 0) > desde);

  return { comidas, dias, borradas };
}

/* ---------------- fusión de lo remoto ---------------- */

/**
 * Aplica lo que vino del servidor sobre el estado local.
 * Regla: gana la versión modificada más tarde. Es simple y predecible, que es
 * lo que hace falta cuando el conflicto lo generó una sola persona en dos
 * dispositivos, no dos personas peleando por el mismo dato.
 */
function aplicarRemoto(estado, { comidas = [], dias = [] }) {
  const salida = clonar(estado);
  const resumen = { nuevas: 0, actualizadas: 0, ignoradas: 0, borradas: 0, diasTocados: 0 };

  const tumbas = new Set((salida.borradas || []).map(b => b.id));

  for (const fila of comidas) {
    const fecha = fila.fecha;
    if (!salida.dias[fecha]) salida.dias[fecha] = { peso: null, agua: 0, ejercicio: 0, nota: '', comidas: [] };

    const lista = salida.dias[fecha].comidas;
    const pos = lista.findIndex(c => c.id === fila.id);
    const local = pos >= 0 ? lista[pos] : null;

    if (fila.borrada) {
      // el otro dispositivo la borró
      if (pos >= 0) { lista.splice(pos, 1); resumen.borradas++; }
      if (!tumbas.has(fila.id)) {
        salida.borradas = [{ id: fila.id, fecha, act: Number(fila.act) || 0 }, ...(salida.borradas || [])];
        tumbas.add(fila.id);
      }
      continue;
    }

    // acá se borró y allá se modificó: el borrado local manda salvo que lo remoto sea posterior
    const tumba = (salida.borradas || []).find(b => b.id === fila.id);
    if (tumba && (tumba.act || 0) >= (Number(fila.act) || 0)) { resumen.ignoradas++; continue; }

    if (!local) {
      lista.push(filaAComida(fila));
      resumen.nuevas++;
    } else if ((Number(fila.act) || 0) > (local.act || local.ts || 0)) {
      lista[pos] = filaAComida(fila, local);
      resumen.actualizadas++;
    } else {
      resumen.ignoradas++;
    }
  }

  for (const fila of dias) {
    const fecha = fila.fecha;
    if (!salida.dias[fecha]) salida.dias[fecha] = { peso: null, agua: 0, ejercicio: 0, nota: '', comidas: [] };

    const d = salida.dias[fecha];
    if ((Number(fila.act) || 0) > (d.act || 0)) {
      d.peso = fila.peso == null ? d.peso : Number(fila.peso);
      d.agua = Number(fila.agua) || 0;
      d.ejercicio = Number(fila.ejercicio) || 0;
      d.nota = String(fila.nota || '');
      d.act = Number(fila.act) || 0;
      resumen.diasTocados++;
    }
  }

  // las comidas quedan ordenadas por hora, como en el resto de la app
  for (const d of Object.values(salida.dias)) {
    (d.comidas || []).sort((a, b) => a.ts - b.ts);
  }

  return { estado: salida, resumen };
}

/* ---------------- la sincronización completa ---------------- */

/**
 * Baja lo remoto, lo fusiona y después sube lo local. Ese orden importa:
 * al revés, la versión vieja de este dispositivo pisaría en el servidor la
 * edición más nueva que hizo el otro.
 */
async function sincronizar({ cliente, estado, llave, ultimoSync = 0, ahora = Date.now() }) {
  if (!llaveValida(llave)) throw new Error('La llave de sincronización no es válida.');

  // 1) primero se baja: si lo remoto es más nuevo tiene que ganar ANTES de que
  //    esta máquina suba su versión, o el upsert pisaría lo bueno con lo viejo.
  const [remotasComidas, remotosDias] = await Promise.all([
    cliente.traer(TABLA_COMIDAS, llave, ultimoSync),
    cliente.traer(TABLA_DIAS, llave, ultimoSync)
  ]);

  const { estado: fusionado, resumen } = aplicarRemoto(estado, {
    comidas: remotasComidas,
    dias: remotosDias
  });

  // 2) recién ahora se mira qué hay para subir, ya sobre el estado fusionado
  const cambios = cambiosLocales(fusionado, ultimoSync);

  const filasComidas = cambios.comidas.map(({ comida, fecha }) => comidaAFila(comida, fecha, llave, ahora));
  const filasBorradas = cambios.borradas.map(b => ({
    llave, subido: ahora, id: b.id, fecha: b.fecha, ts: 0, titulo: '', items: [],
    kcal: 0, prot: 0, carb: 0, gras: 0, momento: 'almuerzo', notas: '',
    borrada: true, act: b.act
  }));
  const filasDias = cambios.dias.map(({ dia, fecha }) => diaAFila(dia, fecha, llave, ahora));

  await cliente.guardar(TABLA_COMIDAS, [...filasComidas, ...filasBorradas]);
  await cliente.guardar(TABLA_DIAS, filasDias);

  return {
    estado: fusionado,
    resumen: {
      ...resumen,
      subidasComidas: filasComidas.length,
      subidasBorradas: filasBorradas.length,
      subidasDias: filasDias.length,
      bajadas: remotasComidas.length + remotosDias.length
    },
    ultimoSync: ahora
  };
}

if (typeof window !== 'undefined') {
  window.__sync = {
    TABLA_DIAS, TABLA_COMIDAS, LARGO_LLAVE,
    generarLlave, llaveValida, llaveLegible, clienteSupabase,
    comidaAFila, filaAComida, diaAFila,
    cambiosLocales, aplicarRemoto, sincronizar
  };
}
