-- ============================================================
-- Déficit — los macros son decimales, no enteros.
--
-- Correr una sola vez en Supabase → SQL Editor → Run.
-- Es seguro: no borra ni cambia ningún dato, solo ensancha el tipo de las
-- columnas. Los valores que ya estaban siguen igual.
--
-- POR QUÉ
--
-- Las tablas se crearon con kcal, prot, carb y gras como `integer`, y los
-- macros no son enteros: un análisis devuelve 28,6 g de grasa, y ajustar una
-- porción a la mitad da 15,3 g de proteína. Postgres rechazaba la fila entera
-- con `invalid input syntax for type integer: "28.6"`.
--
-- Y como todas las comidas se suben en un solo POST, **una sola comida con
-- decimales hacía fallar la subida completa**: no subía ninguna. Por eso la
-- sincronización nunca llegó a funcionar.
-- ============================================================

alter table public.comidas
  alter column kcal type numeric,
  alter column prot type numeric,
  alter column carb type numeric,
  alter column gras type numeric;

-- El ejercicio puede venir con decimales por el mismo motivo (un cálculo, no
-- un número tipeado). El agua se queda entera: son vasos y se cuentan de a uno.
alter table public.dias
  alter column ejercicio type numeric;

-- Para confirmar que quedó bien: las cinco tienen que decir "numeric".
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (table_name, column_name) in (
    ('comidas','kcal'), ('comidas','prot'), ('comidas','carb'),
    ('comidas','gras'), ('dias','ejercicio')
  )
order by table_name, column_name;
