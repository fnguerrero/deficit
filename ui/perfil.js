/* ============================================================
   Pantalla Perfil: formulario, validación y el cálculo resultante.
   ============================================================ */

/* ---------------- render: PERFIL ---------------- */

function renderPerfil() {
  renderPlanEtapas();
  renderModos();
  const p = state.perfil;
  $('pSexo').value = p.sexo;
  $('pEdad').value = p.edad ?? '';
  $('pAltura').value = p.altura ?? '';
  $('pPeso').value = p.peso ?? '';
  $('pPesoObj').value = p.pesoObj ?? '';
  $('pActividad').value = p.actividad;
  $('pRitmo').value = p.ritmo;
  $('pManual').value = p.manual ?? '';

  const calc = calcular();
  const ul = $('calcLista');
  ul.innerHTML = '';

  if (!calc) {
    $('calcAviso').textContent = 'Completá edad, altura y peso para ver tu objetivo.';
    return;
  }

  const filas = [
    ['Metabolismo basal (TMB)', fmtKcal(calc.tmb)],
    ['Gasto total estimado (TDEE)', fmtKcal(calc.tdee)],
    ['Objetivo diario', fmtKcal(calc.objetivo)],
    ['Déficit', `${fmtNum(calc.deficitReal)} kcal/día`],
    ['Pérdida estimada', `${fmtNum(calc.kgSemana, 2)} kg/semana`],
    ['Proteínas / Carbos / Grasas', `${fmtNum(calc.macros.prot)} / ${fmtNum(calc.macros.carb)} / ${fmtNum(calc.macros.gras)} g`]
  ];
  if (calc.semanas) {
    const meta = new Date(Date.now() + calc.semanas * 7 * 86400000)
      .toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
    filas.push(['Llegás a la meta en', `${calc.semanas} semanas (~${meta})`]);
  }

  for (const [k, v] of filas) {
    const li = document.createElement('li');
    const s = document.createElement('span'); s.textContent = k;
    const b = document.createElement('b'); b.textContent = v;
    li.append(s, b); ul.appendChild(li);
  }

  $('calcAviso').textContent = state.perfil.manual
    ? 'Estás usando un objetivo manual; el ritmo de pérdida se recalcula a partir de ese valor.'
    : calc.ajustado
      ? `El ritmo elegido daba por debajo del piso seguro (${fmtKcal(calc.piso)}). Se ajustó el objetivo.`
      : 'Mifflin-St Jeor. Es una estimación: ajustala según cómo evolucione tu peso real.';
}

/* ---------------- perfil ---------------- */

const CAMPOS_PERFIL = { edad: 'pEdad', altura: 'pAltura', peso: 'pPeso', pesoObj: 'pPesoObj', manual: 'pManual' };

function mostrarErroresPerfil(errores) {
  for (const [campo, id] of Object.entries(CAMPOS_PERFIL)) {
    const input = $(id);
    const label = input.parentElement;
    let msg = label.querySelector('.error-campo');

    if (errores[campo]) {
      input.classList.add('invalido');
      input.setAttribute('aria-invalid', 'true');
      if (!msg) {
        msg = document.createElement('small');
        msg.className = 'error-campo';
        label.appendChild(msg);
      }
      msg.textContent = errores[campo];
    } else {
      input.classList.remove('invalido');
      input.removeAttribute('aria-invalid');
      if (msg) msg.remove();
    }
  }
}

$('btnGuardarPerfil').onclick = () => {
  const num = (id) => { const v = parseFloat($(id).value); return isNaN(v) ? null : v; };
  const propuesto = {
    sexo: $('pSexo').value,
    edad: num('pEdad'),
    altura: num('pAltura'),
    peso: num('pPeso'),
    pesoObj: num('pPesoObj'),
    actividad: parseFloat($('pActividad').value),
    ritmo: parseFloat($('pRitmo').value),
    manual: num('pManual')
  };

  const { ok, errores } = validarPerfil(propuesto);
  mostrarErroresPerfil(errores);

  if (!ok) {
    const cuantos = Object.keys(errores).length;
    toast(cuantos === 1 ? 'Revisá el campo marcado' : `Revisá los ${cuantos} campos marcados`);
    $(CAMPOS_PERFIL[Object.keys(errores)[0]])?.focus();
    return;
  }

  state.perfil = propuesto;
  save(); renderAll();
  toast('Perfil guardado');
};

