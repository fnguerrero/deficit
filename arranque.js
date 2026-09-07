/* ============================================================
   Arranque. Va último: acá ya están cargados core, claude y todas
   las pantallas de ui/.
   ============================================================ */

aplicarTema();
// los cortes entre desayuno, almuerzo y cena salen de tus horarios reales
aprenderMomentos(state.dias);
renderAll();
programarRecordatorios();
programarCambioDeDia();
mostrarOnboarding();
sincronizarAlArrancar();

// si volvemos de Google, la sesion viene en el fragmento de la URL
volverDeGoogle();

// acceso directo "Analizar foto" del ícono de la app
if (new URLSearchParams(location.search).get('accion') === 'foto') {
  history.replaceState(null, '', location.pathname);
  setTimeout(() => $('btnFoto').click(), 200);
}

/*
 * Los botones del aviso fijo.
 *
 * Llegan de dos formas y las dos hacen falta: en la URL cuando la app estaba
 * cerrada y el service worker la abrio, y por mensaje cuando ya habia una
 * ventana —ahi no hay recarga, asi que el parametro nunca llegaria.
 */
function hacerDesdeElAviso(accion) {
  /*
   * Sobre HOY, siempre: el aviso habla del dia de hoy, y quien dejo la app
   * abierta mirando otro dia —o cruzando la medianoche— le cargaria las cosas
   * a ese. Si la vista estaba en otro, primero se vuelve.
   */
  if (fecha !== hoyISO()) {
    fecha = hoyISO();
    renderAll();
  }

  if (accion === 'foto') setTimeout(() => $('btnFoto').click(), 200);

  /* `agua` ya no es un boton del aviso, pero se sigue atendiendo: una
     notificacion vieja, todavia en la barra, puede mandarla. */
  if (accion === 'agua') {
    ponerAgua((dia().agua || 0) + 1);
    toast('Vaso anotado');
  }

  /* Y el aviso vuelve: el sistema lo cierra al tocar un boton, y sin esto se
     perdia el tablero justo despues de usarlo. */
  if (typeof refrescarAvisoFijo === 'function') refrescarAvisoFijo();
}

const pedido = new URLSearchParams(location.search).get('hacer');
if (pedido) {
  history.replaceState(null, '', location.pathname);
  setTimeout(() => hacerDesdeElAviso(pedido), 250);
}

navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.tipo === 'hacer') hacerDesdeElAviso(e.data.accion);
});

/*
 * Y el camino que no falla: la accion anotada en IndexedDB por el service
 * worker.
 *
 * Los otros dos dependen de algo que puede no pasar —que el sistema conserve el
 * parametro de la URL, que la ventana abierta tenga el listener puesto—. Esto
 * se mira al arrancar y cada vez que la app vuelve al frente, que es
 * exactamente cuando se vuelve de tocar una notificacion.
 */
async function aplicarPendiente() {
  if (typeof tomarPendiente !== 'function') return;
  const accion = await tomarPendiente();
  if (accion) hacerDesdeElAviso(accion);
}

aplicarPendiente();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  aplicarPendiente();
  /* Y el aviso fijo vuelve a estar, si no esta: es el momento en que se puede
     comprobar, porque con la app en primer plano el service worker esta
     despierto seguro. Ver actualizarObjetivosFijos(), que ahora mira si el
     cartel sigue puesto antes de saltear por firma repetida. */
  if (typeof refrescarAvisoFijo === 'function') refrescarAvisoFijo();
});
