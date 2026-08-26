# Déficit

PWA de déficit calórico con análisis de comidas **por foto** (Claude vision).
Sin build y sin dependencias: todo corre en el navegador.

Publicada en <https://fnguerrero.github.io/deficit/> — **no hay nada que configurar**:
la clave de Claude vive en un proxy y la sincronización ya viene apuntada a su proyecto.

## En el celular (Android)

Abrí la URL en Chrome → menú `⋮` → **Agregar a la pantalla principal**.
Queda con ícono propio y a pantalla completa. Dentro de la app, en **Ajustes**
también aparece el botón *Instalar* cuando Chrome lo ofrece.

Andando como PWA funciona offline salvo el análisis de foto, que necesita internet.

## En la compu

El acceso directo **Deficit** del escritorio abre la versión publicada en una ventana
sin barra de direcciones. Si no está, se recrea con:

```
powershell -ExecutionPolicy Bypass -File tools\crear_acceso_directo.ps1
```

Para desarrollo, `Deficit.bat` levanta `http://localhost:5599`. Con `file://` no anda el
service worker, así que conviene el `.bat`.

## Antes que nada: probá que la estimación sirve

La app estima calorías mirando una foto. **Eso puede salir bien o mal, y hasta que no lo
midas con tus comidas no lo sabés.** Toda la app se apoya en ese número, así que conviene
empezar por ahí. Lleva dos minutos.

1. Elegí **tres comidas cuyas calorías reales conozcas**. Las más fáciles:
   - algo envasado, que trae la tabla en el paquete (un yogur, una barrita, un alfajor);
   - algo que puedas pesar en balanza y buscar (100 g de arroz cocido, una fruta);
   - un plato que hayas armado vos y sepas qué le pusiste.
2. Sacale una foto a cada una, **como si la fueras a cargar normalmente**: mismo ángulo,
   misma luz, el plato entero.
3. En **Ajustes → Calibrar la estimación**, tocá *Agregar una foto*, elegí la imagen y
   cargá el nombre y las calorías reales.
4. Con las tres cargadas, tocá **Correr la prueba**. Cada foto se analiza una vez
   (unos centavos en total).

Lo que devuelve:

| Error promedio | Qué significa |
|---|---|
| hasta 10% | El número sirve para seguir un déficit. |
| 10% a 20% | Sirve de referencia; corregí a mano las comidas grandes. |
| más de 20% | No confíes en el total: probá el modo *Preciso* o cargá a mano lo que más comés. |

También te dice **para qué lado se equivoca**. Si estima siempre por debajo, sabés que el
día real es más alto que el que ves — y eso es accionable aunque el error sea grande.

La app además va aprendiendo sola: cada vez que corregís a mano lo que estimó, guarda esa
diferencia, y si detecta que se equivoca siempre para el mismo lado te lo dice.

**Lo que ya está medido**: leer una etiqueta funciona perfecto. Con la que genera
`tools/etiqueta_prueba.py` devolvió los 8 valores exactos (calorías, macros, fibra, azúcar
y sodio), confianza alta, en 9,5 segundos. Eso es transcribir, que es la parte fácil.
**Estimar un plato servido es otra cosa** y sigue sin medirse: eso es lo que responde la
calibración de arriba.

## Primer uso

La primera vez arranca un onboarding de 3 pasos: bienvenida, tus datos y la API key
(este último se puede saltear, y conviene: la clave ya viene por el proxy). Con eso ya
calcula tu objetivo diario.

La key de Anthropic se saca de `console.anthropic.com` y queda solo en el
`localStorage` de este navegador; se manda únicamente a `api.anthropic.com`.

**Se puede evitar cargarla en cada dispositivo**: con el proxy desplegado (ver más abajo),
la clave vive en el servidor y la app anda sin configurar nada, también en el celular.

## Qué hace

**Registro**
- **Foto del plato** → Claude identifica los alimentos, estima porciones, calorías y macros.
  Se pueden mandar **varias fotos** de la misma comida (plato, bebida, postre) en un solo análisis.
- **Código de barras** → escaneás el envase y trae los datos de Open Food Facts.
  Es gratis, no gasta API y los valores son los de la etiqueta, no una estimación.
