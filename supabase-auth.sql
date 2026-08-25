-- ============================================================
-- Déficit — pasar de "llave de dispositivo" a "cuenta de usuario".
--
-- Antes: cada instalación generaba una llave de 32 caracteres y esa llave
-- agrupaba los datos. Funcionaba, pero la comida quedaba asociada a un
-- dispositivo y no a una persona: instalabas en otro lado y era otra identidad.
--
-- Ahora: cada fila lleva el user_id de quien la cargó, y las políticas hacen
-- que nadie pueda ver ni tocar lo de otro. Entrás donde quieras y está todo.
--
-- Se corre entero en el SQL Editor de Supabase. Es idempotente: se puede
-- volver a correr sin romper nada.
-- ============================================================

-- ---------- 1. la columna del dueño ----------

-- Nullable a propósito: las filas que ya existen no tienen dueño todavía y las
-- va a reclamar la función de más abajo en el primer login.
alter table public.comidas add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.dias    add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Lo que más se consulta: "todo lo mío desde tal fecha".
create index if not exists comidas_user_subido on public.comidas (user_id, subido);
create index if not exists dias_user_subido    on public.dias    (user_id, subido);

-- ---------- 2. las políticas viejas se van ----------

-- Estas daban acceso a cualquiera que tuviera la anon key y adivinara una
-- llave. Con cuentas de verdad ya no hacen falta.
drop policy if exists comidas_anon on public.comidas;
drop policy if exists dias_anon    on public.dias;

-- ---------- 3. cada uno ve y toca lo suyo ----------

-- auth.uid() es el id del usuario que hizo la request, y sale del token que
-- firma Supabase: no se puede falsear desde el cliente. Esto es lo que hace que
-- la separación entre usuarios sea real y no una convención.

drop policy if exists comidas_propias on public.comidas;
create policy comidas_propias on public.comidas
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists dias_propios on public.dias;
create policy dias_propios on public.dias
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Sin sesión iniciada no se ve nada. Antes alcanzaba con la anon key.
revoke all on public.comidas from anon;
revoke all on public.dias    from anon;

-- ---------- 4. reclamar lo que se cargó antes del login ----------

-- El problema: hay filas cargadas con una llave de dispositivo y sin dueño.
-- Quien inicia sesión por primera vez tiene que poder adoptarlas.
--
-- Va como función y no como política abierta a propósito: una política que
-- dejara actualizar filas sin dueño permitiría que cualquiera se apropiara de
-- datos ajenos probando llaves. Acá el efecto es acotado —solo filas huérfanas,
-- solo de la llave exacta que el dispositivo ya tenía— y siempre a nombre de
-- quien hizo la llamada, que sale del token.
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

  return query select v_comidas, v_dias;
end;
$$;

revoke all on function public.reclamar_llave(text) from public, anon;
grant execute on function public.reclamar_llave(text) to authenticated;

-- ---------- 5. control ----------

-- Cuántas filas quedan sin dueño, es decir pendientes de reclamar.
select
  (select count(*) from public.comidas where user_id is null) as comidas_sin_duenio,
  (select count(*) from public.dias    where user_id is null) as dias_sin_duenio;
