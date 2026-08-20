# TODO — lo que le faltaba a Déficit (ciclo 3)

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

## Partir app.js (primero: todo lo demás va a tocar esos archivos)

- [x] 1. Separar el render en `ui/` por pantalla, sin cambiar comportamiento
      · verif: los 319 tests siguen en verde y la app arranca sin errores de consola
- [x] 2. Un chequeo automático de tamaño de archivos, para que no vuelva a pasar
      · verif: el script marca en rojo cualquier archivo que pase el límite

## Probar que la IA estima bien

- [x] 3. Banco de calibración: fotos con su valor real, corrida y error promedio
      · verif: correrlo con respuestas simuladas devuelve el error contra los valores reales
- [x] 4. Guardar cada corrección como medición del sesgo del modelo
      · verif: test que registra 3 correcciones y calcula el sesgo
- [x] 5. Avisar si el modelo viene subestimando o sobrestimando sistemáticamente
      · verif: test con sesgo del 20% que dispara el aviso, y con 3% que no
- [x] 6. Documentar en el README cómo correr la calibración en dos minutos
      · verif: seguir los pasos escritos, sin conocimiento previo, llega al resultado

## Que los datos no se pierdan

- [x] 7. Cliente de Supabase por REST, con fetch inyectable
      · verif: test de las cuatro operaciones contra un servidor simulado
- [x] 8. Identificador de dispositivo y llave de sincronización
      · verif: test de generación, formato y persistencia
- [x] 9. Subir los cambios locales
      · verif: test que sube 3 comidas y comprueba el cuerpo del request
- [x] 10. Bajar los cambios remotos y fusionarlos
      · verif: test que baja comidas nuevas y las suma sin duplicar
- [x] 11. Resolver conflictos: gana la modificación más reciente
      · verif: test con la misma comida editada en dos dispositivos
- [x] 12. Comidas borradas que no reviven al sincronizar
      · verif: test que borra en un dispositivo y sincroniza en el otro
- [x] 13. Pantalla de sincronización: estado, último sync, copiar la llave
      · verif: por DOM, con el cliente simulado, muestra el resultado real
- [x] 14. El SQL de las tablas y las políticas, listo para pegar en Supabase
      · verif: el archivo existe y describe todas las columnas que usa el cliente
- [x] 15. Respaldo automático a archivo y almacenamiento persistente
      · verif: pedir persistencia y comprobar el aviso de días sin respaldar

## Código de barras

- [x] 16. Cliente de Open Food Facts con cache local
      · verif: test con respuestas reales guardadas; el segundo pedido no usa red
- [x] 17. Escáner de código de barras con la cámara, y alternativa a mano
      · verif: comprobar el flujo con un código tipeado cuando no hay cámara
- [x] 18. Del producto a la comida: porciones, cantidad y guardado
      · verif: escanear (simulado) y guardar deja la comida con sus macros

## Que no se dispare el gasto

- [x] 19. Tope mensual de gasto que corta de verdad
      · verif: test que llega al límite y comprueba que el análisis se rechaza
- [x] 20. Aviso al acercarse y gasto del mes a la vista
      · verif: al 80% aparece el aviso; al 100%, el corte

## Nutrientes que faltaban

- [x] 21. Fibra, azúcar y sodio: modelo, schema del análisis y migración
      · verif: test de migración y del schema; los datos viejos quedan en cero
- [x] 22. Mostrarlos en el día y en el informe, solo si hay datos
      · verif: con datos aparecen, sin datos no ensucian la pantalla
