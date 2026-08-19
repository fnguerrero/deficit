# Déficit

PWA de déficit calórico con análisis de comidas **por foto** (Claude vision).

Publicada en <https://fnguerrero.github.io/deficit/>

## En el celular (Android)

Abrí la URL en Chrome → menú `⋮` → **Agregar a la pantalla principal**.
Queda con ícono propio y a pantalla completa. Dentro de la app, en **Ajustes**
también aparece el botón *Instalar* cuando Chrome lo ofrece.

Andando como PWA funciona offline salvo el análisis de foto, que necesita internet.

## En la compu

Doble clic en `Deficit.bat` → abre `http://localhost:5599`.

También funciona abriendo `index.html` directo, pero con `file://` no anda el
service worker; conviene el `.bat`.

## Primer uso

1. **Perfil** → cargá sexo, edad, altura, peso, actividad y ritmo de pérdida.
   Calcula TMB (Mifflin-St Jeor), TDEE y objetivo diario, con piso de seguridad.
2. **Ajustes** → pegá tu API key de Anthropic (`console.anthropic.com`).
   Queda solo en el `localStorage` de este navegador.
3. **Hoy** → `📷 Analizar foto`: sacás o elegís la foto del plato, Claude identifica
   los alimentos y estima porciones, calorías y macros. Todo es editable antes de guardar.

## Cómo funciona el análisis

- La imagen se redimensiona a 1024 px y se manda a la API de Claude (visión) con
  `output_config.format` para que devuelva JSON validado contra un schema.
- Si el modelo no soporta structured outputs, reintenta pidiendo JSON en el prompt.
- Se guarda una miniatura de 128 px por comida; si el `localStorage` se llena, se
  descartan las miniaturas viejas automáticamente.

Modelo por defecto: **Opus 5** (mejor estimación de porciones).
En Ajustes se puede bajar a Sonnet 5 o Haiku 4.5 para gastar menos.

## Datos

Todo vive en `localStorage` bajo la clave `deficit.v1`.
En Ajustes hay exportar / importar JSON y borrar todo.

## Archivos

- `index.html` — estructura y pantallas
- `styles.css` — estilos (tema oscuro, pensado para celular)
- `app.js` — cálculo nutricional, persistencia y llamada a la API
- `sw.js` — service worker (cache del shell; nunca cachea la API)
- `manifest.json` — manifest de la PWA
- `tools/gen_iconos.py` — regenera los íconos (`py -3 tools/gen_iconos.py`)

Al cambiar cualquier archivo del shell, subir `VERSION` en `sw.js` para que los
dispositivos ya instalados tomen la versión nueva.
