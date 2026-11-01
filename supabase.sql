-- Run once in the Supabase SQL Editor for this app's project.
create table if not exists public.project_flow_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.project_flow_state enable row level security;
drop policy if exists "Users can read own project state" on public.project_flow_state;
drop policy if exists "Users can insert own project state" on public.project_flow_state;
drop policy if exists "Users can update own project state" on public.project_flow_state;
create policy "Users can read own project state" on public.project_flow_state for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own project state" on public.project_flow_state for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own project state" on public.project_flow_state for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
