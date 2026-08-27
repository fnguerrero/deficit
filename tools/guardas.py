# Guardas de integridad. Correr: py -3 tools/guardas.py
#
# Tres cosas que el navegador solo descubre en tiempo de ejecucion, y a veces ni
# ahi:
#
#   1. dos archivos que declaran la misma funcion global. El ultimo que carga
#      gana y el otro deja de existir, sin un solo aviso.
#   2. un $('idQueNoExiste') que devuelve null y revienta con "cannot read
#      properties of null" recien cuando alguien entra a esa pantalla.
#   3. un script que entra en index.html y no en el shell del service worker:
#      eso no falla en el navegador, falla SIN INTERNET y semanas despues.
#
# Devuelve codigo 1 si algo esta mal, asi sirve para cortar un script.
import io
import os
import re
import sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def leer(nombre):
    return io.open(os.path.join(BASE, nombre), encoding='utf-8').read()


def sin_comentarios(js):
    js = re.sub(r'/\*.*?\*/', '', js, flags=re.S)
    return re.sub(r'//[^\n]*', '', js)


problemas = []

indice = leer('index.html')
archivos = [f for f in re.findall(r'src="([^"?]+\.js)', indice)
            if os.path.exists(os.path.join(BASE, f))]

# ---- 1. globales declaradas dos veces ----
#
# Entre archivos Y dentro del mismo archivo. Lo segundo parece imposible y no lo
# es: pasa cuando alguien agrega una funcion al final sin darse cuenta de que ya
# estaba 300 lineas mas arriba. JavaScript no dice nada — la segunda pisa a la
# primera — y solo se nota cuando algo que andaba deja de andar.
declara = {}
for f in archivos:
    cuerpo = sin_comentarios(leer(f))
    nombres = (re.findall(r'^function\s+([A-Za-z_$][\w$]*)', cuerpo, re.M)
               + re.findall(r'^const\s+([A-Z_][A-Z0-9_]*)\s*=', cuerpo, re.M))

    vistos = set()
    for n in nombres:
        if n in vistos:
            problemas.append('%s se declara DOS VECES dentro de %s' % (n, f))
            continue
        vistos.add(n)
        declara.setdefault(n, []).append(f)

for nombre, donde in sorted(declara.items()):
    if len(donde) > 1:
        problemas.append('%s se declara en %s. El ultimo pisa al anterior.'
                         % (nombre, ' y '.join(donde)))

# ---- 2. ids que el JS busca y el HTML no tiene ----
ids_html = set(re.findall(r'\bid="([^"]+)"', indice))
usados = set()
for f in archivos:
    cuerpo = leer(f)
    usados |= set(re.findall(r"\$\('([^']+)'\)", cuerpo))
    # Los ids que el propio JS crea al vuelo tambien existen: no estan en el
    # HTML porque el elemento se arma con createElement.
    ids_html |= set(re.findall(r"\.id\s*=\s*'([^']+)'", cuerpo))
    ids_html |= set(re.findall(r"id=[\\]?[\"']([\w-]+)", cuerpo))

for u in sorted(usados - ids_html):
    problemas.append("$('%s') no existe en index.html" % u)

# ---- 3. scripts fuera del shell offline ----
en_sw = set(re.findall(r"'\./([^'?]+\.js)", leer('sw.js')))
for f in archivos:
    if f not in en_sw:
        problemas.append('%s esta en index.html pero no en el shell de sw.js: '
                         'la app no arranca offline' % f)

if problemas:
    print('%d problemas:' % len(problemas))
    for p in problemas:
        print('  - ' + p)
    sys.exit(1)

print('Guardas OK: %d scripts, %d globales, %d ids'
      % (len(archivos), len(declara), len(ids_html)))
