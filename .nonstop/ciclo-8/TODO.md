# TODO — ciclo 8: el personaje contra la referencia

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

Verificación visual: rasterizar con Edge headless (`--headless=new --screenshot`) contra
`_personaje.html?modo=cuerpo|fase|animo` y MIRAR el PNG. Es la única forma de ver los bugs
de dibujo; media docena aparecieron solo mirando el render.

## A. Relieve sobre la ropa

- [x] 1. Pectorales marcados sobre la musculosa: surco al medio y borde inferior de cada uno · verif: render fibra vs flaco, se tienen que distinguir
- [x] 2. Abdominales: línea media más los transversales, solo con músculo · verif: render de fibra y fuerte+
- [x] 3. El relieve del abdomen NO aparece con la panza grande, que lo taparía · verif: test sobre el SVG de contextura .9
- [x] 4. Trapecios: la diagonal cuello-hombro, que es lo que más rápido lee "entrena" · verif: render de macizo

## B. La panza empuja la prenda

- [x] 5. La musculosa se abomba sobre la panza en vez de seguir el torso plano · verif: render de contextura .85 y 1
- [x] 6. El ruedo de la musculosa sube al frente cuando hay panza · verif: render, el pliegue tiene que quedar por debajo
- [x] 7. La papada aparece antes y se lee a tamaño real · verif: render de máximo a 96 px

## C. El short

- [x] 8. Short hasta media pierna con dobladillo, como la referencia · verif: render + test de que el ruedo queda arriba de la rodilla
- [x] 9. La pierna nace debajo del short sin que se vea la costura · verif: render de los 7 cuerpos

## D. El aura de las fases

- [x] 10. Llamas con forma de fuego (puntas irregulares) en vez de pétalos lisos · verif: render de las 7 fases
- [x] 11. Escombros flotando desde fase 3, como en la referencia · verif: render
- [x] 12. El aura queda detrás del personaje y no le come el contorno · verif: render de fase 6

## E. Cara y proporciones

- [x] 13. Cejas, boca y oreja reubicadas para la cabeza nueva (caraRy bajó de 20.5 a 18.6) · verif: render de los 8 ánimos
- [x] 14. El personaje entra en la tarjeta de Hoy sin desbordar · verif: leer el alto real en el navegador

## G. Apareció en el camino

- [x] 17. transformacion.js se pasó del límite al crecer el aura · verif: tamanos.py en verde

## F. Cierre

- [x] 15. Los 763 tests, guardas y tamaños en verde · verif: correr los tres
- [x] 16. La app real anda: consola limpia y el personaje se ve en Hoy · verif: navegador

## H. Abierto — el personaje híbrido no convence del todo (28/08/2026)

Nico lo dio por bueno "por ahora", sin estar convencido. Lo que quedó en falta:

- [ ] Un gordo musculoso en la lámina: hoy la fase no puede tocarle el cuerpo a quien
      tiene panza, porque el único dibujo con músculo es delgado y le borraría los kilos
      · verif: sumarlo a ref/cuerpos.png, correr tools/sprites.py y sacar el freno de
      `margen` en spritePara()
- [ ] Los 8 ánimos: hoy son un emoji al lado del título porque el sprite tiene cara fija
      · verif: una lámina con las 8 caras del mismo personaje, recortadas y superpuestas
      sobre la cabeza como ya se hace con el pelo
- [ ] El personaje SVG completo (personaje.js, figura.js, cara.js) ya no lo usa la app:
      pesa en el shell offline y solo sirve al taller · verif: decidir si se saca, una vez
      que el híbrido esté confirmado
