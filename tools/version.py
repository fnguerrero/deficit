# Sube la version de los assets en un solo lugar.
#   py -3 tools/version.py         -> incrementa en 1
#   py -3 tools/version.py 12      -> fija la version 12
#
# Toca sw.js (VERSION y el shell) e index.html / tests.html (?v=N).
# Sin esto, el navegador sigue sirviendo CSS y JS viejo de su cache HTTP
# aunque el service worker sea network-first.
import io
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def leer(nombre):
    return io.open(os.path.join(BASE, nombre), encoding='utf-8').read()


def escribir(nombre, texto):
    io.open(os.path.join(BASE, nombre), 'w', encoding='utf-8', newline='\n').write(texto)


sw = leer('sw.js')
actual = int(re.search(r"deficit-v(\d+)", sw).group(1))
nueva = int(sys.argv[1]) if len(sys.argv) > 1 else actual + 1

sw = re.sub(r"deficit-v\d+", "deficit-v%d" % nueva, sw)
sw = re.sub(r"\?v=\d+", "?v=%d" % nueva, sw)
escribir('sw.js', sw)

for archivo in ('index.html', 'tests.html'):
    html = leer(archivo)
    html = re.sub(r"\?v=\d+", "?v=%d" % nueva, html)
    escribir(archivo, html)

# Un archivo nuevo que entra en index.html y no en el shell del service worker
# no falla en el navegador: falla SIN INTERNET, semanas despues, y ahi no hay
# como darse cuenta. Paso en el ciclo 6 con siete archivos de una.
indice = leer('index.html')
en_html = set(re.findall(r'src="([^"?]+\.js)', indice))
en_sw = set(re.findall(r"'\./([^'?]+\.js)", sw))
faltan = sorted(en_html - en_sw)

if faltan:
    print('OJO: estos scripts estan en index.html pero no en el shell de sw.js:')
    for f in faltan:
        print('  - ' + f)
    print('Sin eso la app no arranca offline.')

# Una variable de color que un tema define y otro no es invisible hasta que
# alguien abre ese tema: `var(--x)` sin definir vale `inherit`, y adentro de un
# <button> eso cae al color del sistema. Paso con --txt2, que estaba en 6 temas
# de 9 y dejaba el texto del personaje ilegible en oscuro.
css = leer('styles.css')
bloques = re.findall(r'(:root[^{]*)\{([^}]*)\}', css)
con_txt = [(sel.strip(), cuerpo) for sel, cuerpo in bloques if '--txt:' in cuerpo]
sin_txt2 = [sel for sel, cuerpo in con_txt if '--txt2:' not in cuerpo]

if sin_txt2:
    print('OJO: estos temas definen --txt pero no --txt2:')
    for sel in sin_txt2:
        print('  - ' + sel)
    print('El texto secundario de ese tema queda con el color del sistema.')

print('version %d -> %d' % (actual, nueva))
