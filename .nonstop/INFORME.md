# Informe — ciclo 13: diez mejoras sobre la pantalla que se usa

01/09/2026 · 10 iteraciones (#94 a #103) sobre un presupuesto de 40 · ninguna bloqueada.

## De dónde salieron

Nico pasó un prompt largo pidiendo rediseñar la home. Estas diez salen de analizarlo
contra lo que la app ya tiene: se tomó lo que responde una pregunta que la pantalla no
contestaba, se descartó lo que duplicaba algo existente, y se dejó afuera lo que era un
refactor entero disfrazado de ítem.

La restricción que mandó todo el ciclo: **la home acababa de adelgazar**, y el prompt
pedía agregarle seis secciones. Nada de lo que entró le devolvió los bloques que se le
habían sacado.

## Las diez

1. **Los macros dicen qué significan.** "64 / 180 g" obliga a hacer la resta y a acordarse
   de si en ese macro conviene llegar o no pasarse. La distinción que importa es el tipo
   de objetivo: la proteína es una meta y quedarse corto es el problema; el carbohidrato
   en keto es un techo y pasarse es el problema. El mismo número dice cosas opuestas.
2. **Marcador de hábitos.** Cinco casilleros sueltos son cinco botones; "4 de 5 · te falta
   agua" es un progreso que pide el quinto. Con tres pendientes no se listan: sería una
   lista de tareas y no un empujón.
3. **El peso y su tendencia, arriba.** Es el objetivo real de la app y vivía en Historial.
   Se muestra la tendencia y no el peso del día: entre dos días hay hasta un kilo por sal
   y agua, y ese número arriba invita a mirarlo cada mañana y sacar conclusiones del ruido.
4. **El coaching nombra qué está flojo.** "Vas tirando" describe el día y no sirve para
   hacer nada. Los títulos de flojo son distintos de los de mal a propósito: "Dormiste
   poco" es un hecho cerrado, "Te faltó dormir" es lo mismo sobre algo que todavía se
   puede arreglar.
5. **El anillo separa el objetivo del ejercicio.** "/ 2.612" con 420 quemados adentro hace
   pensar que la app cuenta lo quemado como comida. "2.192 + 300" muestra de dónde sale
   cada parte.
6. **Aclararle al análisis qué era el plato.** El campo existía pero vivía en la pantalla
   de revisión, que ya casi no aparece: lo habíamos dejado fuera de alcance sin querer.
7. **Los macros de cada comida.** Con 218 g de carbohidratos en la barra del día, lo que
   falta saber es cuál de las cuatro comidas los trajo.
8. **Aviso cuando el modo no cuadra hace días.** El aviso por comida hace su trabajo, pero
   repetido cinco días es un cartel siempre encendido, y eso deja de leerse.
9. **Los primeros pasos.** Después del onboarding queda una pantalla llena de guiones que
   no está rota pero tampoco dice qué hacer. Desaparece sola cuando ya no falta nada.
10. **Nada de esto rompió lo que andaba.**

## Verificación

| Qué | Resultado |
|---|---|
| Tests propios | **911 en verde** (37 nuevos) |
| `guardas.py` | OK — 48 scripts, 666 globales, 397 ids |
| `tamanos.py` | Todo dentro de límite |
| Consola | Limpia: 0 errores en los trece render y las cinco pestañas |
| Ancho a 375 px | `scrollWidth` = viewport, cero elementos fuera |

Los diez criterios de aceptación pasan.

## Lo que se dejó afuera, y por qué

- **El "Daily Score" de 0 a 100.** Sería la sexta métrica de gamificación compitiendo con
  las cinco que ya hay —XP, nivel, fases, rachas, días perfectos— y "premiar adherencia
  y no comer menos" es exactamente lo que ya hace el sistema de días perfectos.
- **Una sección de coaching aparte.** Ya es la tarjeta del muñeco. Agregar otra sería
  tener dos coaches diciendo lo mismo.
- **Una sección de "qué comer ahora".** Ya existe y consume API: por eso está a un toque
  y no fija en pantalla.
- **Separar "objetivo" de "estrategia" en el modo.** Tiene razón conceptual —"moderado" es
  un objetivo y "keto" una estrategia, y hoy son el mismo campo— pero toca el cálculo del
  objetivo, el veredicto de cada comida, los gráficos y la migración. Es un trabajo
  entero, no un ítem de una lista.

## Tres bugs que aparecieron en el camino

**`reanalizarConCorreccion` perdía el `editandoId`.** Pisaba el objeto entero, así que
corregir una comida ya guardada la guardaba como nueva y dejaba la vieja al lado,
duplicada. Solo se veía usando la corrección sobre algo guardado, que es justo lo que el
ítem 6 vino a habilitar.

**La suite bajó de 891 a 591 de golpe**, por redeclarar `HOY_P`. Es la segunda vez en el
proyecto: que el total baje en bloque no es una regresión, es un archivo entero que no
parsea.

**Los tests de `pasosQueFaltan` fallaban** porque la función había quedado en la capa de
UI, que la suite no carga. Era lógica pura y se mudó.

## Desvíos de la SPEC

- **`core.js` se pasó del límite** al sumarle `leerMacro` y `resumenHabitos`. Las dos se
  mudaron a `chequeos.js`, que es donde ya vivían las demás interpretaciones de datos, y
  ese archivo estrena límite propio.
- Nada más se desvió.

## Bloqueados

Ninguno.
