# Informe — ciclo 5: modos, simplificar y que se pueda cumplir

## Estado: 26 de 36 ítems. Frenado por contexto, no por bloqueo.

El ciclo quedó **más grande que el presupuesto de contexto de una sesión**. Todo lo hecho
está verificado, en verde y publicado; lo que falta está intacto en el TODO y se puede
retomar sin recomponer nada.

## Qué se construyó

### Modos — el corazón del ciclo

Seis modos: mantenimiento, déficit moderado, déficit agresivo, definición, keto y volumen
limpio. El objetivo **sale del cuerpo de cada uno** (Mifflin-St Jeor por factor de
actividad), no de una constante: dos personas distintas nunca reciben el mismo número. La
proteína se prescribe por kilo de peso, que es como se hace de verdad, y keto fija 30 g de
carbohidratos y llena el resto con grasa.

**Pisos de seguridad**: ningún modo baja de 1.500 kcal en varones ni de 1.200 en mujeres, ni
por debajo del metabolismo basal. Cuando la cuenta da menos, corta ahí y explica que bajar
más rápido haría perder músculo en vez de grasa.

**Apta o no apta**: cada comida se juzga contra el modo, con lo que el análisis ya devolvió.
No cuesta ni una llamada extra. En keto los carbohidratos son un tope duro que cuenta lo ya
consumido en el día; en el resto, una comida que se lleva más del 60% del objetivo no entra.

### El veredicto honesto

Lo último que pidió Nico y lo más delicado. Con menos de 10 días de peso y 7 de registro
**dice cuántos faltan en vez de inventar una tendencia** — el peso se mueve un kilo por agua
y sal, y afirmar algo con cuatro días sería una moneda al aire disfrazada de dato. Con datos
suficientes detecta cuatro situaciones, incluida la incómoda: si el peso no se mueve dice
*"No estás bajando"* y da la explicación más probable, que es que las porciones a ojo se
subestiman siempre para el mismo lado.

### Hoy, como tablero

- Los tres botones de carga —foto, código, etiqueta— en una fila.
- **Cinco objetivos que se marcan en verde y se apagan**: peso, agua, ejercicio, ayuno y ánimo.
- Sugerencias, repetir, carga manual y kcal sueltas se fueron a *Más opciones*.
- Las comidas sin descripción en la lista; los alimentos se ven al tocar.
- **Entra sin scroll en 375×812.** No persiguiendo alturas fijas —eso siempre queda corto—
  sino dejando que la lista de comidas se quede con lo que sobra. Verificado con 2, 5 y 10
  comidas: la página nunca se mueve.

### Menos fricción para cargar

- **Agua**: se toca el vaso al que llegaste. Sin `+` ni `−`, que era un toque por vaso.
- **Ejercicio por actividad**: elegís "funcional" y la app calcula 510 kcal con tu peso
  (MET × peso × horas). Cargar "45 minutos de fútbol" es algo que alguien sabe; "480 kcal" no.
- **Ánimo por caritas**, con nota opcional.
- **Peso precargado** con el último conocido.
- **Ayuno**: botón, cronómetro y cuatro ventanas.

### Menos gasto de API

Sonnet por defecto (un tercio de Opus) y **Haiku para etiquetas**, que es transcribir y no
estimar. El análisis pasa de **US$ 0,018 a ~0,006**. Se ofrece Opus solo cuando el modelo
devuelve confianza baja: se paga precisión únicamente cuando hace falta.

### Y además

Cinco temas (automático, claro, oscuro, negro OLED y cálido) y recomendaciones por modo.

## Los bugs que aparecieron verificando

1. **Tres tests tenían el precio de Opus escrito a mano** y fallaron al cambiar el modelo. El
   costo bajó exactamente a 0,6 del anterior — la relación Sonnet/Opus. Se corrigieron los
   tests, no el código.
2. **La tarjeta de macros quedó fuera de su contenedor** al mover las stats, y por eso no se
   acomodaba al lado del anillo.
3. **Marqué un ítem como hecho sin estarlo** (el selector de modo en Perfil). Lo devolví a
   pendiente y lo implementé. Queda anotado porque es el error más fácil de repetir.

## Verificación

| Criterio | Resultado |
|---|---|
| 1. Suite en verde | **518 tests, 0 fallos** (eran 503 al empezar) |
| 2. Sin errores de consola | 0 recursos con error, escritorio y móvil |
| 4. El objetivo sale del cuerpo | dos pesos distintos dan objetivos con 300+ kcal de diferencia |
| 5. Keto marca lo que no entra | 45 g de carbos → no entra, con el número en el motivo |
| 6. Pisos de seguridad | perfil chico en agresivo corta en 1.200 y explica por qué |
| 7. Hoy sin scroll en 375×812 | diferencia 0 px con 5 objetivos y 3 comidas |
| 8. Tres botones en una fila | mismo `offsetTop` los tres |
| 9. Objetivos que se marcan | peso, ejercicio, ayuno y ánimo pasan a verde |
| 10. Modelo por tipo | plato pide `sonnet`, etiqueta pide `haiku` en el body real |
| 11. Ejercicio por MET | funcional = 510 kcal para 85 kg |
| 12. Cinco temas | los cuatro fondos distintos, sobreviven a recargar |
| 14. Recomendaciones por modo | keto habla de carbohidratos, volumen de entrenar |
| 15. Veredicto en cuatro estados | verificado por DOM los tres con datos y el "faltan datos" |

## Lo que quedó pendiente

Nada bloqueado: solo no llegó el contexto.

- **Gráficos con selector de período** (ítems 28-30) — el más grande de los que faltan.
- **Sueño auto-reportado y recordatorio de dormir** (34-36).
- **Aviso antes de guardar** una comida que rompe el modo (8) — hoy se marca en la lista,
  falta el aviso previo.
- **Optimizaciones de imagen y prompt** (16) y mostrar el ahorro en Ajustes (17).
- **Editar actividades** desde Ajustes (20) — se pueden agregar por código, falta la pantalla.

## Sobre sueño y ayuno: qué es viable y qué no

Nico preguntó a mitad del ciclo. La respuesta honesta:

- **Ayuno**: hecho. Es un cronómetro, y justamente por eso funciona.
- **Sueño auto-reportado**: viable, queda pendiente.
- **Movimiento nocturno y ronquidos**: **imposible en una PWA.** El navegador suspende todo
  con la pantalla apagada y no hay acceso al micrófono en segundo plano. Eso necesita una app
  nativa o un reloj. No es una limitación que se pueda sortear con más trabajo.

## Números

- **26 ítems** completados, 0 bloqueados, de 36 (el TODO creció de 31 a 36 en el camino).
- **518 tests**, 0 fallos. Se sumaron 55 en el ciclo.
- El análisis por foto cuesta **un tercio** de lo que costaba.
