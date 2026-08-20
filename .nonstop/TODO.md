# TODO — 33 mejoras a Déficit

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

## Andamiaje (primero, sin esto no hay verificación real)

- [x] 0. Suite de tests headless: `tests.js` + `tests.html`, runner propio, y refactor
      mínimo de `app.js` para exponer las funciones puras en `window.__deficit`
      · verif: abrir tests.html y leer `window.__resultados` con 0 fallos

## Datos y modelo

- [x] 1. Migración de estado versionada (`schema`), con defaults para campos nuevos
      · verif: test que carga un state viejo y comprueba los campos nuevos
- [x] 2. Alimentos frecuentes: se guardan los usados, con contador de uso
      · verif: test que agrega 2 comidas y comprueba el ranking de frecuentes
- [x] 3. Momento de la comida (desayuno/almuerzo/merienda/cena/snack) autodetectado por hora
      · verif: test de la función hora→momento en los 5 rangos
- [x] 4. Agua del día: contador de vasos con objetivo
      · verif: sumar/restar vasos en el DOM y comprobar persistencia
- [x] 5. Ejercicio del día: kcal quemadas que amplían el objetivo
      · verif: test de objetivo efectivo = objetivo + quemadas

## Carga de comidas

- [x] 6. Editar una comida ya guardada (hoy solo se puede borrar)
      · verif: editar por DOM y comprobar que cambian los totales del día
- [x] 7. Deshacer el borrado de una comida desde el toast
      · verif: borrar, deshacer y comprobar que vuelve idéntica
- [x] 8. Repetir una comida de otro día con un toque
      · verif: repetir y comprobar que aparece en hoy con la misma kcal
- [x] 9. Multiplicador de porción (×0.5 / ×1 / ×1.5 / ×2) que reescala kcal y macros
      · verif: test que escala un ítem y comprueba los 4 valores
- [x] 10. Buscador de alimentos frecuentes en la carga manual, con autocompletado
      · verif: escribir 3 letras por DOM y comprobar las sugerencias

## Análisis con Claude

- [x] 11. Reintento automático con backoff ante 429 y 5xx
      · verif: test con fetch mockeado que falla 2 veces y a la 3ra anda
- [x] 12. Cancelar el análisis en curso (AbortController) desde el modal
      · verif: iniciar, cancelar y comprobar que el modal cierra sin error
- [x] 13. Contexto del usuario en el prompt (objetivo, momento del día, frecuentes)
      · verif: test que arma el body y busca esos datos en el prompt
- [x] 14. Corregir la estimación por texto y re-analizar sin sacar otra foto
      · verif: test que arma el body de corrección con la respuesta previa
- [x] 15. Modo etiqueta: leer la tabla nutricional de un envase
      · verif: test del prompt de etiqueta + campo porciones por envase
- [x] 16. Registrar tokens y costo estimado de cada análisis
      · verif: test del cálculo de costo por modelo con usage conocido

## Historial y análisis de datos

- [x] 17. Gráfico de barras de calorías de los últimos 14 días con línea de objetivo
      · verif: comprobar que se dibujan 14 barras y la línea
- [x] 18. Media móvil de 7 días sobre la curva de peso
      · verif: test de la función de media móvil con serie conocida
- [x] 19. Racha de días registrados seguidos
      · verif: test de racha con huecos y sin huecos
- [x] 20. Progreso hacia el peso objetivo en porcentaje
      · verif: test con peso inicial, actual y meta
- [x] 21. Balance semanal acumulado (déficit real de la semana en kcal y en kg)
      · verif: test con 7 días cargados
- [x] 22. TDEE adaptativo: estimar el gasto real según peso perdido vs consumido
      · verif: test con serie de 14 días donde el peso baja menos de lo previsto
- [x] 23. Editar días pasados desde el historial (peso y comidas)
      · verif: navegar a un día pasado y comprobar que se puede cargar

## Robustez y UX

- [x] 24. Sin API key la app avisa una sola vez y el resto sigue funcionando
      · verif: borrar key y comprobar que no hay errores de consola
- [x] 25. Validación del perfil con mensajes claros por campo
      · verif: test de la función de validación con 6 casos inválidos
- [x] 26. Números formateados en es-AR (miles y decimales)
      · verif: test de formateo con 5 valores
- [x] 27. Onboarding de 3 pasos la primera vez que se abre
      · verif: con state vacío comprobar que aparece, y que no vuelve tras cerrarlo
- [x] 28. Aviso de versión nueva del service worker con botón de actualizar
      · verif: comprobar el listener de updatefound y el botón en el DOM
- [x] 29. Accesibilidad: aria-labels, foco visible, contraste de los botones de ícono
      · verif: comprobar aria-label en todos los botones sin texto
- [x] 30. Aviso de cuota de localStorage cerca del límite
      · verif: test de la función de uso con un state grande simulado

## Cierre

- [x] 31. Exportar a CSV además de JSON
      · verif: generar el CSV y comprobar cabecera y cantidad de filas
- [x] 32. Backup automático del state en cada cambio (última copia buena)
      · verif: corromper el state principal y comprobar que restaura del backup
- [x] 34. Versionado de assets (?v=N) en HTML y shell del SW — detectado en el camino: el navegador servia CSS/JS viejo de su propio cache HTTP aunque el SW fuera network-first
      · verif: tras versionar, las reglas nuevas de CSS aparecen en document.styleSheets
- [x] 33. Subir VERSION del service worker y actualizar README con lo nuevo
      · verif: comprobar que el cache viejo se borra al activar la versión nueva
