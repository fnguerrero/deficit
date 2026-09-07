/* Service worker — cachea el shell de la app para que ande offline.
   Subir la versión al cambiar cualquier archivo. */

const VERSION = 'deficit-v574';

const SHELL = [
  './',
  './index.html',
  './styles.css?v=574',
  './config.js?v=574',
  './core.js?v=574',
  './platos.js?v=574',
  './animar.js?v=574',
  './fotos.js?v=574',
  './calibracion.js?v=574',
  './modos.js?v=574',
  './arreglos.js?v=574',
  './consecuencias.js?v=574',
  './recorte.js?v=574',
  './push.js?v=574',
  './deportes.js?v=574',
  './habitos.js?v=574',
  './mascota.js?v=574',
  './cuerpo.js?v=574',
  './cintura.js?v=574',
  './figura.js?v=574',
  './cara.js?v=574',
  './personaje.js?v=574',
  './relieve.js?v=574',
  './sprite-datos.js?v=574',
  './sprite.js?v=574',
  './img/cuerpo-0.webp',
  './img/cuerpo-1.webp',
  './img/cuerpo-2.webp',
  './img/cuerpo-3.webp',
  './img/cuerpo-4.webp',
  './img/cuerpo-5.webp',
  './img/cuerpo-6.webp',
  './transformacion.js?v=574',
  './aura.js?v=574',
  './juego.js?v=574',
  './sonidos.js?v=574',
  './voz.js?v=574',
  './graficos.js?v=574',
  './plazo.js?v=574',
  './compartir.js?v=574',
  './sugerencias.js?v=574',
  './analisis.js?v=574',
  './chequeos.js?v=574',
  './claude.js?v=574',
  './productos.js?v=574',
  './sync-perfil.js?v=574',
  './fusion-dia.js?v=574',
  './sync.js?v=574',
  './estado-sync.js?v=574',
  './auth.js?v=574',
  './app.js?v=574',
  './ui/general.js?v=574',
  './ui/hoy.js?v=574',
  './ui/peso.js?v=574',
  './ui/dia.js?v=574',
  './ui/objetivos.js?v=574',
  './ui/barra.js?v=574',
  './ui/recorte.js?v=574',
  './ui/push.js?v=574',
  './ui/tarjeta.js?v=574',
  './ui/comidas.js?v=574',
  './ui/edicion.js?v=574',
  './ui/resumen.js?v=574',
  './ui/escaner.js?v=574',
  './ui/asistente.js?v=574',
  './ui/historial.js?v=574',
  './ui/progreso.js?v=574',
  './ui/logros.js?v=574',
  './ui/perfil.js?v=574',
  './ui/sincronizacion.js?v=574',
  './ui/cuenta.js?v=574',
  './ui/calibracion.js?v=574',
  './ui/actividades.js?v=574',
  './ui/recordatorios.js?v=574',
  './ui/ajustes.js?v=574',
  './arranque.js?v=574',
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

/*
 * El aviso que llega con la app cerrada: el unico camino real en una PWA, donde
 * los `setTimeout` mueren al cerrarse y nadie despierta al telefono.
 *
 * Viaja SIN texto a proposito: mandarlo con contenido obliga a encriptar el
 * cuerpo con la clave del dispositivo (RFC 8291), y lo que hay que decir se
 * arma igual de bien aca con la hora del telefono. Menos codigo del lado
 * servidor, y ningun dato de comidas saliendo a un tercero.
 */
const MOMENTOS_SW = [
  { hasta: 11 * 60 + 29, texto: '¿Ya desayunaste? Cargá la foto y seguí con lo tuyo.' },
  { hasta: 16 * 60 + 29, texto: '¿Ya almorzaste? Una foto y listo.' },
  { hasta: 20 * 60 + 29, texto: '¿Merendaste algo? Anotalo antes de que se te pase.' },
  { hasta: 24 * 60, texto: '¿Y la cena? Con eso el día queda cerrado.' }
];

function textoDelAviso(datos) {
  if (datos) {
    try {
      const j = datos.json();
      if (j && j.cuerpo) return { titulo: j.titulo || 'Déficit', cuerpo: j.cuerpo };
    } catch { /* sin json usable, se arma abajo */ }
  }

  const ahora = new Date();
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  const m = MOMENTOS_SW.find(x => minutos <= x.hasta) || MOMENTOS_SW[MOMENTOS_SW.length - 1];
  return { titulo: 'Déficit', cuerpo: m.texto };
}

self.addEventListener('push', (e) => {
  const { titulo, cuerpo } = textoDelAviso(e.data);
  e.waitUntil(self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    // reemplaza al anterior en vez de apilar cuatro carteles en el dia
    tag: 'deficit-recordatorio'
  }));
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
