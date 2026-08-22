# Arma el .ico de Windows a partir del icono de 512 de la PWA.
# Correr: py -3 tools/gen_ico.py
#
# Windows necesita .ico para los accesos directos; el .png del manifest no le sirve.
from PIL import Image
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIGEN = os.path.join(BASE, 'icons', 'icon-512.png')
DESTINO = os.path.join(BASE, 'icons', 'deficit.ico')

# Los tamaños que Windows usa según dónde lo muestre: barra de tareas, escritorio, alt-tab.
TAMANOS = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]

img = Image.open(ORIGEN).convert('RGBA')
img.save(DESTINO, format='ICO', sizes=TAMANOS)

print('listo: %s (%d bytes)' % (DESTINO, os.path.getsize(DESTINO)))
