# Informe — lo que le faltaba a Déficit (ciclo 3)

## Qué se construyó

Los dos ciclos anteriores agregaron funciones. Este atacó los **huecos de fondo** que quedaban,
en el mismo orden en que se los conté a Nico cuando preguntó qué le faltaba a la app.

### 1. Nunca se había probado la estimación por foto contra la API real

Era el hueco más serio: la app entera se apoya en ese número y no había una sola medición.
No puedo correrla yo (necesita su key), así que construí el banco:

- **Calibración**: cargás 3 fotos de comidas cuyas calorías reales conocés, tocás un botón y
  la app te dice **cuánto se equivoca con tus comidas**, para qué lado, y qué hacer con eso.
- **Sesgo aprendido**: cada vez que corregís a mano una estimación queda una medición gratis.
  Con 5 correcciones consistentes de 15% o más, la app te avisa que viene errando parejo.
- El README arranca ahora con esa sección: tres tipos de comida que sirven de referencia, los
  cuatro pasos y una tabla de qué significa cada nivel de error.

### 2. Los datos vivían en un solo navegador, sin respaldo

- **Sincronización con Supabase** por REST, sin SDK y sin login: una llave larga y aleatoria
  agrupa tus datos, y se copia al otro dispositivo para compartirlos.
- **`supabase.sql`** listo para pegar: tablas, índices, RLS y la explicación de qué protege qué.
- **Respaldo**: aviso cuando nunca exportaste o cuando pasaron 14 días, y almacenamiento
  persistente pedido recién cuando hay algo que proteger.

### 3. Todo lo envasado se cargaba a mano o se pagaba

- **Código de barras** contra Open Food Facts: gratis, sin API key, sin foto. Escaneás con la
  cámara (o escribís el código) y trae los datos de la etiqueta, que no son una estimación.
- Cache local de 300 productos por 90 días: el mismo yogur no se pide dos veces.

### 4. Nada frenaba el gasto

- **Tope mensual que corta de verdad**: al llegar al límite no se analiza más. Avisa al 80%,
  y lo que no cuesta plata (manual, código de barras, historial) sigue andando igual.

### 5 y 6. Nutrientes y tamaño del código

- **Fibra, azúcar y sodio** en el modelo, en el análisis y en el código de barras, mostrados
  solo cuando hay datos.
- **`app.js` pasó de 2.785 líneas a 130**, repartido en 8 archivos de `ui/`. `core.js` también
  se partió. Y quedó `tools/tamanos.py` para que no vuelva a pasar.

### Cómo correrlo

```bash
"W:\Working Folder Personal\DeficitCalorico\Deficit.bat"
```

`http://localhost:5599` para la app, `/tests.html` para la suite.

## Verificación

| Criterio de aceptación | Resultado |
|---|---|
| 1. 420+ tests, 0 fallos | **430 tests, 0 fallos** |
| 2. Sin errores de consola, sin key y sin conexión | limpia; anda sin key; el shell entero responde del cache |
| 3. State del ciclo 2 migra sin pérdida | conserva perfil, días, fotos, frecuentes, recetas, correcciones, referencias, historial, errores y config; suma los 4 campos nuevos |
| 4. Todos los ítems verificados | 22/22, cada uno con su línea de bitácora |
| 5. Cero llamadas reales | Claude, Supabase y Open Food Facts, todo con `fetch` simulado |
| 6. Sync: los cuatro casos | subir, bajar, conflicto y borrado que no revive — más convergencia de 3 dispositivos |
| 7. Código de barras con respuesta real | fixture de Open Food Facts; carga el producto con sus macros |
| 8. El tope impide analizar | con 5,20 gastados sobre un tope de 5, el botón de foto no abre el modal |
| 9. `app.js` < 1.200 y `ui/` < 700 | app.js **130**; el mayor de `ui/` es 622 |
| 10. Calibración de punta a punta | corre con respuestas simuladas y devuelve el error; documentada en el README |

Ningún ítem quedó bloqueado.

## Decisiones tomadas por criterio propio

1. **Sincronización sin login.** Una llave aleatoria de 32 caracteres, sin `l`, `o`, `0` ni `1`
   porque se copia a mano entre dispositivos. Sin cuentas ni contraseñas que mantener.

2. **Los conflictos se resuelven por comida, no por día.** Gana la última edición. Es simple y
   predecible, que es lo que hace falta cuando el conflicto lo genera una persona en dos
   dispositivos, no dos personas peleando por el mismo dato.

3. **Las fotos no se sincronizan.** Pesan y son del dispositivo donde se sacaron. Lo remoto
   nunca pisa la foto local.

4. **El tope frena, no avisa.** Un aviso que no bloquea no evita la sorpresa a fin de mes.

5. **Los nutrientes solo aparecen si hay datos.** El análisis por foto muchas veces no los
   devuelve; una fila de ceros sería peor que no mostrarlos. Y el prompt le dice al modelo que
   ponga 0 antes que inventar.

6. **El banco de calibración usa las fotos de Nico, no un dataset armado.** Lo que importa es
   si acierta con *sus* comidas, no con un promedio ajeno.

## Desvíos de la SPEC

Cuatro, todos por cosas que aparecieron verificando:

1. **`core.js` se partió en dos** (no estaba planeado). Llegó a 1.782 de 1.800 líneas y el ítem
   de nutrientes lo iba a pasar. Salió `analisis.js` con la lectura de datos y el informe.

2. **El orden de la sincronización se invirtió.** Estaba escrito como *subir → bajar*, y los
   tests mostraron que así la versión vieja de un dispositivo pisa en el servidor la edición
   más nueva del otro. Ahora es **bajar → fusionar → subir**.

3. **El filtro de bajada pasó de `act` a `subido`.** Filtrar por "cuándo se modificó" dejaba
   afuera las comidas viejas que otro dispositivo recién sube. Se agregó una segunda marca de
   tiempo: cuándo llegó al servidor.

4. **Dos errores de "declarada después de usarse"** en `core.js` (`MAX_CORRECCIONES` y
   `TOPE_DEFECTO`), que rompieron 39 y 160 tests respectivamente. Las constantes que usa
   `DEFAULT_STATE` ahora están todas juntas arriba del archivo.

   La primera vez, además, **mi verificación fue floja**: di por insertado un bloque porque
   encontré el nombre de la función en el archivo, cuando lo que estaba era su línea en el
   export. Desde entonces verifico contra la declaración (`function X`), no contra el nombre.

## Lo que queda pendiente, y es de Nico

- **Correr la calibración de verdad.** Es lo primero que conviene hacer: si la estimación
  resulta floja con sus comidas, lo que hay que ajustar es el prompt, no la app.
- **Crear el proyecto de Supabase** y pegar URL y anon key para activar la sincronización.
  El SQL ya está listo; la capa está probada contra un servidor simulado, pero **nunca se
  ejecutó contra un Supabase real**.

## Números

- **23 iteraciones** sobre un presupuesto de 45.
- **22 ítems** completados, 0 bloqueados.
- **430 tests** (eran 319 al empezar el ciclo), 0 fallos.
- **0 llamadas reales** a ninguna de las tres APIs.
- El código pasó de 4 archivos a 15, ninguno por encima de su límite.
