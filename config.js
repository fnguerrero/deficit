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
  proxyUrl: ''
};
