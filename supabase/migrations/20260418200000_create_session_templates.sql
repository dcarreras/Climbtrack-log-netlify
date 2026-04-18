create table public.session_templates (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  session_type public.session_type not null default 'boulder',
  blocks jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table public.session_templates enable row level security;

create policy "Users manage own templates"
  on public.session_templates
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
