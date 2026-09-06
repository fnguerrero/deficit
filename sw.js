/* Service worker — cachea el shell de la app para que ande offline.
   Subir la versión al cambiar cualquier archivo. */

const VERSION = 'deficit-v542';

const SHELL = [
  './',
  './index.html',
  './styles.css?v=542',
  './config.js?v=542',
  './core.js?v=542',
  './platos.js?v=542',
  './animar.js?v=542',
  './fotos.js?v=542',
  './calibracion.js?v=542',
  './modos.js?v=542',
  './arreglos.js?v=542',
  './consecuencias.js?v=542',
  './recorte.js?v=542',
  './deportes.js?v=542',
  './habitos.js?v=542',
  './mascota.js?v=542',
  './cuerpo.js?v=542',
  './cintura.js?v=542',
  './figura.js?v=542',
  './cara.js?v=542',
  './personaje.js?v=542',
  './relieve.js?v=542',
  './sprite-datos.js?v=542',
  './sprite.js?v=542',
  './img/cuerpo-0.webp',
  './img/cuerpo-1.webp',
  './img/cuerpo-2.webp',
  './img/cuerpo-3.webp',
  './img/cuerpo-4.webp',
  './img/cuerpo-5.webp',
  './img/cuerpo-6.webp',
  './transformacion.js?v=542',
  './aura.js?v=542',
  './juego.js?v=542',
  './sonidos.js?v=542',
  './voz.js?v=542',
  './graficos.js?v=542',
  './plazo.js?v=542',
  './compartir.js?v=542',
  './sugerencias.js?v=542',
  './analisis.js?v=542',
  './chequeos.js?v=542',
  './claude.js?v=542',
  './productos.js?v=542',
  './sync-perfil.js?v=542',
  './fusion-dia.js?v=542',
  './sync.js?v=542',
  './estado-sync.js?v=542',
  './auth.js?v=542',
  './app.js?v=542',
  './ui/general.js?v=542',
  './ui/hoy.js?v=542',
  './ui/peso.js?v=542',
  './ui/dia.js?v=542',
  './ui/objetivos.js?v=542',
  './ui/barra.js?v=542',
  './ui/recorte.js?v=542',
  './ui/tarjeta.js?v=542',
  './ui/comidas.js?v=542',
  './ui/edicion.js?v=542',
  './ui/resumen.js?v=542',
  './ui/escaner.js?v=542',
  './ui/asistente.js?v=542',
  './ui/historial.js?v=542',
  './ui/progreso.js?v=542',
  './ui/logros.js?v=542',
  './ui/perfil.js?v=542',
  './ui/sincronizacion.js?v=542',
  './ui/cuenta.js?v=542',
  './ui/calibracion.js?v=542',
  './ui/actividades.js?v=542',
  './ui/recordatorios.js?v=542',
  './ui/ajustes.js?v=542',
  './arranque.js?v=542',
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
