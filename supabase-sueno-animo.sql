-- El sueño y el ánimo, que hasta ahora vivían solo en el dispositivo donde se
-- cargaban. Son dos de los cinco hábitos del día y no subían a ningún lado.
--
-- Correr una sola vez en el SQL Editor de Supabase. Es seguro correrlo de
-- nuevo: las tres columnas usan "if not exists".

alter table public.dias add column if not exists sueno_horas   numeric;
alter table public.dias add column if not exists sueno_calidad text;
alter table public.dias add column if not exists animo         text;

-- Y en comidas: los tres nutrientes que la pantalla del día muestra abajo del
-- anillo —los trae el código de barras— más qué fracción de lo estimado se
-- comió. Todo eso se guardaba local y no subía.

alter table public.comidas add column if not exists fibra          numeric not null default 0;
alter table public.comidas add column if not exists azucar         numeric not null default 0;
alter table public.comidas add column if not exists sodio          numeric not null default 0;
alter table public.comidas add column if not exists porcion_factor numeric not null default 1;
