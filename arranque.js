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
  if (accion === 'agua') {
    ponerAgua((dia().agua || 0) + 1);
    toast('Vaso anotado');
    return;
  }
  if (accion === 'foto') setTimeout(() => $('btnFoto').click(), 200);
}

const pedido = new URLSearchParams(location.search).get('hacer');
if (pedido) {
  history.replaceState(null, '', location.pathname);
  setTimeout(() => hacerDesdeElAviso(pedido), 250);
}

navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.tipo === 'hacer') hacerDesdeElAviso(e.data.accion);
});
