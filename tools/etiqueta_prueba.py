# Arma una etiqueta nutricional con valores conocidos: sirve para comprobar si
# el modelo lee bien, comparando lo que devuelve contra numeros que sabemos.
#
# Correr:  py -3 tools/etiqueta_prueba.py
# Despues: cargar la imagen en la app con "Leer etiqueta de un envase".
#
# Verificado el 23/08/2026 con Opus 5 en precision Normal: los 8 valores
# exactos, confianza alta, 9,5 segundos y US$ 0,018.
from PIL import Image, ImageDraw, ImageFont
import os

W, H = 900, 1100
img = Image.new('RGB', (W, H), (250, 250, 248))
d = ImageDraw.Draw(img)


def fuente(px, negrita=False):
    nombre = 'arialbd.ttf' if negrita else 'arial.ttf'
    try:
        return ImageFont.truetype('C:/Windows/Fonts/' + nombre, px)
    except OSError:
        return ImageFont.load_default()


d.rectangle([40, 40, W - 40, H - 40], outline=(20, 20, 20), width=4)
d.text((70, 80), 'GALLETITAS DE AVENA', font=fuente(46, True), fill=(15, 15, 15))
d.text((70, 145), 'INFORMACION NUTRICIONAL', font=fuente(30, True), fill=(15, 15, 15))
d.text((70, 190), 'Porcion: 30 g (3 galletitas)', font=fuente(26), fill=(40, 40, 40))
d.text((70, 228), 'Porciones por envase: 8', font=fuente(26), fill=(40, 40, 40))

d.line([70, 280, W - 70, 280], fill=(20, 20, 20), width=3)
d.text((70, 295), 'Cantidad por porcion', font=fuente(24, True), fill=(15, 15, 15))
d.text((640, 295), 'por 30 g', font=fuente(24, True), fill=(15, 15, 15))
d.line([70, 335, W - 70, 335], fill=(20, 20, 20), width=2)

FILAS = [
    ('Valor energetico', '142 kcal'),
    ('Carbohidratos', '19 g'),
    ('  Azucares', '6,5 g'),
    ('Proteinas', '3,2 g'),
    ('Grasas totales', '5,8 g'),
    ('  Grasas saturadas', '2,1 g'),
    ('Fibra alimentaria', '2,4 g'),
    ('Sodio', '95 mg'),
]

y = 360
for etiqueta, valor in FILAS:
    negrita = not etiqueta.startswith('  ')
    d.text((70, y), etiqueta, font=fuente(30, negrita), fill=(15, 15, 15))
    d.text((640, y), valor, font=fuente(30, negrita), fill=(15, 15, 15))
    y += 58
    d.line([70, y - 12, W - 70, y - 12], fill=(200, 200, 200), width=1)

d.text((70, y + 30), 'Ingredientes: harina de avena, azucar, aceite de girasol,', font=fuente(22), fill=(60, 60, 60))
d.text((70, y + 62), 'huevo, sal, esencia de vainilla.', font=fuente(22), fill=(60, 60, 60))

salida = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'etiqueta-prueba.jpg')
img.save(salida, 'JPEG', quality=88)
print(salida)
