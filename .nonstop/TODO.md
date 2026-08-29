# TODO — ciclo 12: que no se pierdan datos

Estados: `[ ]` pendiente · `[~]` en curso · `[x]` hecho y verificado · `[!]` bloqueado

- [x] 1. Andamiaje: un doble del servidor con la forma de `clienteSupabase`, para probar la coreografía completa sin red · verif: un sync entero contra el doble, con filas que suben y bajan
- [x] 2. El sync automático deja de comerse lo que se cargó mientras corría · verif: test que carga una comida en medio del sync y la busca al final
- [x] 3. Quedarse sin señal no desloguea: la sesión solo se borra si el servidor la rechaza · verif: test con fetch que explota vs. fetch que devuelve 401
- [x] 4. Con sesión y sin token vivo, el sync no sigue como anónimo · verif: test de que no llama a guardar, y el mensaje que queda
- [x] 5. El día se fusiona campo por campo: el agua de un dispositivo no borra el peso del otro · verif: test con los dos lados tocando el mismo día
- [x] 6. Un respaldo que sobrevive a la primera fusión, con botón para volver atrás · verif: test del guardado + por DOM el botón aparece y restaura
- [x] 7. Si el sync viene fallando hace días, se ve · verif: test del cálculo + por DOM el aviso
- [x] 8. Nada de esto rompe lo que ya andaba · verif: suite completa, guardas, tamaños y las cinco pestañas en consola
