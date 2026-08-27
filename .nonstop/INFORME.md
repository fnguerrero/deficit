# Informe — ciclo 8: el personaje contra la referencia

27/08/2026 · 9 iteraciones (#14 a #22) sobre un presupuesto de 40 · 17 ítems, ninguno bloqueado.

## Qué se construyó

El muñeco pasó de ser un monigote de bloques a parecerse a la referencia que pasó Nico.
Se mira con `_personaje.html?modo=cuerpo|fase|animo|peso` y con `_zoom.html?parte=...`,
que amplía una parte para ver los bugs de dibujo que a 96 px no se ven.

**Identidad**

- **Anteojos redondos**, con marco, puente, varillas y brillo. Es EL rasgo: el muñeco es
  Nico, y sin ellos el parecido dependía de detalles invisibles a este tamaño.

**El cuerpo**

- Brazos y piernas dejaron de ser trazos de ancho constante y pasaron a ser **siluetas**.
  El brazo nace ancho en el deltoide, abulta en el bíceps, se estrangula en el codo y se
  afina en la muñeca; la pierna abre en el muslo, afina en la rodilla, vuelve a abrir en
  la pantorrilla. Un tubo no distingue entrenar de engordar: solo se hace más gordo.
- **Proporciones**: cadera y cintura subieron, la rodilla bajó y la cabeza se achicó
  (`caraRy` de 20.5 a 18.6). Con la cadera a 110 el muñeco era un bloque sobre dos patas.
- **La panza es un punto propio del contorno** (`anchoEn`), no una elipse pintada encima.
  Antes la silueta iba derecho de la cintura a la cadera: perfil de barril, y la barriga
  era una mancha clara sobre una prenda que no se enteraba.
- **Manos**: puños chicos al final del antebrazo. Con el radio del brazo entero parecían
  guantes de box.

**La ropa**

- La **musculosa es UNA pieza** con el escote y las sisas recortados en su propio contorno.
  Antes era el torso pintado de verde con parches de piel encima; cada parche traía su
  borde recto y todos juntos armaban una barra negra de hombro a hombro.
- **Short hasta media pierna** con dobladillo. A `Y.cadera + 17` el muñeco quedaba en
  calzoncillos.
- **Zapatillas** con puntera, empeine y suela.

**El relieve**

- **Pectorales** (un arco por lado desde el esternón), **abdominales** (línea media más dos
  pares de transversales) y **trapecios** sobre la musculosa, solo con músculo.
- Con panza **no hay abdominales**: un abdominal marcado debajo de una panza es mentira, y
  el dibujo no puede decir dos cosas sobre el mismo cuerpo. Hay un test que lo fija.
- **Papada** desde contextura 0.6 y con trazo más grueso: a 0.72 y 1.5 px no se veía.

**Las fases**

- Las lenguas de fuego tienen el borde en **zigzag** en vez de curvas suaves. Eran pétalos,
  no fuego.
- Y son **altas**: llegan al hombro. A la mitad de esta altura el personaje parecía parado
  en un charco de llamas en vez de envuelto.
- **Escombros** flotando de fase 3 para arriba. Sin ellos el aura es algo que le pasa al
  personaje; con ellos, algo que le pasa al lugar donde está parado.

## Verificación

| Qué | Resultado |
|---|---|
| Tests propios | **764 en verde** (dos nuevos: el músculo del brazo, y que la panza tape los abdominales) |
| `tools/guardas.py` | OK — 40 scripts, 552 globales, 352 ids |
| `tools/tamanos.py` | Todo dentro de límite |
| Consola del navegador | Limpia con la app real cargada |
| Tarjeta de Hoy | 119 px con el SVG en 76, no desborda |

Los siete criterios de aceptación de la SPEC pasan.

## Decisiones tomadas por criterio propio

- **Las imágenes de referencia no se usan como assets.** El personaje combina contextura ×
  musculatura × ánimo × fase: son miles de combinaciones y catorce dibujos fijos no las
  cubren. Se usaron como referencia de estilo.
- **No se rediseñó la cara.** Los anteojos, las proporciones y la ropa alcanzan para el
  parecido; rediseñarla sin una referencia de la cara sería tirar lo que ya estaba aprobado.
- **Se archivaron las 31 pendientes del ciclo 7** en `.nonstop/ciclo-7/`. El pedido vigente
  era el personaje.
- **Queda `_zoom.html`** en el repo. `_personaje.html` muestra el muñeco entero; este
  amplía una parte, y sin él media docena de bugs de dibujo no se habrían visto nunca.

## Desvíos de la SPEC

- **El ítem 6 (“el ruedo de la musculosa sube al frente con panza”) se cumplió sin tocar
  nada.** El ruedo ya subía con la contextura desde el ciclo anterior (`hemMusculosa`
  lleva un `+ med.c * 10`). Se verificó y se marcó hecho.
- **Apareció un ítem 17 que no estaba planeado**: `transformacion.js` se pasó de su límite
  al crecer el aura y hubo que partirlo. Salió `aura.js` con fuego, escombros, rayos, suelo
  y ki; en `transformacion.js` quedó el pelo.
- Nada más se desvió: el resto de los ítems se hizo como estaba escrito.

## Trampas aprendidas, para no repetirlas

- **Nada de comentarios `<!-- -->` adentro del SVG.** El doble guion rompe el XML y hay un
  test que lo agarra. Las explicaciones van como comentario de JS, afuera del template.
- **Orden del contorno de una prenda**: sisa, tirante, escote. Con la sisa terminando más
  abajo que el escote, el path se cruza a sí mismo y la prenda sale chorreada de un lado.
- **Una sombra hecha aparte asoma por los recortes.** La de la musculosa sale del mismo
  path que la musculosa (`siluetaRemera` con `mitad = true`).
- **Al partir un archivo, revisar qué quedó en el medio.** Cortando entre `brazos` y
  `torso` se fue `volumen()` de arriba, y la app quedó en blanco con un
  `volumen is not defined`.

## Bloqueados

Ninguno.
