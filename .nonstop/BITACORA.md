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
