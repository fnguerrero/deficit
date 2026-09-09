/* ============================================================
   pendiente.js — lo que quedo por hacer desde una notificacion.

   El service worker no puede tocar el estado de la app: `localStorage` no
   existe ahi. Lo que si comparten los dos es IndexedDB, asi que la accion se
   deja anotada en una base minima y la app la aplica cuando arranca o cuando
   vuelve al frente.

   Es el camino MAS robusto de los tres que hay \u2014el parametro en la URL, el
   postMessage a una ventana abierta y esto\u2014 porque no depende de que la app
   este cargada ni de que reciba el mensaje a tiempo: la accion espera en disco.
   ============================================================ */

const BASE_PENDIENTE = 'deficit-pendiente';
const TIENDA_PENDIENTE = 'acciones';

function abrirBasePendiente() {
  return new Promise((res, rej) => {
    if (typeof indexedDB === 'undefined') { rej(new Error('sin IndexedDB')); return; }
    const pedido = indexedDB.open(BASE_PENDIENTE, 1);
    pedido.onupgradeneeded = () => {
      const db = pedido.result;
      if (!db.objectStoreNames.contains(TIENDA_PENDIENTE)) db.createObjectStore(TIENDA_PENDIENTE);
    };
    pedido.onsuccess = () => res(pedido.result);
    pedido.onerror = () => rej(pedido.error || new Error('no abrio'));
  });
}

function usarTienda(modo, fn) {
  return abrirBasePendiente().then(db => new Promise((res, rej) => {
    const tx = db.transaction(TIENDA_PENDIENTE, modo);
    const pedido = fn(tx.objectStore(TIENDA_PENDIENTE));
    pedido.onsuccess = () => res(pedido.result);
    pedido.onerror = () => rej(pedido.error);
    tx.oncomplete = () => db.close();
  }));
}

/** Anota una accion para cuando la app pueda. */
function anotarPendiente(accion, ahora = Date.now()) {
  return usarTienda('readwrite', t => t.put({ accion, ts: ahora }, 'ultima'))
    .catch(() => null);
}

/**
 * Devuelve la accion anotada y la borra. Se lee una sola vez: si quedara,
 * cada vez que la app vuelve al frente sumaria otro vaso.
 *
 * Vieja no vale: una accion de hace horas es de una notificacion que quedo
 * colgada, y aplicarla al abrir la app manana sumaria un vaso de ayer.
 */
function tomarPendiente({ ahora = Date.now(), vence = 10 * 60 * 1000 } = {}) {
  return usarTienda('readonly', t => t.get('ultima'))
    .then(guardado => usarTienda('readwrite', t => t.delete('ultima')).then(() => guardado))
    .then(guardado => {
      if (!guardado || !guardado.accion) return null;
      if (ahora - (guardado.ts || 0) > vence) return null;
      return guardado.accion;
    })
    .catch(() => null);
}

/* ---------------- la foto que llego compartida ---------------- */

/*
 * Una foto que Android le paso a la app desde otra —la galeria, WhatsApp— con
 * el boton Compartir.
 *
 * Va por el mismo camino que la accion pendiente y por el mismo motivo: el
 * service worker atiende ese POST sin que la app exista todavia, y IndexedDB es
 * lo unico que los dos comparten. Se guarda el Blob entero: pasarlo por la URL
 * no entra, y por postMessage se pierde si la app tarda en arrancar.
 */
function anotarFotoCompartida(blob, ahora = Date.now()) {
  return usarTienda('readwrite', t => t.put({ blob, ts: ahora }, 'foto')).catch(() => null);
}

/** La devuelve y la borra: una foto compartida se analiza una sola vez. */
function tomarFotoCompartida({ ahora = Date.now(), vence = 10 * 60 * 1000 } = {}) {
  return usarTienda('readonly', t => t.get('foto'))
    .then(g => usarTienda('readwrite', t => t.delete('foto')).then(() => g))
    .then(g => {
      if (!g || !g.blob) return null;
      /* Vieja no vale, igual que la accion: una foto compartida hace horas es de
         un plato que ya no existe. */
      if (ahora - (g.ts || 0) > vence) return null;
      return g.blob;
    })
    .catch(() => null);
}

