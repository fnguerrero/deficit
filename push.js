/* ============================================================
   push.js — los avisos que llegan con la app cerrada.

   Lo que hay hoy son `setTimeout` con la app abierta: si el telefono esta
   guardado, no avisa nada. Un aviso que solo llega cuando ya estas mirando la
   app no es un recordatorio.

   La unica forma real en una PWA es Web Push: el navegador le da a la app una
   direccion propia \u2014el "endpoint"\u2014, esa direccion se guarda del lado servidor
   y el servidor le golpea cuando corresponde. El telefono despierta el service
   worker aunque la app este cerrada.

   Aca vive lo que se puede probar sin navegador: convertir la clave, armar la
   fila que se guarda y decidir a que hora toca avisar.
   ============================================================ */

/**
 * La clave publica VAPID, de base64url al arreglo de bytes que pide el
 * navegador. `applicationServerKey` no acepta el string: quiere los 65 bytes.
 */
function claveAplicacion(base64url) {
  const txt = String(base64url || '').trim();
  if (!txt) return null;

  /* base64url usa - y _ donde base64 usa + y /, y viene sin relleno. */
  const relleno = '='.repeat((4 - (txt.length % 4)) % 4);
  const normal = (txt + relleno).replace(/-/g, '+').replace(/_/g, '/');

  let crudo;
  try {
    crudo = atob(normal);
  } catch {
    return null;
  }

  const bytes = new Uint8Array(crudo.length);
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i);
  return bytes;
}

/**
 * La fila que se guarda del lado servidor.
 *
 * Va la llave de sincronizacion y no el mail: es la misma que ya identifica al
 * dispositivo para las comidas, y no agrega un dato personal nuevo a una tabla
 * que solo necesita saber a donde golpear y cuando.
 *
 * Los horarios viajan con la suscripcion porque el servidor tiene que decidir
 * SIN la app: si los tuviera solo el telefono, habria que despertarlo para
 * saber a que hora despertarlo.
 */
function filaDeSuscripcion(sub, { llave, horarios = [], tz = '', ahora = Date.now() } = {}) {
  const endpoint = sub?.endpoint || '';
  if (!endpoint || !llave) return null;

  return {
    llave,
    endpoint,
    p256dh: sub?.keys?.p256dh || '',
    auth: sub?.keys?.auth || '',
    /* Solo los prendidos y con hora valida: mandar al servidor un aviso apagado
       es pedirle que despierte el telefono para nada. */
    horarios: (horarios || []).filter(h => h && h.activo !== false && /^\d{2}:\d{2}$/.test(h.hora)),
    tz: tz || '',
    act: ahora
  };
}

/**
 * Si a esta hora local le toca un aviso.
 *
 * `ventana` es cada cuanto corre el reloj del servidor: con 15 minutos, un
 * aviso de las 13:30 tiene que dispararse en la corrida de las 13:30 y en
 * ninguna otra. Se compara contra el minuto del dia para no pelear con husos
 * ni con cambios de fecha.
 */
function tocaAvisar(horaTexto, minutosLocales, ventana = 15) {
  const m = /^(\d{2}):(\d{2})$/.exec(String(horaTexto || ''));
  if (!m) return false;

  const objetivo = Number(m[1]) * 60 + Number(m[2]);
  const ahora = Number(minutosLocales);
  if (!(ahora >= 0)) return false;

  const diferencia = ((ahora - objetivo) % 1440 + 1440) % 1440;
  return diferencia < ventana;
}
