"""datos_prueba.py — seis meses de vida cargada, para mirar Historial y Progreso.

Con dos semanas de datos ninguna pantalla dice nada: la curva de peso es una
raya, el promedio semanal no existe y el veredicto del plan no tiene con qué
compararse. Este generador arma medio año de uso REAL —no un dataset perfecto—
y lo deja en un JSON listo para el botón Importar de Ajustes.

Lo que hace que sirva es lo que sale mal a propósito:

  - **Huecos.** Nadie carga 180 días seguidos. Hay días en blanco sueltos y
    alguna semana entera caída, que es lo que de verdad pasa en enero.
  - **Mesetas y rebotes.** El peso no baja en línea recta. Hay tres semanas
    clavado, un fin de semana largo que sube y una recaída en el medio.
  - **Findes.** Sábado y domingo comen más, toman menos agua y duermen distinto.
  - **La balanza no es de todos los días.** Se pesa cada tres o cuatro.
  - **La cintura, cada tanto.** Es el dato que no se mide seguido, y acá se
    anota una vez por mes: sirve justo para ver si el historial la banca.

    python tools/datos_prueba.py            -> deficit-prueba.json, 180 días
    python tools/datos_prueba.py --dias 90  -> tres meses
    python tools/datos_prueba.py --peso-inicial 92 --peso-final 82.5
"""
import argparse
import json
import os
import random
from datetime import date, timedelta

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# La semilla fija hace que dos corridas den lo mismo: un bug que aparece con
# estos datos tiene que poder reproducirse mañana.
SEMILLA = 20260901

MOMENTOS = ['desayuno', 'almuerzo', 'merienda', 'cena', 'snack']

# Hora típica de cada momento, en minutos. Sale de MOMENTOS de la app: una
# comida sin ts creíble se ordena mal en la pantalla del día.
HORA = {'desayuno': 9 * 60, 'almuerzo': 13 * 60 + 30, 'merienda': 17 * 60 + 30,
        'cena': 21 * 60 + 30, 'snack': 23 * 60}

# Platos por momento: título, kcal, proteínas, carbos, grasas, fibra, azúcar,
# sodio. Son platos de acá y no "chicken breast 100 g", porque estos datos se
# miran para decidir si una pantalla se entiende.
PLATOS = {
    'desayuno': [
        ('Café con leche y tostadas', 320, 12, 42, 11, 3, 12, 380),
        ('Mate con dos medialunas', 410, 7, 52, 19, 2, 22, 340),
        ('Yogur con granola', 290, 14, 38, 9, 4, 20, 120),
        ('Huevos revueltos con pan', 380, 22, 26, 20, 2, 3, 520),
        ('Café solo', 5, 0, 1, 0, 0, 0, 5),
    ],
    'almuerzo': [
        ('Milanesa con puré', 780, 42, 68, 34, 5, 8, 980),
        ('Ensalada de pollo', 420, 38, 22, 19, 6, 7, 620),
        ('Fideos con salsa', 640, 21, 96, 17, 7, 14, 740),
        ('Bife con ensalada', 560, 46, 14, 34, 5, 5, 610),
        ('Tarta de verdura', 490, 18, 44, 26, 6, 9, 830),
        ('Guiso de lentejas', 520, 26, 72, 13, 14, 10, 890),
        ('Empanadas (3)', 660, 26, 58, 34, 3, 6, 1100),
    ],
    'merienda': [
        ('Mate con galletitas', 260, 4, 40, 9, 1, 18, 290),
        ('Fruta', 95, 1, 24, 0, 4, 19, 2),
        ('Café con una factura', 310, 6, 38, 15, 1, 17, 260),
        ('Licuado de banana', 240, 8, 44, 4, 3, 32, 90),
    ],
    'cena': [
        ('Pollo al horno con papas', 680, 44, 52, 30, 5, 4, 720),
        ('Pizza (3 porciones)', 810, 32, 88, 34, 5, 10, 1520),
        ('Sopa y tortilla', 430, 20, 38, 21, 6, 6, 690),
        ('Salmón con verduras', 520, 40, 18, 30, 6, 7, 480),
        ('Sandwich de milanesa', 720, 34, 66, 34, 4, 9, 1180),
        ('Revuelto de zapallitos', 360, 19, 20, 22, 5, 8, 540),
    ],
    'snack': [
        ('Alfajor', 230, 3, 32, 10, 1, 24, 130),
        ('Puñado de almendras', 170, 6, 6, 15, 3, 1, 1),
        ('Barrita de cereal', 130, 2, 22, 4, 2, 12, 75),
        ('Helado', 280, 5, 34, 14, 1, 30, 95),
    ],
}

