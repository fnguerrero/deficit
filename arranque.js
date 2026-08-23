/* ============================================================
   Arranque. Va último: acá ya están cargados core, claude y todas
   las pantallas de ui/.
   ============================================================ */

aplicarTema();
renderAll();
programarRecordatorios();
programarCambioDeDia();
mostrarOnboarding();
sincronizarAlArrancar();

// acceso directo "Analizar foto" del ícono de la app
if (new URLSearchParams(location.search).get('accion') === 'foto') {
  history.replaceState(null, '', location.pathname);
  setTimeout(() => $('btnFoto').click(), 200);
}
