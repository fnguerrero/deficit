/* ============================================================
   Pantalla Perfil: formulario, validación y el cálculo resultante.
   ============================================================ */

/* ---------------- render: PERFIL ---------------- */

function renderPerfil() {
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
