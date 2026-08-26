# SPEC — ciclo 5: modos, simplificar y que se pueda cumplir

## Objetivo

La app tiene todo lo que hace falta y no se usa. El diagnóstico de Nico es preciso: pide
demasiado (cargar cada vaso de agua, escribir una nota, elegir entre seis botones) y muestra
demasiado (descripciones, opciones que no usa, todo apilado y con scroll).

Este ciclo cambia el eje: de "registrar con precisión" a **"que se pueda cumplir todos los
días"**. Menos entradas, más grandes, con el objetivo del día a la vista y marcándose en
verde a medida que se completa. Y encima, **modos** (keto, déficit agresivo, definición…)
que fijan el objetivo según el cuerpo de cada uno y dicen si lo que comiste entra o no.

## Alcance

**Entra, en el orden en que Nico lo pidió:**

1. **Modos** con objetivo calculado por altura, peso, edad y género.
2. **Apta / no apta** por comida según el modo.
3. **Pantalla Hoy como tablero de objetivos**: se completan y se apagan.
4. Los tres botones de carga —foto, código de barras, etiqueta— en una fila.
5. Sugerencias, repetir y carga manual pasan a un menú secundario.
6. Las comidas del día sin descripción; al tocarlas se ve todo.
7. **Menos gasto de API**: Sonnet + optimizaciones + escalado según confianza.
8. **Ejercicio por actividad** (funcional, running, fútbol…) con favoritas y duración propia.
9. **Agua por vasos táctiles**, sin más y sin menos.
10. **Recomendaciones según el modo**.
11. **Nota del día con caritas**.
12. **Peso** con el último valor precargado.
13. **Objetivos diarios** que se marcan en verde al completarse.
14. **Temas**: claro, oscuro y dos más.
15. **Sección de gráficos** con período elegible.
16. **Un veredicto honesto de si vas bien**, contra el objetivo del modo.

17. **Ayuno intermitente** con cronometro, y **sueno auto-reportado** (pedido a mitad
    del ciclo).

**No entra:**
- **Registro automatico de sueno**: movimiento nocturno y ronquidos son imposibles en una
  PWA. El navegador suspende todo con la pantalla apagada, y el microfono toda la noche
  no se puede en segundo plano. Eso necesita app nativa o un reloj. Lo que si entra es el
  auto-reporte, que ademas es lo unico que se sostiene sin comprar nada.
- **Login multiusuario** — decisión de Nico: va en el ciclo 6, sobre una app ya estable.
  Igual el modelo de datos se deja preparado para que entre sin migración dolorosa.
- Sincronizar fotos.
- Medir la estimación de platos servidos: sigue necesitando las fotos de Nico.

## Stack y decisiones

Sin cambios de stack: HTML/CSS/JS vanilla, sin build, una pantalla por archivo en `ui/`.

## Supuestos

1. **Los modos calculan con Mifflin-St Jeor**, que es la fórmula estándar para gasto basal,
   por factor de actividad. Es una calculadora, no una prescripción: la app lo dice y
   recomienda consultar a un profesional antes de un déficit agresivo o de keto.
2. **Con pisos de seguridad**: ningún modo baja de 1.500 kcal en varones ni de 1.200 en
   mujeres, por más agresivo que sea el objetivo. Si la cuenta da menos, se corta ahí y se
   avisa por qué.
3. **"Apta o no apta" se calcula localmente**, sobre los macros que el análisis ya devuelve.
   No cuesta una sola llamada extra a la API.
4. **El escalado de modelo es después, no antes.** Preguntar "¿esto es complejo?" costaría
   una llamada extra por foto. En cambio: etiquetas y códigos con Haiku (transcribir no
   necesita más), platos con Sonnet, y si vuelve con confianza baja se ofrece reanalizar con
   Opus. Se paga precisión solo cuando hace falta.
5. **El agua es táctil y aproximada**: se toca el vaso al que llegaste, no se suma de a uno.
   Nico eligió esto sobre las caritas; sin `+` ni `−`.
6. **Las actividades usan METs**, la tabla estándar de gasto energético: kcal = MET × peso ×
   horas. Es la misma base que usa cualquier reloj deportivo.
7. **Lo que se saca de la pantalla principal no se borra**: sugerencias, repetir y carga
   manual siguen existiendo en un menú. Sacarlas del camino no es lo mismo que perderlas.
8. **Los cuatro temas son claro, oscuro, negro OLED y cálido.** OLED ahorra batería real en
   el celular; cálido baja el azul para la noche.
9. **El veredicto es honesto o calla.** Con menos de 10 días de peso y 7 de registro no se
   puede hablar de tendencia: en vez de inventar una, dice cuántos días faltan. Y cuando hay
   datos, si no estás en déficit lo dice sin adornos, porque un "vas bien" falso es peor que
   no decir nada.

## Criterios de aceptación

1. La suite entera pasa, con tests nuevos por cada ítem con lógica.
2. Sin errores de consola, en escritorio y en móvil.
3. Un estado del ciclo 4 migra sin perder nada y estrena los campos nuevos.
4. Elegir un modo cambia el objetivo diario, y el número sale de la altura, el peso, la edad
   y el género de la persona — no de una constante.
5. Con modo keto, una comida con muchos carbohidratos se marca **no apta** y una baja en
   carbos se marca **apta**, con el motivo escrito.
6. Ningún modo devuelve un objetivo por debajo del piso de seguridad.
7. La pantalla Hoy entra **sin scroll en 375×812** con el día a medio cargar.
8. Los tres botones de carga están en una sola fila y funcionan. (Se mide con la
   posición real en pantalla: `offsetTop` dejó de servir cuando el botón de foto pasó a
   vivir dentro del contenedor de su flechita.)
9. Cargar el peso, el agua, el ejercicio y el ánimo marca cada objetivo en verde.
10. Una foto de plato usa Sonnet; una etiqueta usa Haiku; con confianza baja aparece la
    opción de reanalizar mejor.
11. El ejercicio se carga eligiendo una actividad y calcula las calorías por MET y peso.
12. Los cuatro temas se aplican y sobreviven a recargar.
13. La sección de gráficos muestra peso, calorías y adherencia, y el período se cambia entre
    diario, semanal y mensual.
14. Las recomendaciones cambian según el modo activo.
15. El veredicto dice "faltan datos" con pocos días, y con datos suficientes detecta los tres
    casos: en camino, más lento de lo previsto, y sin déficit.

## Presupuesto

45 iteraciones.
