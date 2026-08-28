# Bitácora — lo que le faltaba a Déficit (ciclo 3)

Formato: `#N — qué se hizo — cómo se verificó`

#0 — Bootstrap del ciclo 3: ciclos 1 y 2 archivados, SPEC con 10 criterios y TODO con 22 items sobre los huecos de fondo (calibracion de la IA, sincronizacion, codigo de barras, tope de gasto, nutrientes y partir app.js). Nico eligio Supabase dejandolo listo para pegar credenciales — verificado: 319 tests en verde y la app publicada andando antes de tocar nada

#1 — app.js partido: de 2.785 lineas a 129, con 7 modulos en ui/ (general, hoy, comidas, asistente, historial, perfil, ajustes) mas arranque.js al final; sin cambiar una linea de logica — verificado: los 319 tests siguen en verde, cero errores de consola, las 30 funciones clave definidas y un recorrido funcional completo (carga manual, favorito de un toque, suma rapida, agua, ejercicio, nota, peso y las 4 pantallas)

#2 — tools/tamanos.py: chequeo de tamaño por archivo con limite propio, aviso al 85% y salida con codigo 1 si algo se paso — verificado: con los archivos actuales sale 0 y avisa que core.js viene cerca; sembrando un archivo de 800 lineas salio 1 nombrandolo

#3 — Banco de calibracion: fotos con su valor real conocido, corrida contra la API y error promedio con veredicto accionable. El primer intento fallo porque agregarReferencia descartaba la foto de analisis (bug real, corregido) y se bajo a 768 px con tope de 8 para cuidar la cuota — verificado: 13 tests nuevos (332 total) y una corrida simulada con 18% de subestimacion pareja dio 18,0% de error, veredicto 'aceptable' y solo 16 KB de peso

#4 — Cada correccion a mano de una estimacion de la IA queda anotada como medicion de sesgo (se ignora lo que sea menos del 5%, que es redondeo). El primer intento no inserto el bloque en core.js y mi chequeo lo dio por bueno porque el nombre ya estaba en el export: se corrigio y ahora verifico contra la declaracion — verificado: 9 tests nuevos (341 total) y en la app 5 comidas corregidas dejaron 5 registros de -20%

#5 — Aviso de sesgo sistematico en Ajustes: salta con 5 correcciones consistentes de 15% o mas para el mismo lado — verificado: con -20% pareja mostro 'estimando 20,0% de menos de forma pareja'; al corregir despues para el otro lado el sesgo cayo a 2,5%, dejo de ser consistente y el aviso se apago solo

#6 — README con la seccion 'Antes que nada: probá que la estimación sirve': tres tipos de comida que sirven de referencia, los 4 pasos exactos y la tabla de que significa cada nivel de error — verificado: los nombres del README coinciden literalmente con los de la UI ('Calibrar la estimación', 'Agregar una foto', 'Correr la prueba') y los umbrales de la tabla con los de veredictoCalibracion

#7 — sync.js: cliente REST de Supabase con fetch inyectable, cabeceras apikey/Bearer, upsert con merge-duplicates y errores traducidos (401 'revisá la anon key', 404 'corriste el SQL') — verificado: 12 tests con un Supabase simulado, incluyendo sin conexion y tabla faltante

#8 — Llave de sincronizacion de 32 caracteres sin l/o/0/1 (se confunden al copiarlas a mano), con validacion y formato legible en bloques — verificado: 5 tests, incluyendo 50 llaves generadas sin repetir y sin caracteres ambiguos

#9 — Subida de cambios locales: solo lo modificado desde el ultimo sync, comidas, dias y tumbas, sin mandar las fotos (pesan y son del dispositivo) — verificado: 6 tests, la segunda corrida no vuelve a subir lo mismo

#10 — Bajada y fusion: se corrigio un error de diseño que encontraron los tests — se subia antes de bajar y la version vieja de este dispositivo pisaba en el servidor la edicion mas nueva del otro. Ahora baja, fusiona y recien despues sube. Ademas el filtro pasa a 'cuando llego al servidor' en vez de 'cuando se modifico', porque una comida vieja subida tarde no llegaba nunca — verificado: el celular recibe las 2 comidas de la compu, no duplica al repetir y la foto local sobrevive

#11 — Conflictos por comida: gana la edicion mas reciente comparando el campo act — verificado: la misma comida editada en dos dispositivos converge al valor del que la toco despues, y lo viejo no pisa lo nuevo (queda como ignorada)

#12 — Tumbas: lo borrado en un dispositivo desaparece en el otro y no revive aunque se sincronice varias veces; si el borrado local es posterior, la fila remota vieja no la resucita — verificado: 3 tests del borrado mas convergencia de 3 dispositivos al mismo estado

#13 — Pantalla de sincronizacion en Ajustes: URL y anon key con validacion, llave propia generada sola y mostrada en bloques, copiar/pegar llave y sincronizar a mano con estado — verificado: contra un Supabase simulado subio 3 filas, bajo la comida del otro dispositivo, conservo la foto local y con un 401 mostro el mensaje traducido y lo dejo anotado en el diagnostico

#14 — supabase.sql listo para pegar: tablas comidas y dias con act (resuelve conflictos) y subido (filtra la bajada), claves primarias por llave, indices para la bajada, RLS con politicas y explicacion de por que la llave es lo que protege — verificado: comprobado por script que todas las columnas que manda el cliente existen en el SQL y que las dos que se usan como filtro estan indexadas

