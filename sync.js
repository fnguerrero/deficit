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

/* Los mismos que reintenta el cliente de Claude: nada de esto es culpa nuestra
   y todos se arreglan solos esperando un poco. */
const REINTENTABLES_SUPA = [429, 500, 502, 503, 504];

const dormirDefecto = (ms) => new Promise(r => setTimeout(r, ms));

function clienteSupabase({ url, anonKey, fetchFn, señal = null, intentos = 3, dormir = dormirDefecto, base: espera = 600, token: tokenActual = '' }) {
  if (!url || !anonKey) throw new Error('Faltan la URL y la clave de Supabase.');

  const base = String(url).replace(/\/+$/, '') + '/rest/v1/';

  /*
   * Con sesion iniciada el Bearer es el token del usuario, y ahi las politicas
   * RLS filtran por auth.uid(): cada uno ve lo suyo y nada mas. Sin sesion cae
   * en la anon key, que ya no alcanza para leer nada pero deja que el cliente
   * se construya igual sin explotar.
   */
  const cabeceras = () => ({
    apikey: anonKey,
    Authorization: 'Bearer ' + (tokenActual || anonKey),
    'Content-Type': 'application/json'
  });

  async function pedir(ruta, opciones = {}) {
    let res;
    let ultimoFallo = null;

    // Un 503 de paso no tiene por qué costarle a la persona el sync entero.
    for (let i = 0; i < intentos; i++) {
      try {
        res = await fetchFn(base + ruta, {
          ...opciones,
          headers: { ...cabeceras(), ...(opciones.headers || {}) },
          signal: señal
        });
      } catch (e) {
        if (e && e.name === 'AbortError') throw e;
        ultimoFallo = new Error('No se pudo conectar con Supabase. Revisá la conexión y la URL.');
        if (i < intentos - 1) { await dormir(espera * Math.pow(2, i)); continue; }
        throw ultimoFallo;
      }

      if (res.ok || !REINTENTABLES_SUPA.includes(res.status)) break;
      if (i < intentos - 1) await dormir(espera * Math.pow(2, i));
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
      /*
       * Las tablas viejas tienen los macros como `integer`, y los macros son
       * decimales: 28,6 g de grasa, media porción de 15,3 g de proteína. Como
       * todas las comidas van en un solo POST, una sola con decimales hace
       * fallar la subida entera. El mensaje crudo de Postgres —"invalid input
       * syntax for type integer"— no le dice a nadie qué hacer.
       */
      if (res.status === 400 && /invalid input syntax for type integer/i.test(detalle)) {
        throw new Error('La base tiene los macros como números enteros y son decimales. ' +
          'Corré supabase-decimales.sql en Supabase y volvé a sincronizar.');
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

      /* Con sesion iniciada no se filtra por llave: las politicas RLS ya
         devuelven solo lo del usuario, y filtrar ademas por la llave de ESTE
         dispositivo escondería lo que cargaste desde el celular. */
      const porLlave = tokenActual ? '' : `llave=eq.${encodeURIComponent(llave)}&`;
      return pedir(`${tabla}?${porLlave}subido=gt.${piso}&order=subido.asc`);
    },

    /** Adopta las filas que quedaron con llave y sin duenio, tras el primer login. */
    async reclamarLlave(llave) {
      const r = await pedir('rpc/reclamar_llave', {
        method: 'POST',
        body: JSON.stringify({ p_llave: llave })
      });
      const fila = Array.isArray(r) ? r[0] : r;
      return {
        comidas: Number(fila?.comidas_migradas) || 0,
        dias: Number(fila?.dias_migrados) || 0
      };
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
function comidaAFila(comida, fecha, llave, subido = Date.now(), userId = null) {
  return {
    llave,
    subido,
    ...(userId ? { user_id: userId } : {}),
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
    /* Los tres nutrientes que la pantalla del día muestra abajo del anillo.
       Los traen el código de barras y algunos análisis, se guardaban local y no
       subían: al abrir la app en otro dispositivo la fila aparecía vacía. */
    fibra: Number(comida.fibra) || 0,
    azucar: Number(comida.azucar) || 0,
    sodio: Number(comida.sodio) || 0,
    porcion_factor: Number(comida.porcionFactor) > 0 ? Number(comida.porcionFactor) : 1,
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
    /* Si la base todavía no tiene estas columnas, lo que llega es undefined y
       queda en 0 o en 1, que es exactamente lo que había antes. */
    fibra: Number(fila.fibra) || 0,
    azucar: Number(fila.azucar) || 0,
    sodio: Number(fila.sodio) || 0,
    porcionFactor: Number(fila.porcion_factor) > 0 ? Number(fila.porcion_factor) : 1,
    // la foto vive solo en el dispositivo donde se sacó
    thumb: comidaLocal?.thumb || null,
    foto: comidaLocal?.foto || null,
    act: Number(fila.act) || 0
  };
}

function diaAFila(dia, fecha, llave, subido = Date.now(), userId = null) {
  return {
    llave,
    subido,
    ...(userId ? { user_id: userId } : {}),
    fecha,
    peso: dia.peso,
    /* La cintura del día en que se midió. No es un dato diario, pero es el
       único lugar donde queda su fecha, y sin fecha no hay curva que dibujar
       en el otro dispositivo. */
    cintura: dia.cintura ?? null,
    agua: dia.agua || 0,
    ejercicio: dia.ejercicio || 0,
    nota: dia.nota || '',
    /* Dos de los cinco hábitos del día viajaban sin subir: el sueño y el ánimo
       vivían solo en el dispositivo donde se cargaron, mientras la app decía
       que con una cuenta los datos quedaban a salvo. Se guardan planos porque
       Postgres no tiene por qué saber la forma del objeto del cliente. */
    sueno_horas: dia.sueno?.horas ?? null,
    sueno_calidad: dia.sueno?.calidad || null,
    animo: dia.animo || null,
    act: dia.act || 0
  };
}

/** Los campos que la base puede no tener todavía, si falta correr la migración. */
const CAMPOS_NUEVOS_DIA = ['sueno_horas', 'sueno_calidad', 'animo', 'cintura'];
const CAMPOS_NUEVOS_COMIDA = ['fibra', 'azucar', 'sodio', 'porcion_factor'];

/** La misma fila sin los campos nuevos, para reintentar contra una base vieja. */
function filaSinCamposNuevos(fila, campos = CAMPOS_NUEVOS_DIA) {
  const copia = { ...fila };
  for (const c of campos) delete copia[c];
  return copia;
}

/** Si el 400 se queja de una columna que no existe, la base está sin migrar. */
function faltaMigracion(mensaje) {
  const m = String(mensaje || '');
  return [...CAMPOS_NUEVOS_DIA, ...CAMPOS_NUEVOS_COMIDA].some(c => m.includes(c)) &&
    /column|columna|schema cache/i.test(m);
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
 * Un día, campo por campo, cuando el mismo día se tocó en dos dispositivos.
 *
 * Antes el día se resolvía entero por `act`: ganaba el más nuevo y el otro se
 * tiraba completo. Eso perdía datos en el caso más común que hay, que es usar
 * el celular y la compu el mismo día:
 *
 *   En la compu tomás cuatro vasos de agua (act = 10:00). En el celu registrás
 *   la caminata (act = 18:00, y su agua es 0 porque ahí nunca tocaste el agua).
 *   Al sincronizar, el día del celu es más nuevo y pisa: **los cuatro vasos
 *   desaparecen.** Y al revés, si la compu sincroniza última, se pierde la
 *   caminata.
 *
 * Hay un `act` por día y no uno por campo, así que no se puede saber cuál de
 * los cinco se tocó. Lo que sí se sabe es qué es cada campo:
 *
 *   · **agua y ejercicio** son acumuladores: durante el día solo suben. El
 *     máximo de los dos es lo que efectivamente pasó. El costo es que borrar
 *     un vaso desde el otro dispositivo no se propaga —vuelve—, y a cambio no
 *     se pierde nunca lo que sí se registró.
 *   · **el peso** lo pone una balanza una vez al día: si uno de los dos lo
 *     tiene y el otro no, vale el que lo tiene. Con los dos cargados, el `act`
 *     desempata.
 *   · **la nota** es texto que se escribe: gana la más nueva, pero una vacía
 *     nunca pisa una escrita. Mismo trade-off que el agua, y por el mismo
 *     motivo: perder algo escrito es peor que arrastrar algo borrado.
 */
function fusionarDia(local, remoto) {
  const actL = Number(local?.act) || 0;
  const actR = Number(remoto?.act) || 0;
  const ganaR = actR > actL;

  const agua = Math.max(Number(local?.agua) || 0, Number(remoto?.agua) || 0);
  const ejercicio = Math.max(Number(local?.ejercicio) || 0, Number(remoto?.ejercicio) || 0);

  const pesoL = local?.peso == null || local.peso === '' ? null : Number(local.peso);
  const pesoR = remoto?.peso == null || remoto.peso === '' ? null : Number(remoto.peso);
  const peso = pesoL == null ? pesoR : (pesoR == null ? pesoL : (ganaR ? pesoR : pesoL));

  const notaL = String(local?.nota || '');
  const notaR = String(remoto?.nota || '');
  const nota = !notaR ? notaL : (!notaL ? notaR : (ganaR ? notaR : notaL));

  /* El sueño y el ánimo son "lo tiene el que lo tiene": ninguno de los dos se
     acumula como el agua ni se puede promediar, así que si de un lado hay dato
     y del otro no, gana el que hay, y si hay de los dos gana el más nuevo. */
  /* La cintura es como el peso: un número medido que no se acumula. Si de un
     lado hay y del otro no, gana el que hay. */
  const cintL = local?.cintura == null || local.cintura === '' ? null : Number(local.cintura);
  const cintR = remoto?.cintura == null || remoto.cintura === '' ? null : Number(remoto.cintura);
  const cintura = cintL == null ? cintR : (cintR == null ? cintL : (ganaR ? cintR : cintL));

  const suenoR = remotoSueno(remoto);
  const suenoL = local?.sueno || null;
  const sueno = !suenoR ? suenoL : (!suenoL ? suenoR : (ganaR ? suenoR : suenoL));

  const animoL = local?.animo || null;
  const animoR = remoto?.animo || null;
  const animo = !animoR ? animoL : (!animoL ? animoR : (ganaR ? animoR : animoL));

  const cambio = peso !== (pesoL == null ? null : pesoL) ||
    cintura !== cintL ||
    agua !== (Number(local?.agua) || 0) ||
    ejercicio !== (Number(local?.ejercicio) || 0) ||
    nota !== notaL ||
    JSON.stringify(sueno) !== JSON.stringify(suenoL) ||
    animo !== animoL;

  return { peso, cintura, agua, ejercicio, nota, sueno, animo, act: Math.max(actL, actR), cambio };
}

/** El sueño que viene del servidor, que llega en dos columnas planas. */
function remotoSueno(remoto) {
  if (!remoto) return null;
  /* Puede venir ya armado (de otro cliente en memoria) o en columnas. */
  if (remoto.sueno) return remoto.sueno;
  const horas = remoto.sueno_horas;
  const calidad = remoto.sueno_calidad;
  if (horas == null && !calidad) return null;
  return { ...(horas == null ? {} : { horas: Number(horas) }), ...(calidad ? { calidad } : {}) };
}

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
    /* Una fila sin fecha válida creaba `dias["undefined"]`, que después salía
       en el historial y no se podía borrar desde ninguna pantalla. Se descarta:
       una comida sin día no se puede colocar en ningún lado. */
    if (!esFechaISO(fecha)) { resumen.ignoradas++; continue; }
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
      /*
       * Antes de agregarla hay que sacarla de cualquier OTRO dia.
       *
       * Una comida cargada un dia y corregida a otro llega del remoto con la
       * fecha nueva, y la busqueda solo mira la lista de esa fecha: no la
       * encuentra, la agrega, y la vieja se queda donde estaba. La misma comida
       * contada dos veces, en dos dias distintos, y el total de los dos mal.
       */
      for (const [f, dia] of Object.entries(salida.dias)) {
        if (f === fecha || !Array.isArray(dia.comidas)) continue;
        const otro = dia.comidas.findIndex(c => c.id === fila.id);
        if (otro >= 0) dia.comidas.splice(otro, 1);
      }

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
    if (!esFechaISO(fecha)) continue;
    if (!salida.dias[fecha]) salida.dias[fecha] = { peso: null, agua: 0, ejercicio: 0, nota: '', comidas: [] };

    const d = salida.dias[fecha];
    const f = fusionarDia(d, fila);
    if (f.cambio) {
      d.peso = f.peso;
      d.agua = f.agua;
      d.ejercicio = f.ejercicio;
      d.nota = f.nota;
      d.sueno = f.sueno;
      d.animo = f.animo;
      d.act = f.act;
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
async function sincronizar({ cliente, estado, llave, ultimoSync = 0, ahora = Date.now(), userId = null }) {
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

  const filasComidas = cambios.comidas.map(({ comida, fecha }) => comidaAFila(comida, fecha, llave, ahora, userId));
  const filasBorradas = cambios.borradas.map(b => ({
    llave, subido: ahora, ...(userId ? { user_id: userId } : {}),
    id: b.id, fecha: b.fecha, ts: 0, titulo: '', items: [],
    kcal: 0, prot: 0, carb: 0, gras: 0, momento: 'almuerzo', notas: '',
    borrada: true, act: b.act
  }));
  const filasDias = cambios.dias.map(({ dia, fecha }) => diaAFila(dia, fecha, llave, ahora, userId));

  await guardarComidas(cliente, [...filasComidas, ...filasBorradas]);
  await guardarDias(cliente, filasDias);

  /* 3) y el perfil, que hasta ahora no viajaba: quien abría la app en el
     celular se encontraba la altura, la edad y el objetivo en blanco. Va aparte
     porque es UNO solo y se resuelve entero — ver sync-perfil.js — y no puede
     tumbar el resto si la tabla todavía no existe. */
  const perfil = await sincronizarPerfil({
    cliente, perfil: fusionado.perfil, llave, ultimoSync, ahora, userId
  });
  fusionado.perfil = perfil.perfil;

  return {
    estado: fusionado,
    /* Las filas crudas salen con el resultado para que el llamador pueda volver
       a fusionarlas sobre el estado que este vivo al terminar. Ver
       fusionarAlFinal(), justo abajo. */
    remotas: { comidas: remotasComidas, dias: remotosDias },
    resumen: {
      ...resumen,
      subidasComidas: filasComidas.length,
      subidasBorradas: filasBorradas.length,
      subidasDias: filasDias.length,
      perfilBajado: perfil.cambio,
      perfilSubido: perfil.subido,
      /* Que la pantalla pueda decir que falta correr la migración: fallar en
         silencio deja a alguien esperando un dato que no va a llegar nunca. */
      faltaTablaPerfil: perfil.migrar,
      bajadas: remotasComidas.length + remotosDias.length
    },
    ultimoSync: ahora
  };
}

/**
 * Guardar los días, aguantando que la base esté sin migrar.
 *
 * El sueño y el ánimo son columnas nuevas. Una base creada antes no las tiene,
 * y un solo campo desconocido hace fallar el POST entero: el sync quedaría
 * roto para todo, no solo para lo nuevo. Si el 400 se queja justo de esas
 * columnas, se reintenta sin ellas y el resto sigue subiendo igual.
 */
async function guardarDias(cliente, filas) {
  return guardarTolerante(cliente, TABLA_DIAS, filas, CAMPOS_NUEVOS_DIA);
}

/** Lo mismo para las comidas, que también estrenan columnas. */
async function guardarComidas(cliente, filas) {
  return guardarTolerante(cliente, TABLA_COMIDAS, filas, CAMPOS_NUEVOS_COMIDA);
}

async function guardarTolerante(cliente, tabla, filas, campos) {
  if (!filas.length) return;
  try {
    await cliente.guardar(tabla, filas);
  } catch (e) {
    if (!faltaMigracion(e?.message)) throw e;
    await cliente.guardar(tabla, filas.map(f => filaSinCamposNuevos(f, campos)));
  }
}

/**
 * Fusiona lo remoto sobre el estado que esta vivo AHORA, no sobre el que se
 * clono al empezar.
 *
 * Sin esto se pierden comidas, y en silencio. El sync automatico corre cuatro
 * segundos despues de cada cambio y tarda lo que tarde la red: si en esos
 * segundos se carga otra comida —que es exactamente lo que pasa cuando alguien
 * esta cargando el almuerzo—, `sincronizar` la ignora, porque trabajo sobre un
 * clon anterior. Asignar ese clon al estado global borra la comida nueva. No
 * avisa nada, no falla nada, y en la pantalla la comida simplemente ya no esta.
 *
 * Re-aplicar es seguro: `aplicarRemoto` decide por `act` y no acumula, asi que
 * pasarle dos veces las mismas filas da el mismo resultado.
 *
 * Lo que se cargo durante el sync no sube en esta ronda —su `act` es posterior
 * al `ultimoSync` que queda anotado—, asi que la siguiente lo agarra.
 */
function fusionarAlFinal(estadoVivo, resultado) {
  const remotas = resultado?.remotas || { comidas: [], dias: [] };

  /* Sin nada que bajar no hay nada que fusionar, y el clon de aplicarRemoto es
     un JSON.stringify del historial entero: caro para repetirlo al pedo cada
     vez que se guarda un vaso de agua. */
  if (!remotas.comidas.length && !remotas.dias.length) {
    return { estado: estadoVivo, resumen: resultado.resumen };
  }

  const r = aplicarRemoto(estadoVivo, remotas);
  return { estado: r.estado, resumen: { ...resultado.resumen, ...r.resumen } };
}

if (typeof window !== 'undefined') {
  window.__sync = {
    TABLA_DIAS, TABLA_COMIDAS, LARGO_LLAVE,
    generarLlave, llaveValida, llaveLegible, clienteSupabase,
    comidaAFila, filaAComida, diaAFila, filaSinCamposNuevos, faltaMigracion, guardarDias, guardarComidas,
    cambiosLocales, aplicarRemoto, fusionarDia, sincronizar, fusionarAlFinal,
    TABLA_PERFIL, perfilAFila, filaAPerfil, fusionarPerfil, perfilVacio, sincronizarPerfil
  };
}
