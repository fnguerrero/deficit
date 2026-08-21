/* ============================================================
   Calibrar la estimación: fotos con su valor real, corrida contra
   la API y el error que devuelve. Es la única forma de saber si el
   número que muestra la app sirve para algo.
   ============================================================ */

/** El resultado de la última corrida, para no recalcular al pintar. */
/**
 * El sesgo que sale de las correcciones que Nico hace a mano.
 * No necesita cargar nada: se arma solo mientras usa la app.
 */
function renderSesgoAprendido() {
  const s = sesgoAprendido(state.correcciones);
  const caja = $('avisoSesgo');

  if (!s || !s.avisar) { caja.hidden = true; return; }

  caja.hidden = false;
  caja.textContent =
    `Sobre ${fmtNum(s.n)} correcciones tuyas, la app viene estimando ${fmtNum(Math.abs(s.sesgo), 1)}% ` +
    `${s.lado} de forma pareja. Si querés que afine, probá el modo Preciso; ` +
    `mientras tanto, tenelo en cuenta al mirar el total del día.`;
}

function renderCalibracion() {
  renderSesgoAprendido();
  const refs = state.referencias || [];
  const medicion = medirCalibracion(refs);

  $('referenciasVacio').hidden = refs.length > 0;
  $('btnCorrerCalib').hidden = !refs.length;
  $('calibPill').textContent = refs.length
    ? `${fmtNum(refs.length)} ${refs.length === 1 ? 'foto' : 'fotos'}`
    : '';

  $('calibResultado').hidden = !medicion;
  if (medicion) {
    $('calibError').textContent = `${fmtNum(medicion.errorPromedio, 1)}%`;
    $('calibError').className = 'calib-' + medicion.veredicto.nivel;
    $('calibVeredicto').textContent = medicion.veredicto.texto;
    $('calibSesgo').textContent = `${textoSesgo(medicion.sesgo)} Medido sobre ${fmtNum(medicion.n)} ${medicion.n === 1 ? 'foto' : 'fotos'}.`;
  }

  const porId = {};
  for (const f of (medicion?.filas || [])) porId[f.id] = f;

  const ul = $('listaReferencias');
  ul.innerHTML = '';

  for (const r of refs) {
    const li = document.createElement('li');

    if (r.foto) {
      const img = document.createElement('img');
      img.className = 'thumb'; img.src = r.foto; img.alt = '';
      li.appendChild(img);
    }

    const info = document.createElement('div');
    info.className = 'info';
    const b = document.createElement('b'); b.textContent = r.nombre;
    const sm = document.createElement('small');
    const fila = porId[r.id];
    sm.textContent = fila
      ? `real ${fmtKcal(fila.real)} · estimó ${fmtKcal(fila.estimado)}`
      : `real ${fmtKcal(r.kcalReal)} · sin correr`;
    info.append(b, sm);

    const error = document.createElement('span');
    error.className = 'ref-error';
    if (fila) {
      error.textContent = fmtDelta(fila.pct, 1) + '%';
      error.classList.add(Math.abs(fila.pct) <= 10 ? 'calib-bien'
        : (Math.abs(fila.pct) <= 20 ? 'calib-aceptable' : 'calib-flojo'));
    } else {
      error.textContent = '—';
    }

    const del = document.createElement('button');
    del.className = 'del'; del.textContent = '×';
    del.setAttribute('aria-label', 'Borrar la referencia ' + r.nombre);
    del.onclick = () => {
      state.referencias = borrarReferencia(state.referencias, r.id);
      save(); renderCalibracion();
    };

    li.append(info, error, del);
    ul.appendChild(li);
  }
}

$('btnAgregarRef').onclick = () => $('refInput').click();

$('refInput').onchange = async (e) => {
  const file = e.target.files?.[0];
  e.target.value = '';
  if (!file) return;

  const nombre = (prompt('¿Qué es? (ej: "Yogur griego 150 g")') || '').trim();
  if (!nombre) return;

  const kcalReal = parseInt(prompt('¿Cuántas calorías tiene REALMENTE? (de la etiqueta o de la balanza)') || '', 10);
  if (!kcalReal) { toast('Sin el valor real no se puede comparar'); return; }

  try {
    const original = await leerArchivo(file);
    // dos tamaños: uno para analizar y una miniatura para la lista. La de
    // análisis va a 768 px porque acá se guardan varias y hay que cuidar la cuota.
    const grande = await redimensionar(original, 768, 0.7);
    const chica = await redimensionar(original, 128, 0.55);

    state.referencias = agregarReferencia(state.referencias, {
      nombre, kcalReal, foto: chica, fotoGrande: grande.split(',')[1]
    });
    save(); renderCalibracion();
    toast('Referencia agregada');
  } catch (err) {
    toast(err.message);
  }
};

$('btnCorrerCalib').onclick = async () => {
  if (topeAlcanzado()) return;
  if (!hayAcceso(state.cfg)) {
    toast('Falta la API key', { texto: 'Cargarla', accion: () => irTab('ajustes') });
    return;
  }

  const refs = state.referencias || [];
  const sinFoto = refs.filter(r => !r.fotoGrande);
  if (sinFoto.length === refs.length) {
    toast('Volvé a cargar las fotos: se guardaron sin la versión grande');
    return;
  }

  const boton = $('btnCorrerCalib');
  boton.disabled = true;

  let hechas = 0, fallidas = 0;

  for (const r of refs) {
    if (!r.fotoGrande) continue;

    boton.textContent = `Analizando ${hechas + 1} de ${refs.length}…`;

    try {
      // sin cache: la gracia es medir lo que devuelve el modelo hoy
      const resultado = await analizarImagen({
        fetchFn: (...a) => fetch(...a),
        ...accesoApi(state.cfg),
        modelo: state.cfg.modelo || MODELO_DEFAULT,
        precision: state.cfg.precision || 'normal',
        imagen: r.fotoGrande,
        contexto: null
      });

      const total = sumarItems(resultado.items);
      state.referencias = anotarEstimacion(state.referencias, r.id, {
        kcal: total.calorias,
        prot: total.proteinas,
        modelo: resultado.modelo,
        precision: state.cfg.precision || 'normal',
        costo: resultado.costo
      });
      registrarUso(resultado, 'calibracion');
      hechas++;
    } catch (err) {
      fallidas++;
      anotarError('Calibración: ' + err.message, 'calibracion', 0);
    }

    save(); renderCalibracion();
  }

  boton.disabled = false;
  boton.textContent = 'Correr la prueba';

  const medicion = medirCalibracion(state.referencias);
  toast(medicion
    ? `Error promedio: ${fmtNum(medicion.errorPromedio, 1)}%`
    : (fallidas ? 'No se pudo analizar ninguna' : 'Listo'));
};