- **Etiqueta de un envase** → lee la tabla nutricional con la cámara y la pasa a una porción.
- **Corregir por texto** (“la porción era el doble”) y rehacer la estimación sin sacar otra foto.
- **Favoritos**: los alimentos marcados se cargan de un toque desde la pantalla Hoy.
- **Recetas**: guardás un conjunto de alimentos con nombre y lo reusás cuando quieras.
- **Repetir** una comida de los últimos 14 días o **copiar un día entero**.
- **Suma rápida** para cargar calorías sueltas sin desglose.
- Carga manual con autocompletado desde tus alimentos frecuentes, que no gasta API.
- Multiplicador de porción ×0,5 / ×1 / ×1,5 / ×2 por alimento.
- Comidas agrupadas por momento del día, editables, movibles a otro momento u otro día,
  con deshacer al borrar y visor de la foto en grande.
- Agua (vasos según tu peso), ejercicio (que amplía el objetivo) y nota del día.

**Seguimiento**
- Anillo de calorías, macros contra objetivo y navegación por día.
- Curva de peso con **media móvil de 7 días** y **proyección a 4 semanas**.
- Barras de los últimos 14 días contra el objetivo, y racha de días registrados.
- **Adherencia** (días dentro del objetivo), **reparto por momento del día**,
  **patrón por día de la semana** y **comparación con la semana anterior**.
- **Aviso de proteína corta**, que es lo que más se descuida en déficit.
- **TDEE adaptativo**: estima tu gasto real a partir de lo que comiste y lo que bajaste.
- Buscador por alimento, comida o nota del día.
- **Fibra, azúcar y sodio** cuando hay datos, con el objetivo de cada uno.
- **Informe mensual** imprimible en una página.

**Datos**
- **Sincronización entre dispositivos** con Supabase: ves lo mismo en la compu y en el celular.
- Aviso de respaldo y almacenamiento persistente, para que el navegador no te borre el historial.
- Todo en `localStorage` (`deficit.v1`), con copia de respaldo automática.
- Exportar JSON y CSV; importar **fusionando** (sin duplicar) o reemplazando.
- Revisión de datos incoherentes con recalculo automático.
- Aviso de cuota y pantalla de diagnóstico con los últimos errores.

**La app**
- Tema claro y oscuro (sigue al sistema o forzado), recordatorios locales,
  atajos de teclado en la compu y cambio de día automático a medianoche.

## Sincronizar entre la compu y el celular

Los datos viven en el navegador de cada dispositivo. El proyecto de Supabase **ya viene
configurado con la app**, así que alcanza con emparejarlos:

1. En un dispositivo: **Ajustes → Sincronización → Sincronizar ahora**.
2. Ahí aparece **tu llave**. Tocá *Copiar llave*.
3. En el otro: **Usar otra llave**, pegás esa, y *Sincronizar ahora*.

Desde ese momento los dos ven lo mismo.

<details>
<summary>Usar otro proyecto de Supabase</summary>

