# Helper del modo nonstop: marca items del TODO y agrega lineas a la bitacora.
#   py -3 .nonstop/log.py mark 7 x          -> marca el item 7 como hecho
#   py -3 .nonstop/log.py mark 7 ~          -> item 7 en curso
#   py -3 .nonstop/log.py bit "que se hizo — como se verifico"
#   py -3 .nonstop/log.py estado            -> resumen de pendientes
import io
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
TODO = os.path.join(BASE, 'TODO.md')
BIT = os.path.join(BASE, 'BITACORA.md')


def leer(p):
    return io.open(p, encoding='utf-8').read()


def escribir(p, s):
    io.open(p, 'w', encoding='utf-8', newline='\n').write(s)


def marcar(num, estado):
    s = leer(TODO)
    pat = re.compile(r'^(- \[)[ x~!](\] ' + str(num) + r'\. )', re.M)
    nuevo, n = pat.subn(lambda m: m.group(1) + estado + m.group(2), s)
    if not n:
        print('NO ENCONTRE el item', num)
        return 1
    escribir(TODO, nuevo)
    print('item', num, '->', estado)
    return 0


def bitacora(texto):
    s = leer(BIT)
    nums = [int(m) for m in re.findall(r'^#(\d+) ', s, re.M)]
    n = max(nums) + 1 if nums else 0
    linea = '#%d — %s' % (n, texto)
    escribir(BIT, s.rstrip('\n') + '\n\n' + linea + '\n')
    print(linea)
    return 0


def estado():
    s = leer(TODO)
    pend = re.findall(r'^- \[ \] (\d+)\.', s, re.M)
    curso = re.findall(r'^- \[~\] (\d+)\.', s, re.M)
    hechos = re.findall(r'^- \[x\] (\d+)\.', s, re.M)
    blo = re.findall(r'^- \[!\] (\d+)\.', s, re.M)
    print('hechos: %d | en curso: %s | bloqueados: %s | pendientes: %d %s'
          % (len(hechos), curso or '-', blo or '-', len(pend), pend[:6]))
    return 0


if __name__ == '__main__':
    accion = sys.argv[1] if len(sys.argv) > 1 else 'estado'
    if accion == 'mark':
        sys.exit(marcar(sys.argv[2], sys.argv[3]))
    elif accion == 'bit':
        sys.exit(bitacora(sys.argv[2]))
    else:
        sys.exit(estado())
