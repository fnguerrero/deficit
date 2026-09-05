/* ============================================================
   ui/resumen.js — lo que se ve DESPUES de que la comida se guardo sola.

   Salió de ui/edicion.js al pasar su límite, y el corte estaba a la vista:
   antes de guardar se edita —los alimentos, las cantidades, el total—, y
   después ya no se edita nada, se lee. Este archivo es ese segundo momento:
   qué entendió el análisis, cuánto sumó, si entra en el modo, qué significa
   eso para el día, y las dos salidas que quedan —elegir de qué era el plato o
   corregir cuánto comiste—.
   ============================================================ */

/**
 * El resumen de lo que se guardó solo.
 *
 * Como ya no hay pantalla de revisión, este aviso es lo único que la persona ve
 * del análisis: tiene que decir qué entendió, cuánto sumó, si entra en el modo,
 * y dejar la puerta abierta para corregirlo.
 */
function avisarComidaGuardada({ titulo, kcal, comida, id }) {
  /* El resto del día ya incluye esta comida, así que para juzgarla se descuenta:
     si no, en keto una comida se compararía contra sus propios carbohidratos. */
  const hoy = totalesDia();
  const previo = { carb: Math.max(0, (hoy.carb || 0) - (comida.carb || 0)) };

  const v = comidaApta(comida, state.perfil.modo, calcular(), previo);
  /* La comida viaja con el veredicto: el consejo necesita los alimentos, y sin
     ellos solo se puede repetir que no entra. */
  mostrarResumenComida({ titulo, kcal, veredicto: { ...v, comida, previo }, etiqueta: etiquetaApta(v, state.perfil.modo), id });
}

/* ---------------- lo que la foto no puede mostrar ---------------- */

/*
 * La pregunta que la app no puede contestar sola.
 *
 * Unas empanadas de carne y unas de humita son la misma foto. Hasta acá el
 * modelo elegía la más probable y lo dejaba escrito en las notas, donde nadie
 * lo lee, y el número quedaba mal sin que nadie se enterara.
 *
 * Aparece DESPUÉS de guardar y no antes, a propósito. La comida ya quedó
 * registrada con la opción más probable: si nadie toca nada, no pasa nada malo.
 * Preguntar antes de guardar sería volver al peaje que sacamos ayer —foto,
 * espera, formulario— por un caso que ni siquiera es el más común.
 */
function pintarDuda(comida, id) {
  const caja = $('resumenDuda');
  if (!caja) return;

  const amb = comida?.ambiguedad;
  caja.hidden = !hayQuePreguntar(amb);
  if (caja.hidden) return;

  $('resumenDudaTxt').textContent = amb.pregunta;

  const cont = $('resumenDudaOpciones');
  cont.innerHTML = '';

  amb.opciones.forEach((op, i) => {
    const b = document.createElement('button');
    /* La elegida se marca: sin eso, después de tocar una no hay forma de saber
       cuál quedó, y la pregunta parece seguir abierta. */
    const elegida = (amb.elegida ?? 0) === i;
    b.className = 'duda-opcion' + (elegida ? ' elegida' : '');
    b.innerHTML = `${op.etiqueta}<small>${fmtNum(Math.round(op.calorias))} kcal</small>`;
    b.onclick = () => elegirOpcion(id, i);
    cont.appendChild(b);
  });
}

/**
 * Aplica la opción sobre la comida YA guardada y vuelve a pintar el resumen.
 *
 * Todo local: los números de cada variante vinieron en el mismo análisis, así
 * que cambiar de opción no cuesta una llamada ni una espera.
 */
function elegirOpcion(id, indice) {
  const d = dia();
  const pos = (d.comidas || []).findIndex(c => c.id === id);
  if (pos < 0) return;

  const nueva = aplicarOpcion(d.comidas[pos], indice);
  d.comidas[pos] = { ...d.comidas[pos], ...nueva };
  d.act = Date.now();
  save();
  renderHoy();

  /* Se vuelve a pintar el resumen entero y no solo el número: el veredicto del
     modo puede haber cambiado con la elección, que es medio el punto —unas de
     humita tienen bastante más carbohidrato que unas de carne. */
  const c = d.comidas[pos];
  avisarComidaGuardada({ titulo: c.titulo, kcal: c.kcal, comida: c, id });
  toast(c.ambiguedad?.opciones?.[indice]?.etiqueta || 'Actualizado');
}

/* ---------------- el resumen de lo que se guardó ---------------- */

