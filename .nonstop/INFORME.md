# Informe — ciclo 5: modos, simplificar y que se pueda cumplir

## 36 de 36 ítems. Terminado.

El ciclo se cerró en dos tandas: la primera llegó a 26 y frenó por contexto; esta retomó los
10 que quedaban y los completó.

## Qué se construyó

### Los modos — 16 en total

Seis de objetivo calórico (mantenimiento, moderado, agresivo, definición, keto, volumen) y
diez patrones alimentarios (mediterránea, low carb, alta proteína, vegetariana, sin gluten,
paleo, DASH, flexitariana, sin lactosa, antiinflamatoria).

El objetivo **sale del cuerpo de cada uno** —Mifflin-St Jeor por factor de actividad—, la
proteína se prescribe por kilo de peso, y ningún modo baja de 1.500/1.200 kcal ni del
metabolismo basal.

**Apta o no apta**: el análisis devuelve de qué está hecho el plato (vegetales, pescado,
gluten, ultraprocesado, frito…) y con eso las reglas se resuelven **localmente, sin una sola
llamada extra a la API**. La misma pizza sale "no apto" por carbohidratos en keto, por
ultraprocesado en mediterránea y por gluten en sin gluten.

### La pantalla Hoy, como tablero

Tres botones de carga en una fila, seis objetivos que se marcan en verde y se apagan, las
comidas sin descripción, y el resto a un menú. **Entra sin scroll en 375×812** — no
persiguiendo alturas fijas, sino dejando que la lista de comidas se quede con lo que sobra.

### Fito

El día traducido a una cara: cansado si dormiste poco, seco si no tomaste agua, pesado si te
pasaste. Cada dimensión se evalúa por separado y gana la que más pesa, así que siempre puede
decir **por qué** está como está. Con niveles y racha.

Dos decisiones deliberadas: refleja **energía y ánimo, nunca forma corporal**; y el nivel sube
por **días registrados, no por días perfectos** — premiar solo la perfección hace que un mal
día se sienta como perder todo, que es cuando se abandona.

### La sección Progreso

Cuatro gráficos en SVG a mano —una librería de charts pesa más que toda la app—: peso,
calorías contra objetivo, adherencia, y uno que depende del modo. Selector de día/semana/mes
que agrupa promediando, porque mirar el peso día a día es mirar ruido.

**Los huecos cortan la línea** en vez de inventar el tramo: dibujar una recta entre dos pesos
con una semana de hueco es inventar una tendencia que nadie midió.

### Sueño, y lo que hace con la comida

Auto-reportado (horas + calidad), con aviso opcional de hora de dormir. Y **`efectoDelSueno()`**,
que compara los días de poco sueño contra los demás. La mayor parte de esa función es negarse
a responder: con menos de 4 días de cada tipo dice cuántos faltan, y cuando responde aclara
que son pocos días y que es una pista, no una ley.

### Menos gasto de API

Sonnet por defecto, Haiku en etiquetas, Opus solo si la confianza vuelve baja. Imagen de 1024
a 768 px y cache de 30 a 90 días. **El análisis pasó de US$ 0,018 a ~0,006.**

### Y además

Nueve temas, ayuno intermitente con cronómetro, agua táctil, ejercicio por MET con
actividades editables, ánimo por caritas, peso precargado, veredicto honesto de progreso y
recomendaciones por modo.

## Los bugs que aparecieron verificando

Ninguno estaba previsto, y varios solo se ven mirando el render:

1. **`hidden` no ocultaba nada** en 6 elementos: es solo `display:none` del navegador y
   cualquier clase con `display` se lo comía. El peor caso era la fila de nutrientes, que se
   suponía oculta sin datos y se veía siempre.
2. **La adherencia pintaba de rojo el 100%** y de verde el 0%, por reusar la regla de
   calorías donde pasarse es malo.
3. **El eje del peso imprimía "86, 85, 85"** al redondear a entero un rango de menos de un kilo.
4. **El anillo de calorías** estaba roto en los dos tamaños por la misma causa: su contenedor
   seguía fijo en 190 px mientras el SVG se había achicado a 104.
5. **Sin sesión la app seguía sincronizando** y se comía un 401 en cada guardado, desde que
   las políticas RLS exigen usuario.
6. **El handler de sincronizar copiaba las credenciales globales** al estado local.
7. **Dos bugs que introduje yo mismo** con el menú de cámara: no respondía a Escape ni contaba
   como modal abierto.

## Tres tests en rojo que estaban mal ellos, no el código

- El costo esperado tenía el precio de Opus escrito a mano y bajó a 0,6 al pasar a Sonnet:
  exactamente la relación entre ambos.
- El cache esperaba expirar a los 31 días, cuando el cambio a 90 fue deliberado.
- `alertaProteina` recibía la fecha por defecto (hoy real) contra un fixture del 2026-08-20:
  empezó a fallar sola cuando el calendario pasó esa fecha.

En los tres se corrigió la prueba. "Arreglar" código que funciona para hacer pasar un test
defectuoso rompe algo que andaba y encima queda en verde.

## Verificación final

| Criterio | Resultado |
|---|---|
| 1. Suite en verde | **587 tests, 0 fallos** (eran 503 al empezar) |
| 2. Sin errores de consola | 0 recursos con error |
| 4. El objetivo sale del cuerpo | dos pesos distintos dan 300+ kcal de diferencia |
| 5. Keto marca lo que no entra | 68 g de carbos → no entra, con el número |
| 6. Pisos de seguridad | perfil chico en agresivo corta en 1.200 |
| 7. Hoy sin scroll en 375×812 | entra con 6 objetivos y Fito |
| 8. Tres botones en una fila | los tres en `top: 402` |
| 9. Objetivos que se marcan | 4 en verde con el día cargado |
| 10. Modelo por tipo | plato→sonnet, etiqueta→haiku |
| 11. Ejercicio por MET | funcional = 510 kcal para 85 kg |
| 12. Temas | 9, todos con fondo distinto |
| 13. Gráficos y período | 4 gráficos, 3 períodos |
| 14. Recomendaciones por modo | cambian con el modo |
| 15. Veredicto en 4 estados | verificado por DOM |

## Desvíos de la SPEC

1. **El criterio 8 se midió mal hasta el final.** Usaba `offsetTop`, que dejó de servir cuando
   el botón de foto pasó a vivir dentro del contenedor de su flechita. Se corrigió el criterio
   —ahora usa la posición real en pantalla—, no el código.
2. **`ui/ajustes.js` se partió dos veces**: salieron `ui/actividades.js` y `ui/recordatorios.js`.
   No estaba planeado, pero el control de tamaños existe justamente para que el corte se
   decida cuando corresponde.
3. **El login multiusuario entró**, cuando estaba explícitamente fuera del alcance. Nico lo
   pidió a mitad del ciclo al ver que sus comidas quedaban atadas a un dispositivo.
4. **Fito, los patrones alimentarios y el guardado directo de fotos** tampoco estaban: se
   sumaron sobre la marcha.

## Números

- **36 ítems** completados, 0 bloqueados. El TODO creció de 31 a 36 en el camino.
- **587 tests**, 0 fallos. Se sumaron 84 en el ciclo.
- El análisis por foto cuesta **un tercio** de lo que costaba.

## Lo que sigue pendiente, y es de Nico

- **Crear la cuenta** en Ajustes → Tu cuenta. El SQL ya está corrido; en el primer login se
  adoptan las comidas que ya subió.
- **Usar la app.** La estimación de un plato servido sigue sin medirse contra la realidad, y
  es lo único que ninguna cantidad de trabajo mío puede reemplazar.
