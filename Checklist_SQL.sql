-- 90 Day Project Flow checklist extension. Preserves existing project_flow_state.
create table if not exists public.app_checklists (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 project_id text not null,
 title text not null,
 groups jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.app_checklists add column if not exists project_id text;
create index if not exists app_checklists_user_project_idx on public.app_checklists(user_id,project_id);
alter table public.app_checklists enable row level security;
drop policy if exists "project_checklists_select" on public.app_checklists;
drop policy if exists "project_checklists_insert" on public.app_checklists;
drop policy if exists "project_checklists_update" on public.app_checklists;
drop policy if exists "project_checklists_delete" on public.app_checklists;
create policy "project_checklists_select" on public.app_checklists for select to authenticated using (auth.uid()=user_id);
create policy "project_checklists_insert" on public.app_checklists for insert to authenticated with check (auth.uid()=user_id);
create policy "project_checklists_update" on public.app_checklists for update to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "project_checklists_delete" on public.app_checklists for delete to authenticated using (auth.uid()=user_id);
