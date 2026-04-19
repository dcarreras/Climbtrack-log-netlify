-- Legacy Supabase import generated from dump
-- Source user email: carreras.albacete.david@gmail.com
-- Sessions: 31
-- Climbs: 90
-- Legacy photo records: 9
-- Goals: 4

create table if not exists public.legacy_profile_snapshots ( id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, source text not null, payload jsonb not null, imported_at timestamp with time zone not null default now());
alter table public.legacy_profile_snapshots enable row level security;
do $$ begin create policy "Users can view own legacy profile snapshots" on public.legacy_profile_snapshots for select using (auth.uid() = user_id); exception when duplicate_object then null; end $$;

create table if not exists public.legacy_goals ( id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, title text not null, description text, progress integer, source text not null default 'legacy-supabase', created_at timestamp with time zone not null, imported_at timestamp with time zone not null default now());
alter table public.legacy_goals enable row level security;
do $$ begin create policy "Users can view own legacy goals" on public.legacy_goals for select using (auth.uid() = user_id); exception when duplicate_object then null; end $$;

create table if not exists public.legacy_route_photos ( id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade, session_id uuid references public.sessions(id) on delete set null, climb_id uuid references public.climbs(id) on delete set null, photo_url text, legacy_grade text, legacy_climb_type text, legacy_location text, legacy_name text, legacy_notes text, legacy_flash boolean, created_at timestamp with time zone not null, imported_at timestamp with time zone not null default now());
alter table public.legacy_route_photos enable row level security;
do $$ begin create policy "Users can view own legacy route photos" on public.legacy_route_photos for select using (auth.uid() = user_id); exception when duplicate_object then null; end $$;