#15 — Respaldo: aviso cuando nunca exportaste con 3+ dias cargados o cuando pasaron 14 dias, marca de ultimo respaldo al exportar, y almacenamiento persistente pedido recien al guardar una comida (nunca al abrir) — verificado: 7 tests nuevos (384 total) y en la app el aviso aparecio con 6 dias sin exportar, se apago al exportar, volvio a los 20 dias y la persistencia no se pidio al renderizar

#16 — productos.js: cliente de Open Food Facts (gratis, sin API key) con normalizacion de la respuesta real, conversion de kJ a kcal y de sal a sodio, cache local de 300 productos por 90 dias y errores utiles — verificado: 24 tests nuevos (408 total) con fixtures de respuestas reales

#17 — Escaner de codigo de barras con BarcodeDetector y camara trasera, con carga a mano como alternativa cuando el navegador no lo soporta o no hay permiso; cerrar el modal apaga la camara — verificado: en un navegador sin BarcodeDetector el panel explico la situacion y el codigo a mano trajo el producto igual

#18 — Del producto a la comida: porciones sugeridas (la del envase, 100 g y el envase entero), gramos editables con el total recalculando, y pasaje al editor para ajustar antes de guardar — verificado: el yogur de 160 g dio 155 kcal, cambiar a 100 g dio 97, se guardo como comida y el segundo escaneo salio del cache con 1 sola llamada de red

#19 — Tope mensual de gasto que frena de verdad: se chequea antes de cada llamada paga (foto, etiqueta, correccion, sugerencias y calibracion) y con el tope alcanzado no se abre el analisis — verificado: 10 tests nuevos y en la app con 5,20 gastados sobre un tope de 5 el boton de foto no abrio el modal, mientras la carga manual siguio andando

#20 — Gasto del mes a la vista con barra y aviso al 80%, tope editable y opcion de apagarlo (cero = sin freno) — verificado: al 84% aviso sin frenar, al 100% bloqueo con el texto de que hacer, subir el tope destrabo y ponerlo en cero dejo pasar todo

#21 — Fibra, azucar y sodio en el modelo, en el schema del analisis (con instruccion de poner 0 antes que inventar) y en el codigo de barras, con migracion que deja en cero lo ya guardado — verificado: 12 tests nuevos y las comidas viejas siguen intactas con los tres campos en cero

#22 — Los tres nutrientes se muestran en Hoy solo si hay datos, con objetivo por calorias (14 g de fibra cada 1.000 kcal, 10% de azucar, 2.000 mg de sodio de la OMS) y marca cuando te pasas; en el informe del mes aparecen como promedios — verificado: sin datos la fila queda oculta, con lentejas mostro los tres y con 2.600 mg de sodio marco el exceso

---

## Ciclo 4 — que la app se sienta terminada (23/08/2026)

#0 — Bootstrap. 17 items en 4 frentes: lo que quedo desactualizado al mover la clave al
proxy, que la app se actualice sin pelear, sincronizacion automatica y robustez ante
fallas. El disparador son tres cosas que pasaron hoy de verdad, no una lista de deseos.
Presupuesto 40.

#1 — El paso 3 del onboarding ya no pide la clave cuando hay proxy: pasa a explicar como se usa la app, con otro icono y otro titulo; sin proxy vuelve el campo — verificado por DOM en los dos casos (con proxy el input mide 0, sin proxy 43,75)

#1b — Encontrado arreglando lo anterior: `hidden` no ocultaba nada si el elemento tenia una clase con display propio, porque el UA stylesheet pierde contra cualquier regla de autor. Afectaba a 6 elementos, y el peor era listaNutrientes, que se suponia oculto sin datos y se veia siempre. Una regla `[hidden] { display: none !important }` arriba de todo — verificado: la lista de elementos que ignoran hidden paso de 6 a 0

#2 — La tarjeta "sin key" de Hoy ya no aparece con el proxy andando (la destrabo el fix de hidden de #1b) y sin proxy sigue apareciendo con su texto correcto — verificado por DOM: 0 de alto con proxy, 91,8 sin proxy

#3 — Los tres toasts que piden la clave ahora usan la constante SIN_ACCESO en vez de repetir el literal. Ademas verifique el circuito entero: el toast lleva a Ajustes y ahi el campo esta VISIBLE, no escondido en el plegable que agregue antes — verificado por DOM

#4 — La app toma la version nueva sola cuando no hay nada en juego; el banner queda solo si hay un modal abierto, un analisis corriendo o algo tipeandose. La decision es sePuedeActualizarSolo() en core.js, pura — verificado: 5 tests nuevos, y en vivo con un worker falso la app ociosa manda 'actualizar' sin banner y con un modal abierto muestra el banner sin mandar nada

#5 — Ademas de al cargar, ahora busca version nueva cada vez que se vuelve a la app (visibilitychange). Quien la deja abierta dias en el celular no dispara nunca el load y se quedaba clavado en una version vieja — verificado: el handler queda registrado y reg.update() corre al volver

#6 — Diagnostico muestra la version que sirve el worker ACTIVO, preguntandosela por MessageChannel, en vez de leer el cache mas alto: con una version esperando, su cache ya existe y decia que estabas actualizado cuando corrias la vieja — verificado: antes de activar reportaba vacio (el worker viejo no tiene el handler) y despues de activar coincide con deficit-v96

