# TODO — 30 mejoras a Déficit (ciclo 2)

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

## Menos fricción en el uso diario

- [x] 1. Favoritos: marcar alimentos y cargarlos desde Hoy en un toque
      · verif: test del toggle y del orden; en la app, un favorito carga la comida entera
- [x] 2. Recetas: guardar un conjunto de alimentos como plantilla con nombre
      · verif: test de crear/aplicar receta; aplicar una deja los mismos items y kcal
- [x] 3. Copiar un día entero a otro
      · verif: copiar ayer a hoy deja las mismas comidas y no toca el original
- [x] 4. Suma rápida: cargar kcal sueltas sin nombre ni desglose
      · verif: sumar 150 kcal por DOM y ver el anillo moverse
- [x] 5. Mover una comida a otro momento o a otro día
      · verif: mover del almuerzo a la cena y de hoy a ayer, con los totales siguiendo
- [x] 6. Nota del día, con indicador cuando hay algo escrito
      · verif: escribir, recargar y comprobar que persiste
- [x] 7. Buscador en el historial por alimento o comida
      · verif: test de la función de búsqueda; buscar "pizza" lista los días que la tienen
- [x] 8. Ver la foto original en grande al tocar la miniatura
      · verif: comprobar que abre el visor y que se cierra

## Gastar menos API

- [x] 9. Cache de análisis por huella de la imagen: la misma foto no se paga dos veces
      · verif: test que analiza dos veces y comprueba una sola llamada
- [x] 10. Respuesta en streaming, con el texto apareciendo mientras llega
      · verif: test con un stream SSE mockeado que reconstruye el JSON final
- [x] 11. Varias fotos en un mismo análisis (plato + bebida + postre)
      · verif: test que arma el body con 3 imágenes en un solo mensaje
- [x] 12. Selector de precisión por análisis (rápido / preciso) que cambia effort y modelo
      · verif: test que comprueba el body de cada modo
- [x] 13. Sugerencia de qué comer con las calorías que quedan del día
      · verif: test del prompt con el margen y los macros restantes
- [x] 14. Registro de análisis: qué se pidió, qué costó y con qué modelo
      · verif: test del registro acotado a N entradas; visible en Ajustes

## Que los datos digan algo

- [x] 15. Proyección de peso a 4 semanas según la tendencia real
      · verif: test con serie conocida; el número coincide con el cálculo a mano
- [x] 16. Adherencia: porcentaje de días dentro del objetivo
      · verif: test con 10 días, 7 dentro → 70%
- [x] 17. Dónde se te va el déficit: reparto de calorías por momento del día
      · verif: test del reparto con comidas conocidas
- [x] 18. Patrón por día de la semana (los findes se comen distinto)
      · verif: test que promedia por día de semana con una serie armada
- [x] 19. Comparar esta semana contra la anterior
      · verif: test con dos semanas distintas y el delta correcto
- [x] 20. Aviso de proteína corta, que es lo que más se descuida en déficit
      · verif: test del umbral (menos del 80% del objetivo, 3 días seguidos)
- [x] 21. Informe imprimible del mes, en una página
      · verif: generar el HTML y comprobar secciones y totales

## Plataforma

- [x] 22. Tema claro: respeta el sistema y se puede forzar desde Ajustes
      · verif: cambiar el tema y medir contraste de los textos principales
- [x] 23. Recordatorios para cargar las comidas, con permiso pedido a demanda
      · verif: comprobar el agendado y que no pide permiso solo al abrir
- [x] 24. Cambio de día a medianoche con la app abierta
      · verif: simular el cruce de medianoche y comprobar que la vista pasa al día nuevo
- [x] 25. Atajos de teclado en la compu (nueva comida, tabs, cerrar modal)
      · verif: disparar los eventos de teclado y comprobar el efecto
- [x] 26. Confirmar antes de descartar un análisis sin guardar
      · verif: cerrar con datos cargados pide confirmación; sin datos, no
- [x] 27. Que no se ponga lenta con años de datos
      · verif: cargar 400 días y medir que el render de Historial baje de 150 ms

## Robustez

- [x] 28. Revisar datos incoherentes (kcal que no cierran con los macros) y ofrecer arreglo
      · verif: test de detección con casos límite; la app lista los problemas
- [x] 29. Importar fusionando en vez de reemplazar, sin duplicar comidas
      · verif: test de merge con solapamiento parcial
- [x] 30. Pantalla de diagnóstico: versión, service worker, cuota y últimos errores
      · verif: provocar un error y comprobar que queda registrado y visible
- [x] 31. El service worker limpia los caches viejos al instalar, no solo al activar — detectado en el camino: quedaron 34 caches acumulados porque cada version nueva espera confirmacion
      · verif: con varios caches viejos sembrados, instalar deja solo el actual
