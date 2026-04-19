do $$
begin
  create type public.session_status as enum ('in_progress', 'completed', 'abandoned');
exception
  when duplicate_object then null;
end $$;

alter table public.sessions
  add column if not exists status public.session_status,
  add column if not exists started_at timestamp with time zone,
  add column if not exists paused_at timestamp with time zone,
  add column if not exists paused_ms integer,
  add column if not exists completed_at timestamp with time zone,
  add column if not exists planned_session_id uuid references public.planned_sessions(id) on delete set null;

update public.sessions
set
  status = coalesce(status, 'completed'::public.session_status),
  started_at = coalesce(started_at, created_at, now()),
  paused_ms = coalesce(paused_ms, 0),
  completed_at = coalesce(completed_at, updated_at, created_at, now())
where status is null
   or started_at is null
   or paused_ms is null
   or completed_at is null;

alter table public.sessions
  alter column status set default 'completed'::public.session_status,
  alter column status set not null,
  alter column paused_ms set default 0,
  alter column paused_ms set not null;

alter table public.climbs
  add column if not exists order_index integer;

update public.climbs
set order_index = coalesce(order_index, 0)
where order_index is null;

alter table public.climbs
  alter column order_index set default 0,
  alter column order_index set not null;

create unique index if not exists idx_sessions_user_active_unique
  on public.sessions (user_id)
  where status = 'in_progress';

create index if not exists idx_sessions_user_status_date
  on public.sessions (user_id, status, date desc);

create index if not exists idx_climbs_session_order
  on public.climbs (session_id, order_index);