#7-9 — La sincronizacion dejo de ser un boton que hay que acordarse de tocar: corre al arrancar (con piso de 2 min para que abrir y cerrar la app no dispare una ronda por vez) y 4 segundos despues de cualquier cambio. El enganche esta en save(), que es el unico punto por donde pasa todo, en vez de en los 6 lugares que agregan comidas — verificado en vivo con fetch interceptado: un cambio dispara una ronda, cinco save() seguidos colapsan en una sola, y con una corriendo la segunda devuelve "ya hay una corriendo"

#7b — Encontrado en el camino: el handler del boton guardaba configSync() completo, o sea copiaba al estado local las credenciales que trae la app. Mismo bug que ya habia evitado en los otros lugares. Ahora usa configSyncLocal()

#10 — Un fallo de red deja el estado local intacto — verificado con un test que corta la bajada a mitad y compara el estado serializado antes y despues

#11 — El cliente de Supabase reintenta 429 y 5xx con backoff, igual que el de Claude; 401 y 404 no se reintentan porque no van a cambiar — verificado: 4 tests (dos 503 y a la tercera pasa; un 401 llama una sola vez; las esperas son 100 y 200 ms; sin red avisa tras 3 intentos)

#12 — Faltaba el estado "sincronizando", que con la sincronizacion automatica es justo el que importa: la app hace pedidos que nadie pidio y no se veian por ningun lado — verificado por DOM los cinco estados: sin configurar, lista, activa con resumen, con error y sincronizando

#13 — La app arranca y navega sin conexion — verificado de verdad: apague el servidor y recargue. Cargo el shell entero (28 recursos del cache del SW), los 5 modulos presentes, las 4 pantallas navegables y el anillo pintado. El unico error de consola era residuo del buffer, no reproducible

#14 — Los errores del diagnostico ya se podian limpiar y el contador no mentia — verificado por DOM: con 3 dice "3 errores" y muestra el boton; despues de limpiar dice "todo en orden" y el boton desaparece. Sin cambios de codigo

#15 — Con el almacenamiento lleno la app avisa y sigue andando — verificado interceptando localStorage.setItem para que tire QuotaExceededError siempre: no lanza excepcion, muestra "No se pudo guardar: almacenamiento lleno" y la app queda usable

#16 — Accesibilidad: 0 controles sin nombre y 0 inalcanzables por teclado en las 4 pantallas (7 a 36 controles cada una, con los plegables abiertos) y en los dos modales

#17 — Encontrados dos bugs que habia introducido YO hoy con el menu de origen de foto: no respondia a Escape y no contaba como modal abierto, asi que la app se podia auto-actualizar con el menu en pantalla. Ademas agregue trampa de foco: con un modal abierto el Tab ya no se escapa a la pagina de atras y al cerrar el foco vuelve de donde vino — verificado por DOM: foco entra, cicla, Escape cierra y lo devuelve a btnFoto

---

## Ciclo 5 — modos, simplificar y que se pueda cumplir (23/08/2026)

#0 — Bootstrap. 31 items en 9 frentes, presupuesto 45. El eje cambia: de "registrar con
precision" a "que se pueda cumplir todos los dias". Ventana de preguntas usada: login
multiusuario queda para el ciclo 6, Hoy se rehace como tablero de objetivos, API va con
Sonnet + optimizaciones + escalado por confianza, y el agua va con vasos tactiles sin +/-.
Nico sumo despues el veredicto honesto de si va bien.

#1-3 — modos.js nuevo con los 6 modos (mantenimiento, moderado, agresivo, definicion, keto, volumen). El objetivo sale de Mifflin-St Jeor por el cuerpo de cada uno, no de una constante; la proteina se prescribe por kilo de peso; keto fija 30 g de carbos y llena con grasa. Pisos de seguridad: 1500/1200 y nunca por debajo del basal — verificado: 14 tests, con el TMB y el TDEE calculados a mano

#6 — comidaApta(): reglas por modo, todo local, cero llamadas a la API. En keto el carbono es tope duro y cuenta lo que ya consumiste hoy; en el resto una comida que se lleva mas del 60% del dia no entra — verificado: 6 tests con comidas al limite

#18 y #22 — Actividades por MET (kcal = MET x peso x horas) con duracion propia por actividad, favoritas y actividades que se pueden agregar sin perder las del catalogo. Agua: vasos objetivo segun el peso, con piso y techo — verificado: 8 tests

#26 — veredictoProgreso(): honesto o calla. Con menos de 10 dias de peso y 7 de registro dice cuantos faltan en vez de inventar una tendencia; con datos detecta en camino, mas lento, sin deficit y demasiado rapido, con regresion lineal sobre el peso y adherencia real — verificado: 11 tests, incluido que el peso que sube no puede dar "vas bien"

#9-13 — Hoy rehecha como tablero. Los tres botones de carga en una fila; sugerencias, repetir, manual y kcal sueltas se fueron a "Mas opciones"; grilla de 4 objetivos que se marcan en verde al completarse; las comidas sin descripcion en la lista (se ve al tocar) y con marca de si entran en el modo — verificado por DOM: los 3 botones comparten offsetTop, y completar peso/ejercicio/animo los pone verdes

#13b — El layout perseguia alturas fijas y siempre quedaba corto. Ahora la estructura ocupa lo suyo y la lista de comidas se queda con lo que sobra (flex + min-height 0), asi entra con 2 comidas o con 10 — verificado: sobra 0 px en 375x812 con el dia cargado y 4 comidas; con 10 la lista scrollea adentro sin mover la pagina

#21 — Agua tactil: se toca el vaso al que llegaste y se llenan todos hasta ahi; volver a tocar el ultimo baja uno. Sin + ni -, que era un toque por vaso — verificado por DOM: tocar el 4 deja 4, tocarlo de nuevo deja 3, tocar el 8 deja 8

