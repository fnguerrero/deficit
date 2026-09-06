/* Service worker — cachea el shell de la app para que ande offline.
   Subir la versión al cambiar cualquier archivo. */

const VERSION = 'deficit-v518';

const SHELL = [
  './',
  './index.html',
  './styles.css?v=518',
  './config.js?v=518',
  './core.js?v=518',
  './platos.js?v=518',
  './animar.js?v=518',
  './fotos.js?v=518',
  './calibracion.js?v=518',
  './modos.js?v=518',
  './arreglos.js?v=518',
  './consecuencias.js?v=518',
  './recorte.js?v=518',
  './habitos.js?v=518',
  './mascota.js?v=518',
  './cuerpo.js?v=518',
  './cintura.js?v=518',
  './figura.js?v=518',
  './cara.js?v=518',
  './personaje.js?v=518',
  './relieve.js?v=518',
  './sprite-datos.js?v=518',
  './sprite.js?v=518',
  './img/cuerpo-0.webp',
  './img/cuerpo-1.webp',
  './img/cuerpo-2.webp',
  './img/cuerpo-3.webp',
  './img/cuerpo-4.webp',
  './img/cuerpo-5.webp',
  './img/cuerpo-6.webp',
  './transformacion.js?v=518',
  './aura.js?v=518',
  './juego.js?v=518',
  './sonidos.js?v=518',
  './voz.js?v=518',
  './graficos.js?v=518',
  './plazo.js?v=518',
  './compartir.js?v=518',
  './sugerencias.js?v=518',
  './analisis.js?v=518',
  './chequeos.js?v=518',
  './claude.js?v=518',
  './productos.js?v=518',
  './sync-perfil.js?v=518',
  './sync.js?v=518',
  './estado-sync.js?v=518',
  './auth.js?v=518',
  './app.js?v=518',
  './ui/general.js?v=518',
  './ui/hoy.js?v=518',
  './ui/dia.js?v=518',
  './ui/objetivos.js?v=518',
  './ui/barra.js?v=518',
  './ui/recorte.js?v=518',
  './ui/tarjeta.js?v=518',
  './ui/comidas.js?v=518',
  './ui/edicion.js?v=518',
  './ui/resumen.js?v=518',
  './ui/escaner.js?v=518',
  './ui/asistente.js?v=518',
  './ui/historial.js?v=518',
  './ui/progreso.js?v=518',
  './ui/logros.js?v=518',
  './ui/perfil.js?v=518',
  './ui/sincronizacion.js?v=518',
  './ui/cuenta.js?v=518',
  './ui/calibracion.js?v=518',
  './ui/actividades.js?v=518',
  './ui/recordatorios.js?v=518',
  './ui/ajustes.js?v=518',
  './arranque.js?v=518',
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
