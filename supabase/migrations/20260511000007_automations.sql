-- ─── automations ─────────────────────────────────────────────────────────────
create table if not exists automations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  workflow_id text not null,
  company_id  text not null default 'grupo',
  frequency   text not null default 'manual'
    check (frequency in ('manual', 'daily', 'weekly', 'monthly')),
  status      text not null default 'active'
    check (status in ('active', 'paused')),
  config      jsonb not null default '{}',
  created_by  uuid references auth.users(id) on delete set null,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table automations enable row level security;

create policy "Users can read own automations"
  on automations for select
  using (auth.uid() = created_by);

create policy "Users can insert own automations"
  on automations for insert
  with check (auth.uid() = created_by);

create policy "Users can update own automations"
  on automations for update
  using (auth.uid() = created_by);

create policy "Users can delete own automations"
  on automations for delete
  using (auth.uid() = created_by);

-- ─── automation_runs ─────────────────────────────────────────────────────────
create table if not exists automation_runs (
  id             uuid primary key default gen_random_uuid(),
  automation_id  uuid not null references automations(id) on delete cascade,
  status         text not null default 'running'
    check (status in ('running', 'done', 'error')),
  input          jsonb not null default '{}',
  output         text,
  error_message  text,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz
);

alter table automation_runs enable row level security;

create policy "Users can read own automation runs"
  on automation_runs for select
  using (
    exists (
      select 1 from automations
      where automations.id = automation_runs.automation_id
        and automations.created_by = auth.uid()
    )
  );

create policy "Users can insert own automation runs"
  on automation_runs for insert
  with check (
    exists (
      select 1 from automations
      where automations.id = automation_runs.automation_id
        and automations.created_by = auth.uid()
    )
  );

create policy "Users can update own automation runs"
  on automation_runs for update
  using (
    exists (
      select 1 from automations
      where automations.id = automation_runs.automation_id
        and automations.created_by = auth.uid()
    )
  );

create index if not exists automation_runs_automation_id_idx
  on automation_runs (automation_id, started_at desc);