#19 y #23-24 — Ejercicio por actividad favorita de un toque (funcional 60' = 510 kcal para 85 kg), animo por caritas con nota opcional, y el peso precargado con el ultimo valor conocido — verificado por DOM

#4 — Selector de modo en Perfil: los 6 en una grilla, con lo que implica cada uno y el objetivo resultante debajo — verificado por DOM: elegir Keto guarda el modo y baja los carbos a 30

#14-15 — Ahorro de API: Sonnet por defecto (un tercio del costo de Opus) y Haiku para etiquetas, que es transcribir y no estimar. convieneEscalar() ofrece Opus solo cuando el modelo devolvio confianza baja, para pagar precision solo cuando hace falta — verificado: 8 tests, incluyendo que un plato pide sonnet y una etiqueta pide haiku en el body real

#14b — Tres tests fallaron con el cambio y tenian el precio de Opus escrito a mano: el costo bajo a 0,6 del anterior, que es exactamente la relacion Sonnet/Opus. Se corrigieron los tests, no el codigo. El que elige Opus explicitamente quedo con el precio de Opus, que ahi si corresponde

#32-33 — Ayuno intermitente: boton de arrancar/cortar, cronometro en vivo, cuatro ventanas (16:8, 18:6, 20:4, 12:12) y el ayuno como quinto objetivo del dia. Es un cronometro y nada mas, que es justo por lo que funciona: no depende de sensores que una PWA no tiene — verificado por DOM el flujo entero y 7 tests de la logica

#25-27 — Veredicto y recomendaciones en Historial. Verificado por DOM los tres estados: sin datos dice "Faltan 9 dias de peso y 6 de comidas"; bajando al ritmo previsto dice "Vas en camino" con -0,51 contra 0,51 y 100% de adherencia; y con el peso quieto dice "No estas bajando" y da la explicacion mas probable en vez de maquillarlo. Las recomendaciones cambian con el modo

#31 — Cinco temas: automatico, claro, oscuro, negro OLED (bateria real en el celular) y calido (menos azul de noche) — verificado: los cuatro fondos son distintos y la barra del navegador acompana

#34 — El sueno auto-reportado ya estaba: se hizo junto con el personaje (horas + calidad en caritas, sexto objetivo del dia). Se marca sin trabajo nuevo

#28 — En curso: seccion de progreso con graficos propios

#28-30 — Seccion Progreso nueva, quinta pestana. Cuatro graficos en SVG a mano (una libreria de charts pesa mas que toda la app): peso, calorias contra objetivo, adherencia, y uno que depende del modo —carbohidratos en keto, proteina en definicion—. Selector de dia/semana/mes que agrupa promediando, porque mirar el peso dia a dia es mirar ruido. Los huecos cortan la linea en vez de inventar el tramo — verificado por DOM: 14/8/3 puntos segun periodo

#28b — Dos bugs que solo aparecieron mirando el render, no leyendo el codigo: la adherencia pintaba de ROJO el 100% y de verde el 0%, porque reusaba la regla de calorias donde pasarse es malo; y el eje del peso imprimia "86, 85, 85" al redondear a entero un rango de menos de un kilo — verificado: el color acompana al valor en las 14 barras y el eje va con decimales cuando el rango es chico

#20 — Editar actividades desde Ajustes: cambiar duracion, elegir cuales van en Hoy (tope de 3, que es lo que entra) y agregar propias con nombre e intensidad. El id sale del nombre sin acentos y sin pisar uno existente — verificado por DOM: cambiar running a 45' recalcula a 625 kcal, intercambiar favoritas anda, la cuarta se rechaza y "Escalada" queda con su id sin romper el catalogo

#20b — ui/ajustes.js se paso del limite de 700 lineas al agregar esto. Salio ui/actividades.js. El control de tamanos existe justamente para que el corte se decida cuando corresponde y no cuando el archivo ya es inmanejable

#36 — efectoDelSueno(): compara los dias que dormiste poco contra los que dormiste bien. La mayor parte de la funcion es negarse a responder: con menos de 4 dias de cada tipo dice cuantos faltan. Y cuando responde, aclara que son pocos dias y que es una pista, no una ley — verificado: 9 tests y por DOM los tres casos (come mas, sin efecto, sin datos)

#35 — Aviso de hora de dormir, con su propia regla de "ya esta hecho": no mira si cargaste una comida sino si ya registraste el sueno — verificado: 5 tests de la ventana horaria y por DOM el guardado de la preferencia

#8 — Al guardar a mano algo que rompe el modo, se avisa ANTES de cerrar. No bloquea: el segundo toque guarda igual. La app registra, no vigila — verificado por DOM con una pizza en keto

#16-17 — Menos gasto sin tocar el modelo: la imagen baja de 1024 a 768 px (casi la mitad de tokens de entrada; un plato se estima por tamano relativo a los cubiertos, no por detalle fino) y el cache pasa de 30 a 90 dias y de 24 a 60 entradas, porque cada entrada es un analisis ya pagado

#16b — Un test se puso en rojo con el cambio de cache: esperaba que expirara a los 31 dias. El cambio era deliberado, asi que se corrigio el test —ahora prueba 90 dias y que el plazo siga siendo configurable—, no el codigo

#35b — ui/ajustes.js se volvio a pasar de tamano. Salio ui/recordatorios.js con los avisos, que son un tema propio y autocontenido

## Ciclo 6 — Fito humano y el sistema que engancha