1. Creá un proyecto gratis en [supabase.com](https://supabase.com).
2. **SQL Editor** → pegá todo `supabase.sql` → **Run**.
3. **Project Settings → API**: copiá la *Project URL* y la *Publishable key*
   (antes se llamaba anon key y empezaba con `eyJ`; ahora empieza con `sb_publishable_`).
4. En la app, **Ajustes → Sincronización → Usar otro proyecto de Supabase**, pegá las dos
   cosas y *Guardar*. Para volver al proyecto de la app, vaciá los campos y guardá.

</details>

**Con cuenta**: en Ajustes → *Tu cuenta* entrás con mail y contraseña, y desde ahí tus
datos son tuyos y no del dispositivo. Instalás donde quieras, entrás y está todo. Lo que
hayas cargado antes de tener cuenta se adopta solo en el primer login.

La sincronización **corre sola**: al abrir la app y unos segundos después de cualquier
cambio. El botón *Sincronizar ahora* sigue estando para forzarla y ver qué pasó.

Cómo resuelve los choques: cada comida se compara por separado y gana la última edición.
Lo que borrás en un dispositivo desaparece en el otro y no vuelve. Las fotos no se
sincronizan: se quedan donde las sacaste, porque pesan y no valen el tráfico.

**La llave es lo único que protege tus datos** (no hay usuario ni contraseña): es larga y
aleatoria, pero guardala como guardarías una contraseña.

## Cómo funciona el análisis

La imagen se redimensiona a 1024 px y va a la API de Claude con
`output_config.format` + JSON schema, con fallback a pedir JSON por prompt si el
modelo no lo soporta. La respuesta llega **en streaming**, así se ven los alimentos
mientras el modelo los escribe. Se reintenta con backoff ante 429 y 5xx, se puede
cancelar, y se registra el costo de cada llamada (visible en Ajustes).

**La misma foto no se paga dos veces**: queda cacheada por su huella durante 30 días.
Y hay un **tope mensual de gasto** que corta de verdad: al llegar al límite no se analiza
más hasta el mes siguiente, aunque el registro manual y el código de barras siguen andando.

Modelo por defecto: **Opus 5**, con tres modos de precisión en Ajustes:
*Rápido* (Haiku 4.5), *Normal* (esfuerzo medio) y *Preciso* (esfuerzo alto).

Cuánto sale, medido: **US$ 0,018 por análisis** en Opus 5 / Normal, unos 10 segundos.
Con 5 dólares de crédito son unos 275 análisis. En *Rápido* baja bastante, y para leer
una etiqueta —que es transcribir, no estimar— alcanza de sobra.

## La clave en un solo lugar

Cargar la clave dispositivo por dispositivo es molesto, y en el código no puede ir: el repo
es público y GitHub Pages sirve todo tal cual. La salida es un **Worker de Cloudflare** que
guarda la clave del lado servidor; la app le habla a él en vez de a `api.anthropic.com`.

Se configura una sola vez y ni el celular, ni la compu, ni el repo tienen la clave.
**Ya está desplegado** en `deficit-proxy.fnguerrero.workers.dev`; para rehacerlo o moverlo,
los pasos están en [`proxy/README.md`](proxy/README.md) — son tres comandos.
Sus propios tests corren sin Cloudflare y sin tocar la API: `node proxy/test.mjs`.

El Worker solo acepta pedidos desde los orígenes de la app, limita a 30 por minuto por IP y
restringe los modelos, así que la URL suelta no le sirve de mucho a nadie. Aun así, el freno
que de verdad acota el peor caso es el límite de gasto en la consola de Anthropic.

Si el proxy no está configurado, cada dispositivo usa su propia clave desde Ajustes, como
siempre. Y si cargás una clave estando el proxy activo, gana la tuya en ese dispositivo.

## Desarrollo

| Archivo | Qué tiene |
|---|---|
| `config.js` | configuración pública de la app (la URL del proxy) — sin credenciales |
| `core.js` | lógica pura: cálculo, fechas, estado, formato |
| `analisis.js` | lectura de los datos: tendencias, patrones, búsqueda e informe |
| `claude.js` | la API de Claude (el `fetch` se inyecta para poder testearlo) |
| `productos.js` | Open Food Facts y el código de barras |
| `sync.js` | sincronización con Supabase por REST |
| `app.js` | estado, persistencia y helpers |
| `ui/*.js` | una pantalla por archivo |
| `arranque.js` | el arranque, que va último |
| `supabase.sql` | las tablas, listas para pegar en Supabase |
| `proxy/` | el Worker de Cloudflare que guarda la clave (`node proxy/test.mjs`) |
| `tests.js` + `tests.html` | 573 tests sin dependencias — abrir `/tests.html` |
| `sw.js` | service worker (network-first, cache como respaldo offline) |
| `tools/gen_iconos.py` | regenera los íconos (`py -3 tools/gen_iconos.py`) |
| `tools/version.py` | sube la versión de los assets (`py -3 tools/version.py`) |
| `tools/tamanos.py` | avisa si un archivo se pasó de largo (`py -3 tools/tamanos.py`) |
| `tools/etiqueta_prueba.py` | arma una etiqueta con valores conocidos, para verificar la lectura |
| `tools/crear_acceso_directo.ps1` | deja el acceso directo en el escritorio de Windows |

**Al tocar cualquier archivo del shell hay que subir la versión**, y de eso se encarga
`py -3 tools/version.py`: toca `VERSION` en `sw.js` y el `?v=N` de los `<script>`/`<link>`
en `index.html` y `tests.html`, que es lo que evita que el navegador sirva CSS o JS viejo
de su propio cache HTTP.

Los tests corren en el navegador contra los módulos puros; las tres capas de red
(Claude, Open Food Facts y Supabase) se prueban con un `fetch` simulado, así que la suite
no consume API ni toca ningún servidor.
