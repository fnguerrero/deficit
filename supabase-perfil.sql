-- El perfil y la cintura, que hasta ahora no viajaban.
--
-- Los días y las comidas se sincronizaban desde el principio; el perfil no.
-- Quien abría la app en el celular se encontraba la altura, la edad y el
-- objetivo en blanco, y la app calculando sobre nada — mientras la pantalla
-- decía que con una cuenta los datos quedaban a salvo.
--
-- Correr una sola vez en el SQL Editor de Supabase, DESPUÉS de supabase.sql y
-- supabase-auth.sql. Es seguro correrlo de nuevo: todo usa "if not exists" o
-- "or replace".

-- ---------- 1. la cintura del día ----------
-- No es un dato diario, pero el día es el único lugar donde queda su FECHA, y
-- sin fecha no hay curva que dibujar en el otro dispositivo.
alter table public.dias add column if not exists cintura numeric;

-- ---------- 2. el perfil ----------
-- Una fila por llave. A diferencia de los días, que son muchos y se fusionan
-- uno por uno, el perfil es uno solo y se resuelve entero: gana el `act` más
-- alto, que es la última vez que alguien lo guardó.
create table if not exists public.perfil (
  llave      text    not null,
  sexo       text,
  edad       numeric,
  altura     numeric,
  peso       numeric,
  peso_obj   numeric,
  cintura    numeric,
  actividad  numeric,
  ritmo      numeric,
  plazo      text,               -- una fecha ISO, o null si no hay plazo puesto
  manual     numeric,
  modo       text,
  act        bigint  not null default 0,
  subido     bigint  not null default 0,
  user_id    uuid    references auth.users(id) on delete cascade,

  primary key (llave)
);

create index if not exists perfil_llave_subido on public.perfil (llave, subido);

-- ---------- 3. cada uno ve y toca lo suyo ----------
-- Las mismas reglas que dias y comidas después de supabase-auth.sql: solo con
-- sesión iniciada, y solo las filas propias.
alter table public.perfil enable row level security;

drop policy if exists perfil_propio on public.perfil;
create policy perfil_propio on public.perfil
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on public.perfil from anon;

-- ---------- 4. que el perfil también se reclame ----------
-- reclamar_llave adopta las filas cargadas antes del primer login. Sin sumar
-- el perfil acá, alguien que cargó su altura sin cuenta y después se registra
-- perdería el perfil justo en el momento en que empieza a sincronizar: la fila
-- vieja queda huérfana y nadie la vuelve a mirar.
create or replace function public.reclamar_llave(p_llave text)
returns table (comidas_migradas int, dias_migrados int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_comidas int := 0;
  v_dias int := 0;
begin
  if v_user is null then
    raise exception 'Hay que iniciar sesión antes de reclamar una llave';
  end if;

  if p_llave is null or length(p_llave) <> 32 then
    raise exception 'Esa llave no tiene el formato esperado';
  end if;

  update public.comidas
     set user_id = v_user
   where llave = p_llave
     and user_id is null;
  get diagnostics v_comidas = row_count;

  update public.dias
     set user_id = v_user
   where llave = p_llave
     and user_id is null;
  get diagnostics v_dias = row_count;

  -- El perfil no se cuenta en el resultado: la firma de la función es parte
  -- del contrato con el cliente, que espera exactamente esas dos columnas.
  update public.perfil
     set user_id = v_user
   where llave = p_llave
     and user_id is null;

  return query select v_comidas, v_dias;
end;
$$;

revoke all on function public.reclamar_llave(text) from public, anon;