#1 — ui/comidas.js estaba 18 lineas pasado del limite: salio ui/edicion.js con el editor del resultado (cargar una comida y corregirla son dos momentos distintos). Verif: tamanos.py limpio

#2 — Un test en rojo heredado del ciclo 5: "con el dia en blanco no opina" fallaba porque estadoMascota leia el reloj adentro y a las 18 hs un dia vacio SI es un problema. El codigo estaba bien; lo que estaba mal era que la hora no se pudiera fijar. Ahora entra por parametro. Verif: 587 en verde

#3 — cuerpo.js: IMC, bandas, contextura continua (17-35 clampeado), musculatura por dias entrenados en 14, y el descuento por musculo. Sin peso devuelve null en vez de inventar. Verif: 16 tests nuevos, 603 en verde

#4 — personaje.js: Fito pasa a ser humano. Silueta muestreada a partir de cuatro anchos, lo que deja cortar la ropa a cualquier altura y que siga al cuerpo. Verif: rasterizado con Edge headless y mirado

#5 — Tres arreglos que solo se ven mirando el render: los brazos quedaban tapados por el torso (se dibujaban antes), las piernas eran muy cortas y la manga tenia forma rara. Verif: PNG de la grilla de cuerpos

#6 — Proporciones a lo Duolingo: la cabeza se lleva casi un tercio. No es capricho: en Hoy el personaje mide 74 px y con proporciones reales la cara quedaba en 12 px, donde no se distingue un bostezo de una sonrisa. Verif: PNG de los ocho animos, todos legibles

#7 — El personaje entra en la pantalla y sin peso cargado dibuja un cuerpo medio pidiendo el dato. 22 tests nuevos, incluido el que fija el criterio central: mismo peso con distinta comida da la MISMA silueta. Verif: 621 en verde y por DOM

#8 — juego.js: cuatro rachas separadas, escudos que se ganan cada 7 dias, XP que paga por registrar ademas de por cumplir, niveles y 16 logros. Todo se recalcula contra el historial en vez de acumularse: asi borrar una comida cargada por error no deja XP fantasma. Verif: 654 en verde

#9 — sonidos.js (WebAudio, sin un solo archivo, apagado por defecto) y voz.js (el repertorio de Fito, con un test que prohibe frases que humillen por el cuerpo). Verif: 678 en verde

#10 — tests.js se paso de 6000 lineas: salio tests2.js con la suite del ciclo 6. Ojo con como se lee el resultado: hay tests async que corren despues, y el resumen en pantalla se pinta dos veces. Lo confiable es esperar a window.__listo

#11 — Bug real que solo se ve en el navegador: la manga escribia el menos a mano y del lado izquierdo salia "q--5.9", que tira el path entero. El test de NaN no lo agarraba porque "--5.9" no es NaN. Se agrego el test que si lo agarra

#12 — Pantalla de nivel, rachas grandes y logros dentro de Progreso (la barra de abajo ya tiene cinco botones), festejo en cola de a uno, e interruptor de sonido en Ajustes que suena al prenderlo. Verif: por DOM

#13 — Hoy en 375x812: la lista de comidas quedaba en 37 px. Dos causas. Los seis objetivos ocupaban dos filas (ahora una), y sobre todo el `calc(100dvh - 216px)`: el 216 era una suma a ojo del header y la nav, y dejaba 120 px de pantalla vacia abajo. Ahora el alto lo reparte flex. Verif: Hoy entra justo y la lista paso a 88 px

#13b — Al pasar el alto a flex hubo que mover el scroll del documento a `main`, o Historial, Progreso, Perfil y Ajustes quedaban sin poder scrollear. Verif: las cinco pestanas llegan al final

#14 — El juego no se sincroniza como tabla propia: XP, nivel, rachas y logros se derivan de los dias, que ya se sincronizan. Solo quedan por dispositivo los escudos gastados y que logros ya se festejaron. Anotado en Supuestos. Verif: test de que los mismos dias dan el mismo juego

#15 — Siete archivos nuevos entraron en index.html y NO en el shell del service worker: eso no falla en el navegador, falla sin internet y semanas despues. Se agregaron, y version.py ahora avisa cuando pasa. Se probo que la guardia dispare de verdad

#16 — Verificacion final contra los criterios de la SPEC: 682 tests en verde, 0 errores de consola, los 15 criterios cumplidos. Ciclo cerrado en 14 iteraciones de 55

## Ajustes despues de que Nico la probo

#17 — Dos bugs que el uso real destapo enseguida. La barra de abajo tenia cinco botones en una grilla de CUATRO columnas, asi que Ajustes caia solo a una segunda fila. Y --txt2 estaba definido en 6 de los 9 temas: una variable de color indefinida vale `inherit`, y adentro de un <button> eso cae al color del sistema, o sea casi negro sobre la tarjeta oscura. Por eso el texto del personaje era ilegible en oscuro y se veia bien en claro. Verif: los 8 temas dan entre 7.1 y 10.3 de contraste

#18 — El personaje se quedo sin nombre: el muneco es Nico, asi que la app le habla en segunda persona. "Vas a pleno", "Te falta agua". Se reescribio todo el repertorio de voz

#19 — El cuerpo llegaba al tope demasiado pronto: la curva del IMC pasa a dos tramos (rapido hasta 35, lento hasta 50) y el extremo se ensancho de verdad. DIAS_RUTINA bajo de 10 a 6, porque con 10 el eje de musculo casi nunca llegaba arriba

