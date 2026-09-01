# Informe — Ciclo 14: diez bugs

## Qué se hizo

Diez bugs encontrados y arreglados, cada uno reproducido antes de tocar el
código y con al menos un test que falla contra la versión vieja.

**Los que perdían datos**

1. **El sueño y el ánimo no sincronizaban.** Dos de los cinco hábitos que la app
   pide todos los días vivían solo en el dispositivo donde se cargaron: no había
   columnas en la base ni los miraba la fusión, mientras la app decía que con
   una cuenta los datos quedan a salvo.
2. **`migrar()` borraba el ayuno del día.** Corre en cada arranque, así que
   cortar un ayuno y volver a abrir la app lo perdía.
3. **Fibra, azúcar y sodio no viajaban.** Son los tres números que se muestran
   abajo del anillo; al abrir la app en otro dispositivo la fila salía vacía.
4. **Borrar una comida no entraba en la pila de deshacer.** El toast trae su
   propio "Deshacer" pero dura segundos: pasado eso, el botón Deshacer de la
   pantalla no traía de vuelta la acción destructiva más común de la app.
5. **Una fila sin fecha creaba `dias["undefined"]`**, que después aparecía en el
   historial sin forma de borrarlo.

**Los que mentían o no hacían nada**

6. **La porción se encadenaba.** Media de media daba un cuarto, tocar "1"
   después de "½" no devolvía al valor original, el botón marcado era siempre
   "1", y el título apilaba prefijos hasta quedar "½ 2 ½ Milanesa".
7. **El onboarding borraba el modo** al guardar, igual que Perfil antes de
   arreglarlo hoy.
8. **Una actividad creada desde el modal de Ejercicio no aparecía**: se guardaba
   en la lista general, pero en Hoy solo salen las tres favoritas.
9. **Cortar el ayuno lo guardaba en el día que se estuviera mirando**, no en hoy.
10. **El plan por etapas calculaba con 0,5 kg/semana** cuando el ritmo salía de
    una fecha, porque el value del select es la palabra "fecha".

## Cómo verificar

Abrir `tests.html`: **954 tests, todo en verde**. Las herramientas de control:
`guardas.py` (50 scripts, 688 globales, 399 ids), `tamanos.py` (todo dentro de
límite), `version.py` al día.

## Decisiones tomadas por criterio propio

- **El cliente aguanta una base sin migrar.** Las siete columnas nuevas se
  mandan igual, y si el 400 se queja justo de ellas se reintenta sin ellas. Un
  solo campo desconocido hace fallar el POST entero, así que sin esto el sync
  quedaría roto para todo hasta correr el SQL.
- **La porción se guarda como factor, no como valores base.** La base se
  reconstruye dividiendo, que es una línea contra duplicar cada macro.
- **La actividad nueva entra sola a favoritas solo si hay lugar.** Con los tres
  ocupados no se saca ninguna sin permiso: se avisa dónde elegirla.

## Desvíos de la SPEC

- **Se hicieron dos cosas que no estaban en el alcance**, las dos pedidas
  durante el ciclo: el anillo legible con números grandes (con el rojo más rojo
  y las grasas en amarillo) y compartir la sugerencia de comida por WhatsApp,
  que estrena `compartir.js` con 7 tests.
- **El criterio 7 se cumple parcialmente.** Hoy entra sin scroll con el día
  completo en 412×915, 375×812 y 375×740 (1 px), y quedan 23 px de resto en
  360×640. Con avisos excepcionales activos —poca proteína varios días— crece y
  scrollea, que es correcto: son bloques que aparecen porque hay algo que decir.

## Pendiente de Nico

**Correr `supabase-sueno-animo.sql`** en el SQL Editor. Sin eso, el sueño, el
ánimo, los nutrientes y la porción siguen sin sincronizar (la app no se rompe:
reintenta sin esos campos).

## Números

10 bugs en 12 iteraciones (#105 a #116), sobre un presupuesto de 40.
De 932 a 954 tests.
