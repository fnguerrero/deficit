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
