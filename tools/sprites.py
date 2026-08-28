"""
Recorta las laminas de referencia en sprites sueltos, uno por contextura.

Las laminas vienen con los siete cuerpos en fila sobre fondo blanco. El recorte
es HORIZONTAL solamente: el rango vertical es el mismo para los siete, asi que
la cabeza queda siempre en la misma fraccion del alto y el pelo y el aura que se
dibujan por encima pueden posicionarse con un solo numero.

    py -3 tools/sprites.py

Entra:  ref/cuerpos.png   (los 7 cuerpos)
Sale:   img/cuerpo-0.webp .. cuerpo-6.webp  +  img/sprites.json con las medidas
"""

import json
import os
import sys

from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRADA = os.path.join(RAIZ, 'ref', 'cuerpos.png')
SALIDA = os.path.join(RAIZ, 'img')

ALTO_FINAL = 300      # tres veces el alto al que se muestra, para pantallas densas
MARGEN = 6            # pixeles de aire a cada lado del personaje
UMBRAL_BLANCO = 244   # por encima de esto se considera fondo


def columnas_con_dibujo(im):
    """Devuelve, por columna, si tiene algun pixel que no sea fondo."""
    gris = im.convert('L')
    ancho, alto = gris.size
    px = gris.load()
    tiene = []
    for x in range(ancho):
        hay = False
        for y in range(0, alto, 2):        # de a dos filas: alcanza y es cuatro veces mas rapido
            if px[x, y] < UMBRAL_BLANCO:
                hay = True
                break
        tiene.append(hay)
    return tiene


def tramos(tiene, minimo=12):
    """Los tramos contiguos con dibujo. El minimo descarta motas sueltas."""
    out = []
    inicio = None
    for x, hay in enumerate(tiene):
        if hay and inicio is None:
            inicio = x
        elif not hay and inicio is not None:
            if x - inicio >= minimo:
                out.append((inicio, x))
            inicio = None
    if inicio is not None and len(tiene) - inicio >= minimo:
        out.append((inicio, len(tiene)))
    return out


def rango_vertical(im):
    """La primera y la ultima fila con dibujo, para toda la lamina."""
    gris = im.convert('L')
    ancho, alto = gris.size
    px = gris.load()
    arriba = abajo = None
    for y in range(alto):
        for x in range(0, ancho, 2):
            if px[x, y] < UMBRAL_BLANCO:
                if arriba is None:
                    arriba = y
                abajo = y
                break
    return arriba, abajo


def sin_fondo(im):
    """
    El fondo pasa a transparente, pero SOLO el que toca el borde.

    Borrar todo lo que sea casi blanco deja las zapatillas huecas: son blancas y
    quedan del color del fondo. Lo que separa al fondo del calzado no es el
    color sino estar conectado con el exterior, asi que se rellena desde las
    cuatro esquinas y se borra unicamente lo que el relleno alcanza. Todo lo que
    esta rodeado por el contorno negro del dibujo queda intacto.
    """
    im = im.convert('RGB')
    ancho, alto = im.size
    marca = (255, 0, 255)
    for esquina in [(0, 0), (ancho - 1, 0), (0, alto - 1), (ancho - 1, alto - 1)]:
        ImageDraw.floodfill(im, esquina, marca, thresh=70)

    im = im.convert('RGBA')
    px = im.load()
    for y in range(alto):
        for x in range(ancho):
            if px[x, y][:3] == marca:
                px[x, y] = (255, 255, 255, 0)
    return im



