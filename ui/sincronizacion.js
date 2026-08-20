/* ============================================================
   Pantalla de sincronización: credenciales, llave y el sync manual.
   ============================================================ */

let sincronizando = false;

function configSync() {
  return state.cfg.sync || {};
}

/** La llave se genera sola la primera vez que hace falta. */
function llaveDeEsteDispositivo() {
  const cfg = configSync();
  if (llaveValida(cfg.llave)) return cfg.llave;

  const llave = generarLlave();
  state.cfg.sync = { ...cfg, llave };
  save();
  return llave;
}

function renderSync() {
  const cfg = configSync();
  const llave = llaveDeEsteDispositivo();
  const configurado = !!(cfg.url && cfg.anonKey);

  $('syncUrl').value = cfg.url || '';
  $('syncKey').value = cfg.anonKey || '';
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
    state.cfg.sync = { ...configSync(), url: '', anonKey: '' };
    save(); renderSync();
    toast('Sincronización desactivada');
    return;
  }

  if (!/^https:\/\/.+\.supabase\.co$/.test(url)) {
    toast('La URL tiene que ser la del proyecto: https://xxxxx.supabase.co');
    return;
  }
  if (anonKey.length < 20) { toast('Esa anon key parece incompleta'); return; }

  state.cfg.sync = { ...configSync(), url, anonKey, ultimoError: '' };
  save(); renderSync();
  toast('Guardado. Probá con "Sincronizar ahora"');
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
  state.cfg.sync = { ...configSync(), llave: pegada, ultimoSync: 0, ultimoError: '' };
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
