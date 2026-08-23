/* ============================================================
   Pantalla de sincronización: credenciales, llave y el sync manual.
   ============================================================ */

let sincronizando = false;

/**
 * Lo que hay guardado en ESTE dispositivo. Para escribir siempre se parte de
 * acá: si se partiera de configSync(), el default global quedaría copiado al
 * estado local y ya no habría forma de volver atrás.
 */
function configSyncLocal() {
  return state.cfg.sync || {};
}

/**
 * Lo que se usa para conectarse: gana lo cargado a mano en este dispositivo y,
 * si no hay nada, se cae al default de config.js. Así el celular no necesita
 * que le carguen las credenciales.
 */
function configSync() {
  const local = configSyncLocal();
  return { ...local, ...resolverCredenciales(local, credencialesDeLaApp()) };
}

function credencialesDeLaApp() {
  return (typeof CONFIG_APP !== 'undefined' && CONFIG_APP.supabase) || {};
}

/** Si las credenciales vienen de config.js, no hay nada que cargar en Ajustes. */
function credencialesGlobales() {
  return resolverCredenciales(configSyncLocal(), credencialesDeLaApp()).global;
}

/** La llave se genera sola la primera vez que hace falta. */
function llaveDeEsteDispositivo() {
  const cfg = configSync();
  if (llaveValida(cfg.llave)) return cfg.llave;

  const llave = generarLlave();
  state.cfg.sync = { ...configSyncLocal(), llave };
  save();
  return llave;
}

function renderSync() {
  const cfg = configSync();
  const llave = llaveDeEsteDispositivo();
  const configurado = !!(cfg.url && cfg.anonKey);

  const local = configSyncLocal();
  $('syncUrl').value = local.url || '';
  $('syncKey').value = local.anonKey || '';
  renderOrigenCredenciales();
  $('syncLlave').textContent = llaveLegible(llave);

  $('btnSincronizar').hidden = !configurado;
  $('btnCopiarLlave').hidden = !configurado;

  if (!configurado) {
    $('syncPill').textContent = 'sin configurar';
    $('syncEstado').textContent = '';
    $('syncEstado').className = 'hint';
    return;
  }

  $('syncPill').textContent = cfg.ultimoSync ? 'activa' : 'lista';

  if (cfg.ultimoError) {
    $('syncEstado').textContent = cfg.ultimoError;
    $('syncEstado').className = 'hint sync-mal';
  } else if (cfg.ultimoSync) {
    const cuando = new Date(cfg.ultimoSync).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    $('syncEstado').textContent = `Última sincronización: ${cuando}` +
      (cfg.ultimoResumen ? ` · ${cfg.ultimoResumen}` : '');
    $('syncEstado').className = 'hint sync-ok';
  } else {
    $('syncEstado').textContent = 'Todavía no sincronizaste. Tocá "Sincronizar ahora".';
    $('syncEstado').className = 'hint';
  }
}

$('btnGuardarSync').onclick = () => {
  const url = $('syncUrl').value.trim().replace(/\/+$/, '');
  const anonKey = $('syncKey').value.trim();

  if (!url && !anonKey) {
    state.cfg.sync = { ...configSyncLocal(), url: '', anonKey: '' };
    save(); renderSync();
    toast('Sincronización desactivada');
    return;
  }

  if (!/^https:\/\/.+\.supabase\.co$/.test(url)) {
    toast('La URL tiene que ser la del proyecto: https://xxxxx.supabase.co');
    return;
  }
  if (anonKey.length < 20) { toast('Esa anon key parece incompleta'); return; }

  // Si es igual a lo que ya trae la app, no se guarda: una copia local que
  // envejece mal el día que cambie el proyecto.
  const app = credencialesDeLaApp();
  const propio = !(url === app.url && anonKey === app.anonKey);

  state.cfg.sync = {
    ...configSyncLocal(),
    url: propio ? url : '',
    anonKey: propio ? anonKey : '',
    ultimoError: ''
  };
  save(); renderSync();
  toast(propio ? 'Guardado. Probá con "Sincronizar ahora"' : 'Ya venía configurado con la app');
};

