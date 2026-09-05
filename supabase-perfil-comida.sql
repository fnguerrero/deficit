-- Que ES cada comida, y la pregunta que quedo abierta, para que viajen entre
-- dispositivos.
--
-- Sin estas dos columnas una comida bajada del celular llega sin su perfil, y
-- los modos que juzgan por patron —mediterranea, vegetariana, paleo, sin
-- gluten— se quedan sin nada que mirar: el mismo plato figura "no apto" en el
-- dispositivo donde se saco la foto y "apto" en el otro, y con eso se mueven
-- el casillero de Comidas, la racha y la adherencia.
--
-- Correr en el SQL editor de Supabase. Es aditivo: las filas que ya estan
-- quedan con NULL, que es exactamente lo que la app hace hoy con ellas.

alter table comidas add column if not exists perfil jsonb;
alter table comidas add column if not exists ambiguedad jsonb;