/* ---------------- el modo ---------------- */

/**
 * Elegir el modo es la decisión que más cambia la app: de acá salen el objetivo
 * del día, el reparto de macros, qué comida entra y qué se recomienda.
 */
function renderModos() {
  const cont = $('listaModos');
  if (!cont) return;

  const actual = state.perfil.modo || MODO_DEFECTO;
  cont.innerHTML = '';

  for (const m of listaModos()) {
    const b = document.createElement('button');
    b.className = 'modo-btn' + (m.id === actual ? ' activo' : '');
    b.innerHTML = `<i aria-hidden="true">${m.emoji || '🎯'}</i>` +
      `<span><b>${m.nombre}</b><small>${m.resumen}</small></span>`;
    b.setAttribute('aria-pressed', String(m.id === actual));
    b.onclick = () => {
      state.perfil.modo = m.id;
      save();
      renderModos();
      renderPerfil();
      renderHoy();
      toast(`Modo ${m.nombre}`);
    };
    cont.appendChild(b);
  }

  const modo = modoDe(actual);
  const calc = calcular();
  const partes = [modo.detalle];

  if (calc) {
    partes.push(`Tu objetivo: ${fmtNum(calc.objetivo)} kcal — ${fmtNum(calc.macros.prot)} g de proteína, ` +
      `${fmtNum(calc.macros.carb)} g de carbohidratos y ${fmtNum(calc.macros.gras)} g de grasas.`);
    if (calc.ajustado && calc.motivo) partes.push(calc.motivo);
  }
  if (modo.aviso) partes.push(modo.aviso);

  $('detalleModo').textContent = partes.join(' ');
}

/*
 * El plan por etapas, cuando la meta esta lejos.
 *
 * Antes esto era un error que ademas no dejaba guardar: "es una baja muy grande,
 * mejor ponete una meta intermedia", sin decir cual. Alguien de 140 kg que pone
 * 80 no se esta equivocando, y calcular la meta intermedia es justo el trabajo
 * que la app puede hacer sola.
 */
function renderPlanEtapas() {
  const caja = $('planEtapas');
  if (!caja) return;

  const peso = parseFloat($('pPeso').value);
  const obj = parseFloat($('pPesoObj').value);
  const ritmo = parseFloat($('pRitmo')?.value) || 0.5;
  const plan = planPorEtapas(peso, obj, ritmo);

  caja.hidden = !plan;
  if (!plan) return;

  const meses = plan.meses === 1 ? '1 mes' : `${plan.meses} meses`;

  /* Once etapas no se leen. Se muestran las tres primeras y la ultima, que es
     lo que hace falta para saber por donde arranca y donde termina. */
  const aMostrar = plan.etapas.length > 5
    ? [...plan.etapas.slice(0, 3), null, plan.etapas.at(-1)]
    : plan.etapas;
  caja.innerHTML = `
    <p class="hint"><b>${fmtNum(plan.total, 1)} kg</b> es mucho para una sola cuesta:
      a este ritmo son unos ${meses}. Partido en etapas:</p>
    <ol class="etapas">
      ${aMostrar.map(e => e === null
        ? '<li class="salto">…</li>'
        : `<li><b>${fmtPeso(e.hasta)}</b>
        <small>bajar ${fmtNum(e.kg, 1)} kg · semana ${e.semanas}</small></li>`).join('')}
    </ol>
    <p class="hint">La meta que guardás sigue siendo ${fmtPeso(obj)}. Esto es solo por dónde
      pasa el camino.</p>`;
}

for (const id of ['pPeso', 'pPesoObj', 'pRitmo']) {
  $(id)?.addEventListener('input', renderPlanEtapas);
}
