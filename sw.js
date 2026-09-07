/* Service worker — cachea el shell de la app para que ande offline.
   Subir la versión al cambiar cualquier archivo. */

/* La accion pendiente vive en IndexedDB, que es lo unico que el service worker
   y la app comparten de verdad. */
importScripts('./pendiente.js');

const VERSION = 'deficit-v632';

const SHELL = [
  './',
  './index.html',
  './styles.css?v=632',
  './config.js?v=632',
  './fechas.js?v=632',
  './frecuentes.js?v=632',
  './core.js?v=632',
  './platos.js?v=632',
  './animar.js?v=632',
  './fotos.js?v=632',
  './calibracion.js?v=632',
  './modos.js?v=632',
  './patrones.js?v=632',
  './arreglos.js?v=632',
  './consecuencias.js?v=632',
  './recorte.js?v=632',
  './push.js?v=632',
  './tira-aviso.js?v=632',
  './pendiente.js?v=632',
  './deportes.js?v=632',
  './habitos.js?v=632',
  './mascota.js?v=632',
  './cuerpo.js?v=632',
  './cintura.js?v=632',
  './figura.js?v=632',
  './cara.js?v=632',
  './personaje.js?v=632',
  './relieve.js?v=632',
  './sprite-datos.js?v=632',
  './sprite.js?v=632',
  './img/cuerpo-0.webp',
  './img/cuerpo-1.webp',
  './img/cuerpo-2.webp',
  './img/cuerpo-3.webp',
  './img/cuerpo-4.webp',
  './img/cuerpo-5.webp',
  './img/cuerpo-6.webp',
  './transformacion.js?v=632',
  './aura.js?v=632',
  './logros.js?v=632',
  './juego.js?v=632',
  './sonidos.js?v=632',
  './voz.js?v=632',
  './graficos.js?v=632',
  './plazo.js?v=632',
  './compartir.js?v=632',
  './sugerencias.js?v=632',
  './analisis.js?v=632',
  './informe.js?v=632',
  './chequeos.js?v=632',
  './optimo.js?v=632',
  './claude.js?v=632',
  './productos.js?v=632',
  './sync-perfil.js?v=632',
  './fusion-dia.js?v=632',
  './sync.js?v=632',
  './estado-sync.js?v=632',
  './auth.js?v=632',
  './app.js?v=632',
  './ui/general.js?v=632',
  './ui/hoy.js?v=632',
  './ui/peso.js?v=632',
  './ui/dia.js?v=632',
  './ui/objetivos.js?v=632',
  './ui/barra.js?v=632',
  './ui/recorte.js?v=632',
  './ui/push.js?v=632',
  './ui/tarjeta.js?v=632',
  './ui/comidas.js?v=632',
  './ui/edicion.js?v=632',
  './ui/resumen.js?v=632',
  './ui/escaner.js?v=632',
  './ui/asistente.js?v=632',
  './ui/historial.js?v=632',
  './ui/progreso.js?v=632',
  './ui/logros.js?v=632',
  './ui/perfil.js?v=632',
  './ui/sincronizacion.js?v=632',
  './ui/cuenta.js?v=632',
  './ui/calibracion.js?v=632',
  './ui/actividades.js?v=632',
  './ui/recordatorios.js?v=632',
  './ui/ajustes.js?v=632',
  './arranque.js?v=632',
  './manifest.json',
  './icons/icon-192.png',
  './icons/badge-96.png',
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
/* El tag del aviso fijo. Vive aca repetido —en la app es TAG_OBJETIVOS— porque
   el service worker no comparte codigo con ella. */
const TAG_FIJO = 'deficit-objetivos';

/*
 * Vuelve a poner el aviso fijo, identico, apenas se lo toca.
 *
 * Android CIERRA la notificacion al tocarla y eso no se puede evitar: no
 * alcanza con no llamar a close(), lo hace el sistema. Lo unico que queda es
 * volver a mostrarla, y se puede porque el evento trae la notificacion que se
 * esta yendo con todo adentro —titulo, cuerpo, imagen y botones—. Mismo tag,
 * asi que ocupa el lugar de la anterior en vez de apilarse.
 */
function reponerAviso(n) {
  return self.registration.showNotification(n.title, {
    body: n.body,
    icon: n.icon,
    badge: n.badge,
    image: n.image,
    tag: n.tag,
    actions: n.actions,
    data: n.data,
    renotify: false,
    silent: true,
    requireInteraction: true
  });
}

self.addEventListener('notificationclick', (e) => {
  /* Los recordatorios puntuales se cierran y listo: dicen una cosa una vez. El
     fijo es un tablero y tiene que seguir ahi despues de usarlo. */
  const fijo = e.notification.tag === TAG_FIJO;
  const copia = fijo ? {
    title: e.notification.title,
    body: e.notification.body,
    icon: e.notification.icon,
    badge: e.notification.badge,
    image: e.notification.image,
    tag: e.notification.tag,
    actions: e.notification.actions,
    data: e.notification.data
  } : null;

  e.notification.close();

  /* Los botones del aviso. El service worker no puede tocar el estado —vive en
     localStorage y aca no existe—, asi que la accion viaja en la URL y la app
     la ejecuta al arrancar. Si ya hay una ventana abierta se le avisa por
     mensaje, que es mas rapido que recargarla. */
  const accion = e.action || '';
  const destino = accion ? `./?hacer=${accion}` : './';

  e.waitUntil((async () => {
    if (copia) await reponerAviso(copia);

    /* La accion se anota en IndexedDB ANTES de abrir nada: es lo unico que
       sobrevive a que la app este abierta con codigo viejo, a que el sistema
       recorte el parametro de la URL o a que el mensaje llegue antes de que la
       app tenga el listener puesto. La app la toma y la borra. */
    if (accion) await anotarPendiente(accion).catch(() => {});

    const lista = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const abierta = lista.find(c => c.url.includes(self.registration.scope));
    if (abierta) {
      if (accion) abierta.postMessage({ tipo: 'hacer', accion });
      return abierta.focus();
    }
    return self.clients.openWindow(destino);
  })());
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
    // blanco sobre transparente: Android lo pinta como silueta. Ver gen_iconos.py
    badge: 'icons/badge-96.png',
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
