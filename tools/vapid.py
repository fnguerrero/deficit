"""Genera el par de claves VAPID para las notificaciones push.

CORRELO VOS, en tu consola: la privada se imprime en pantalla y no tiene que
pasar por ningun lado mas. Un par generado en otra maquina —o pegado en un
chat— se descarta y se genera de nuevo.

Se corre UNA vez. La publica va en el codigo de la app (es publica de verdad:
identifica al emisor y no autoriza nada por si sola) y la privada se carga como
secreto del Worker con `npx wrangler secret put VAPID_PRIVADA`.

    py -3 tools/vapid.py

No guarda nada en disco a proposito: la privada se pega directo en el prompt de
wrangler y no queda en ningun archivo del repo.
"""

import base64

from cryptography.hazmat.primitives.asymmetric import ec


def b64(datos: bytes) -> str:
    """base64url sin relleno, que es como las pide el estandar."""
    return base64.urlsafe_b64encode(datos).rstrip(b'=').decode()


def main() -> None:
    """Con `--secreto-a ARCHIVO` la privada NO se imprime: va al archivo y de
    ahi directo al prompt de wrangler. Es la forma de generarla sin que quede en
    una pantalla, un log o un historial de consola."""
    import argparse
    import sys

    ap = argparse.ArgumentParser()
    ap.add_argument('--secreto-a', default='')
    args = ap.parse_args()

    clave = ec.generate_private_key(ec.SECP256R1())
    numeros = clave.private_numbers()
    publica = clave.public_key().public_numbers()

    # La publica va en formato "punto sin comprimir": 0x04 + X + Y, 65 bytes.
    crudo = b'\x04' + publica.x.to_bytes(32, 'big') + publica.y.to_bytes(32, 'big')
    privada = numeros.private_value.to_bytes(32, 'big')

    if args.secreto_a:
        with open(args.secreto_a, 'w', encoding='utf-8') as f:
            f.write(b64(privada))
        print(b64(crudo))
        print('privada escrita en ' + args.secreto_a, file=sys.stderr)
        return

    print('VAPID_PUBLICA  (va en el codigo de la app, es publica):')
    print(b64(crudo))
    print()
    print('VAPID_PRIVADA  (secreto del Worker, NO va al repo):')
    print(b64(privada))
    print()
    print('Cargala con:')
    print(r'  cd "W:\Working Folder Personal\DeficitCalorico\proxy" && npx wrangler secret put VAPID_PRIVADA')


if __name__ == '__main__':
    main()
