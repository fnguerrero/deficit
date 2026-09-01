# TODO — Ciclo 14

## Caza

- [x] Barrido 1: fechas y husos (hoyISO, sumarDias, cambio de día, medianoche) · verif: tests que provoquen el corrimiento
- [x] Barrido 2: números (NaN, división por cero, campos vacíos, negativos, redondeo) · verif: llamadas con los valores límite
- [x] Barrido 3: estado y ciclo de vida (borrar mientras se edita, doble toque, render tras cambiar de día) · verif: por DOM en el navegador
- [x] Barrido 4: sync y persistencia (fusión, cuota de localStorage, estado corrupto) · verif: tests con respuestas simuladas
- [x] Barrido 5: modos y macros (keto, techos, reparto, comida sin macros) · verif: tests con comidas límite
- [x] Barrido 6: las cinco pestañas con estado raro (día vacío, día futuro, perfil a medias) · verif: consola limpia en los trece render

## Arreglos

- [x] Bug 1: borrar una comida no entraba en la pila de deshacer · verif: test de la pila
- [x] Bug 2: el sueño y el ánimo no sincronizaban · verif: 9 tests de fila, fusión y migración
- [x] Bug 3: el plan por etapas usa 0,5 cuando el ritmo salió de una fecha · verif: test del ritmo efectivo
- [x] Bug 4: el onboarding pisa el perfil entero y borra el modo · verif: test de fusión
- [x] Bug 5: la actividad nueva no entra en favoritas y no aparece · verif: test del alta
- [x] Bug 6: migrar() borra el ayuno del día en cada arranque · verif: round-trip por migrar
- [x] Bug 7: cortar el ayuno lo guarda en el día visible, no en hoy · verif: test con fecha distinta
- [x] Bug 8: la porción se aplica en cascada y no vuelve atrás · verif: test de ida y vuelta
- [x] Bug 9: fibra, azúcar y sodio no viajan en el sync · verif: round-trip por comidaAFila
- [x] Bug 10: una fila sin fecha crea un día con clave "undefined" · verif: test de aplicarRemoto

## Cierre

- [x] Verificación final contra los criterios de la SPEC