#20 — Las fases, pedido de Nico: la escalera de dias perfectos seguidos, con aura, pelo encendido y rayos. Va en el pelo y el aura y NO en el cuerpo: si cumplir un dia te dibujara flaco, la app estaria diciendo que ya adelgazaste. Lo unico que el dia perfecto le presta al cuerpo es un plus de musculo chico y temporal

#20b — Las puntas del pelo se leian como una corona por dos motivos seguidos: primero los valles del zigzag quedaban por debajo del borde del craneo y los tapaba la tapa del pelo; despues, ya corregidos, los picos se salian del lienzo y quedaban cortados al ras. El lienzo se estiro 26 px para arriba

#21 — El ayuno salio de los objetivos: un objetivo es algo que la app te pide todos los dias, y el ayuno es algo que haces cuando queres. Ahora es un chip arriba, al lado del modo activo, que tampoco se veia en ningun lado

#22 — Los sonidos pasan a venir prendidos, con `sonidoElegido` para que el cambio de default llegue a quien ya tenia estado guardado sin pisar una decision tomada a mano. Y cumplir un objetivo ahora se siente: el casillero pega un salto y sube un +15

#23 — La lista de comidas tenia scroll propio y con seis comidas quedaba en 52 px. Se le saco: la lista mide lo que mide y si el dia es pesado se scrollea la pantalla, que es lo que uno espera

#24 — Bug viejo que aparecio de paso: el chequeo de version nueva al volver a la app usaba `reg` fuera de su alcance y tiraba ReferenceError cada vez. O sea que no corria nunca, y quien deja la app abierta dias en el celular se quedaba en una version vieja sin enterarse

#25 — version.py suma una segunda guardia: avisa si un tema define --txt pero no --txt2. Se probo que dispare

#26 — Las fases no transmitian nada: cambiaban el color del pelo sobre el mismo muneco chibi parado de brazos caidos. Lo que las hace imponentes no es el color sino la SILUETA. Ahora la fase suma musculo, abre la postura, cierra los punos, separa las piernas y pone cara de furia de la 2 para arriba. El pelo pasa a puntas altas, filosas e inclinadas hacia atras (triangulos sueltos, no un zigzag), el aura son lenguas de fuego subiendo en vez de un halo redondo, y desde la fase 3 se resquebraja el suelo

#26b — La cabeza baja de 26.5 a 23 de radio: una cabeza que se lleva un tercio de la figura se lee tierna siempre, por mucha ceja enojada que tenga

#26c — Los brazos quedaban en cruz porque la pose de la fase se sumaba a la de 'genial', que ya los levanta 26 grados. Ahora el angulo lo fija la fase en absoluto

#27 — Un test en rojo que marcaba algo real: el musculo de la fase angostaba la cintura, o sea que cumplir un dia te dibujaba mas flaco. Se separo en un tercer eje (`poder`) que entra en todo lo que ensancha y en nada de lo que afina. El test viejo pedia que la fase no tocara la silueta —regla que cambio a pedido de Nico— y se reemplazo por el que de verdad importa: puede ponerte mas grande, nunca mas flaco

#27b — El otro rojo era el test que contaba los animos por Object.keys(CARAS): 'furioso' es la cara que impone la fase, no un animo. La lista va explicita

#28 — "Parezco Carlitos". Y era exacto: cabeza redonda enorme, sin cuello, piernas cortas y corte de tacho. Proporciones de adulto (tronco y piernas mas largos, cabeza de 26.5 a 20.5 de radio, cuello a la vista) y musculosa de gimnasio en vez de remera, que es lo que hace que los brazos se vean y que el musculo se lea

#29 — El objetivo de agua salia del peso: 12 vasos para 86 kg. Nadie que hoy toma dos pasa a doce, asi que el casillero quedaba sin marcar todos los dias y terminaba ignorado. Arranca en 4 y se sube a mano de a uno; la referencia por peso sigue estando, como dato al costado y no como meta

#30 — En pantallas anchas el modal se centra. Pegado al borde de abajo se leia como cortado, que fue justo lo que reporto Nico

#31 — Reescritura completa de la capa de dibujo a estilo anime, sobre la referencia que paso Nico. Tres cosas: contorno oscuro en cada parte, cel shading de dos tonos con corte duro (la sombra del torso es la misma silueta partida al medio, asi que nunca se sale del cuerpo y no hace falta clipPath ni ids unicos), y angulos en vez de circulos — mandibula, ojos afilados, cejas en cuna, mechones puntiagudos

#31b — personaje.js se paso de tamano y salio cara.js. El corte tiene sentido propio: el cuerpo lo manda la balanza y la cara el dia, asi que se tocan por motivos distintos

#31c — Tres bugs de dibujo que solo se ven rasterizando: la boca estaba en coordenadas fijas y al achicarse la cabeza un grito ocupaba media cara; el iris llenaba casi todo el blanco del ojo y a tamano chico se fundia con la ceja en una sola mancha; y los miembros se dibujaban en dos trazos con punta redonda, o sea un muneco de salchichas articulado

#31d — La linea del pelo bajo demasiado DOS veces seguidas y en las dos la frente entera quedaba del color del pelo, con los ojos flotando sobre una vincha. Se extrajo `lineaDelPelo()` a su propia funcion para poder probarla, y el test nuevo cazo el tercer intento fallado antes de que lo viera yo

