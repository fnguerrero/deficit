-- La configuración, para que no haya que rearmarla en cada dispositivo.
--
-- El perfil ya viajaba (supabase-perfil.sql), pero no la configuración: quien
-- abría la app en la compu se encontraba los vasos en el default, el tiempo de
-- cada deporte sin ajustar, los horarios de las comidas de fábrica y el muñeco
-- con la figura equivocada. Todo eso se había elegido una vez, en el celular.
--
-- Va como una sola columna jsonb y no como diez columnas nuevas porque se
-- resuelve entera: gana la última que alguien tocó, con su propio reloj
-- adentro (`act`). Ver CFG_QUE_VIAJA en sync-perfil.js para qué entra — la
-- clave de la API y los permisos de notificación NO viajan, que son de cada
-- aparato.
--
-- Correr una sola vez en el SQL Editor de Supabase, DESPUÉS de
-- supabase-perfil.sql. Es seguro correrlo de nuevo.
--
-- Hasta que se corra, la app sigue andando: si el POST se queja de que la
-- columna no existe, reintenta sin ella y el perfil viaja igual.

alter table public.perfil add column if not exists cfg jsonb;