def caja_del_pelo(im):
    """
    Donde esta la mata de pelo negro, en fracciones del sprite.

    Es lo que necesita la app para plantar encima el pelo de color de la fase:
    tiene que TAPAR al negro del dibujo, no acomodarse al lado.

    No alcanza con buscar lo oscuro en el tercio de arriba: ahi tambien estan
    los anteojos y el contorno de la cara, y el pelo terminaba llegando hasta la
    boca. Lo que separa al pelo del resto es la CANTIDAD por fila: el pelo es
    una masa de decenas de pixeles y un contorno son dos o tres. Se corta donde
    el conteo cae por debajo de un cuarto del maximo.
    """
    ancho, alto = im.size
    px = im.convert('RGBA').load()
    hasta = int(alto * 0.34)

    def negros(y):
        return [x for x in range(ancho)
                if px[x, y][3] > 128 and max(px[x, y][:3]) < 70]

    filas = [negros(y) for y in range(hasta)]
    conteos = [len(f) for f in filas]
    if not any(conteos):
        return None

    tope = max(conteos)
    lleno = conteos.index(tope)
    y0 = next(y for y, n in enumerate(conteos) if n > 0)

    # El corte se busca DESPUES de la fila mas llena, nunca antes: arriba de
    # todo estan las puntas de los mechones, que traen dos o tres pixeles por
    # fila, y midiendo desde ahi el pelo media una sola fila de alto.
    y1 = lleno
    for y in range(lleno, hasta):
        if conteos[y] < tope * 0.25:
            break
        y1 = y

    xs = [x for y in range(y0, y1 + 1) for x in filas[y]]
    return {
        'cx': round((min(xs) + max(xs)) / 2 / ancho, 4),
        'arriba': round(y0 / alto, 4),
        'abajo': round(y1 / alto, 4),
        'ancho': round((max(xs) - min(xs)) / ancho, 4)
    }


def main():
    if not os.path.exists(ENTRADA):
        print('Falta ' + ENTRADA)
        print('Guarda ahi la lamina de las 7 contexturas, en la resolucion mas alta que tengas.')
        return 1

    im = Image.open(ENTRADA)
    print('Lamina: %dx%d' % im.size)

    arriba, abajo = rango_vertical(im)
    if arriba is None:
        print('La lamina parece estar en blanco.')
        return 1

    partes = tramos(columnas_con_dibujo(im))
    print('Encontrados %d personajes' % len(partes))
    if len(partes) != 7:
        print('OJO: se esperaban 7. Revisa la lamina o el umbral antes de seguir.')

    os.makedirs(SALIDA, exist_ok=True)
    escala = ALTO_FINAL / (abajo - arriba + 1)
    medidas = {'alto': ALTO_FINAL, 'sprites': []}

    for i, (x0, x1) in enumerate(partes):
        caja = (max(0, x0 - MARGEN), arriba, min(im.size[0], x1 + MARGEN), abajo + 1)
        recorte = sin_fondo(im.crop(caja))
        ancho = max(1, round(recorte.size[0] * escala))
        recorte = recorte.resize((ancho, ALTO_FINAL), Image.LANCZOS)

        nombre = 'cuerpo-%d.webp' % i
        recorte.save(os.path.join(SALIDA, nombre), 'WEBP', quality=88, method=6)
        peso = os.path.getsize(os.path.join(SALIDA, nombre))
        medidas['sprites'].append({
            'archivo': nombre, 'ancho': ancho, 'bytes': peso,
            'pelo': caja_del_pelo(recorte)
        })
        print('  %s  %dx%d  %.1f KB' % (nombre, ancho, ALTO_FINAL, peso / 1024))

    with open(os.path.join(SALIDA, 'sprites.json'), 'w', encoding='utf-8') as f:
        json.dump(medidas, f, ensure_ascii=False, indent=2)

    # Las medidas van tambien como JS: un fetch de un JSON para siete numeros
    # obligaria a que el dibujo espere a la red la primera vez.
    js = os.path.join(RAIZ, 'sprite-datos.js')
    with open(js, 'w', encoding='utf-8') as f:
        f.write('/* Generado por tools/sprites.py. No editar a mano. */\n')
        f.write('const SPRITES = ')
        json.dump(medidas, f, ensure_ascii=False, indent=2)
        f.write(';\n')
    print('sprite-datos.js escrito')

    total = sum(s['bytes'] for s in medidas['sprites'])
    print('Total: %.1f KB' % (total / 1024))
    return 0


if __name__ == '__main__':
    sys.exit(main())