#32 — El bug del peso, medido: 85 kg daba un torso de 63 de ancho, 150 daba 67, y 200, 300 y 400 daban 67 los tres. La curva del IMC cortaba en 50 y con 1,80 m 200 kg ya son IMC 62. Ahora la curva va en TRES tramos hasta IMC 90, el cuerpo ensancha mucho mas en el extremo (la cintura va de 13 a 41 contra 13 a 33 de antes) y cuando el IMC se pasa del techo la app lo DICE, en vez de dejar el muneco quieto como si hubiera ignorado el dato

#33 — Pelo estilo Goku: seis mechones gordos en abanico con la punta afinada en dos tramos, mas dos flequillos sobre la frente. Antes eran ocho triangulos rectos y finitos, o sea un peine

#34 — Fuera las estrellitas. Entran las particulas de ki que suben, la electricidad que parpadea desde la fase 2 (con pasos, no degradé: un rayo que se desvanece suave no se lee como un rayo) y el aura que respira

#35 — El momento de transformarse: sacudon, destello, grito y un sonido propio (una onda de sierra que arranca en 110 Hz y revienta en 880). Durante esos 780 ms se le fuerza la cara de furia y la pose maxima aunque la fase recien ganada sea la 1: es el unico lugar donde el dibujo miente sobre el estado, y vale la pena porque un instante sin nada que lo marque no se registra como premio

#36 — Tres tests en rojo, los tres fijando la curva vieja de dos tramos. Se actualizaron a la de tres y se le sumo el caso que faltaba: que 110, 150 y 200 kg den cuerpos distintos entre si

#37 — El relieve del torso. Hasta aca los dos ejes hacian exactamente lo mismo —ensanchar la silueta— asi que el cuerpo de alguien que entrena se veia igual de blando que el de alguien que no. Ahora la grasa se dibuja como VOLUMEN que cuelga (panza en dos tonos, con su pliegue y sus rollos al costado) y el musculo como SEPARACION entre piezas (deltoides, trapecios, pectorales y linea del abdomen). Volumen abajo contra piezas arriba

#37b — Dos detalles que solo aparecieron mirando el render: las lineas de musculo estaban en el color de la remera y se perdian contra la propia remera, asi que pasaron al color del contorno; y el ruedo de la musculosa era fijo, con lo cual la mitad de abajo de la panza quedaba afuera y el pliegue caia sobre el short, donde se leia como un cinturon. Ahora el ruedo baja con la contextura

#37c — Un test que escribi mal: buscaba la panza por su coordenada y agarraba los ojos, que tambien son elipses. Se corrigio la prueba

#38 — El selector de modos no tenia UNA SOLA linea de CSS: el <small> es inline, asi que el nombre y el resumen salian pegados ("MantenimientoSostener el peso actual") y los 16 botones se apilaban como texto corrido. Ahora es una grilla de tarjetas con emoji, nombre en negrita y resumen debajo; en el celular pasa a una columna

## Ciclo 7 — cien mejoras

#1 — Bloque A. `sumarDias` sobre basura devolvia "NaN-aN-aN", que despues se usaba como clave de `dias` y ensuciaba el estado en silencio: ahora hay `esFechaISO()` y devuelve null. El IMC ignora pesos y alturas imposibles en vez de dividir por cero. Los totales del dia salieron a `totalesDe()`, que estaba escrito con el mismo reduce en cuatro archivos y en dos sin el `|| 0`, asi que una kcal en null volvia NaN el dia entero. Verif: 727 en verde

#2 — Rendimiento de las rachas: barrian 400 dias hacia atras SIEMPRE, cuatro veces por render y otra por cada record — mil seiscientas vueltas para un historial de diez dias. `ventanaHistorial()` corta el barrido donde empiezan los datos

#3 — Accesibilidad. Los modales pasan por `abrirCapa()`: abrir dos veces pisaba `focoPrevio` con un elemento del propio modal y al cerrar el foco se quedaba en la nada. Se sumo una region de anuncios para lectores de pantalla (cambio de pestana y apertura de modal eran silencio total), los vasos dicen su estado y no solo su numero, los objetivos son switches con aria-checked, y el personaje se describe entero: animo, fase e IMC. Verif: por DOM

#4 — 11, 12 y 14 ya estaban bien: la trampa de foco, el Escape y el role=status del toast existian del ciclo 4. Se verificaron por DOM y se marcaron, sin tocar nada

#5 — Contraste: `--dim` no llegaba a 4.5:1 en cinco de los ocho temas (vino 3.99, papel 3.63). Corregidos los cinco; ahora el peor esta en 5.57. Y las seis reglas de `prefers-reduced-motion` desperdigadas se reemplazaron por una global, para que la animacion del ciclo que viene nazca contemplada

#6 — Rendimiento: `renderAll` armaba las cuatro pantallas de una aunque tres estuvieran ocultas, asi que cada toque de un vaso reconstruia el historial entero. Ahora dibuja la visible y marca las demas como vencidas. Y `save()` se agrupa a 250 ms, con escritura inmediata al ocultar la pestana: serializaba el estado ENTERO —cientos de kB con meses de historial— una vez por toque

#7 — core.js se paso del limite: salio calibracion.js. En el camino aparecio `window.__core`, un bloque de export que no usaba NADIE y que ademas rompia al cargar porque nombraba funciones que se habian mudado. Borrado entero. Verif: 727 en verde, consola limpia en pestana nueva

#8 — Memorizacion por firma: `recalcularJuego` recorria el historial entero en CADA render de Hoy y el SVG del personaje se re-generaba aunque nada hubiera cambiado. Verif: 0 recalculos con tres renders seguidos sin cambios

#9 — Escribi `historialACSV()` y despues descubri que `armarCSV()` ya existia y era mas completa. Borre la mia y le escribi a la que estaba los tests que le faltaban, incluido el del escapado