do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id from auth.users where email = 'carreras.albacete.david@gmail.com' limit 1;
  if target_user_id is null then
    raise exception 'Legacy import aborted: target auth user not found for email %', 'carreras.albacete.david@gmail.com';
  end if;

  update public.profiles set display_name = coalesce(display_name, 'David Carreras Albacete') where id = target_user_id;
  insert into public.legacy_profile_snapshots (id, user_id, source, payload) values ('8794215d-66c3-5ea7-a189-d0d5323d869d', target_user_id, 'legacy-supabase', '{"id": "1b2d34ec-3935-474b-bab5-fda66258379a", "name": "David Carreras Albacete", "email": "carreras.albacete.david@gmail.com", "location": "Madrid ", "member_since": "2025-03-13", "home_gym": "Sharma Climbing ", "climbing_style": "Todos ", "total_sessions": "19", "hours_climbed": "33", "top_boulder": "6b", "top_sport": "7b", "created_at": "2025-03-13 17:04:09.87053+00", "avatar_url": "https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/profile_images/1b2d34ec-3935-474b-bab5-fda66258379a/avatar.jpg"}'::jsonb) on conflict (id) do nothing;

  if not exists (select 1 from public.gyms where lower(name) = lower('Boulder Gym')) then
    insert into public.gyms (name) values ('Boulder Gym');
  end if;
  if not exists (select 1 from public.gyms where lower(name) = lower('El chorro malaga')) then
    insert into public.gyms (name) values ('El chorro malaga');
  end if;
  if not exists (select 1 from public.gyms where lower(name) = lower('Gym')) then
    insert into public.gyms (name) values ('Gym');
  end if;
  if not exists (select 1 from public.gyms where lower(name) = lower('Home Wall')) then
    insert into public.gyms (name) values ('Home Wall');
  end if;
  if not exists (select 1 from public.gyms where lower(name) = lower('Red River Gorge')) then
    insert into public.gyms (name) values ('Red River Gorge');
  end if;
  if not exists (select 1 from public.gyms where lower(name) = lower('Sharma')) then
    insert into public.gyms (name) values ('Sharma');
  end if;
  if not exists (select 1 from public.gyms where lower(name) = lower('Smith Rock')) then
    insert into public.gyms (name) values ('Smith Rock');
  end if;
  if not exists (select 1 from public.gyms where lower(name) = lower('Sputnik')) then
    insert into public.gyms (name) values ('Sputnik');
  end if;
  if not exists (select 1 from public.gyms where lower(name) = lower('The Crag')) then
    insert into public.gyms (name) values ('The Crag');
  end if;
  if not exists (select 1 from public.gyms where lower(name) = lower('Timer')) then
    insert into public.gyms (name) values ('Timer');
  end if;
  if not exists (select 1 from public.gyms where lower(name) = lower('Urban Rocks')) then
    insert into public.gyms (name) values ('Urban Rocks');
  end if;
  if not exists (select 1 from public.gyms where lower(name) = lower('Vertical World')) then
    insert into public.gyms (name) values ('Vertical World');
  end if;

  if not exists (select 1 from public.sessions where id = '8792f1d7-b88d-4dd4-8fc8-bd559020a370') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('8792f1d7-b88d-4dd4-8fc8-bd559020a370', target_user_id, '2025-03-13', (select id from public.gyms where lower(name) = lower('Sputnik') order by created_at asc limit 1), 'hybrid'::public.session_type, 60, 'Sport Climbing', 'Importado desde el proyecto legacy.
Tipo original: Sport Climbing
Ubicacion legacy: Sputnik
Grado resumen legacy: 6c
Total registrado en legacy: 5
Notas originales: sesion de boulder con Charlie', 'completed'::public.session_status, '2025-03-13 17:35:06.213+00', 0, '2025-03-13 17:35:06.213+00', '2025-03-13 17:35:06.213+00', '2025-03-13 17:35:06.213+00');
  end if;
  if not exists (select 1 from public.climbs where id = '8211aa4f-9768-59d2-b9b1-283a34f5c182') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('8211aa4f-9768-59d2-b9b1-283a34f5c182', '8792f1d7-b88d-4dd4-8fc8-bd559020a370', 'boulder'::public.discipline, null, 'font'::public.grade_system, '6b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Soft
Notas legacy: Boulder facil ', 0, '2025-03-13 17:35:06.213+00', '2025-03-13 17:35:06.213+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'b0b4c266-cd35-5ddf-83cf-4c02a3bb130b') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('b0b4c266-cd35-5ddf-83cf-4c02a3bb130b', '8792f1d7-b88d-4dd4-8fc8-bd559020a370', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, true, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Hard
Notas legacy: 4 bulders facies ', 1, '2025-03-13 17:35:06.213+00', '2025-03-13 17:35:06.213+00');
  end if;
  if not exists (select 1 from public.climbs where id = '48f0b42c-3230-5949-9d82-965229aadb6a') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('48f0b42c-3230-5949-9d82-965229aadb6a', '8792f1d7-b88d-4dd4-8fc8-bd559020a370', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, true, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Hard
Notas legacy: 4 bulders facies ', 2, '2025-03-13 17:35:06.213+00', '2025-03-13 17:35:06.213+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'dfc7c341-1776-538b-8cfb-6c33b59fe90e') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('dfc7c341-1776-538b-8cfb-6c33b59fe90e', '8792f1d7-b88d-4dd4-8fc8-bd559020a370', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, true, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Hard
Notas legacy: 4 bulders facies ', 3, '2025-03-13 17:35:06.213+00', '2025-03-13 17:35:06.213+00');
  end if;
  if not exists (select 1 from public.climbs where id = '2415290d-7354-5733-9b8c-cacf4854897e') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('2415290d-7354-5733-9b8c-cacf4854897e', '8792f1d7-b88d-4dd4-8fc8-bd559020a370', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, true, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Hard
Notas legacy: 4 bulders facies ', 4, '2025-03-13 17:35:06.213+00', '2025-03-13 17:35:06.213+00');
  end if;
  if not exists (select 1 from public.climbs where id = '0c20e6f3-75bb-54ff-9020-9a3141b58e5e') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('0c20e6f3-75bb-54ff-9020-9a3141b58e5e', '8792f1d7-b88d-4dd4-8fc8-bd559020a370', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Soft', 5, '2025-03-13 17:35:06.213+00', '2025-03-13 17:35:06.213+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'e46ecffd-2e90-524e-9d2f-931c0cbbc5f8') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('e46ecffd-2e90-524e-9d2f-931c0cbbc5f8', '8792f1d7-b88d-4dd4-8fc8-bd559020a370', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Soft', 6, '2025-03-13 17:35:06.213+00', '2025-03-13 17:35:06.213+00');
  end if;
  if not exists (select 1 from public.climbs where id = '8f45dd1a-dbd6-584a-a420-faeb8810ae97') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('8f45dd1a-dbd6-584a-a420-faeb8810ae97', '8792f1d7-b88d-4dd4-8fc8-bd559020a370', 'route'::public.discipline, null, 'french'::public.grade_system, '7a+', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Hard
Notas legacy: Project route - working the crux', 7, '2025-03-13 17:35:06.213+00', '2025-03-13 17:35:06.213+00');
  end if;
  if not exists (select 1 from public.sessions where id = '1ae26163-2c13-4062-8846-a5202ea23175') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('1ae26163-2c13-4062-8846-a5202ea23175', target_user_id, '2025-03-21', (select id from public.gyms where lower(name) = lower('Sharma') order by created_at asc limit 1), 'rope'::public.session_type, 60, 'Sport Climbing', 'Importado desde el proyecto legacy.
Tipo original: Sport Climbing
Ubicacion legacy: Sharma
Total registrado en legacy: 5', 'completed'::public.session_status, '2025-03-21 17:02:53.601+00', 0, '2025-03-21 17:02:53.601+00', '2025-03-21 17:02:53.601+00', '2025-03-21 17:02:53.601+00');
  end if;
  if not exists (select 1 from public.climbs where id = '7602e9fe-7770-5343-b77f-2ea9d4a70055') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('7602e9fe-7770-5343-b77f-2ea9d4a70055', '1ae26163-2c13-4062-8846-a5202ea23175', 'route'::public.discipline, null, 'french'::public.grade_system, '6A', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Soft', 0, '2025-03-21 17:02:53.601+00', '2025-03-21 17:02:53.601+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'd7216ed3-0e53-5195-a529-ab66d1d9155e') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('d7216ed3-0e53-5195-a529-ab66d1d9155e', '1ae26163-2c13-4062-8846-a5202ea23175', 'route'::public.discipline, null, 'french'::public.grade_system, '6A', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium', 1, '2025-03-21 17:02:53.601+00', '2025-03-21 17:02:53.601+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'f6314023-934a-5a08-867b-6cdba6648318') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('f6314023-934a-5a08-867b-6cdba6648318', '1ae26163-2c13-4062-8846-a5202ea23175', 'route'::public.discipline, 'purple'::public.color_band, 'french'::public.grade_system, '5c', 1, true, true, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Hard
Notas legacy: Via facil en autos - Morado', 2, '2025-03-21 17:02:53.601+00', '2025-03-21 17:02:53.601+00');
  end if;
  if not exists (select 1 from public.climbs where id = '2c6bfc56-7072-5ea8-b170-ddb8370b581a') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('2c6bfc56-7072-5ea8-b170-ddb8370b581a', '1ae26163-2c13-4062-8846-a5202ea23175', 'route'::public.discipline, null, 'french'::public.grade_system, '7a+', 1, true, true, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Medium
Notas legacy: Via de cazos sencilla', 3, '2025-03-21 17:02:53.601+00', '2025-03-21 17:02:53.601+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'f9b35cfa-30be-5fe8-8b42-e01b7a8e426e') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('f9b35cfa-30be-5fe8-8b42-e01b7a8e426e', '1ae26163-2c13-4062-8846-a5202ea23175', 'route'::public.discipline, null, 'french'::public.grade_system, '4b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium', 4, '2025-03-21 17:02:53.601+00', '2025-03-21 17:02:53.601+00');
  end if;
  if not exists (select 1 from public.sessions where id = '3494c155-20fe-44b1-a16d-5102d56f9bee') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('3494c155-20fe-44b1-a16d-5102d56f9bee', target_user_id, '2025-03-10', (select id from public.gyms where lower(name) = lower('Sharma') order by created_at asc limit 1), 'rope'::public.session_type, 20, 'Sport Climbing', 'Importado desde el proyecto legacy.
Tipo original: Sport Climbing
Ubicacion legacy: Sharma
Grado resumen legacy: 6c
Total registrado en legacy: 7
Notas originales: sesion de prueba con cuerda', 'completed'::public.session_status, '2025-03-13 18:36:14.679+00', 0, '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'b4de9dcc-2f5b-5a3b-a8e0-57d6246e117c') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('b4de9dcc-2f5b-5a3b-a8e0-57d6246e117c', '3494c155-20fe-44b1-a16d-5102d56f9bee', 'route'::public.discipline, null, 'french'::public.grade_system, '6a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Hard', 0, '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'e5fa10a1-d80f-51ab-8e4e-a1d84508f488') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('e5fa10a1-d80f-51ab-8e4e-a1d84508f488', '3494c155-20fe-44b1-a16d-5102d56f9bee', 'route'::public.discipline, null, 'french'::public.grade_system, '6b+', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Soft', 1, '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00');
  end if;
  if not exists (select 1 from public.climbs where id = '882bd6b0-b951-5f55-bec8-6176a6afd2b6') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('882bd6b0-b951-5f55-bec8-6176a6afd2b6', '3494c155-20fe-44b1-a16d-5102d56f9bee', 'route'::public.discipline, null, 'french'::public.grade_system, '5a+', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Medium', 2, '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00');
  end if;
  if not exists (select 1 from public.climbs where id = '42204f38-58d4-56ce-859b-f8f97820b3fe') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('42204f38-58d4-56ce-859b-f8f97820b3fe', '3494c155-20fe-44b1-a16d-5102d56f9bee', 'route'::public.discipline, null, 'french'::public.grade_system, '5a+', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Medium', 3, '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'bcc43b01-9abc-5f42-8742-1789f48a4e0c') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('bcc43b01-9abc-5f42-8742-1789f48a4e0c', '3494c155-20fe-44b1-a16d-5102d56f9bee', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Medium', 4, '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00');
  end if;
  if not exists (select 1 from public.climbs where id = '4e203315-e326-53e4-bf3c-4e679c926d9e') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('4e203315-e326-53e4-bf3c-4e679c926d9e', '3494c155-20fe-44b1-a16d-5102d56f9bee', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Medium', 5, '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00');
  end if;
  if not exists (select 1 from public.climbs where id = '4b438656-2f29-55fd-8d97-1c49445cbaf9') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('4b438656-2f29-55fd-8d97-1c49445cbaf9', '3494c155-20fe-44b1-a16d-5102d56f9bee', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Medium', 6, '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'a36be44c-17d8-5c22-ae51-869f7a07c34b') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('a36be44c-17d8-5c22-ae51-869f7a07c34b', '3494c155-20fe-44b1-a16d-5102d56f9bee', 'route'::public.discipline, null, 'french'::public.grade_system, '6b+', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Medium
Notas legacy: Endurance test with many small holds', 7, '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'bda2417c-152c-5256-baa7-7dacf2deeddd') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('bda2417c-152c-5256-baa7-7dacf2deeddd', '3494c155-20fe-44b1-a16d-5102d56f9bee', 'route'::public.discipline, null, 'french'::public.grade_system, '6b+', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Medium
Notas legacy: Endurance test with many small holds', 8, '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'dcf5a23d-98ed-5f52-8e72-ee9a97fd68e5') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('dcf5a23d-98ed-5f52-8e72-ee9a97fd68e5', '3494c155-20fe-44b1-a16d-5102d56f9bee', 'route'::public.discipline, null, 'french'::public.grade_system, '7a+', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Hard
Notas legacy: Project route - working the crux', 9, '2025-03-13 18:36:14.679+00', '2025-03-13 18:36:14.679+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'dbfff328-fa20-4e5c-8292-0dda5ffa56d8') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('dbfff328-fa20-4e5c-8292-0dda5ffa56d8', target_user_id, '2025-03-11', (select id from public.gyms where lower(name) = lower('Sharma') order by created_at asc limit 1), 'rope'::public.session_type, 25, 'Sport Climbing', 'Importado desde el proyecto legacy.
Tipo original: Sport Climbing
Ubicacion legacy: Sharma
Grado resumen legacy: 6c
Total registrado en legacy: 7
Notas originales: otra sesion de cuerda', 'completed'::public.session_status, '2025-03-13 18:37:02.196+00', 0, '2025-03-13 18:37:02.196+00', '2025-03-13 18:37:02.196+00', '2025-03-13 18:37:02.196+00');
  end if;
  if not exists (select 1 from public.climbs where id = '598d97ac-bdca-56f6-ae32-cbad50cd4877') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('598d97ac-bdca-56f6-ae32-cbad50cd4877', 'dbfff328-fa20-4e5c-8292-0dda5ffa56d8', 'route'::public.discipline, null, 'french'::public.grade_system, '6a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium', 0, '2025-03-13 18:37:02.196+00', '2025-03-13 18:37:02.196+00');
  end if;
  if not exists (select 1 from public.climbs where id = '16ce6b33-d50c-5bd5-a947-a66ac06a56b3') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('16ce6b33-d50c-5bd5-a947-a66ac06a56b3', 'dbfff328-fa20-4e5c-8292-0dda5ffa56d8', 'route'::public.discipline, null, 'french'::public.grade_system, '6b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium', 1, '2025-03-13 18:37:02.196+00', '2025-03-13 18:37:02.196+00');
  end if;
  if not exists (select 1 from public.climbs where id = '83bcd3ec-7e5f-5dc5-a59e-3c80c1271911') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('83bcd3ec-7e5f-5dc5-a59e-3c80c1271911', 'dbfff328-fa20-4e5c-8292-0dda5ffa56d8', 'route'::public.discipline, null, 'french'::public.grade_system, '6b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium', 2, '2025-03-13 18:37:02.196+00', '2025-03-13 18:37:02.196+00');
  end if;
  if not exists (select 1 from public.climbs where id = '956a8ee7-bd6e-5166-8993-fdd66de51bd3') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('956a8ee7-bd6e-5166-8993-fdd66de51bd3', 'dbfff328-fa20-4e5c-8292-0dda5ffa56d8', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium', 3, '2025-03-13 18:37:02.196+00', '2025-03-13 18:37:02.196+00');
  end if;
  if not exists (select 1 from public.climbs where id = '035b5f5f-99e2-5870-a3ff-1b92843a06fb') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('035b5f5f-99e2-5870-a3ff-1b92843a06fb', 'dbfff328-fa20-4e5c-8292-0dda5ffa56d8', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium', 4, '2025-03-13 18:37:02.196+00', '2025-03-13 18:37:02.196+00');
  end if;
  if not exists (select 1 from public.climbs where id = '58bb9644-c7bf-5897-b40c-3b9ee6f6b82c') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('58bb9644-c7bf-5897-b40c-3b9ee6f6b82c', 'dbfff328-fa20-4e5c-8292-0dda5ffa56d8', 'route'::public.discipline, null, 'french'::public.grade_system, '5a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium', 5, '2025-03-13 18:37:02.196+00', '2025-03-13 18:37:02.196+00');
  end if;
  if not exists (select 1 from public.climbs where id = '7bf15664-3292-5521-9f79-9967901b3597') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('7bf15664-3292-5521-9f79-9967901b3597', 'dbfff328-fa20-4e5c-8292-0dda5ffa56d8', 'route'::public.discipline, null, 'french'::public.grade_system, '5a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium', 6, '2025-03-13 18:37:02.196+00', '2025-03-13 18:37:02.196+00');
  end if;
  if not exists (select 1 from public.climbs where id = '6e27c3e4-018e-5842-b399-2a4eac3faacc') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('6e27c3e4-018e-5842-b399-2a4eac3faacc', 'dbfff328-fa20-4e5c-8292-0dda5ffa56d8', 'route'::public.discipline, null, 'french'::public.grade_system, '6b+', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Extremely Hard', 7, '2025-03-13 18:37:02.196+00', '2025-03-13 18:37:02.196+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'd0a70df2-a7d1-59ba-a74b-0ea7d9f419e4') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('d0a70df2-a7d1-59ba-a74b-0ea7d9f419e4', 'dbfff328-fa20-4e5c-8292-0dda5ffa56d8', 'route'::public.discipline, null, 'french'::public.grade_system, '7b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Hard
Notas legacy: Project route - working the crux', 8, '2025-03-13 18:37:02.196+00', '2025-03-13 18:37:02.196+00');
  end if;
  if not exists (select 1 from public.sessions where id = '585a3cae-e947-462c-bcec-68f6299efc65') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('585a3cae-e947-462c-bcec-68f6299efc65', target_user_id, '2025-03-14', (select id from public.gyms where lower(name) = lower('Timer') order by created_at asc limit 1), 'boulder'::public.session_type, 60, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Timer
Total registrado en legacy: 1', 'completed'::public.session_status, '2025-03-14 02:47:38.98+00', 0, '2025-03-14 02:47:38.98+00', '2025-03-14 02:47:38.98+00', '2025-03-14 02:47:38.98+00');
  end if;
  if not exists (select 1 from public.climbs where id = '908f4f70-26dd-5a7f-af84-daa3b5d21699') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('908f4f70-26dd-5a7f-af84-daa3b5d21699', '585a3cae-e947-462c-bcec-68f6299efc65', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V4', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Medium
Notas legacy: Endurance test with many small holds', 0, '2025-03-14 02:47:38.98+00', '2025-03-14 02:47:38.98+00');
  end if;
  if not exists (select 1 from public.climbs where id = '769c4f38-930d-51f6-828e-a35e8a42f7c9') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('769c4f38-930d-51f6-828e-a35e8a42f7c9', '585a3cae-e947-462c-bcec-68f6299efc65', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V6', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Medium
Notas legacy: Project attempt - making progress', 1, '2025-03-14 02:47:38.98+00', '2025-03-14 02:47:38.98+00');
  end if;
  if not exists (select 1 from public.sessions where id = '3fb1aedf-4539-41d5-8fee-b6f169b3cd77') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('3fb1aedf-4539-41d5-8fee-b6f169b3cd77', target_user_id, '2025-03-14', (select id from public.gyms where lower(name) = lower('Timer') order by created_at asc limit 1), 'boulder'::public.session_type, 60, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Timer
Total registrado en legacy: 1', 'completed'::public.session_status, '2025-03-14 02:47:46.045+00', 0, '2025-03-14 02:47:46.045+00', '2025-03-14 02:47:46.045+00', '2025-03-14 02:47:46.045+00');
  end if;
  if not exists (select 1 from public.climbs where id = '93c7ab33-975f-5df9-8246-c9f2184f8942') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('93c7ab33-975f-5df9-8246-c9f2184f8942', '3fb1aedf-4539-41d5-8fee-b6f169b3cd77', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V5', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Soft', 0, '2025-03-14 02:47:46.045+00', '2025-03-14 02:47:46.045+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'fc77c9e5-3254-544c-8ce4-af64e0f7befc') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('fc77c9e5-3254-544c-8ce4-af64e0f7befc', '3fb1aedf-4539-41d5-8fee-b6f169b3cd77', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V6', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Hard
Notas legacy: Project attempt - making progress', 1, '2025-03-14 02:47:46.045+00', '2025-03-14 02:47:46.045+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'f61276f1-9bfa-5a84-8014-e9094b2aa458') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('f61276f1-9bfa-5a84-8014-e9094b2aa458', '3fb1aedf-4539-41d5-8fee-b6f169b3cd77', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V6', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Hard
Notas legacy: Project attempt - making progress', 2, '2025-03-14 02:47:46.045+00', '2025-03-14 02:47:46.045+00');
  end if;
  if not exists (select 1 from public.sessions where id = '61eda67b-fd25-4673-9bbe-31932a2f4b4f') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('61eda67b-fd25-4673-9bbe-31932a2f4b4f', target_user_id, '2023-11-15', (select id from public.gyms where lower(name) = lower('Boulder Gym') order by created_at asc limit 1), 'boulder'::public.session_type, 90, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Boulder Gym
Grado resumen legacy: V4
Total registrado en legacy: 12
Notas originales: Great session, worked on overhangs', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = '98ac4dcf-7d59-5954-b25b-a1b1adc34f94') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('98ac4dcf-7d59-5954-b25b-a1b1adc34f94', '61eda67b-fd25-4673-9bbe-31932a2f4b4f', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V5', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Hard', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'e98d55a6-c642-5d87-aeb7-0295eb9dc46b') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('e98d55a6-c642-5d87-aeb7-0295eb9dc46b', '61eda67b-fd25-4673-9bbe-31932a2f4b4f', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V5', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Hard', 1, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'f4266d16-150e-5f48-87a9-9e0b07b305ad') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('f4266d16-150e-5f48-87a9-9e0b07b305ad', '61eda67b-fd25-4673-9bbe-31932a2f4b4f', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V5', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Hard', 2, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = '406e3826-5af7-52b6-8cb5-5f61b44ae1af') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('406e3826-5af7-52b6-8cb5-5f61b44ae1af', '61eda67b-fd25-4673-9bbe-31932a2f4b4f', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V5', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Medium
Notas legacy: Project attempt - making progress', 3, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'dcf3c0cf-0c6a-42f2-9772-35bf4b3dcade') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('dcf3c0cf-0c6a-42f2-9772-35bf4b3dcade', target_user_id, '2023-11-22', (select id from public.gyms where lower(name) = lower('Boulder Gym') order by created_at asc limit 1), 'boulder'::public.session_type, 75, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Boulder Gym
Grado resumen legacy: V3
Total registrado en legacy: 8
Notas originales: Focused on technique', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'dbb8cef2-3d57-5846-be01-a178ac18e6a3') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('dbb8cef2-3d57-5846-be01-a178ac18e6a3', 'dcf3c0cf-0c6a-42f2-9772-35bf4b3dcade', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V4', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Hard
Notas legacy: Endurance test with many small holds', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'a337778e-72a6-4fa4-b0ad-b1094982b8e5') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('a337778e-72a6-4fa4-b0ad-b1094982b8e5', target_user_id, '2023-12-05', (select id from public.gyms where lower(name) = lower('Urban Rocks') order by created_at asc limit 1), 'boulder'::public.session_type, 120, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Urban Rocks
Grado resumen legacy: V5
Total registrado en legacy: 15
Notas originales: Pushed my limits today!', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = '289c7bd6-9b98-545d-8cbf-4cbbc39242b9') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('289c7bd6-9b98-545d-8cbf-4cbbc39242b9', 'a337778e-72a6-4fa4-b0ad-b1094982b8e5', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V5', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Hard
Notas legacy: Slab requiring balance and patience', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'ebc2f73f-982c-5a73-8f73-6ae6f7d29b98') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('ebc2f73f-982c-5a73-8f73-6ae6f7d29b98', 'a337778e-72a6-4fa4-b0ad-b1094982b8e5', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V5', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Hard
Notas legacy: Slab requiring balance and patience', 1, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'b46151e6-b05a-464c-8571-701e86a76ab7') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('b46151e6-b05a-464c-8571-701e86a76ab7', target_user_id, '2023-12-18', (select id from public.gyms where lower(name) = lower('Boulder Gym') order by created_at asc limit 1), 'boulder'::public.session_type, 60, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Boulder Gym
Grado resumen legacy: V4
Total registrado en legacy: 7
Notas originales: Quick session', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = '9084668a-d8dd-5a3f-9763-3ee555d9fe9a') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('9084668a-d8dd-5a3f-9763-3ee555d9fe9a', 'b46151e6-b05a-464c-8571-701e86a76ab7', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V6', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Medium', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'fdc5299e-811c-4ded-9d1c-ed34eb333aa8') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('fdc5299e-811c-4ded-9d1c-ed34eb333aa8', target_user_id, '2024-01-10', (select id from public.gyms where lower(name) = lower('Boulder Gym') order by created_at asc limit 1), 'boulder'::public.session_type, 90, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Boulder Gym
Grado resumen legacy: V5
Total registrado en legacy: 10
Notas originales: Worked on a crimpy problem', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = '581c5f57-9e3b-5168-a074-dcc2bf15343e') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('581c5f57-9e3b-5168-a074-dcc2bf15343e', 'fdc5299e-811c-4ded-9d1c-ed34eb333aa8', 'boulder'::public.discipline, null, 'v-grade'::public.grade_system, 'V4', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Extremely Hard', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = '1dc18b04-26b1-4dec-82be-d774de63fe01') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('1dc18b04-26b1-4dec-82be-d774de63fe01', target_user_id, '2024-01-22', (select id from public.gyms where lower(name) = lower('Vertical World') order by created_at asc limit 1), 'rope'::public.session_type, 120, 'Sport Climbing', 'Importado desde el proyecto legacy.
Tipo original: Sport Climbing
Ubicacion legacy: Vertical World
Grado resumen legacy: 6b+
Total registrado en legacy: 6
Notas originales: First lead climbing session', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'b0660c93-4839-5ca9-b364-246067a1e1e1') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('b0660c93-4839-5ca9-b364-246067a1e1e1', '1dc18b04-26b1-4dec-82be-d774de63fe01', 'route'::public.discipline, null, 'french'::public.grade_system, '6a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Hard', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'b4224a6d-73a6-5d82-91e6-0679edb97a51') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('b4224a6d-73a6-5d82-91e6-0679edb97a51', '1dc18b04-26b1-4dec-82be-d774de63fe01', 'route'::public.discipline, null, 'french'::public.grade_system, '6a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Hard', 1, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'bd31a4f1-962e-40e7-a256-6f455211bbc4') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('bd31a4f1-962e-40e7-a256-6f455211bbc4', target_user_id, '2024-02-05', (select id from public.gyms where lower(name) = lower('The Crag') order by created_at asc limit 1), 'rope'::public.session_type, 150, 'Sport Climbing', 'Importado desde el proyecto legacy.
Tipo original: Sport Climbing
Ubicacion legacy: The Crag
Grado resumen legacy: 6c
Total registrado en legacy: 8
Notas originales: Great endurance training', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = '8f183e09-43d5-5ad6-a9d6-7e64a9915331') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('8f183e09-43d5-5ad6-a9d6-7e64a9915331', 'bd31a4f1-962e-40e7-a256-6f455211bbc4', 'route'::public.discipline, null, 'french'::public.grade_system, '6c+', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Soft', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = '73725576-9a9d-4c2a-9663-720782eeb890') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('73725576-9a9d-4c2a-9663-720782eeb890', target_user_id, '2024-02-18', (select id from public.gyms where lower(name) = lower('Vertical World') order by created_at asc limit 1), 'rope'::public.session_type, 180, 'Sport Climbing', 'Importado desde el proyecto legacy.
Tipo original: Sport Climbing
Ubicacion legacy: Vertical World
Grado resumen legacy: 7a
Total registrado en legacy: 9
Notas originales: Sent my project!', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = '4d72ba78-9c98-5c53-bae2-a5fcad211789') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('4d72ba78-9c98-5c53-bae2-a5fcad211789', '73725576-9a9d-4c2a-9663-720782eeb890', 'route'::public.discipline, null, 'french'::public.grade_system, '6a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium
Notas legacy: Endurance test with many small holds', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = '07e11b1d-46db-54c6-ae42-1b3ad7482957') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('07e11b1d-46db-54c6-ae42-1b3ad7482957', '73725576-9a9d-4c2a-9663-720782eeb890', 'route'::public.discipline, null, 'french'::public.grade_system, '6a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium
Notas legacy: Endurance test with many small holds', 1, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = '13a8b634-f790-41b4-a4f2-76dd6f2d31ef') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('13a8b634-f790-41b4-a4f2-76dd6f2d31ef', target_user_id, '2024-03-04', (select id from public.gyms where lower(name) = lower('The Crag') order by created_at asc limit 1), 'rope'::public.session_type, 120, 'Sport Climbing', 'Importado desde el proyecto legacy.
Tipo original: Sport Climbing
Ubicacion legacy: The Crag
Grado resumen legacy: 6c+
Total registrado en legacy: 5
Notas originales: Working on technique', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'db685dc0-6b10-573e-b6c5-d5da1dcc21dd') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('db685dc0-6b10-573e-b6c5-d5da1dcc21dd', '13a8b634-f790-41b4-a4f2-76dd6f2d31ef', 'route'::public.discipline, null, 'french'::public.grade_system, '7a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Medium
Notas legacy: Dynamic moves between good holds', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'c2bf7867-1104-4320-8dd2-4a47edfb259a') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('c2bf7867-1104-4320-8dd2-4a47edfb259a', target_user_id, '2024-03-20', (select id from public.gyms where lower(name) = lower('Smith Rock') order by created_at asc limit 1), 'rope'::public.session_type, 240, 'Outdoor', 'Importado desde el proyecto legacy.
Tipo original: Outdoor
Ubicacion legacy: Smith Rock
Grado resumen legacy: 6b
Total registrado en legacy: 6
Notas originales: Beautiful day, great climbs', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'd2e5daf6-5356-5a9a-9ded-e6657ed9db8d') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('d2e5daf6-5356-5a9a-9ded-e6657ed9db8d', 'c2bf7867-1104-4320-8dd2-4a47edfb259a', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Medium', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'c626417e-6cc6-4cb3-a222-0c47fdd02241') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('c626417e-6cc6-4cb3-a222-0c47fdd02241', target_user_id, '2024-04-10', (select id from public.gyms where lower(name) = lower('Red River Gorge') order by created_at asc limit 1), 'rope'::public.session_type, 300, 'Outdoor', 'Importado desde el proyecto legacy.
Tipo original: Outdoor
Ubicacion legacy: Red River Gorge
Grado resumen legacy: 6c
Total registrado en legacy: 8
Notas originales: Amazing weekend trip', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'ff9cc496-8dff-51ff-be5e-4fd5f695555f') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('ff9cc496-8dff-51ff-be5e-4fd5f695555f', 'c626417e-6cc6-4cb3-a222-0c47fdd02241', 'route'::public.discipline, null, 'french'::public.grade_system, '6b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Soft
Notas legacy: Crimpy route with technical footwork', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = '74fa4e2f-d820-565e-809a-f7fdd1e2f7f2') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('74fa4e2f-d820-565e-809a-f7fdd1e2f7f2', 'c626417e-6cc6-4cb3-a222-0c47fdd02241', 'route'::public.discipline, null, 'french'::public.grade_system, '6b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Soft
Notas legacy: Crimpy route with technical footwork', 1, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = '0bc6aecf-675a-4ecf-ac3b-601016e29496') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('0bc6aecf-675a-4ecf-ac3b-601016e29496', target_user_id, '2024-04-25', (select id from public.gyms where lower(name) = lower('Home Wall') order by created_at asc limit 1), 'rope'::public.session_type, 60, 'Training', 'Importado desde el proyecto legacy.
Tipo original: Training
Ubicacion legacy: Home Wall
Grado resumen legacy: V4
Notas originales: Finger strength training', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = '1899548a-22eb-586b-bb53-793a093f3fe8') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('1899548a-22eb-586b-bb53-793a093f3fe8', '0bc6aecf-675a-4ecf-ac3b-601016e29496', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, true, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Extremely Hard
Notas legacy: Endurance test with many small holds', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'e58ca492-20df-5e05-a520-ed63c8ad3ea7') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('e58ca492-20df-5e05-a520-ed63c8ad3ea7', '0bc6aecf-675a-4ecf-ac3b-601016e29496', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, true, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Extremely Hard
Notas legacy: Endurance test with many small holds', 1, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = '5a3386a1-ed14-47cf-a569-72934b74c001') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('5a3386a1-ed14-47cf-a569-72934b74c001', target_user_id, '2024-05-07', (select id from public.gyms where lower(name) = lower('Gym') order by created_at asc limit 1), 'rope'::public.session_type, 90, 'Training', 'Importado desde el proyecto legacy.
Tipo original: Training
Ubicacion legacy: Gym
Grado resumen legacy: V3
Notas originales: Campus board and core workout', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'f8afe420-d072-549f-bdf7-b80f31478a1f') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('f8afe420-d072-549f-bdf7-b80f31478a1f', '5a3386a1-ed14-47cf-a569-72934b74c001', 'route'::public.discipline, null, 'french'::public.grade_system, '7a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Medium
Notas legacy: Crimpy route with technical footwork', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'b3f43bbf-68d5-53d8-ad7a-afe115747d4b') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('b3f43bbf-68d5-53d8-ad7a-afe115747d4b', '5a3386a1-ed14-47cf-a569-72934b74c001', 'route'::public.discipline, null, 'french'::public.grade_system, '7a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Medium
Notas legacy: Crimpy route with technical footwork', 1, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'f15bab1b-6776-4382-9f96-138a21be4c95') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('f15bab1b-6776-4382-9f96-138a21be4c95', target_user_id, '2024-05-20', (select id from public.gyms where lower(name) = lower('Gym') order by created_at asc limit 1), 'rope'::public.session_type, 75, 'Training', 'Importado desde el proyecto legacy.
Tipo original: Training
Ubicacion legacy: Gym
Grado resumen legacy: V4
Notas originales: Endurance training', 'completed'::public.session_status, '2025-03-14 02:53:19.065888+00', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = '89980903-b53c-5f86-abbd-4004bf2c075a') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('89980903-b53c-5f86-abbd-4004bf2c075a', 'f15bab1b-6776-4382-9f96-138a21be4c95', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Soft
Notas legacy: Crimpy route with technical footwork', 0, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'eb9c4b5d-14c4-5bc9-a870-87a0d3876cfc') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('eb9c4b5d-14c4-5bc9-a870-87a0d3876cfc', 'f15bab1b-6776-4382-9f96-138a21be4c95', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Soft
Notas legacy: Crimpy route with technical footwork', 1, '2025-03-14 02:53:19.065888+00', '2025-03-14 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.sessions where id = '8b2814db-ed6e-4be3-b80d-f5809d09fbe6') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('8b2814db-ed6e-4be3-b80d-f5809d09fbe6', target_user_id, '2025-03-16', (select id from public.gyms where lower(name) = lower('El chorro malaga') order by created_at asc limit 1), 'rope'::public.session_type, 300, 'Outdoor', 'Importado desde el proyecto legacy.
Tipo original: Outdoor
Ubicacion legacy: El chorro malaga 
Total registrado en legacy: 5
No habia detalle individual de vias en el dump original.', 'completed'::public.session_status, '2025-03-17 22:06:18.007+00', 0, '2025-03-17 22:06:18.007+00', '2025-03-17 22:06:18.007+00', '2025-03-17 22:06:18.007+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'eaf7d91e-dcbf-51ce-bb22-8aff11b47c24') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('eaf7d91e-dcbf-51ce-bb22-8aff11b47c24', '8b2814db-ed6e-4be3-b80d-f5809d09fbe6', 'route'::public.discipline, null, null, null, 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 0, '2025-03-17 22:06:18.007+00', '2025-03-17 22:06:18.007+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'fb60e316-7900-5226-bcba-666576e8595b') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('fb60e316-7900-5226-bcba-666576e8595b', '8b2814db-ed6e-4be3-b80d-f5809d09fbe6', 'route'::public.discipline, null, null, null, 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 1, '2025-03-17 22:06:18.007+00', '2025-03-17 22:06:18.007+00');
  end if;
  if not exists (select 1 from public.climbs where id = '1ffc2663-4ac6-5864-b235-2c21e1eb345a') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('1ffc2663-4ac6-5864-b235-2c21e1eb345a', '8b2814db-ed6e-4be3-b80d-f5809d09fbe6', 'route'::public.discipline, null, null, null, 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 2, '2025-03-17 22:06:18.007+00', '2025-03-17 22:06:18.007+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'c6851414-3be7-516b-b990-9a5626f28bb6') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('c6851414-3be7-516b-b990-9a5626f28bb6', '8b2814db-ed6e-4be3-b80d-f5809d09fbe6', 'route'::public.discipline, null, null, null, 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 3, '2025-03-17 22:06:18.007+00', '2025-03-17 22:06:18.007+00');
  end if;
  if not exists (select 1 from public.climbs where id = '5b6e32d2-4669-5d7f-9aa2-dbf6fbc33b6b') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('5b6e32d2-4669-5d7f-9aa2-dbf6fbc33b6b', '8b2814db-ed6e-4be3-b80d-f5809d09fbe6', 'route'::public.discipline, null, null, null, 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 4, '2025-03-17 22:06:18.007+00', '2025-03-17 22:06:18.007+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'cb1906db-003f-492c-b106-eb85aaf3cde9') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('cb1906db-003f-492c-b106-eb85aaf3cde9', target_user_id, '2025-03-16', (select id from public.gyms where lower(name) = lower('El chorro malaga') order by created_at asc limit 1), 'rope'::public.session_type, 300, 'Outdoor', 'Importado desde el proyecto legacy.
Tipo original: Outdoor
Ubicacion legacy: El chorro malaga 
Total registrado en legacy: 5
No habia detalle individual de vias en el dump original.', 'completed'::public.session_status, '2025-03-17 22:06:24.038+00', 0, '2025-03-17 22:06:24.038+00', '2025-03-17 22:06:24.038+00', '2025-03-17 22:06:24.038+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'e1eb8fcd-2170-5bb6-a2f2-cce686378cf1') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('e1eb8fcd-2170-5bb6-a2f2-cce686378cf1', 'cb1906db-003f-492c-b106-eb85aaf3cde9', 'route'::public.discipline, null, null, null, 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 0, '2025-03-17 22:06:24.038+00', '2025-03-17 22:06:24.038+00');
  end if;
  if not exists (select 1 from public.climbs where id = '3afe3cf8-1e6f-57bf-a2ee-9ef961285587') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('3afe3cf8-1e6f-57bf-a2ee-9ef961285587', 'cb1906db-003f-492c-b106-eb85aaf3cde9', 'route'::public.discipline, null, null, null, 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 1, '2025-03-17 22:06:24.038+00', '2025-03-17 22:06:24.038+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'cdc10e3c-0885-539a-8205-83c4758562cd') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('cdc10e3c-0885-539a-8205-83c4758562cd', 'cb1906db-003f-492c-b106-eb85aaf3cde9', 'route'::public.discipline, null, null, null, 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 2, '2025-03-17 22:06:24.038+00', '2025-03-17 22:06:24.038+00');
  end if;
  if not exists (select 1 from public.climbs where id = '0c61624e-eb78-54c9-a247-f448222bb951') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('0c61624e-eb78-54c9-a247-f448222bb951', 'cb1906db-003f-492c-b106-eb85aaf3cde9', 'route'::public.discipline, null, null, null, 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 3, '2025-03-17 22:06:24.038+00', '2025-03-17 22:06:24.038+00');
  end if;
  if not exists (select 1 from public.climbs where id = '33ea13da-db49-5857-8a57-9008005dbbd9') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('33ea13da-db49-5857-8a57-9008005dbbd9', 'cb1906db-003f-492c-b106-eb85aaf3cde9', 'route'::public.discipline, null, null, null, 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 4, '2025-03-17 22:06:24.038+00', '2025-03-17 22:06:24.038+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'f06df514-b696-4af3-b9d2-9189ed980c2c') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('f06df514-b696-4af3-b9d2-9189ed980c2c', target_user_id, '2025-03-19', (select id from public.gyms where lower(name) = lower('Sputnik') order by created_at asc limit 1), 'boulder'::public.session_type, 60, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Sputnik
Grado resumen legacy: 6a
Total registrado en legacy: 1
No habia detalle individual de vias en el dump original.', 'completed'::public.session_status, '2025-03-19 16:36:14.027+00', 0, '2025-03-19 16:36:14.027+00', '2025-03-19 16:36:14.027+00', '2025-03-19 16:36:14.027+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'ff1b30a9-fa76-511d-afe4-2e90b08462be') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('ff1b30a9-fa76-511d-afe4-2e90b08462be', 'f06df514-b696-4af3-b9d2-9189ed980c2c', 'boulder'::public.discipline, null, 'font'::public.grade_system, '6a', 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 0, '2025-03-19 16:36:14.027+00', '2025-03-19 16:36:14.027+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'e8b65720-b594-44fb-b2d0-9f11f8a9a444') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('e8b65720-b594-44fb-b2d0-9f11f8a9a444', target_user_id, '2025-03-20', (select id from public.gyms where lower(name) = lower('Sharma') order by created_at asc limit 1), 'rope'::public.session_type, 60, 'Sport Climbing', 'Importado desde el proyecto legacy.
Tipo original: Sport Climbing
Ubicacion legacy: Sharma
Total registrado en legacy: 4', 'completed'::public.session_status, '2025-03-20 20:41:00.968+00', 0, '2025-03-20 20:41:00.968+00', '2025-03-20 20:41:00.968+00', '2025-03-20 20:41:00.968+00');
  end if;
  if not exists (select 1 from public.climbs where id = '44257928-3118-5e60-beaf-151a051c8e0a') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('44257928-3118-5e60-beaf-151a051c8e0a', 'e8b65720-b594-44fb-b2d0-9f11f8a9a444', 'route'::public.discipline, null, 'french'::public.grade_system, '5', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Medium', 0, '2025-03-20 20:41:00.968+00', '2025-03-20 20:41:00.968+00');
  end if;
  if not exists (select 1 from public.climbs where id = '5cf0e2ff-215f-5c97-957a-6d1d1747aa31') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('5cf0e2ff-215f-5c97-957a-6d1d1747aa31', 'e8b65720-b594-44fb-b2d0-9f11f8a9a444', 'route'::public.discipline, null, 'french'::public.grade_system, '6a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Medium', 1, '2025-03-20 20:41:00.968+00', '2025-03-20 20:41:00.968+00');
  end if;
  if not exists (select 1 from public.climbs where id = '1aa18412-b36a-593c-8b21-85e58772b6e5') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('1aa18412-b36a-593c-8b21-85e58772b6e5', 'e8b65720-b594-44fb-b2d0-9f11f8a9a444', 'route'::public.discipline, null, 'french'::public.grade_system, '6b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Lead
Dificultad legacy: Medium', 2, '2025-03-20 20:41:00.968+00', '2025-03-20 20:41:00.968+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'b79d4b50-400c-5fd2-8b9b-2fb307810c7f') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('b79d4b50-400c-5fd2-8b9b-2fb307810c7f', 'e8b65720-b594-44fb-b2d0-9f11f8a9a444', 'route'::public.discipline, null, 'french'::public.grade_system, '6b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Hard
Notas legacy: Stop 🛑', 3, '2025-03-20 20:41:00.968+00', '2025-03-20 20:41:00.968+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'a0fd5991-86db-46be-bee6-82c1e5582519') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('a0fd5991-86db-46be-bee6-82c1e5582519', target_user_id, '2025-03-20', (select id from public.gyms where lower(name) = lower('Sharma') order by created_at asc limit 1), 'boulder'::public.session_type, 60, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Sharma
Grado resumen legacy: 6a
Total registrado en legacy: 1
No habia detalle individual de vias en el dump original.', 'completed'::public.session_status, '2025-03-20 23:37:58.51+00', 0, '2025-03-20 23:37:58.51+00', '2025-03-20 23:37:58.51+00', '2025-03-20 23:37:58.51+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'dc39689c-8f35-5ad8-a679-8017f201602c') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('dc39689c-8f35-5ad8-a679-8017f201602c', 'a0fd5991-86db-46be-bee6-82c1e5582519', 'boulder'::public.discipline, null, 'font'::public.grade_system, '6a', 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 0, '2025-03-20 23:37:58.51+00', '2025-03-20 23:37:58.51+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'c95cdc66-95c2-40ed-8ae0-19aadffa79a4') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('c95cdc66-95c2-40ed-8ae0-19aadffa79a4', target_user_id, '2025-03-20', (select id from public.gyms where lower(name) = lower('Sharma') order by created_at asc limit 1), 'boulder'::public.session_type, 60, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Sharma
Grado resumen legacy: 6a
Total registrado en legacy: 1
No habia detalle individual de vias en el dump original.', 'completed'::public.session_status, '2025-03-20 23:38:00.094+00', 0, '2025-03-20 23:38:00.094+00', '2025-03-20 23:38:00.094+00', '2025-03-20 23:38:00.094+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'ee5f79bc-0255-52f0-b4ae-911370e070fa') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('ee5f79bc-0255-52f0-b4ae-911370e070fa', 'c95cdc66-95c2-40ed-8ae0-19aadffa79a4', 'boulder'::public.discipline, null, 'font'::public.grade_system, '6a', 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 0, '2025-03-20 23:38:00.094+00', '2025-03-20 23:38:00.094+00');
  end if;
  if not exists (select 1 from public.sessions where id = '893a607f-cb00-4585-9740-127d404e111a') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('893a607f-cb00-4585-9740-127d404e111a', target_user_id, '2025-03-20', (select id from public.gyms where lower(name) = lower('Sharma') order by created_at asc limit 1), 'boulder'::public.session_type, 60, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Sharma
Grado resumen legacy: 6a
Total registrado en legacy: 1
No habia detalle individual de vias en el dump original.', 'completed'::public.session_status, '2025-03-20 23:38:00.371+00', 0, '2025-03-20 23:38:00.371+00', '2025-03-20 23:38:00.371+00', '2025-03-20 23:38:00.371+00');
  end if;
  if not exists (select 1 from public.climbs where id = '404e5e7a-31de-5bbc-9fb0-275a210e5cce') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('404e5e7a-31de-5bbc-9fb0-275a210e5cce', '893a607f-cb00-4585-9740-127d404e111a', 'boulder'::public.discipline, null, 'font'::public.grade_system, '6a', 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 0, '2025-03-20 23:38:00.371+00', '2025-03-20 23:38:00.371+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'cc5f7c97-8b13-488f-a3ab-f04216463f3b') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('cc5f7c97-8b13-488f-a3ab-f04216463f3b', target_user_id, '2025-03-20', (select id from public.gyms where lower(name) = lower('Sharma') order by created_at asc limit 1), 'boulder'::public.session_type, 60, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Sharma
Grado resumen legacy: 6a
Total registrado en legacy: 1
No habia detalle individual de vias en el dump original.', 'completed'::public.session_status, '2025-03-20 23:38:00.652+00', 0, '2025-03-20 23:38:00.652+00', '2025-03-20 23:38:00.652+00', '2025-03-20 23:38:00.652+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'edc35b8f-1842-56e5-b283-d5ff7ce111b1') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('edc35b8f-1842-56e5-b283-d5ff7ce111b1', 'cc5f7c97-8b13-488f-a3ab-f04216463f3b', 'boulder'::public.discipline, null, 'font'::public.grade_system, '6a', 1, true, false, 'Importado desde resumen legacy sin detalle por via.', 0, '2025-03-20 23:38:00.652+00', '2025-03-20 23:38:00.652+00');
  end if;
  if not exists (select 1 from public.sessions where id = 'cad761f7-d9d5-44c5-a1f5-1eb8a721ef08') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('cad761f7-d9d5-44c5-a1f5-1eb8a721ef08', target_user_id, '2025-03-20', (select id from public.gyms where lower(name) = lower('Sharma') order by created_at asc limit 1), 'boulder'::public.session_type, 60, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Sharma
Grado resumen legacy: 6a
Total registrado en legacy: 0
No habia detalle individual de vias en el dump original.', 'completed'::public.session_status, '2025-03-20 23:38:03.278+00', 0, '2025-03-20 23:38:03.278+00', '2025-03-20 23:38:03.278+00', '2025-03-20 23:38:03.278+00');
  end if;
  if not exists (select 1 from public.sessions where id = '276d43e1-dcf1-4c78-bb21-523fdc868e8b') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('276d43e1-dcf1-4c78-bb21-523fdc868e8b', target_user_id, '2025-03-21', (select id from public.gyms where lower(name) = lower('Sharma') order by created_at asc limit 1), 'rope'::public.session_type, 90, 'Sport Climbing', 'Importado desde el proyecto legacy.
Tipo original: Sport Climbing
Ubicacion legacy: Sharma
Grado resumen legacy: 6A
Total registrado en legacy: 0
Notas originales: Entreno de auroseguros con Javi ', 'completed'::public.session_status, '2025-03-22 11:21:10.767+00', 0, '2025-03-22 11:21:10.767+00', '2025-03-22 11:21:10.767+00', '2025-03-22 11:21:10.767+00');
  end if;
  if not exists (select 1 from public.climbs where id = '5d7fd136-0768-5951-9d19-23616579ee30') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('5d7fd136-0768-5951-9d19-23616579ee30', '276d43e1-dcf1-4c78-bb21-523fdc868e8b', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Soft
Notas legacy: Vía con puertas y pies resbaladizos ', 0, '2025-03-22 11:21:10.767+00', '2025-03-22 11:21:10.767+00');
  end if;
  if not exists (select 1 from public.climbs where id = '0d4c2d1b-913e-5974-91ea-67e8edc69c30') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('0d4c2d1b-913e-5974-91ea-67e8edc69c30', '276d43e1-dcf1-4c78-bb21-523fdc868e8b', 'route'::public.discipline, null, 'french'::public.grade_system, '6c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Medium
Notas legacy: Vía dura de pies pequeños y regletas diagonales. ', 1, '2025-03-22 11:21:10.767+00', '2025-03-22 11:21:10.767+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'b7cc2f79-4bc4-57a7-bd45-3bb17911a9f8') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('b7cc2f79-4bc4-57a7-bd45-3bb17911a9f8', '276d43e1-dcf1-4c78-bb21-523fdc868e8b', 'route'::public.discipline, null, 'french'::public.grade_system, '6b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Medium', 2, '2025-03-22 11:21:10.767+00', '2025-03-22 11:21:10.767+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'cd97cf1e-3ace-5151-b83e-fff0577f3054') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('cd97cf1e-3ace-5151-b83e-fff0577f3054', '276d43e1-dcf1-4c78-bb21-523fdc868e8b', 'route'::public.discipline, null, 'french'::public.grade_system, '6a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Autobelay
Dificultad legacy: Medium', 3, '2025-03-22 11:21:10.767+00', '2025-03-22 11:21:10.767+00');
  end if;
  if not exists (select 1 from public.climbs where id = '8066fed9-1bd4-57b9-9edf-4c5b3596fb64') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('8066fed9-1bd4-57b9-9edf-4c5b3596fb64', '276d43e1-dcf1-4c78-bb21-523fdc868e8b', 'route'::public.discipline, null, 'french'::public.grade_system, '5c', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium', 4, '2025-03-22 11:21:10.767+00', '2025-03-22 11:21:10.767+00');
  end if;
  if not exists (select 1 from public.sessions where id = '477d49e6-8581-47c6-84df-3914d338f0c0') then
    insert into public.sessions (id, user_id, date, gym_id, session_type, duration_min, description, notes, status, started_at, paused_ms, completed_at, created_at, updated_at) values ('477d49e6-8581-47c6-84df-3914d338f0c0', target_user_id, '2025-04-04', (select id from public.gyms where lower(name) = lower('Sharma') order by created_at asc limit 1), 'hybrid'::public.session_type, 90, 'Bouldering', 'Importado desde el proyecto legacy.
Tipo original: Bouldering
Ubicacion legacy: Sharma
Grado resumen legacy: 6A
Total registrado en legacy: 0', 'completed'::public.session_status, '2025-04-04 05:15:39.088+00', 0, '2025-04-04 05:15:39.088+00', '2025-04-04 05:15:39.088+00', '2025-04-04 05:15:39.088+00');
  end if;
  if not exists (select 1 from public.climbs where id = '3d4b68b9-5203-5a54-949a-afdf269a2af3') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('3d4b68b9-5203-5a54-949a-afdf269a2af3', '477d49e6-8581-47c6-84df-3914d338f0c0', 'boulder'::public.discipline, 'yellow'::public.color_band, 'font'::public.grade_system, '6a', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Hard
Notas legacy: Amarillo ', 0, '2025-04-04 05:15:39.088+00', '2025-04-04 05:15:39.088+00');
  end if;
  if not exists (select 1 from public.climbs where id = '08cd4b53-491c-5b08-a7f3-1236c9f23125') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('08cd4b53-491c-5b08-a7f3-1236c9f23125', '477d49e6-8581-47c6-84df-3914d338f0c0', 'boulder'::public.discipline, null, 'font'::public.grade_system, '6b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Medium', 1, '2025-04-04 05:15:39.088+00', '2025-04-04 05:15:39.088+00');
  end if;
  if not exists (select 1 from public.climbs where id = '476465ad-a54d-5b85-ac0e-5890fe34a74f') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('476465ad-a54d-5b85-ac0e-5890fe34a74f', '477d49e6-8581-47c6-84df-3914d338f0c0', 'route'::public.discipline, 'red'::public.color_band, 'french'::public.grade_system, '6b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium
Notas legacy: Rojo ', 2, '2025-04-04 05:15:39.088+00', '2025-04-04 05:15:39.088+00');
  end if;
  if not exists (select 1 from public.climbs where id = '22b24fdf-259f-58f4-ad04-85474e100243') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('22b24fdf-259f-58f4-ad04-85474e100243', '477d49e6-8581-47c6-84df-3914d338f0c0', 'route'::public.discipline, 'yellow'::public.color_band, 'french'::public.grade_system, '6A', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Top Rope
Dificultad legacy: Medium
Notas legacy: Amarillo ', 3, '2025-04-04 05:15:39.088+00', '2025-04-04 05:15:39.088+00');
  end if;
  if not exists (select 1 from public.climbs where id = 'a4c26ebc-9020-51be-95d0-415dd10a170d') then
    insert into public.climbs (id, session_id, discipline, color_band, grade_system, grade_value, attempts, sent, flash, notes, order_index, created_at, updated_at) values ('a4c26ebc-9020-51be-95d0-415dd10a170d', '477d49e6-8581-47c6-84df-3914d338f0c0', 'boulder'::public.discipline, 'red'::public.color_band, 'font'::public.grade_system, '6b', 1, true, false, 'Importado desde detalle legacy.
Tipo legacy: Boulder
Dificultad legacy: Hard
Notas legacy: Rojo', 4, '2025-04-04 05:15:39.088+00', '2025-04-04 05:15:39.088+00');
  end if;

  if not exists (select 1 from public.legacy_route_photos where id = '119c1f6d-0b01-4d5d-ac0d-8bda93d7489c') then
    insert into public.legacy_route_photos (id, user_id, session_id, climb_id, photo_url, legacy_grade, legacy_climb_type, legacy_location, legacy_name, legacy_notes, legacy_flash, created_at) values ('119c1f6d-0b01-4d5d-ac0d-8bda93d7489c', target_user_id, 'e8b65720-b594-44fb-b2d0-9f11f8a9a444', '5cf0e2ff-215f-5c97-957a-6d1d1747aa31', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742333328560.jpg', '6a', 'Lead', 'El chorro ', 'Blue line', '', false, '2025-03-18 21:28:49.797156+00');
  end if;
  if not exists (select 1 from public.legacy_route_photos where id = '0ecd49ff-6d63-4f7c-b3e0-a6e7afe1de34') then
    insert into public.legacy_route_photos (id, user_id, session_id, climb_id, photo_url, legacy_grade, legacy_climb_type, legacy_location, legacy_name, legacy_notes, legacy_flash, created_at) values ('0ecd49ff-6d63-4f7c-b3e0-a6e7afe1de34', target_user_id, '276d43e1-dcf1-4c78-bb21-523fdc868e8b', '5d7fd136-0768-5951-9d19-23616579ee30', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742401756300.jpg', '6c', 'Lead', 'Sharma', 'Sharma Routes', 'Via del sharma', false, '2025-03-19 16:29:15.665078+00');
  end if;
  if not exists (select 1 from public.legacy_route_photos where id = '035bc982-be1b-4578-89df-f2859b2614c1') then
    insert into public.legacy_route_photos (id, user_id, session_id, climb_id, photo_url, legacy_grade, legacy_climb_type, legacy_location, legacy_name, legacy_notes, legacy_flash, created_at) values ('035bc982-be1b-4578-89df-f2859b2614c1', target_user_id, 'f06df514-b696-4af3-b9d2-9189ed980c2c', 'ff1b30a9-fa76-511d-afe4-2e90b08462be', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742402003086.jpg', '6a', 'Autobelay', 'Sputnik', 'Sputnik Route', 'Ruta de Sputnik con Autoasegurador presas azules 15 m', false, '2025-03-19 16:33:22.509474+00');
  end if;
  if not exists (select 1 from public.legacy_route_photos where id = '11ae69d8-79af-4961-96db-64ee1f4faa09') then
    insert into public.legacy_route_photos (id, user_id, session_id, climb_id, photo_url, legacy_grade, legacy_climb_type, legacy_location, legacy_name, legacy_notes, legacy_flash, created_at) values ('11ae69d8-79af-4961-96db-64ee1f4faa09', target_user_id, '1ae26163-2c13-4062-8846-a5202ea23175', 'f6314023-934a-5a08-867b-6cdba6648318', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742575419384.jpg', '5c', 'Top Rope', 'Sharma', 'Morada ', '', false, '2025-03-21 16:43:41.646151+00');
  end if;
  if not exists (select 1 from public.legacy_route_photos where id = '6cec52c1-7940-4547-a2f1-a833bcbc7c42') then
    insert into public.legacy_route_photos (id, user_id, session_id, climb_id, photo_url, legacy_grade, legacy_climb_type, legacy_location, legacy_name, legacy_notes, legacy_flash, created_at) values ('6cec52c1-7940-4547-a2f1-a833bcbc7c42', target_user_id, '276d43e1-dcf1-4c78-bb21-523fdc868e8b', 'cd97cf1e-3ace-5151-b83e-fff0577f3054', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742576203214.jpg', '6a', 'Autobelay', 'Sharma', '', '', false, '2025-03-21 16:56:45.101851+00');
  end if;
  if not exists (select 1 from public.legacy_route_photos where id = '8f1b04e4-2788-479c-accf-15b37c1e7aeb') then
    insert into public.legacy_route_photos (id, user_id, session_id, climb_id, photo_url, legacy_grade, legacy_climb_type, legacy_location, legacy_name, legacy_notes, legacy_flash, created_at) values ('8f1b04e4-2788-479c-accf-15b37c1e7aeb', target_user_id, '276d43e1-dcf1-4c78-bb21-523fdc868e8b', 'b7cc2f79-4bc4-57a7-bd45-3bb17911a9f8', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742576231114.jpg', '6b', 'Autobelay', '', '', '', false, '2025-03-21 16:57:16.151581+00');
  end if;
  if not exists (select 1 from public.legacy_route_photos where id = '63936316-0056-4275-ad83-e2d80960c6e6') then
    insert into public.legacy_route_photos (id, user_id, session_id, climb_id, photo_url, legacy_grade, legacy_climb_type, legacy_location, legacy_name, legacy_notes, legacy_flash, created_at) values ('63936316-0056-4275-ad83-e2d80960c6e6', target_user_id, '276d43e1-dcf1-4c78-bb21-523fdc868e8b', '0d4c2d1b-913e-5974-91ea-67e8edc69c30', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742576553920.jpg', '6c', 'Autobelay', '', '', 'Vía dura de pies pequeños y regletas diagonales. ', false, '2025-03-21 17:02:35.596099+00');
  end if;
  if not exists (select 1 from public.legacy_route_photos where id = 'e1e24056-001e-498e-a37d-c76e96b7a6c9') then
    insert into public.legacy_route_photos (id, user_id, session_id, climb_id, photo_url, legacy_grade, legacy_climb_type, legacy_location, legacy_name, legacy_notes, legacy_flash, created_at) values ('e1e24056-001e-498e-a37d-c76e96b7a6c9', target_user_id, '276d43e1-dcf1-4c78-bb21-523fdc868e8b', null, 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742577450759.jpg', '6c', 'Autobelay', 'Sharma', '', 'Vía con puertas y pies resbaladizos ', false, '2025-03-21 17:17:35.281086+00');
  end if;
  if not exists (select 1 from public.legacy_route_photos where id = '77c8e159-decb-465e-af21-8b8f8481425f') then
    insert into public.legacy_route_photos (id, user_id, session_id, climb_id, photo_url, legacy_grade, legacy_climb_type, legacy_location, legacy_name, legacy_notes, legacy_flash, created_at) values ('77c8e159-decb-465e-af21-8b8f8481425f', target_user_id, '477d49e6-8581-47c6-84df-3914d338f0c0', null, 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1743334186815.jpg', '7a', 'Autobelay', 'Sharma', 'Azul paso duro al principio ', 'Paso de equilibrio y técnico pero bueno ', false, '2025-03-30 11:29:48.162698+00');
  end if;

  if not exists (select 1 from public.legacy_goals where id = '8c7962d7-6449-415e-9588-d65c08fe8416') then
    insert into public.legacy_goals (id, user_id, title, description, progress, created_at) values ('8c7962d7-6449-415e-9588-d65c08fe8416', target_user_id, 'Send V8 boulder', 'Project and successfully climb my first V8 boulder problem', 65, '2025-01-13 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.legacy_goals where id = '155c5cc8-ebeb-4407-951e-0a934c66f5c5') then
    insert into public.legacy_goals (id, user_id, title, description, progress, created_at) values ('155c5cc8-ebeb-4407-951e-0a934c66f5c5', target_user_id, 'Train finger strength', 'Consistent hangboard routine to improve crimp strength', 91, '2025-02-27 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.legacy_goals where id = '7946551c-5e30-4da0-b060-33492a92210c') then
    insert into public.legacy_goals (id, user_id, title, description, progress, created_at) values ('7946551c-5e30-4da0-b060-33492a92210c', target_user_id, 'Climb outdoors twice monthly', 'Make time to climb outdoors at least twice each month', 100, '2025-02-12 02:53:19.065888+00');
  end if;
  if not exists (select 1 from public.legacy_goals where id = 'bfeb7549-b17f-436c-8d52-2c0c7d63f30b') then
    insert into public.legacy_goals (id, user_id, title, description, progress, created_at) values ('bfeb7549-b17f-436c-8d52-2c0c7d63f30b', target_user_id, 'Lead climb 7c', 'Build endurance and technique to lead climb 7c routes', 42, '2025-01-28 02:53:19.065888+00');
  end if;
end $$;
