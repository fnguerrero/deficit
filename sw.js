/* Service worker — cachea el shell de la app para que ande offline.
   Subir la versión al cambiar cualquier archivo. */

const VERSION = 'deficit-v552';

const SHELL = [
  './',
  './index.html',
  './styles.css?v=552',
  './config.js?v=552',
  './core.js?v=552',
  './platos.js?v=552',
  './animar.js?v=552',
  './fotos.js?v=552',
  './calibracion.js?v=552',
  './modos.js?v=552',
  './arreglos.js?v=552',
  './consecuencias.js?v=552',
  './recorte.js?v=552',
  './deportes.js?v=552',
  './habitos.js?v=552',
  './mascota.js?v=552',
  './cuerpo.js?v=552',
  './cintura.js?v=552',
  './figura.js?v=552',
  './cara.js?v=552',
  './personaje.js?v=552',
  './relieve.js?v=552',
  './sprite-datos.js?v=552',
  './sprite.js?v=552',
  './img/cuerpo-0.webp',
  './img/cuerpo-1.webp',
  './img/cuerpo-2.webp',
  './img/cuerpo-3.webp',
  './img/cuerpo-4.webp',
  './img/cuerpo-5.webp',
  './img/cuerpo-6.webp',
  './transformacion.js?v=552',
  './aura.js?v=552',
  './juego.js?v=552',
  './sonidos.js?v=552',
  './voz.js?v=552',
  './graficos.js?v=552',
  './plazo.js?v=552',
  './compartir.js?v=552',
  './sugerencias.js?v=552',
  './analisis.js?v=552',
  './chequeos.js?v=552',
  './claude.js?v=552',
  './productos.js?v=552',
  './sync-perfil.js?v=552',
  './fusion-dia.js?v=552',
  './sync.js?v=552',
  './estado-sync.js?v=552',
  './auth.js?v=552',
  './app.js?v=552',
  './ui/general.js?v=552',
  './ui/hoy.js?v=552',
  './ui/peso.js?v=552',
  './ui/dia.js?v=552',
  './ui/objetivos.js?v=552',
  './ui/barra.js?v=552',
  './ui/recorte.js?v=552',
  './ui/tarjeta.js?v=552',
  './ui/comidas.js?v=552',
  './ui/edicion.js?v=552',
  './ui/resumen.js?v=552',
  './ui/escaner.js?v=552',
  './ui/asistente.js?v=552',
  './ui/historial.js?v=552',
  './ui/progreso.js?v=552',
  './ui/logros.js?v=552',
  './ui/perfil.js?v=552',
  './ui/sincronizacion.js?v=552',
  './ui/cuenta.js?v=552',
  './ui/calibracion.js?v=552',
  './ui/actividades.js?v=552',
  './ui/recordatorios.js?v=552',
  './ui/ajustes.js?v=552',
  './arranque.js?v=552',
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

/*
 * Tocar el aviso de objetivos abre la app en vez de no hacer nada.
 *
 * Sin esto la notificacion fija es un cartel muerto: se ve el estado del dia y
 * al tocarlo no pasa nada, que es peor que no mostrarlo. Si ya hay una pestaña
 * abierta se le da foco en lugar de abrir otra.
 */
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
      const abierta = lista.find(c => c.url.includes(self.registration.scope));
      if (abierta) return abierta.focus();
      return self.clients.openWindow('./');
    })
  );
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