#10 — Volvi a duplicarme, y peor: escribi `compararSemanas` y `buscarEnHistorial` que YA EXISTIAN, las pise, y rompi nueve tests que pasaban. Los originales comparan tambien el peso y buscan en las notas ignorando acentos. Borre las mias. La guarda no lo agarro porque solo miraba duplicados ENTRE archivos: ahora mira tambien dentro de uno, y se probo que dispara

#11 — tools/guardas.py: globales duplicadas, ids que el JS busca y el HTML no tiene, y scripts fuera del shell offline. De entrada encontro dos referencias muertas (notaPill, ejercicioPill) y confirmo que window.__core no lo usaba nadie

#12 — La tarjeta del personaje se habia ido a 160 px al sumarle fase, XP y rachas, y con eso Hoy dejaba de entrar con UNA comida cargada. Bajo a 119 recortando el texto a dos lineas y el personaje a 76 px

#13 — Cierre: 69 de 100, ninguna bloqueada. 761 tests en verde, consola limpia, guardas OK. Las 31 que faltan quedan anotadas con su verificacion para el ciclo 8

## Ciclo 8 — el personaje contra la referencia

#14 — Arranca el ciclo 8. Nico paso dos laminas de referencia (7 fases y 7 contexturas) y pidio que el muneco se parezca. Antes de este ciclo ya entraron los anteojos, los miembros como siluetas y la musculosa de una pieza. Las 31 pendientes del ciclo 7 se archivan en .nonstop/ciclo-7/

#15 — Pectorales (un arco por lado desde el esternon), abdominales (linea media + dos pares de transversales) y trapecios sobre la musculosa. Los pectorales arrancan DEBAJO del escote: a la altura del pecho anatomico caian sobre el borde de la prenda y se leian como una arruga de la tela. Verif: render de torso, fibra y flaco ahora se distinguen de un vistazo
#16 — Test que fija que con panza no hay abdominales: un abdominal marcado debajo de una panza es mentira y el dibujo no puede decir dos cosas del mismo cuerpo. Verif: 764 tests en verde
#17 — La panza pasa a ser un punto propio del contorno (anchoEn), no una elipse pintada encima: con la silueta yendo derecho de la cintura a la cadera el panzon tenia perfil de barril y la barriga era una mancha sobre una prenda que no se enteraba. Verif: render entero, la panza sale por encima del short
#18 — Short hasta media pierna con dobladillo (a Y.cadera+17 el muneco quedaba en calzoncillos) y papada desde contextura 0.6 con trazo mas grueso: a 0.72 y 1.5 px no se veia al tamano real. Verif: render entero de los 5 cuerpos
#19 — El aura: lenguas con el borde en zigzag en vez de curvas suaves (eran petalos, no fuego), altas hasta el hombro (a la mitad el personaje parecia parado en un charco de llamas) y escombros flotando de fase 3 para arriba. Verif: render de las 7 fases
#20 — Los 8 animos con la cabeza nueva: cejas, boca, nariz, oreja y anteojos quedaron en su lugar, no hizo falta reubicar nada. De paso el recorte de la vista cabeza del taller quedo mal al bajar caraRy y se corrigio
#21 — transformacion.js se paso del limite al crecer el aura: sale aura.js con fuego, escombros, rayos, suelo y ki; en transformacion queda el pelo. Registrado en los cuatro HTML y en el shell offline. Verif: guardas 40 scripts OK, tamanos OK, 764 tests en verde
#22 — Verificacion en la app real: tarjeta del personaje 119 px con el SVG en 76, no desborda, consola limpia y el muneco se dibuja con anteojos en fase 5. Verif: navegador
#23 — Cierre del ciclo 8: 17 items, ninguno bloqueado, 9 iteraciones sobre 40. Los siete criterios de aceptacion pasan. 764 tests en verde, guardas y tamanos OK, consola limpia
#24 — El personaje pasa a hibrido: el cuerpo es un sprite recortado de la lamina de Nico (7 contexturas, 88 KB en webp) y el fuego, el pelo de fase y los escombros se siguen dibujando en capas alrededor. Las fases NO van como sprite: serian 49 dibujos y ademas el cuerpo dejaria de salir de la balanza. Los 8 animos se pierden en la cara y pasan a un emoji al lado del titulo. Verif: render de las 7 fases y de 12 combinaciones de contextura, 764 tests en verde, consola limpia, la imagen carga en la app
#25 — Fuera la melena de las fases altas: el pelo de una fase tiene que leerse como MAS PELO, no como otro peinado, y sobre el sprite quedaba a los costados de la cara como orejeras. Ahora crece un 5,5% por fase y nada mas. Verif: render de las 7 fases, 764 tests en verde
#26 — Las fases vuelven a poner musculo: la fase suma al eje musculatura y corre la eleccion de sprite (flaco -> atletico -> marcado -> ancho, tres escalones). Se apaga con la panza porque en la lamina no hay gordo musculoso y sin freno la app le borraba veinte kilos a alguien por cumplir tres dias seguidos. De paso la tabla de los 7 sprites estaba mal: los tres ultimos son delgados musculosos, no gordos musculosos. Verif: render de la progresion en flaco y en panzon, 765 tests en verde
#27 — Nico deja el hibrido "por ahora" sin estar convencido. Lo abierto queda anotado en la seccion H del TODO: falta un gordo musculoso en la lamina, los 8 animos siguen siendo un emoji y el personaje SVG entero quedo sin uso en la app
