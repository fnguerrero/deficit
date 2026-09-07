/* Service worker — cachea el shell de la app para que ande offline.
   Subir la versión al cambiar cualquier archivo. */

const VERSION = 'deficit-v570';

const SHELL = [
  './',
  './index.html',
  './styles.css?v=570',
  './config.js?v=570',
  './core.js?v=570',
  './platos.js?v=570',
  './animar.js?v=570',
  './fotos.js?v=570',
  './calibracion.js?v=570',
  './modos.js?v=570',
  './arreglos.js?v=570',
  './consecuencias.js?v=570',
  './recorte.js?v=570',
  './deportes.js?v=570',
  './habitos.js?v=570',
  './mascota.js?v=570',
  './cuerpo.js?v=570',
  './cintura.js?v=570',
  './figura.js?v=570',
  './cara.js?v=570',
  './personaje.js?v=570',
  './relieve.js?v=570',
  './sprite-datos.js?v=570',
  './sprite.js?v=570',
  './img/cuerpo-0.webp',
  './img/cuerpo-1.webp',
  './img/cuerpo-2.webp',
  './img/cuerpo-3.webp',
  './img/cuerpo-4.webp',
  './img/cuerpo-5.webp',
  './img/cuerpo-6.webp',
  './transformacion.js?v=570',
  './aura.js?v=570',
  './juego.js?v=570',
  './sonidos.js?v=570',
  './voz.js?v=570',
  './graficos.js?v=570',
  './plazo.js?v=570',
  './compartir.js?v=570',
  './sugerencias.js?v=570',
  './analisis.js?v=570',
  './chequeos.js?v=570',
  './claude.js?v=570',
  './productos.js?v=570',
  './sync-perfil.js?v=570',
  './fusion-dia.js?v=570',
  './sync.js?v=570',
  './estado-sync.js?v=570',
  './auth.js?v=570',
  './app.js?v=570',
  './ui/general.js?v=570',
  './ui/hoy.js?v=570',
  './ui/peso.js?v=570',
  './ui/dia.js?v=570',
  './ui/objetivos.js?v=570',
  './ui/barra.js?v=570',
  './ui/recorte.js?v=570',
  './ui/tarjeta.js?v=570',
  './ui/comidas.js?v=570',
  './ui/edicion.js?v=570',
  './ui/resumen.js?v=570',
  './ui/escaner.js?v=570',
  './ui/asistente.js?v=570',
  './ui/historial.js?v=570',
  './ui/progreso.js?v=570',
  './ui/logros.js?v=570',
  './ui/perfil.js?v=570',
  './ui/sincronizacion.js?v=570',
  './ui/cuenta.js?v=570',
  './ui/calibracion.js?v=570',
  './ui/actividades.js?v=570',
  './ui/recordatorios.js?v=570',
  './ui/ajustes.js?v=570',
  './arranque.js?v=570',
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
