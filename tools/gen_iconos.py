# Genera los iconos de la PWA. Correr: py -3 tools/gen_iconos.py
from PIL import Image, ImageDraw
import os

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
os.makedirs(BASE, exist_ok=True)

BG = (14, 17, 22)        # --bg
RING_BG = (34, 42, 53)   # --card2
ACC = (74, 222, 128)     # --acc


def dibujar(size, maskable=False):
    S = 1024  # dibujamos grande y reducimos para que quede suave
    img = Image.new('RGBA', (S, S), BG + (255,))
    d = ImageDraw.Draw(img)

    # zona segura: en el icono maskable el contenido va mas chico (Android le recorta los bordes)
    escala = 0.62 if maskable else 0.76
    r = S * escala / 2
    cx = cy = S / 2
    grosor = int(S * 0.085)
    caja = [cx - r, cy - r, cx + r, cy + r]

    # anillo de fondo completo + progreso (~72%)
    d.arc(caja, 0, 360, fill=RING_BG, width=grosor)
    d.arc(caja, -90, -90 + 260, fill=ACC, width=grosor)

    # flecha hacia abajo = deficit
    a = r * 0.46
    d.line([(cx, cy - a), (cx, cy + a * 0.2)], fill=ACC, width=int(grosor * 0.85))
    d.polygon([(cx - a * 0.62, cy + a * 0.18), (cx + a * 0.62, cy + a * 0.18), (cx, cy + a * 0.95)], fill=ACC)

    return img.resize((size, size), Image.LANCZOS)


for size in (192, 512):
    dibujar(size).save(os.path.join(BASE, f'icon-{size}.png'))
    dibujar(size, maskable=True).save(os.path.join(BASE, f'icon-{size}-maskable.png'))

# icono chico para la pestana del navegador
dibujar(64).save(os.path.join(BASE, 'favicon.png'))

print('iconos generados en', os.path.normpath(BASE))
