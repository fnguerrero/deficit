# SPEC — ciclo 13: diez mejoras sobre la pantalla que se usa

## Objetivo

Nico pasó un prompt largo pidiendo rediseñar la home. El análisis de ese prompt es
el que elige estas diez: se toma lo que responde una pregunta que la pantalla hoy
no contesta, se descarta lo que duplica algo que ya existe, y se deja para otra
sesión lo que es un refactor entero.

La restricción que manda: la home **acaba de adelgazar** en el ciclo 12. Todo lo
que entre tiene que caber sin devolverle los diez bloques que se le sacaron.

## Alcance

**Entra:**
- Los macros dicen cuánto falta o cuánto sobra, no solo el número.
- Los hábitos dicen cuántos van y cuál falta.
- El peso y su tendencia, arriba, que es el objetivo real de la app.
- El coaching dice QUÉ está flojo en vez de "Vas tirando".
- El anillo separa el objetivo del día de lo que sumó el ejercicio.
- Aclararle al análisis qué era el plato, desde el resumen.
- Los macros de cada comida en su tarjeta.
- Un aviso cuando hace días que casi nada entra en el modo elegido.
- El primer día: que la pantalla diga qué hacer en vez de mostrar huecos.

**No entra:**
- El "Daily Score" de 0 a 100: sería la sexta métrica de gamificación compitiendo
  con las cinco que ya hay (XP, nivel, fases, rachas, días perfectos).
- Una sección de coaching aparte: ya es la tarjeta del muñeco.
- Una sección de "qué comer ahora" aparte: ya existe y usa API, por eso está a un
  toque y no fija en pantalla.
- Separar "objetivo" de "estrategia" en el modo: tiene razón conceptual pero toca
  el cálculo del objetivo, el veredicto de cada comida, los gráficos y la
  migración. Es un trabajo entero, no un ítem.

## Stack y decisiones

Lo de siempre: HTML/CSS/JS planos, cero dependencias, tests propios, verificación
por DOM con Chrome headless y con emulación móvil real cuando importa el ancho.

## Supuestos

- **Lo que se agrega a la home tiene que reemplazar o compactar algo**, no sumarse.
  El peso entra arriba porque el bloque del muñeco puede ceder espacio.
- **Los macros interpretados van como una línea corta bajo cada barra**, no como
  una tarjeta nueva.
- **El aviso de modo aparece una vez cada tantos días**, no en cada comida: un
  cartel que está siempre encendido deja de leerse.

## Criterios de aceptación

1. Cada macro dice cuánto falta o cuánto se pasó, y se ve el estado sin leer.
2. Los hábitos muestran cuántos van sobre el total y cuál falta.
3. La home muestra peso, objetivo y tendencia sin entrar a Historial.
4. Con una sola dimensión floja, el título la nombra.
5. El anillo distingue el objetivo base de lo que sumó el ejercicio.
6. Se puede corregir qué era el plato desde el resumen, sin sacar otra foto.
7. Cada comida muestra sus macros en la tarjeta de detalle.
8. Con varios días fuera del modo, la app lo dice una vez.
9. Con la app vacía, la pantalla dice qué hacer.
10. Toda la suite en verde, guardas y tamaños OK, consola limpia, sin desborde a 375 px.

## Presupuesto

40 iteraciones. La bitácora sigue en #94.
