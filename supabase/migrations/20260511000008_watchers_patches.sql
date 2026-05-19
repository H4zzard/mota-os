-- ═══════════════════════════════════════════════════════════════════════════════
-- Mota OS — Watchers Patches
-- Migration: 20260511000008
-- O que faz:
--   1. Adiciona colunas funcionais à tabela watchers existente
--   2. Cria tabela watcher_logs para histórico de execuções
--   3. Atualiza a política RLS de watchers (adiciona created_by)
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── 1. Adicionar defaults nos campos obrigatórios legados ────────────────────
-- (trigger_type e action_type eram NOT NULL sem default; novos registros via UI
--  usam watcher_type para classificação real, esses ficam como fallback)

alter table watchers
  alter column trigger_type set default 'threshold',
  alter column action_type  set default 'dashboard';

-- ─── 2. Novas colunas funcionais ──────────────────────────────────────────────

alter table watchers
  add column if not exists company_id           text        not null default 'grupo',
  add column if not exists created_by           uuid        references auth.users(id) on delete set null,
  add column if not exists watcher_type         text        not null default 'overdue_tasks'
    check (watcher_type in (
      'overdue_tasks', 'workflow_not_run', 'cpl_above_limit',
      'campaign_no_leads', 'sessions_no_ai', 'automation_error'
    )),
  add column if not exists condition            jsonb       not null default '{}',
  add column if not exists frequency            text        not null default 'manual'
    check (frequency in ('manual', 'hourly', 'daily', 'weekly')),
  add column if not exists last_check_at        timestamptz,
  add column if not exists next_check_at        timestamptz,
  add column if not exists last_result          jsonb,
  add column if not exists notification_channel text        not null default 'dashboard';

create index if not exists watchers_created_by_idx
  on watchers (created_by, created_at desc);

-- ─── 3. watcher_logs ─────────────────────────────────────────────────────────

create table if not exists watcher_logs (
  id          uuid        primary key default gen_random_uuid(),
  watcher_id  uuid        not null references watchers(id) on delete cascade,
  status      text        not null default 'ok'
    check (status in ('ok', 'alert', 'error')),
  triggered   boolean     not null default false,
  message     text        not null default '',
  result      jsonb       not null default '{}',
  started_at  timestamptz not null default now(),
  finished_at timestamptz
);

alter table watcher_logs enable row level security;

create policy "watcher_logs: team all"
  on watcher_logs for all to authenticated
  using (true) with check (true);

create index if not exists watcher_logs_watcher_id_idx
  on watcher_logs (watcher_id, started_at desc);
