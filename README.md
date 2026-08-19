# Déficit

App local de déficit calórico con análisis de comidas **por foto** (Claude vision).

## Arrancar

Doble clic en `Deficit.bat` → abre `http://localhost:5599`.

También funciona abriendo `index.html` directo, pero conviene el `.bat` para evitar
restricciones del navegador con `file://`.

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
