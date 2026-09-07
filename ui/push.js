/* ============================================================
   ui/push.js — prender y apagar los avisos con la app cerrada.

   Lo puro esta en push.js. Aca queda lo que necesita navegador: pedir permiso,
   suscribirse contra el service worker y dejar la direccion guardada del lado
   servidor, que es quien despues golpea.
   ============================================================ */

/** Todo lo que tiene que estar para siquiera ofrecerlo. */
function hayPushDisponible() {
  return !!(typeof CONFIG_APP !== 'undefined' && CONFIG_APP.vapidPublica &&
    typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window);
}

async function suscripcionActual() {
  if (!hayPushDisponible()) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg?.pushManager ? reg.pushManager.getSubscription() : null;
}

/**
 * Prende los avisos de fondo.
 *
 * Tres cosas tienen que salir bien y las tres pueden fallar aparte: el permiso
 * del navegador, la suscripcion contra el servicio de push del fabricante, y
 * guardar la direccion en Supabase. Si la tercera falla, la suscripcion se
 * cancela: dejarla viva sin que el servidor la conozca es prometer un aviso que
 * no va a llegar nunca.
 */
async function prenderAvisosDeFondo() {
  if (!hayPushDisponible()) return { ok: false, motivo: 'Este navegador no puede avisarte con la app cerrada.' };

  const permiso = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permiso !== 'granted') return { ok: false, motivo: 'Sin permiso de notificaciones no hay aviso posible.' };

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg?.pushManager) return { ok: false, motivo: 'La app todavía no terminó de instalarse. Probá de nuevo en un rato.' };

  let sub;
  try {
    sub = await reg.pushManager.getSubscription() ||
      await reg.pushManager.subscribe({
        /* Obligatorio en Chrome: cada push tiene que terminar en algo visible.
           Es justo lo que queremos, asi que no cuesta nada. */
        userVisibleOnly: true,
        applicationServerKey: claveAplicacion(CONFIG_APP.vapidPublica)
      });
  } catch (e) {
    return { ok: false, motivo: 'El navegador rechazó la suscripción: ' + (e.message || e) };
  }

  const guardado = await guardarSuscripcion(sub.toJSON());
  if (!guardado.ok) {
    await sub.unsubscribe().catch(() => { /* si no se puede, igual no se guardo */ });
    return guardado;
  }

  return { ok: true };
}

async function guardarSuscripcion(sub) {
  const cfg = configSync();
  if (!cfg.url || !cfg.anonKey) {
    return { ok: false, motivo: 'Hace falta la sincronización configurada: el aviso lo manda el servidor.' };
  }

  const fila = filaDeSuscripcion(sub, {
    llave: llaveDeEsteDispositivo(),
    horarios: state.cfg.horarios || [],
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  });
  if (!fila) return { ok: false, motivo: 'La suscripción vino incompleta.' };

  try {
    const cliente = clienteSupabase({ url: cfg.url, anonKey: cfg.anonKey, fetchFn: fetch.bind(window) });
    await cliente.guardar('push_subs', [fila]);
    return { ok: true };
  } catch (e) {
    /* El caso mas probable: la tabla todavia no existe. Se dice con todas las
       letras —y nombrando el archivo correcto— en vez del error generico del
       cliente, que habla de supabase.sql y manda a buscar donde no es. */
    const falta = /push_subs|does not exist|relation|no encontré las tablas|404/i.test(e.message || '');
    return {
      ok: false,
      motivo: falta
        ? 'Falta crear la tabla push_subs en Supabase (supabase-push.sql).'
        : 'No se pudo guardar la suscripción: ' + (e.message || e)
    };
  }
}

/** Apagarlos: se cancela en el navegador y se borra del servidor. */
async function apagarAvisosDeFondo() {
  const sub = await suscripcionActual();
  if (!sub) return { ok: true };

  const cfg = configSync();
  try {
    if (cfg.url && cfg.anonKey) {
      const cliente = clienteSupabase({ url: cfg.url, anonKey: cfg.anonKey, fetchFn: fetch.bind(window) });
      await cliente.borrar('push_subs', { endpoint: sub.endpoint });
    }
  } catch { /* si no se puede borrar alla, igual se cancela aca */ }

  await sub.unsubscribe().catch(() => { /* ya estaba muerta */ });
  return { ok: true };
}

/* ---------------- el interruptor ---------------- */

/*
 * Aparece solo si el push esta configurado: sin la clave publica en config.js
 * no hay nada que ofrecer, y un interruptor que no puede funcionar es peor que
 * ninguno. Debajo dice en que estado esta, que es lo unico que se puede mirar
 * desde afuera para saber si el aviso va a llegar.
 */
async function renderPush() {
  const fila = $('filaPush');
  const info = $('pushInfo');
  if (!fila) return;

  fila.hidden = !hayPushDisponible();
  if (fila.hidden) {
    if (info) info.textContent = '';
    return;
  }

  const sub = await suscripcionActual();
  $('chkPush').checked = !!sub;
  if (info) {
    info.textContent = sub
      ? 'Listo: los avisos salen del servidor, con la app cerrada.'
      : 'Los de arriba solo llegan con la app abierta. Con esto prendido, el aviso te llega igual.';
  }
}

if ($('chkPush')) {
  $('chkPush').onchange = async (e) => {
    const prender = e.target.checked;
    e.target.disabled = true;

    const r = prender ? await prenderAvisosDeFondo() : await apagarAvisosDeFondo();
    e.target.disabled = false;

    if (!r.ok) {
      e.target.checked = false;
      toast(r.motivo);
    } else {
      toast(prender ? 'Listo, te aviso aunque la cierres' : 'Avisos de fondo apagados');
    }
    renderPush();
  };
}

/*
 * Los horarios cambiaron: si los avisos de fondo estan prendidos, el servidor
 * tiene que enterarse. Sin esto, apagar la merienda la seguia mandando hasta la
 * proxima vez que alguien tocara el interruptor grande.
 */
async function actualizarPushSiEstaPrendido() {
  const sub = await suscripcionActual();
  if (sub) await guardarSuscripcion(sub.toJSON());
}
