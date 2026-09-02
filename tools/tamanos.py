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
    ('calibracion.js', 250),
    ('config.js', 40),
    ('claude.js', 900),
    ('analisis.js', 900),
    ('chequeos.js', 450),
    ('modos.js', 800),
    ('arreglos.js', 250),
    # +50 al sumarle moverse por minutos e intensidad, que es logica de habito
    # como el resto del archivo: partirlo por nueve lineas seria peor.
    ('habitos.js', 350),
    ('mascota.js', 400),
    # +30 por el eje demacrado y el dia en el cuerpo: es la misma familia de
    # traducciones dato->dibujo que ya vivia aca.
    # +20 por el descuento en puntos de IMC y por acotar el aviso: es la misma
    # familia de traducciones dato->dibujo, y la cintura ya salio a su archivo
    ('cuerpo.js', 320),
    # la cintura salio de cuerpo.js: es el unico dato del cuerpo que hay que ir
    # a medir a mano, y todo el resto se recalcula solo
    ('cintura.js', 200),
    # el cuerpo entero: la cara y la transformacion ya salieron a sus propios
    # archivos, y partirlo mas dispersaria el dibujo en tres lugares
    # +70 por musculo dibujado, costillas, postura del dia y animacion.
    # -100 al salir el relieve del torso a relieve.js
    ('personaje.js', 560),
    ('relieve.js', 250),
    ('cara.js', 300),
    ('transformacion.js', 350),
    # +20 por faseEnRiesgo, que vive al lado de diasPerfectos y lee lo mismo
    ('juego.js', 520),
    ('sonidos.js', 250),
    ('voz.js', 350),
    ('graficos.js', 400),
    # +20 por la cintura del dia y el enganche del perfil. El perfil entero ya
    # salio a sync-perfil.js: lo que queda aca son tres lineas de llamada
    ('sync.js', 620),
    ('sync-perfil.js', 250),
    ('estado-sync.js', 250),
    ('auth.js', 300),
    ('tests.js', 6000),   # la suite crece con cada feature
    ('tests2.js', 6000),  # se partio en el ciclo 6, al pasarse la primera
    ('sw.js', 150),
    ('ui/*.js', 700),
    # Lo especifico va ANTES del comodin: el primero que matchea manda, y si
    # `tools/*.py` viniera primero se llevaria puesto este limite.
    # sprites.py se paso al sumarle la segunda pasada de fondo (los huecos que
    # no tocan el borde). Es un script de un solo uso y partirlo lo haria mas
    # dificil de seguir, no menos.
    ('tools/sprites.py', 300),
    # la mitad de datos_prueba.py son las tablas de platos, animos y ejercicios:
    # partirlas a un archivo aparte seria mover una lista para dejarla sola
    ('tools/datos_prueba.py', 350),
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

ya_vistos = set()

for patron, limite in LIMITES:
    for nombre, ruta in archivos(patron):
        if nombre in ya_vistos:
            continue          # ya lo midio una entrada mas especifica
        ya_vistos.add(nombre)
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
