/* Service worker — cachea el shell de la app para que ande offline.
   Subir la versión al cambiar cualquier archivo. */

const VERSION = 'deficit-v479';

const SHELL = [
  './',
  './index.html',
  './styles.css?v=479',
  './config.js?v=479',
  './core.js?v=479',
  './platos.js?v=479',
  './animar.js?v=479',
  './fotos.js?v=479',
  './calibracion.js?v=479',
  './modos.js?v=479',
  './arreglos.js?v=479',
  './habitos.js?v=479',
  './mascota.js?v=479',
  './cuerpo.js?v=479',
  './cintura.js?v=479',
  './figura.js?v=479',
  './cara.js?v=479',
  './personaje.js?v=479',
  './relieve.js?v=479',
  './sprite-datos.js?v=479',
  './sprite.js?v=479',
  './img/cuerpo-0.webp',
  './img/cuerpo-1.webp',
  './img/cuerpo-2.webp',
  './img/cuerpo-3.webp',
  './img/cuerpo-4.webp',
  './img/cuerpo-5.webp',
  './img/cuerpo-6.webp',
  './transformacion.js?v=479',
  './aura.js?v=479',
  './juego.js?v=479',
  './sonidos.js?v=479',
  './voz.js?v=479',
  './graficos.js?v=479',
  './plazo.js?v=479',
  './compartir.js?v=479',
  './sugerencias.js?v=479',
  './analisis.js?v=479',
  './chequeos.js?v=479',
  './claude.js?v=479',
  './productos.js?v=479',
  './sync-perfil.js?v=479',
  './sync.js?v=479',
  './estado-sync.js?v=479',
  './auth.js?v=479',
  './app.js?v=479',
  './ui/general.js?v=479',
  './ui/hoy.js?v=479',
  './ui/dia.js?v=479',
  './ui/objetivos.js?v=479',
  './ui/tarjeta.js?v=479',
  './ui/comidas.js?v=479',
  './ui/edicion.js?v=479',
  './ui/escaner.js?v=479',
  './ui/asistente.js?v=479',
  './ui/historial.js?v=479',
  './ui/progreso.js?v=479',
  './ui/logros.js?v=479',
  './ui/perfil.js?v=479',
  './ui/sincronizacion.js?v=479',
  './ui/cuenta.js?v=479',
  './ui/calibracion.js?v=479',
  './ui/actividades.js?v=479',
  './ui/recordatorios.js?v=479',
  './ui/ajustes.js?v=479',
  './arranque.js?v=479',
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
