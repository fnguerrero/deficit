# Proxy — la clave en un solo lugar

La app es HTML servido por GitHub Pages: **todo lo que está en el repo es público**.
Por eso la clave de Claude no puede vivir acá. Este Worker la guarda del lado servidor,
y la app le habla a él en vez de a `api.anthropic.com`.

Resultado: la configurás **una sola vez**, y ni el celular ni la compu ni el repo la tienen.

## Desplegarlo

Necesitás una cuenta de Cloudflare (gratis) y Node instalado.

```bash
cd "W:\Working Folder Personal\Apps\DeficitCalorico\proxy" && npx wrangler login
```

Se abre el navegador para autorizar. Después:

```bash
cd "W:\Working Folder Personal\Apps\DeficitCalorico\proxy" && npx wrangler secret put ANTHROPIC_API_KEY
```

Te pide la clave y la pegás ahí. **Ese es el único lugar donde va a existir.** Queda
guardada cifrada: ni siquiera el dashboard de Cloudflare te la vuelve a mostrar.

El proxy solo atiende a quien tiene sesión iniciada en la app, así que también
necesita saber dónde preguntar (son la URL y la anon key de `config.js`), y a quién
dejar pasar:

```bash
cd "W:\Working Folder Personal\Apps\DeficitCalorico\proxy" && npx wrangler secret put SUPABASE_URL
cd "W:\Working Folder Personal\Apps\DeficitCalorico\proxy" && npx wrangler secret put SUPABASE_ANON
cd "W:\Working Folder Personal\Apps\DeficitCalorico\proxy" && npx wrangler secret put EMAILS_PERMITIDOS
```

En `EMAILS_PERMITIDOS` va tu mail (o varios, separados por coma). Sin esa lista, a
cualquiera que se cree una cuenta en tu Supabase el proxy le pagaría los análisis.

```bash
cd "W:\Working Folder Personal\Apps\DeficitCalorico\proxy" && npx wrangler deploy
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
cd "W:\Working Folder Personal\Apps\DeficitCalorico" && py -3 tools/version.py
```

Commit y push. Listo: desde ese momento cualquier dispositivo que abra la app analiza
fotos sin que le cargues nada.

## Qué lo protege

La URL del Worker no es secreta, así que hay estos frenos:

- **Sesión de Supabase**: la app manda el token de tu sesión y el Worker le pregunta
  a Supabase de quién es antes de llamar a la API. Sin sesión, 401.
- **Lista de mails** (`EMAILS_PERMITIDOS`): de todas las cuentas con sesión, solo
  esas. Otra cuenta recibe 403.
- **Lista de orígenes**: solo responde a `fnguerrero.github.io` y a `localhost:5599`.
  Frena a un navegador ajeno, pero no a `curl`, que escribe el `Origin` a mano: por
  eso no alcanzaba solo y hizo falta la sesión.
- **Freno por IP**: 30 pedidos por minuto. Un análisis es un pedido.
- **Modelos y tamaño acotados**: solo los tres modelos de la app, `max_tokens` con techo
  y un límite de cuerpo, para que nadie use tu cuenta para otra cosa.

Igual conviene el **límite de gasto en la consola de Anthropic** (*Billing → Usage
limits*): es lo que fija el peor caso posible, pase lo que pase con todo lo de arriba.

## Si algo no anda

- **401 "hay que iniciar sesión"**: la app no tiene sesión en ese dispositivo. Entrá en
  Ajustes → Cuenta. Con una clave propia cargada en Ajustes no hace falta.
- **403 "Esta cuenta no tiene permiso"**: el mail de la sesión no está en
  `EMAILS_PERMITIDOS`.
- **403 "Origen no permitido"**: estás abriendo la app desde una URL que no está en
  `ORIGENES`, dentro de `worker.js`. Agregala y volvé a desplegar.
- **500 "El proxy no tiene la clave configurada"**: faltó el `wrangler secret put`.
- **La app sigue pidiendo la API key**: quedó una clave vieja cargada en Ajustes de ese
  dispositivo, y la clave propia tiene prioridad. Borrala del campo y guardá.
- Los logs en vivo:

```bash
cd "W:\Working Folder Personal\Apps\DeficitCalorico\proxy" && npx wrangler tail
```

## Volver atrás

Poné `proxyUrl: ''` en `config.js` y cada dispositivo vuelve a usar su propia clave desde
Ajustes. El Worker se borra con `npx wrangler delete`.

## Los avisos con la app cerrada

Los recordatorios de la app son temporizadores del navegador: **mueren cuando la
app se cierra**. Para que el aviso llegue con el teléfono guardado hace falta que
alguien golpee desde afuera, y ese alguien es este Worker.

Son cuatro pasos y se hacen una vez.

**1. Generá tu par de claves.** Corré esto en tu consola: la privada se imprime
en pantalla y no tiene que pasar por ningún lado más.

```bash
cd "W:\Working Folder Personal\Apps\DeficitCalorico" && py -3 tools/vapid.py
```

**2. Pegá la pública en `config.js`**, en `vapidPublica`. Es pública de verdad:
identifica quién manda los avisos y no autoriza nada por sí sola. Mientras esté
vacía, la app no ofrece la opción.

**3. Cargá los secretos del Worker** (la privada, la pública y las credenciales
de Supabase, que es de donde salen las suscripciones):

```bash
cd "W:\Working Folder Personal\Apps\DeficitCalorico\proxy" && npx wrangler secret put VAPID_PRIVADA
```

Y lo mismo con `VAPID_PUBLICA`, `SUPABASE_URL`, `SUPABASE_ANON` y
`SUPABASE_SERVICE_ROLE` (Project Settings → API keys → la secreta). La service_role
saltea RLS, así que **solo va acá**, nunca en `config.js` ni en el repo: el cron la
necesita porque la tabla de suscripciones ya no se puede leer con la anon key.

**4. Creá la tabla y desplegá.** El SQL está en `supabase-push.sql`, se pega en
el editor de Supabase. Después:

```bash
cd "W:\Working Folder Personal\Apps\DeficitCalorico\proxy" && npx wrangler deploy
```

El cron queda andando cada quince minutos (está en `wrangler.toml`). Desde ahí,
en Ajustes → Recordatorios aparece **"Avisarme aunque tenga la app cerrada"**.

### Qué viaja y qué no

A Supabase va la dirección que da el navegador, los horarios y el huso, a nombre de
tu cuenta: hace falta tener la sesión iniciada para prender los avisos. **No va
ninguna comida, ni el peso, ni el mail.** El aviso sale vacío —sin texto— y el
teléfono arma la frase según la hora: además de ser menos código, evita que el
contenido de los recordatorios pase por un tercero.