function mostrarResumenComida({ titulo, kcal, veredicto, etiqueta, id }) {
  $('resumenTitulo').textContent = titulo;
  contarHasta($('resumenKcal'), Math.round(kcal), { formato: (v) => fmtNum(Math.round(v)) });
  pintarPorciones(id, kcal);

  const marca = $('resumenApta');
  if (etiqueta) {
    marca.textContent = etiqueta;
    marca.className = 'marca-apta grande ' + (veredicto.nivel === 'si' ? '' : veredicto.nivel);
    marca.hidden = false;
  } else {
    marca.hidden = true;
  }

  /*
   * Y qué hacer al respecto.
   *
   * Un cartel que dice "no entra" y nada más deja a la persona en el peor
   * lugar: sabe que está mal y no sabe qué hacer. Cuando el exceso es de
   * cantidad casi siempre alcanza con sacar algo, y eso se puede calcular.
   */
  pintarDuda(veredicto.comida, id);

  /* El campo para aclararle qué era: solo si la foto sigue en memoria. Sin la
     imagen no hay nada que volver a analizar, y ofrecerlo sería una promesa
     que la app no puede cumplir. */
  const aclarar = $('resumenAclarar');
  if (aclarar) {
    aclarar.hidden = !(typeof ultimaImagen !== 'undefined' && ultimaImagen);
    $('aclaraTxt').value = '';
    comidaAAclarar = id;
  }

  const consejo = $('resumenConsejo');
  const efecto = $('resumenEfecto');
  if (veredicto.nivel === 'no' && veredicto.comida) {
    const c = comoHacerlaApta(veredicto.comida, state.perfil.modo, calcular(), veredicto.previo);
    consejo.textContent = c.texto;
    consejo.className = 'consejo-apta' + (c.posible ? '' : ' sin-vuelta');
    consejo.hidden = !c.texto;

    /* Y que significa para el dia. Va aparte del consejo a proposito: una cosa
       es como arreglar la comida y otra es que pasa si no se arregla, y
       mezclarlas hacia que la segunda —que casi siempre es tranquilizadora— se
       leyera como parte del reto. */
    if (efecto) {
      efecto.textContent = consecuenciaNoApta(dia(), state.perfil.modo, calcular());
      efecto.hidden = !efecto.textContent;
    }
  } else {
    consejo.hidden = true;
    if (efecto) efecto.hidden = true;
  }

  $('resumenIcono').textContent = veredicto?.nivel === 'no' ? '⚠️' : '✓';
  $('resumenMotivo').textContent = veredicto?.motivo || '';

  $('btnResumenEditar').onclick = () => {
    cerrarResumen();
    if (id) editarComida(id);
  };

  abrirCapa('modalResumen');
  tomarFoco($('modalResumen'));
}

/*
 * Los botones de "cuánto comiste".
 *
 * Reescalan la comida YA GUARDADA, en el acto. El plato pudo estar perfectamente
 * entendido y aun así uno comió dos tercios: sin esto hay que abrir la edición y
 * dividir a mano seis números, y nadie hace eso dos veces.
 *
 * Se aplican sobre lo estimado original y no sobre lo que quedó de la última
 * vez: tocar ½ y después ¾ tiene que dar tres cuartos de la estimación, no tres
 * cuartos de la mitad.
 */
function pintarPorciones(id, kcalOriginal) {
  const cont = $('resumenPorciones');
  if (!cont) return;

  cont.innerHTML = '';
  if (!id) { cont.hidden = true; return; }
  cont.hidden = false;

  const original = comidaPorId(id);
  if (!original) { cont.hidden = true; return; }

  /*
   * La base es SIEMPRE la porción entera, reconstruida desde el factor guardado.
   *
   * Antes la base era lo que estuviera guardado, así que los factores se
   * encadenaban: media porción de media porción daba un cuarto, y tocar "1"
   * después de haber puesto "½" no devolvía a las 800 kcal originales sino a
   * las 400. La porción tiene que ser una elección reversible, no un descuento
   * que se aplica de nuevo cada vez.
   */
  const factorActual = Number(original.porcionFactor) > 0 ? Number(original.porcionFactor) : 1;
  const base = factorActual === 1 ? clonar(original) : escalarComida(clonar(original), 1 / factorActual);

  for (const p of PORCIONES) {
    const b = document.createElement('button');
    b.textContent = p.txt;
    b.setAttribute('aria-label', `Comí ${p.txt} de lo estimado`);
    /* Y queda marcada la que está puesta, no siempre la entera. */
    b.className = p.f === factorActual ? 'elegida' : '';

    b.onclick = () => {
      const d = dia();
      const pos = (d.comidas || []).findIndex(c => c.id === id);
      if (pos < 0) return;

      const escalada = escalarComida(base, p.f);
      d.comidas[pos] = { ...escalada, id, ts: d.comidas[pos].ts, porcionFactor: p.f, act: Date.now() };
      save(); renderHoy(); renderHistorial();

      contarHasta($('resumenKcal'), escalada.kcal, { formato: (v) => fmtNum(Math.round(v)) });
      cont.querySelectorAll('button').forEach(x => x.classList.toggle('elegida', x === b));
      pop(b);
    };
    cont.appendChild(b);
  }
}

/** La comida de hoy con ese id, si sigue estando. */
function comidaPorId(id) {
  return (dia().comidas || []).find(c => c.id === id) || null;
}

function cerrarResumen() {
  $('modalResumen').classList.remove('open');
  devolverFoco();
  marcarAtras();
}

$('btnResumenListo').onclick = cerrarResumen;
$('modalResumen').onclick = (e) => { if (e.target.id === 'modalResumen') cerrarResumen(); };
