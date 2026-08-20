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

print('version %d -> %d' % (actual, nueva))