# Cuánto se agranda cada plato de la tabla.
#
# No es decoración: sin esto el promedio daba 1.680 kcal/día, y con ese consumo
# alguien de 92 kg tendría que haber bajado el DOBLE de lo que baja la curva de
# peso. Las dos pantallas contarían historias distintas, y la primera duda al
# mirar Progreso sería si la app suma mal. Calibrado para caer cerca de las
# 2.100 kcal, que es lo que sostiene bajar 9,5 kg en seis meses.
RACION = 1.24

ANIMOS = ['mal', 'flojo', 'normal', 'bien', 'genial']

EJERCICIOS = [
    ('Caminata', 220), ('Gimnasio', 430), ('Bici', 380),
    ('Fútbol', 640), ('Pesas', 350),
]


def iso(d):
    return d.isoformat()


def curva_peso(n, inicial, final, rnd):
    """El peso día a día: baja, pero no en línea recta.

    Una recta de 92 a 82,5 se ve perfecta y no le pasa a nadie. Lo que hace
    que la pantalla de Progreso valga algo es tener que leer una tendencia
    dentro del ruido: tres semanas de meseta, un rebote y el ruido diario de
    la balanza, que son 400 gramos para arriba y para abajo sin que hayas
    hecho nada distinto.
    """
    # Dos tramos parados a propósito y una recaída, ubicados en el medio.
    meseta1 = (int(n * 0.22), int(n * 0.34))
    rebote = (int(n * 0.55), int(n * 0.63))
    meseta2 = (int(n * 0.78), int(n * 0.86))

    avance = []
    t = 0.0
    for i in range(n):
        if meseta1[0] <= i < meseta1[1] or meseta2[0] <= i < meseta2[1]:
            paso = 0.15          # clavado, con una pizca de deriva
        elif rebote[0] <= i < rebote[1]:
            paso = -0.9          # vacaciones: sube
        else:
            paso = 1.0
        t += paso
        avance.append(t)

    total = avance[-1] or 1.0
    pesos = []
    for i, a in enumerate(avance):
        base = inicial + (final - inicial) * (a / total)
        pesos.append(round(base + rnd.gauss(0, 0.28), 1))

    # El último día tiene que dar el peso que dice el perfil: es el número que
    # la app muestra arriba de todo y no puede discrepar del que se cargó.
    pesos[-1] = final
    return pesos


def comidas_del_dia(fecha, finde, rnd):
    """Lo que se comió, con la cantidad de registros que uno de verdad carga."""
    momentos = ['desayuno', 'almuerzo', 'cena']

    # La merienda se carga a veces; el snack, más los fines de semana.
    if rnd.random() < 0.55:
        momentos.append('merienda')
    if rnd.random() < (0.55 if finde else 0.25):
        momentos.append('snack')

    # Y a veces uno se olvida de anotar una comida entera, que es distinto de
    # no haber comido: el día queda corto de calorías sin explicación.
    if rnd.random() < 0.12:
        momentos.remove(rnd.choice(momentos))

    salida = []
    for m in momentos:
        titulo, kcal, prot, carb, gras, fibra, azucar, sodio = rnd.choice(PLATOS[m])

        # La misma milanesa no pesa lo mismo dos veces.
        f = rnd.uniform(0.85, 1.15) * (1.12 if finde else 1.0) * RACION
        minutos = HORA[m] + rnd.randint(-35, 35)
        ts = int(
            (date.fromisoformat(fecha) - date(1970, 1, 1)).days * 86400000
        ) + minutos * 60000

        salida.append({
            'id': f'{fecha}-{m}-{rnd.randint(1000, 9999)}',
            'ts': ts,
            'titulo': titulo,
            'items': [],
            'momento': m,
            'kcal': round(kcal * f),
            'prot': round(prot * f),
            'carb': round(carb * f),
            'gras': round(gras * f),
            'fibra': round(fibra * f, 1),
            'azucar': round(azucar * f),
            'sodio': round(sodio * f),
            'thumb': None,
            'foto': None,
            'notas': '',
            'perfil': None,
        })

    salida.sort(key=lambda c: c['ts'])
    return salida


