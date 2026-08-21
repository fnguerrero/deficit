# Proxy — la clave en un solo lugar

La app es HTML servido por GitHub Pages: **todo lo que está en el repo es público**.
Por eso la clave de Claude no puede vivir acá. Este Worker la guarda del lado servidor,
y la app le habla a él en vez de a `api.anthropic.com`.

Resultado: la configurás **una sola vez**, y ni el celular ni la compu ni el repo la tienen.

## Desplegarlo

Necesitás una cuenta de Cloudflare (gratis) y Node instalado.

```bash
cd "W:\Working Folder Personal\DeficitCalorico\proxy" && npx wrangler login
```

Se abre el navegador para autorizar. Después:

```bash
cd "W:\Working Folder Personal\DeficitCalorico\proxy" && npx wrangler secret put ANTHROPIC_API_KEY
```

Te pide la clave y la pegás ahí. **Ese es el único lugar donde va a existir.** Queda
guardada cifrada: ni siquiera el dashboard de Cloudflare te la vuelve a mostrar.

```bash
cd "W:\Working Folder Personal\DeficitCalorico\proxy" && npx wrangler deploy
```

Al terminar imprime la URL, algo como `https://deficit-proxy.TU-SUBDOMINIO.workers.dev`.

## Conectarlo con la app

Copiá esa URL a `config.js`, en la raíz del proyecto:

```js
const CONFIG_APP = {
  proxyUrl: 'https://deficit-proxy.TU-SUBDOMINIO.workers.dev'
};
```

Subí la versión de los assets y publicá:

```bash
cd "W:\Working Folder Personal\DeficitCalorico" && py -3 tools/version.py
```

Commit y push. Listo: desde ese momento cualquier dispositivo que abra la app analiza
fotos sin que le cargues nada.

## Qué lo protege

La URL del Worker no es secreta, así que hay tres frenos:

- **Lista de orígenes**: solo responde a `fnguerrero.github.io` y a `localhost:5599`.
  Un pedido desde cualquier otro lado se rechaza sin llegar a la API.
- **Freno por IP**: 30 pedidos por minuto. Un análisis es un pedido.
- **Modelos y tamaño acotados**: solo los tres modelos de la app, `max_tokens` con techo
  y un límite de cuerpo, para que nadie use tu cuenta para otra cosa.

El chequeo de origen frena a un navegador ajeno, pero no a alguien decidido con `curl`
—el header `Origin` se puede escribir a mano—. Por eso, la red de contención de verdad
es el **límite de gasto en la consola de Anthropic**: ponelo en *Billing → Usage limits*
y ahí sabés cuál es el peor caso posible, sin depender de nada de esto.

## Si algo no anda

- **403 "Origen no permitido"**: estás abriendo la app desde una URL que no está en
  `ORIGENES`, dentro de `worker.js`. Agregala y volvé a desplegar.
- **500 "El proxy no tiene la clave configurada"**: faltó el `wrangler secret put`.
- **La app sigue pidiendo la API key**: quedó una clave vieja cargada en Ajustes de ese
  dispositivo, y la clave propia tiene prioridad. Borrala del campo y guardá.
- Los logs en vivo:

```bash
cd "W:\Working Folder Personal\DeficitCalorico\proxy" && npx wrangler tail
```

## Volver atrás

Poné `proxyUrl: ''` en `config.js` y cada dispositivo vuelve a usar su propia clave desde
Ajustes. El Worker se borra con `npx wrangler delete`.
