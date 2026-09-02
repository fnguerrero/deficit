-- Los pasos del día, que hasta ahora no existían.
--
-- El sexto hábito. Se cargan a mano —el navegador no llega al podómetro ni a
-- Health Connect— y desde este ciclo cuentan para el día perfecto, así que
-- tienen que viajar como el agua y el ejercicio: sin esta columna, quien
-- camina y anota en el celular abre la compu y ve el casillero en blanco.
--
-- Correr una sola vez en el SQL Editor de Supabase, DESPUÉS de supabase.sql.
-- Es seguro correrlo de nuevo.

alter table public.dias add column if not exists pasos numeric;
