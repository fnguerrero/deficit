/* Service worker — cachea el shell de la app para que ande offline.
   Subir la versión al cambiar cualquier archivo. */

const VERSION = 'deficit-v206';

const SHELL = [
  './',
  './index.html',
  './styles.css?v=206',
  './config.js?v=206',
  './core.js?v=206',
  './modos.js?v=206',
  './mascota.js?v=206',
  './cuerpo.js?v=206',
  './personaje.js?v=206',
  './transformacion.js?v=206',
  './juego.js?v=206',
  './sonidos.js?v=206',
  './voz.js?v=206',
  './graficos.js?v=206',
  './analisis.js?v=206',
  './claude.js?v=206',
  './productos.js?v=206',
  './sync.js?v=206',
  './auth.js?v=206',
  './app.js?v=206',
  './ui/general.js?v=206',
  './ui/hoy.js?v=206',
  './ui/objetivos.js?v=206',
  './ui/comidas.js?v=206',
  './ui/edicion.js?v=206',
  './ui/escaner.js?v=206',
  './ui/asistente.js?v=206',
  './ui/historial.js?v=206',
  './ui/progreso.js?v=206',
  './ui/logros.js?v=206',
  './ui/perfil.js?v=206',
  './ui/sincronizacion.js?v=206',
  './ui/cuenta.js?v=206',
  './ui/calibracion.js?v=206',
  './ui/actividades.js?v=206',
  './ui/recordatorios.js?v=206',
  './ui/ajustes.js?v=206',
  './arranque.js?v=206',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/favicon.png'
];

/** Borra todo cache de la app que no sea el de esta versión. */
async function limpiarCaches() {
  const claves = await caches.keys();
  await Promise.all(
    claves.filter(k => k !== VERSION && /^deficit-v\d+$/.test(k)).map(k => caches.delete(k))
  );
}

self.addEventListener('install', (e) => {
  // sin skipWaiting: la versión nueva espera a que la persona acepte actualizar.
  // Igual se limpia acá: si esperara al activate, cada versión sin confirmar
  // dejaría su cache dando vueltas hasta que alguien toque "Actualizar".
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(SHELL))
      .then(() => limpiarCaches())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'actualizar') self.skipWaiting();

  // Qué versión está sirviendo REALMENTE quien contesta. Mirar los caches no
  // sirve: con una versión esperando, su cache ya existe y el diagnóstico diría
  // que estás actualizado cuando todavía corrés la vieja.
  if (e.data === 'version' && e.ports && e.ports[0]) e.ports[0].postMessage(VERSION);
});

self.addEventListener('activate', (e) => {
  e.waitUntil(limpiarCaches().then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // solo nos metemos con GET del propio origen: la API de Claude nunca se cachea
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Red primero para TODO lo propio, con el cache como respaldo offline.
  // Cache-first dejaba la app pegada en una versión vieja hasta subir VERSION,
  // que es el error clásico de PWA: se publica un fix y nadie lo ve.
  e.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(VERSION).then(c => c.put(req, copia));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => {
        if (hit) return hit;
        // una navegación sin red cae al index cacheado
        if (req.mode === 'navigate' || req.destination === 'document') return caches.match('./index.html');
        return Response.error();
      }))
  );
});
