-- ============================================================
-- Déficit — tablas para sincronizar entre dispositivos.
--
-- Pegá todo esto en Supabase → SQL Editor → Run.
-- Después, en la app: Ajustes → Sincronización → pegá la URL del
-- proyecto y la anon key (Project Settings → API).
--
-- No hay login: la llave que genera la app es lo que agrupa tus datos.
-- Es larga y aleatoria (32 caracteres), y solo la tenés vos.
-- ============================================================

-- ---------- comidas ----------
create table if not exists public.comidas (
  llave    text    not null,
  id       text    not null,
  fecha    date    not null,
  ts       bigint  not null default 0,
  titulo   text    not null default '',
  items    jsonb   not null default '[]'::jsonb,
  -- numeric y no integer: un analisis devuelve 28,6 g de grasa, y media
  -- porcion da 15,3 g de proteina. Con integer, Postgres rechaza la fila.
  kcal     numeric not null default 0,
  prot     numeric not null default 0,
  carb     numeric not null default 0,
  gras     numeric not null default 0,
  momento  text    not null default 'almuerzo',
  notas    text    not null default '',
  borrada  boolean not null default false,

  -- act: cuándo se modificó en el dispositivo. Resuelve los conflictos.
  act      bigint  not null default 0,
  -- subido: cuándo llegó acá. Es lo que se filtra al bajar, porque una
  -- comida vieja subida tarde por otro dispositivo tiene que llegar igual.
  subido   bigint  not null default 0,

  primary key (llave, id)
);

-- ---------- días (peso, agua, ejercicio, nota) ----------
create table if not exists public.dias (
  llave      text    not null,
  fecha      date    not null,
  peso       numeric,
  agua       integer not null default 0,   -- vasos: se cuentan de a uno
  ejercicio  numeric not null default 0,
  nota       text    not null default '',
  act        bigint  not null default 0,
  subido     bigint  not null default 0,

  primary key (llave, fecha)
);

-- ---------- índices para la bajada ----------
create index if not exists comidas_llave_subido on public.comidas (llave, subido);
create index if not exists dias_llave_subido    on public.dias (llave, subido);

-- ============================================================
-- Seguridad
--
-- La anon key la lleva la app, así que es pública por definición. Lo que
-- protege los datos es la llave: sin ella no se puede leer ni escribir
-- nada, porque toda consulta filtra por `llave` y no existe forma de
-- listar las llaves que hay.
--
-- Estas políticas permiten leer y escribir cualquier fila, pero la app
-- siempre consulta con `llave=eq.<la tuya>`. Si querés algo más cerrado,
-- la alternativa es Supabase Auth con un usuario de verdad.
-- ============================================================

alter table public.comidas enable row level security;
alter table public.dias    enable row level security;

drop policy if exists comidas_anon on public.comidas;
create policy comidas_anon on public.comidas
  for all to anon
  using (true)
  with check (true);

drop policy if exists dias_anon on public.dias;
create policy dias_anon on public.dias
  for all to anon
  using (true)
  with check (true);

-- ============================================================
-- Para borrar todo y empezar de cero:
--   drop table if exists public.comidas, public.dias;
-- ============================================================