def generar(dias, peso_inicial, peso_final, altura, cintura_inicial, cintura_final):
    rnd = random.Random(SEMILLA)
    hoy = date.today()
    desde = hoy - timedelta(days=dias - 1)
    pesos = curva_peso(dias, peso_inicial, peso_final, rnd)

    # Una semana entera sin abrir la app, en algún punto del segundo tercio.
    corte = rnd.randint(int(dias * 0.38), int(dias * 0.58))
    apagon = set(range(corte, corte + 7))

    salida = {}
    ultimo_mes_cintura = None

    for i in range(dias):
        if i in apagon:
            continue

        f = desde + timedelta(days=i)
        finde = f.weekday() >= 5

        # Días sueltos sin cargar, que es lo normal en cualquier app de estas.
        if rnd.random() < (0.14 if finde else 0.07):
            continue

        dia = {
            'comidas': comidas_del_dia(iso(f), finde, rnd),
            # La balanza es cada tres o cuatro días, y más seguido al principio,
            # cuando uno recién empieza y se pesa todos los días.
            'peso': pesos[i] if (i % (3 if i < dias * 0.2 else 4) == 0 or i == dias - 1) else None,
            'agua': max(0, round(rnd.gauss(3.4 if finde else 4.6, 1.4))),
            'ejercicio': 0,
            'animo': None,
            'sueno': None,
            'ayuno': None,
            'nota': '',
            'act': 0,
        }

        # Entrena unas tres veces por semana, y menos durante el rebote.
        p_ejercicio = 0.2 if finde else 0.42
        if rnd.random() < p_ejercicio:
            nombre, kcal = rnd.choice(EJERCICIOS)
            dia['ejercicio'] = round(kcal * rnd.uniform(0.7, 1.25))

        # El sueño y el ánimo se cargan casi siempre, pero no siempre.
        if rnd.random() < 0.82:
            horas = rnd.gauss(6.4 if not finde else 7.6, 1.1)
            dia['sueno'] = {'horas': round(max(3.5, min(9.5, horas)), 1)}
        if rnd.random() < 0.75:
            # El ánimo sigue al sueño: dormir cuatro horas y estar genial pasa,
            # pero no todos los días.
            h = (dia['sueno'] or {}).get('horas', 7)
            sesgo = 0 if h >= 7 else (-1 if h >= 5.5 else -2)
            idx = max(0, min(4, round(rnd.gauss(3 + sesgo, 0.9))))
            dia['animo'] = ANIMOS[idx]

        # La cintura: una vez por mes, y el primer día de cada mes que aparezca.
        mes = (f.year, f.month)
        if mes != ultimo_mes_cintura:
            ultimo_mes_cintura = mes
            t = i / max(1, dias - 1)
            dia['cintura'] = round(
                cintura_inicial + (cintura_final - cintura_inicial) * t + rnd.gauss(0, 0.6)
            )

        salida[iso(f)] = dia

    return salida, pesos


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--dias', type=int, default=180)
    ap.add_argument('--peso-inicial', type=float, default=92.0)
    ap.add_argument('--peso-final', type=float, default=82.5)
    ap.add_argument('--peso-objetivo', type=float, default=75.0)
    ap.add_argument('--altura', type=int, default=178)
    ap.add_argument('--edad', type=int, default=36)
    ap.add_argument('--cintura-inicial', type=float, default=104)
    ap.add_argument('--cintura-final', type=float, default=94)
    ap.add_argument('--salida', default=os.path.join(RAIZ, 'deficit-prueba.json'))
    args = ap.parse_args()

    dias, pesos = generar(args.dias, args.peso_inicial, args.peso_final,
                          args.altura, args.cintura_inicial, args.cintura_final)

    state = {
        'esquema': 2,
        'perfil': {
            'sexo': 'm', 'edad': args.edad, 'altura': args.altura,
            'peso': args.peso_final, 'pesoObj': args.peso_objetivo,
            'cintura': args.cintura_final,
            'actividad': 1.375, 'ritmo': 0.5, 'plazo': None,
            'manual': None, 'modo': 'moderado',
        },
        'dias': dias,
        'juego': {'xp': 0, 'logros': [], 'anunciados': [], 'fechasLogros': {},
                  'escudosUsados': {}, 'escudosGastados': 0},
        'frecuentes': [], 'recetas': [], 'cacheAnalisis': {}, 'colaAnalisis': [],
        'historialAnalisis': [], 'errores': [], 'referencias': [],
        'correcciones': [], 'borradas': [], 'productos': {},
        'uso': {'llamadas': 0, 'tokens': 0, 'costo': 0},
    }

    with open(args.salida, 'w', encoding='utf-8') as fh:
        json.dump(state, fh, ensure_ascii=False, indent=1)

    con_peso = sum(1 for d in dias.values() if d.get('peso'))
    con_cintura = sum(1 for d in dias.values() if d.get('cintura'))
    comidas = sum(len(d['comidas']) for d in dias.values())
    kcal = [sum(c['kcal'] for c in d['comidas']) for d in dias.values() if d['comidas']]

    print(f'{args.salida}')
    print(f'  {len(dias)} dias cargados de {args.dias} ({args.dias - len(dias)} en blanco)')
    print(f'  {comidas} comidas, promedio {round(sum(kcal) / len(kcal))} kcal/dia')
    print(f'  {con_peso} pesadas, de {pesos[0]} a {pesos[-1]} kg')
    print(f'  {con_cintura} mediciones de cintura, de {args.cintura_inicial:.0f} '
          f'a {args.cintura_final:.0f} cm')


if __name__ == '__main__':
    main()
