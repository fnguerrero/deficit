# TODO — ciclo 4: que la app se sienta terminada

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

## Lo que quedó desactualizado al mover la clave al proxy

- [x] 1. El onboarding no pide la clave si el proxy está configurado; ese paso pasa a
      explicar qué hace la app · verif: por DOM, con proxy los 3 pasos se completan sin
      input de clave; con proxy vacío el input vuelve a aparecer
- [x] 2. La tarjeta "sin key" de Hoy y sus textos hablan del caso real, no de una clave
      que nadie tiene que cargar · verif: por DOM en los dos casos
- [x] 3. Revisar todo mensaje de error que mande a Ajustes a cargar una clave cuando la
      clave no está ahí · verif: grep de los mensajes + test de los que dependen del proxy

- [x] 1b. (aparecido en el camino) `hidden` no funcionaba sobre ningún elemento con una
      clase que definiera display: 6 lugares, entre ellos la fila de nutrientes que se
      supone que solo aparece con datos · verif: la lista de elementos que ignoran hidden
      quedó vacía

## Que la app se actualice sin pelear

- [x] 4. Auto-actualizar cuando no hay nada en juego; el banner solo si hay un modal
      abierto o un análisis corriendo · verif: test de la decisión con las dos situaciones
- [x] 5. Buscar versión nueva al volver a la app, no solo al cargarla · verif: simular
      visibilitychange y comprobar que se pide la actualización
- [x] 6. Mostrar en Diagnóstico qué versión está corriendo · verif: por DOM, coincide con
      la del service worker

## Sincronización que no hay que acordarse de tocar

- [x] 7. Sincronizar al arrancar, si está configurada y pasó un rato · verif: test con
      cliente simulado; no corre si sincronizó recién
- [x] 8. Sincronizar después de guardar una comida, sin bloquear la interfaz · verif: test
      que guarda y comprueba que subió sin await en el camino del usuario
- [x] 9. Nunca dos sincronizaciones en paralelo · verif: test que dispara dos a la vez y
      comprueba que la segunda no llama al servidor
- [x] 10. Un fallo de red deja el estado local intacto y el error a la vista · verif: test
      con fetch que rompe a mitad; el estado queda igual que antes
- [x] 11. Reintentar con backoff los errores transitorios de Supabase · verif: test con
      500 y después 200
- [x] 12. Indicador de estado de sincronización que no mienta · verif: por DOM en los
      cuatro estados: sin configurar, al día, sincronizando, con error

## Que no se rompa cuando algo falla

- [x] 13. La app arranca y navega sin conexión · verif: con el SW activo y la red cortada,
      cargar y cambiar de pantalla sin errores
- [x] 14. Los errores del diagnóstico se pueden limpiar y el contador dice la verdad ·
      verif: por DOM, agregar 3 errores, limpiar, comprobar que queda en 0
- [x] 15. Un localStorage lleno no rompe la app: avisa y deja seguir · verif: test que
      simula el error de cuota al guardar

## Accesibilidad

- [x] 16. Todo control interactivo alcanzable por teclado y con nombre accesible · verif:
      recorrer el DOM y listar los que no lo cumplen; que la lista quede vacía
- [x] 17. Los modales atrapan el foco y cierran con Escape · verif: test de foco con el
      modal abierto
