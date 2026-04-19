create table if not exists public.legacy_route_photos (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  climb_id uuid references public.climbs(id) on delete set null,
  photo_url text,
  legacy_grade text,
  legacy_climb_type text,
  legacy_location text,
  legacy_name text,
  legacy_notes text,
  legacy_flash boolean,
  created_at timestamp with time zone not null,
  imported_at timestamp with time zone not null default now()
);

alter table public.legacy_route_photos enable row level security;

do $$
begin
  create policy "Users can view own legacy route photos"
  on public.legacy_route_photos
  for select
  using (auth.uid() = user_id);
exception
  when duplicate_object then null;
end $$;

do $$
declare
  target_user_id uuid;
begin
  select id into target_user_id
  from auth.users
  where email = 'carreras.albacete.david@gmail.com'
  limit 1;

  if target_user_id is null then
    raise exception 'Legacy media fix aborted: target auth user not found';
  end if;

  insert into public.legacy_route_photos (
    id, user_id, session_id, climb_id, photo_url, legacy_grade, legacy_climb_type,
    legacy_location, legacy_name, legacy_notes, legacy_flash, created_at
  )
  values
    ('119c1f6d-0b01-4d5d-ac0d-8bda93d7489c', target_user_id, 'e8b65720-b594-44fb-b2d0-9f11f8a9a444', '5cf0e2ff-215f-5c97-957a-6d1d1747aa31', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742333328560.jpg', '6a', 'Lead', 'El chorro ', 'Blue line', '', false, '2025-03-18 21:28:49.797156+00'),
    ('0ecd49ff-6d63-4f7c-b3e0-a6e7afe1de34', target_user_id, '276d43e1-dcf1-4c78-bb21-523fdc868e8b', '5d7fd136-0768-5951-9d19-23616579ee30', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742401756300.jpg', '6c', 'Lead', 'Sharma', 'Sharma Routes', 'Via del sharma', false, '2025-03-19 16:29:15.665078+00'),
    ('035bc982-be1b-4578-89df-f2859b2614c1', target_user_id, 'f06df514-b696-4af3-b9d2-9189ed980c2c', 'ff1b30a9-fa76-511d-afe4-2e90b08462be', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742402003086.jpg', '6a', 'Autobelay', 'Sputnik', 'Sputnik Route', 'Ruta de Sputnik con Autoasegurador presas azules 15 m', false, '2025-03-19 16:33:22.509474+00'),
    ('11ae69d8-79af-4961-96db-64ee1f4faa09', target_user_id, '1ae26163-2c13-4062-8846-a5202ea23175', 'f6314023-934a-5a08-867b-6cdba6648318', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742575419384.jpg', '5c', 'Top Rope', 'Sharma', 'Morada ', '', false, '2025-03-21 16:43:41.646151+00'),
    ('6cec52c1-7940-4547-a2f1-a833bcbc7c42', target_user_id, '276d43e1-dcf1-4c78-bb21-523fdc868e8b', 'cd97cf1e-3ace-5151-b83e-fff0577f3054', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742576203214.jpg', '6a', 'Autobelay', 'Sharma', '', '', false, '2025-03-21 16:56:45.101851+00'),
    ('8f1b04e4-2788-479c-accf-15b37c1e7aeb', target_user_id, '276d43e1-dcf1-4c78-bb21-523fdc868e8b', 'b7cc2f79-4bc4-57a7-bd45-3bb17911a9f8', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742576231114.jpg', '6b', 'Autobelay', '', '', '', false, '2025-03-21 16:57:16.151581+00'),
    ('63936316-0056-4275-ad83-e2d80960c6e6', target_user_id, '276d43e1-dcf1-4c78-bb21-523fdc868e8b', '0d4c2d1b-913e-5974-91ea-67e8edc69c30', 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742576553920.jpg', '6c', 'Autobelay', '', '', 'Vía dura de pies pequeños y regletas diagonales. ', false, '2025-03-21 17:02:35.596099+00'),
    ('e1e24056-001e-498e-a37d-c76e96b7a6c9', target_user_id, '276d43e1-dcf1-4c78-bb21-523fdc868e8b', null, 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1742577450759.jpg', '6c', 'Autobelay', 'Sharma', '', 'Vía con puertas y pies resbaladizos ', false, '2025-03-21 17:17:35.281086+00'),
    ('77c8e159-decb-465e-af21-8b8f8481425f', target_user_id, '477d49e6-8581-47c6-84df-3914d338f0c0', null, 'https://rsjeozamlfsxjmyzbbpa.supabase.co/storage/v1/object/public/route_photos/1b2d34ec-3935-474b-bab5-fda66258379a/1b2d34ec-3935-474b-bab5-fda66258379a-1743334186815.jpg', '7a', 'Autobelay', 'Sharma', 'Azul paso duro al principio ', 'Paso de equilibrio y técnico pero bueno ', false, '2025-03-30 11:29:48.162698+00')
  on conflict (id) do nothing;

  delete from public.attachments
  where id in (
    '119c1f6d-0b01-4d5d-ac0d-8bda93d7489c',
    '0ecd49ff-6d63-4f7c-b3e0-a6e7afe1de34',
    '035bc982-be1b-4578-89df-f2859b2614c1',
    '11ae69d8-79af-4961-96db-64ee1f4faa09',
    '6cec52c1-7940-4547-a2f1-a833bcbc7c42',
    '8f1b04e4-2788-479c-accf-15b37c1e7aeb',
    '63936316-0056-4275-ad83-e2d80960c6e6',
    'e1e24056-001e-498e-a37d-c76e96b7a6c9',
    '77c8e159-decb-465e-af21-8b8f8481425f'
  );

  update public.profiles
  set avatar_url = null
  where id = target_user_id
    and avatar_url like 'https://rsjeozamlfsxjmyzbbpa.supabase.co/%';
end $$;