$('btnCopiarLlave').onclick = async () => {
  const llave = llaveDeEsteDispositivo();
  try {
    await navigator.clipboard.writeText(llave);
    toast('Llave copiada');
  } catch {
    prompt('Copiá esta llave a mano:', llave);
  }
};

$('btnPegarLlave').onclick = () => {
  const pegada = (prompt('Pegá la llave del otro dispositivo:') || '').replace(/\s+/g, '');
  if (!pegada) return;

  if (!llaveValida(pegada)) { toast('Esa llave no tiene el formato correcto'); return; }

  // cambiar de llave es cambiar de cuenta: lo que baje se fusiona con lo de acá
  state.cfg.sync = { ...configSyncLocal(), llave: pegada, ultimoSync: 0, ultimoError: '' };
  save(); renderSync();
  toast('Llave cambiada. Sincronizá para traer los datos');
};

$('btnSincronizar').onclick = async () => {
  if (sincronizando) return;

  const cfg = configSync();
  if (!cfg.url || !cfg.anonKey) { toast('Faltan la URL y la clave'); return; }

  sincronizando = true;
  const boton = $('btnSincronizar');
  boton.disabled = true;
  boton.textContent = 'Sincronizando…';

  try {
    const resultado = await sincronizar({
      cliente: clienteSupabase({ url: cfg.url, anonKey: cfg.anonKey, fetchFn: (...a) => fetch(...a) }),
      estado: state,
      llave: llaveDeEsteDispositivo(),
      ultimoSync: cfg.ultimoSync || 0
    });

    const r = resultado.resumen;
    const subidas = r.subidasComidas + r.subidasBorradas + r.subidasDias;
    const bajadas = r.nuevas + r.actualizadas + r.borradas + r.diasTocados;

    state = resultado.estado;
    state.cfg.sync = {
      ...configSync(),
      ultimoSync: resultado.ultimoSync,
      ultimoError: '',
      ultimoResumen: `Subí ${subidas} y bajé ${bajadas}.`
    };

    save();
    renderAll();
    toast(bajadas ? `${bajadas} ${bajadas === 1 ? 'cambio nuevo' : 'cambios nuevos'}` : 'Todo al día');
  } catch (err) {
    state.cfg.sync = { ...configSync(), ultimoError: err.message };
    save();
    renderSync();
    toast('No se pudo sincronizar');
    anotarError('Sync: ' + err.message, 'sync', 0);
  } finally {
    sincronizando = false;
    boton.disabled = false;
    boton.textContent = 'Sincronizar ahora';
  }
};

/**
 * Explica de dónde salen la URL y la clave. Sin esto, ver la sincronización
 * andando con los campos vacíos parece un error y no lo es.
 */
function renderOrigenCredenciales() {
  const el = $('origenCredenciales');
  if (!el) return;

  const global = credencialesGlobales();
  const hayAlgo = !!configSync().url;

  // Sin nada configurado no hay forma de sincronizar: ahí el plegable se abre solo.
  const det = $('avanzadoSync');
  if (det) det.open = !hayAlgo;

  if (global) {
    el.textContent = 'Listo para usar: el proyecto ya viene con la app. Lo único que se copia entre ' +
      'dispositivos es la llave de acá abajo.';
  } else if (hayAlgo) {
    el.textContent = 'Estás usando un proyecto cargado en este dispositivo, no el que trae la app.';
  } else {
    el.textContent = 'Sin esto, los datos se quedan en este dispositivo.';
  }

  const intro = $('syncIntro');
  if (intro) {
    intro.textContent = global || hayAlgo
      ? 'Para ver lo mismo en la compu y en el celular.'
      : 'Para ver lo mismo en la compu y en el celular. Necesita un proyecto de Supabase (gratis).';
  }
}
