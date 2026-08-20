# SPEC — lo que le faltaba a Déficit (ciclo 3)

Ciclos anteriores cerrados en `.nonstop/ciclo-1/` (33 mejoras) y `.nonstop/ciclo-2/` (31).

## Objetivo

Los dos ciclos anteriores agregaron funciones. Este arregla los **huecos de fondo** que
quedaron, en el orden en que se los conté a Nico:

1. **Nunca se probó la estimación por foto contra la API real.** Es la función central de
   la app y es la única sin evidencia. No puedo correrla yo (necesita su key), así que
   construyo el banco de pruebas para que le tome dos minutos y devuelva un número.
2. **Los datos viven en un solo navegador sin respaldo automático.** Sincronización real
   (Supabase) más respaldo a archivo y almacenamiento persistente.
3. **Todo lo envasado se carga a mano o se paga.** Escaneo de código de barras contra
   Open Food Facts: gratis, sin API y sin foto.
4. **Nada frena el gasto de API.** Tope mensual con corte real.
5. Fibra, azúcar y sodio, que hoy no se miden.
6. `app.js` pasó las 2.500 líneas.

## Alcance

**Entra**
- Todo lo de arriba sobre el código existente, sin romper nada de lo que ya anda.
- Tests nuevos para toda la lógica pura y para las capas de red (con fetch simulado).
- Migración: lo guardado hoy tiene que seguir funcionando sin tocar nada.

**No entra**
- Frameworks, bundlers, dependencias: sigue siendo vanilla sin build. El cliente de
  Supabase se habla por REST con `fetch`, no con su SDK.
- Login con usuario y contraseña: la sincronización va con un identificador propio y la
  anon key, sin cuentas.
- APK: sigue siendo PWA.
- Correr la calibración de verdad: eso lo hace Nico con su key. Yo dejo el banco y lo
  pruebo con respuestas simuladas.

## Stack y decisiones

- HTML + CSS + JS vanilla, sin build.
- Lo puro va a `core.js`; lo que habla con Claude, a `claude.js`. Se suman
  `productos.js` (Open Food Facts) y `sync.js` (Supabase), los dos con `fetch` inyectable.
- `app.js` se parte: la lógica de pantalla sale a `ui/` como archivos separados cargados
  con `<script>`, sin módulos ES (para no pelear con el service worker y `file://`).
- Supabase por REST (`/rest/v1`), con la anon key y RLS por identificador de dispositivo.

## Supuestos

Decisiones tomadas por criterio propio (esta sección crece):

1. **Sincronización sin login**: cada instalación genera un identificador largo y aleatorio
   que hace de llave. Para sumar el celu se copia ese identificador desde la compu. Es lo
   más simple que resuelve el problema real (ver lo mismo en los dos lados) sin cuentas.
2. **La sincronización resuelve conflictos por comida, no por día**: cada comida tiene su
   id, gana la modificación más reciente, y las comidas borradas se anotan como tumba para
   que no reaparezcan.
3. **Open Food Facts sin API key** (es abierta), con cache local de lo escaneado para que
   un producto repetido no vuelva a pedir red.
4. **El tope de gasto corta de verdad**: al llegar al límite no se puede analizar hasta el
   mes siguiente o hasta subirlo a mano. Un aviso que no frena nada no sirve de nada.
5. **La calibración usa fotos que Nico elige**, con el valor real que él sabe (una etiqueta,
   una receta pesada). No invento un dataset: no tendría sentido.
6. **Fibra, azúcar y sodio son opcionales**: si el modelo no los devuelve, quedan en cero y
   no se muestran, para no ensuciar la pantalla con ceros.
7. **Commit y push**: repo personal propio, va sin preguntar (pedido explícito de Nico).

## Criterios de aceptación

1. La suite pasa de 319 a **420+ tests**, con **0 fallos**.
2. La app carga **sin un error de consola** y sigue andando sin API key y sin conexión.
3. Un `state` del ciclo 2 se abre, migra y **no pierde ni un dato**.
4. Todos los ítems del TODO en `[x]`, cada uno con su verificación en la bitácora.
5. **Cero llamadas reales** a Claude, a Supabase o a Open Food Facts durante el trabajo:
   todo con `fetch` simulado.
6. La sincronización, probada contra un Supabase simulado, resuelve los cuatro casos:
   subir, bajar, conflicto entre dos dispositivos y comida borrada que no revive.
7. El escaneo de código de barras, probado con respuestas reales de Open Food Facts
   guardadas como fixture, carga un producto con sus macros.
8. El tope de gasto **impide** un análisis cuando se llegó al límite.
9. `app.js` queda por debajo de **1.200 líneas** y ningún archivo de `ui/` pasa las 700.
10. La calibración corre de punta a punta con respuestas simuladas y devuelve el error
    promedio; queda documentado en el README cómo correrla de verdad en dos minutos.

## Presupuesto

**45 iteraciones** para 22 ítems. El margen es amplio a propósito: partir `app.js` y la
sincronización son los dos trabajos con más riesgo de romper algo que ya andaba.
