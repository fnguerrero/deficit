-- A dónde golpear cuando toca un aviso, y a qué hora.
--
-- La app le pide al navegador una dirección propia —el "endpoint"— y la guarda
-- acá. El Worker lee esta tabla cada quince minutos y golpea las que tengan un
-- horario que caiga en esa ventana.
--
-- No hay ningún dato de comidas ni el mail: solo la llave de sincronización que
-- ya identifica al dispositivo, la dirección, los horarios y el huso. El texto
-- del aviso lo arma el teléfono, así que ni siquiera viaja.
--
-- Correr en el SQL editor de Supabase.

create table if not exists push_subs (
  endpoint text primary key,
  llave text not null,
  p256dh text,
  auth text,
  horarios jsonb not null default '[]'::jsonb,
  tz text,
  act bigint not null default 0,
  creado timestamptz not null default now()
);

create index if not exists push_subs_llave on push_subs (llave);

alter table push_subs enable row level security;

-- Igual que el resto de las tablas: la anon key puede escribir su fila, y lo
-- que separa un dispositivo de otro es la llave de 32 caracteres.
drop policy if exists push_subs_todo on push_subs;
create policy push_subs_todo on push_subs
  for all using (true) with check (true);
