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
-- Correr en el SQL editor de Supabase. Es idempotente: si la tabla ya existía
-- con la política vieja, volver a correrlo la cierra.

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

-- Cada suscripción es de una cuenta. El default hace que la app no tenga que
-- mandarlo: lo pone Postgres con el token de quien guarda.
alter table push_subs add column if not exists user_id uuid
  default auth.uid() references auth.users(id) on delete cascade;

-- Las que se guardaron antes de esta columna se adoptan por la llave: es la
-- misma que llevan las comidas, y esas ya tienen dueño desde supabase-auth.sql.
update push_subs p
   set user_id = c.user_id
  from (select distinct on (llave) llave, user_id
          from public.comidas
         where user_id is not null) c
 where p.user_id is null
   and p.llave = c.llave;

-- Las que siguen sin dueño no se pueden atribuir a nadie, y con la política de
-- abajo nadie podría volver a tocarlas. Se borran: al volver a prender
-- "Avisarme aunque tenga la app cerrada" se guardan de nuevo, ya con dueño.
delete from push_subs where user_id is null;

alter table push_subs enable row level security;

-- Antes era `for all using (true)` para cualquiera con la anon key, y la anon
-- key es pública: cualquiera podía listar todas las filas, con sus llaves de
-- sincronización, y borrarlas o reescribirlas. Ahora cada cuenta ve y toca
-- solo lo suyo. El Worker lee la tabla entera con la service_role, que es un
-- secreto suyo y saltea RLS.
drop policy if exists push_subs_todo on push_subs;
drop policy if exists push_subs_propias on push_subs;
create policy push_subs_propias on push_subs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
