# Déficit

PWA de déficit calórico con análisis de comidas **por foto** (Claude vision).
Sin backend, sin cuentas y sin dependencias: todo corre en el navegador.

Publicada en <https://fnguerrero.github.io/deficit/>

## En el celular (Android)

Abrí la URL en Chrome → menú `⋮` → **Agregar a la pantalla principal**.
Queda con ícono propio y a pantalla completa. Dentro de la app, en **Ajustes**
también aparece el botón *Instalar* cuando Chrome lo ofrece.

Andando como PWA funciona offline salvo el análisis de foto, que necesita internet.

## En la compu

Doble clic en `Deficit.bat` → abre `http://localhost:5599`.
Con `file://` no anda el service worker, así que conviene el `.bat`.

## Primer uso

La primera vez arranca un onboarding de 3 pasos: bienvenida, tus datos y la API key
(este último se puede saltear). Con eso ya calcula tu objetivo diario.

La key de Anthropic se saca de `console.anthropic.com` y queda solo en el
`localStorage` de este navegador; se manda únicamente a `api.anthropic.com`.

## Qué hace

**Registro**
- **Foto del plato** → Claude identifica los alimentos, estima porciones, calorías y macros.
- **Etiqueta de un envase** → lee la tabla nutricional y la pasa a una porción.
- **Corregir por texto** (“la porción era el doble”) y rehacer la estimación sin sacar otra foto.
- **Carga manual** con autocompletado desde tus alimentos frecuentes, que no gasta API.
- **Repetir** cualquier comida de los últimos 14 días.
- Multiplicador de porción ×0,5 / ×1 / ×1,5 / ×2 por alimento.
- Comidas agrupadas por momento del día, editables y con deshacer al borrar.
- Agua (vasos según tu peso) y ejercicio, que amplía el objetivo del día.

**Seguimiento**
- Anillo de calorías, macros contra objetivo y navegación por día.
- Curva de peso con **media móvil de 7 días** (la tendencia real, sin el ruido diario).
- Barras de los últimos 14 días contra el objetivo, y racha de días registrados.
- Progreso hacia tu peso meta y balance semanal en kcal y kg.
- **TDEE adaptativo**: estima tu gasto real a partir de lo que comiste y lo que bajaste,
  que suele diferir de la fórmula. Necesita 10 días cargados y dos pesos.

**Datos**
- Todo en `localStorage` (`deficit.v1`), con copia de respaldo automática.
- Exportar JSON y CSV, importar, y aviso cuando el almacenamiento se llena.

## Cómo funciona el análisis

La imagen se redimensiona a 1024 px y va a la API de Claude con
`output_config.format` + JSON schema, con fallback a pedir JSON por prompt si el
modelo no lo soporta. Se reintenta con backoff ante 429 y 5xx, se puede cancelar,
y se registra el costo de cada llamada (visible en Ajustes).

Modelo por defecto: **Opus 5**. En Ajustes se puede bajar a Sonnet 5 o Haiku 4.5.

## Desarrollo

| Archivo | Qué tiene |
|---|---|
| `core.js` | lógica pura: cálculo, fechas, estado, análisis de la serie, formato |
| `claude.js` | todo lo que habla con la API (el `fetch` se inyecta para poder testearlo) |
| `app.js` | render y eventos del DOM |
| `tests.js` + `tests.html` | 148 tests sin dependencias — abrir `/tests.html` |
| `sw.js` | service worker (network-first, cache como respaldo offline) |
| `tools/gen_iconos.py` | regenera los íconos (`py -3 tools/gen_iconos.py`) |

**Al tocar cualquier archivo del shell hay que subir la versión en dos lugares a la vez:**
`VERSION` en `sw.js` y el `?v=N` de los `<script>`/`<link>` en `index.html` y `tests.html`.
El `?v=N` es lo que evita que el navegador sirva CSS o JS viejo de su propio cache HTTP.

Los tests corren en el navegador contra `core.js` y `claude.js`; la capa de red se
prueba con un `fetch` mockeado, así que no consumen API.
