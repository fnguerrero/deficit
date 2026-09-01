# Ciclo 15 — El muñeco como tamagotchi

## Objetivo

Que los cinco objetivos del día se vean en el cuerpo del muñeco, para bien y
para mal. Hoy el dibujo solo reacciona al peso y todo lo demás vive en un emoji
al costado: se pide que el agua, el ejercicio, el sueño y el ánimo también
cambien lo que se ve.

## Alcance

**Entra:** el dibujo del muñeco en la pantalla Hoy y las funciones que traducen
el día a parámetros de dibujo.

**No entra:** animaciones nuevas, el juego de niveles y XP, el personaje de las
transformaciones (aura, ki, fases), y cambiar qué se le pide a la persona.

## Stack y decisiones

Se usa el personaje SVG paramétrico que ya existe —`personaje.js`, `figura.js`,
`cara.js`— en vez del sprite de imágenes. El SVG ya acepta contextura y
musculatura como números de 0 a 1: es el único de los dos que puede reaccionar a
algo que no sea el peso, y son novecientas líneas ya escritas y probadas.

## Supuestos

- **El estado del cuerpo es una función pura del día.** Se escribe aparte de la
  UI, se testea sola, y el dibujo la consume. Sin eso no hay forma de verificar
  esto sin mirar con los ojos.
- **Rangos**: 40 kg en 1,78 m son IMC 13 y 200 kg son IMC 63. El dibujo ya
  recorre de IMC 17 a 90, así que los dos extremos entran sin tocar la escala.
- **Nada de castigo.** El muñeco refleja lo que hay, no reprocha: sin agua se ve
  seco, sin dormir se ve cansado, sin ejercicio se ve blando. Eso es información
  sobre el día, no un reto.
- **Lo que no se cargó no se dibuja mal.** Un día en blanco es un muñeco neutro,
  no uno deshidratado: no cargar agua no es lo mismo que no tomar agua.

## Criterios de aceptación

1. El peso mueve el cuerpo de flaco a gordo en todo el rango de 40 a 200 kg, y
   dos pesos distintos dan dibujos distintos.
2. Sin agua el muñeco se ve deshidratado; con el objetivo cumplido, no.
3. Sin ejercicio no se le marcan los músculos; con racha, sí.
4. El ánimo cambia la cara.
5. El sueño se ve en la cara, distinto del ánimo.
6. Los cinco son independientes: cambiar uno no pisa a los otros.
7. Un día sin cargar nada da un muñeco neutro.
8. Tests propios de la función que traduce el día a cuerpo.
9. La suite entera en verde y las herramientas de control OK.
10. Hoy sigue entrando sin scroll en 375×812.

## Presupuesto

40 iteraciones.
