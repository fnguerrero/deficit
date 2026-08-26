# Avisa cuando un archivo se pasa de largo. Correr: py -3 tools/tamanos.py
#
# El limite no es capricho: un archivo de 2.500 lineas ya no se navega, y fue
# exactamente lo que le paso a app.js antes de partirlo.
#
# Devuelve codigo 1 si algo se paso, asi sirve para cortar en un script.
import io
import os
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LIMITES = [
    ('app.js', 400),
    ('arranque.js', 100),
    ('core.js', 1400),
    ('config.js', 40),
    ('claude.js', 900),
    ('analisis.js', 900),
    ('modos.js', 800),
    ('mascota.js', 400),
    ('cuerpo.js', 250),
    ('personaje.js', 500),
    ('juego.js', 500),
    ('sonidos.js', 250),
    ('voz.js', 350),
    ('graficos.js', 400),
    ('sync.js', 600),
    ('auth.js', 300),
    ('tests.js', 6000),   # la suite crece con cada feature
    ('tests2.js', 6000),  # se partio en el ciclo 6, al pasarse la primera
    ('sw.js', 150),
    ('ui/*.js', 700),
    ('tools/*.py', 250),
    ('proxy/worker.js', 200),
    ('proxy/test.mjs', 250),
]

AVISO = 0.85   # a partir de aca ya conviene ir mirando


def archivos(patron):
    if '*' not in patron:
        ruta = os.path.join(BASE, patron)
        return [(patron, ruta)] if os.path.exists(ruta) else []

    carpeta, extension = patron.split('/')[0], patron.split('.')[-1]
    dir_completo = os.path.join(BASE, carpeta)
    if not os.path.isdir(dir_completo):
        return []

    return [
        (carpeta + '/' + n, os.path.join(dir_completo, n))
        for n in sorted(os.listdir(dir_completo)) if n.endswith('.' + extension)
    ]


def contar(ruta):
    return len(io.open(ruta, encoding='utf-8').read().split('\n'))


pasados, cerca = [], []
print('%-24s %8s %8s   %s' % ('archivo', 'lineas', 'limite', 'estado'))
print('-' * 60)

for patron, limite in LIMITES:
    for nombre, ruta in archivos(patron):
        n = contar(ruta)
        if n > limite:
            estado = 'SE PASO por %d' % (n - limite)
            pasados.append(nombre)
        elif n > limite * AVISO:
            estado = 'cerca del limite'
            cerca.append(nombre)
        else:
            estado = 'ok'
        print('%-24s %8d %8d   %s' % (nombre, n, limite, estado))

print('-' * 60)
if pasados:
    print('SE PASARON: ' + ', '.join(pasados))
    print('Partilos antes de seguir agregando.')
    sys.exit(1)

if cerca:
    print('Cerca del limite: ' + ', '.join(cerca))

print('Todo dentro de limite.')
