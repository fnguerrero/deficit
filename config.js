/* ============================================================
   config.js — configuración de la app.

   OJO: este archivo es público (el repo lo es, y GitHub Pages lo sirve
   tal cual). Acá NO va ninguna credencial. La clave de Claude vive como
   secreto en el Worker de Cloudflare; ver proxy/README.md.

   La URL del proxy no es un secreto: quien la tenga igual choca contra
   la lista de orígenes permitidos del Worker.
   ============================================================ */

const CONFIG_APP = {
  /* Vacío = cada dispositivo usa su propia clave, cargada en Ajustes.
     Con la URL del Worker puesta, no hay que configurar nada en ningún lado. */
  proxyUrl: 'https://deficit-proxy.fnguerrero.workers.dev',

  /* Sincronización. La anon key de Supabase está pensada para vivir en el
     cliente: lo que protege los datos son las políticas RLS y, sobre todo, la
     llave de 32 caracteres, que NO va acá y se copia a mano entre dispositivos.
     Vacío = cada dispositivo carga lo suyo en Ajustes. */
  supabase: {
    url: '',
    anonKey: ''
  }
};
