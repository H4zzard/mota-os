-- Mota OS — schema inicial
-- Gerado automaticamente a partir de lib/types.ts

-- ─── Extensions ──────────────────────────────────────────────────────────────

create extension if not exists "vector";

-- ─── Enums ───────────────────────────────────────────────────────────────────

create type company_slug        as enum ('cppem', 'unicive', 'colegio', 'everton', 'grupo');
create type user_role           as enum ('admin', 'editor', 'viewer');
create type agent_status        as enum ('active', 'paused');
create type project_status      as enum ('active', 'paused', 'completed', 'planning');
create type task_status         as enum ('todo', 'inprogress', 'review', 'done');
create type task_priority       as enum ('high', 'medium', 'low');
create type source_type         as enum ('documents', 'api', 'folder', 'drive', 'reports', 'knowledge', 'links');
create type workflow_status     as enum ('active', 'paused');
create type automation_status   as enum ('active', 'paused');
create type message_role        as enum ('user', 'assistant', 'system');
create type embedding_status    as enum ('pending', 'processing', 'done', 'error');
create type workflow_run_state  as enum ('pending', 'running', 'done', 'error');
create type api_provider        as enum ('anthropic', 'openai', 'google', 'meta', 'reportei', 'rocketchat', 'whatsapp', 'google_drive');
create type api_conn_status     as enum ('connected', 'disconnected', 'error');
create type schedule_freq       as enum ('daily', 'weekly', 'monthly', 'custom');
create type watcher_trigger     as enum ('threshold', 'absence', 'schedule', 'event');
create type log_event_type      as enum ('chat', 'workflow', 'auto', 'source', 'watcher', 'auth', 'settings', 'api');

-- ─── profiles ────────────────────────────────────────────────────────────────

create table profiles (
  id                  uuid primary key references auth.users on delete cascade,
  email               text        not null,
  name                text        not null default '',
  role                user_role   not null default 'viewer',
  job_title           text        not null default '',
  default_company_id  company_slug not null default 'grupo',
  avatar_url          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── companies ───────────────────────────────────────────────────────────────

create table companies (
  id         uuid        primary key default gen_random_uuid(),
  slug       company_slug not null unique,
  name       text        not null,
  color      text        not null default '#6366f1',
  initials   text        not null,
  active     boolean     not null default true,
  created_at timestamptz not null default now()
);

insert into companies (slug, name, color, initials) values
  ('cppem',   'CPPEM Concursos', '#6366f1', 'CP'),
  ('unicive',  'Unicive',         '#8b5cf6', 'UC'),
  ('colegio',  'Colégio CPPEM',   '#ec4899', 'CC'),
  ('everton',  'Everton Mota',    '#f59e0b', 'EM'),
  ('grupo',    'Grupo Mota',      '#10b981', 'GM');

-- ─── agents ──────────────────────────────────────────────────────────────────

create table agents (
  id               uuid        primary key default gen_random_uuid(),
  slug             text        not null unique,
  name             text        not null,
  short_name       text        not null default '',
  description      text        not null default '',
  long_description text        not null default '',
  icon             text        not null default '🤖',
  color            text        not null default '#6366f1',
  bg_color         text        not null default 'rgba(99,102,241,0.1)',
  capabilities     text[]      not null default '{}',
  status           agent_status not null default 'active',
  model_id         text        not null default 'claude-sonnet-4-6',
  companies        company_slug[] not null default '{}',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── agent_model_configs ─────────────────────────────────────────────────────

create table agent_model_configs (
  id            uuid        primary key default gen_random_uuid(),
  agent_id      uuid        not null references agents on delete cascade,
  provider      api_provider not null,
  model_id      text        not null,
  max_tokens    integer     not null default 4096,
  temperature   numeric     not null default 0.7,
  system_prompt text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (agent_id)
);

-- ─── agent_runs ──────────────────────────────────────────────────────────────

create table agent_runs (
  id            uuid        primary key default gen_random_uuid(),
  agent_id      uuid        not null references agents on delete cascade,
  session_id    uuid,
  user_id       uuid        references auth.users on delete set null,
  model_used    text        not null,
  input_tokens  integer     not null default 0,
  output_tokens integer     not null default 0,
  cost_usd      numeric     not null default 0,
  duration_ms   integer     not null default 0,
  created_at    timestamptz not null default now()
);

-- ─── sessions ────────────────────────────────────────────────────────────────

create table sessions (
  id              uuid        primary key default gen_random_uuid(),
  title           text        not null default 'Nova conversa',
  user_id         uuid        not null references auth.users on delete cascade,
  agent_id        uuid        not null references agents on delete cascade,
  company_id      company_slug not null default 'grupo',
  pinned          boolean     not null default false,
  archived        boolean     not null default false,
  tags            text[]      not null default '{}',
  message_count   integer     not null default 0,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index sessions_user_id_idx on sessions (user_id);
create index sessions_last_message_at_idx on sessions (last_message_at desc);

-- ─── messages ────────────────────────────────────────────────────────────────

create table messages (
  id            uuid        primary key default gen_random_uuid(),
  session_id    uuid        not null references sessions on delete cascade,
  role          message_role not null,
  content       text        not null default '',
  blocks        jsonb,
  agent_id      uuid        references agents on delete set null,
  model_used    text,
  input_tokens  integer,
  output_tokens integer,
  created_at    timestamptz not null default now()
);

create index messages_session_id_idx on messages (session_id, created_at);

-- ─── projects ────────────────────────────────────────────────────────────────

create table projects (
  id             uuid         primary key default gen_random_uuid(),
  title          text         not null,
  description    text         not null default '',
  company_id     company_slug not null default 'grupo',
  responsible_id uuid         references auth.users on delete set null,
  status         project_status not null default 'planning',
  progress       integer      not null default 0 check (progress between 0 and 100),
  budget         numeric,
  start_date     date         not null default current_date,
  end_date       date,
  tags           text[]       not null default '{}',
  highlights     text[]       not null default '{}',
  sessions_count integer      not null default 0,
  tasks_open     integer      not null default 0,
  tasks_total    integer      not null default 0,
  created_at     timestamptz  not null default now(),
  updated_at     timestamptz  not null default now()
);

-- ─── tasks ───────────────────────────────────────────────────────────────────

create table tasks (
  id          uuid          primary key default gen_random_uuid(),
  title       text          not null,
  description text          not null default '',
  project_id  uuid          references projects on delete set null,
  assignee_id uuid          references auth.users on delete set null,
  status      task_status   not null default 'todo',
  priority    task_priority not null default 'medium',
  due_date    date,
  tags        text[]        not null default '{}',
  position    integer       not null default 0,
  created_at  timestamptz   not null default now(),
  updated_at  timestamptz   not null default now()
);

create index tasks_status_position_idx on tasks (status, position);

-- ─── sources ─────────────────────────────────────────────────────────────────

create table sources (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  description  text        not null default '',
  type         source_type not null,
  company_id   company_slug not null default 'grupo',
  connected    boolean     not null default false,
  config       jsonb       not null default '{}',
  last_sync_at timestamptz,
  file_count   integer     not null default 0,
  size_bytes   bigint      not null default 0,
  tags         text[]      not null default '{}',
  icon         text        not null default '📁',
  created_at   timestamptz not null default now()
);

-- ─── source_files ────────────────────────────────────────────────────────────

create table source_files (
  id               uuid             primary key default gen_random_uuid(),
  source_id        uuid             not null references sources on delete cascade,
  name             text             not null,
  path             text             not null default '',
  mime_type        text             not null default '',
  size_bytes       bigint           not null default 0,
  embedding_status embedding_status not null default 'pending',
  created_at       timestamptz      not null default now()
);

create index source_files_source_id_idx on source_files (source_id);

-- ─── knowledge_chunks ────────────────────────────────────────────────────────

create table knowledge_chunks (
  id         uuid        primary key default gen_random_uuid(),
  source_id  uuid        not null references sources on delete cascade,
  file_id    uuid        not null references source_files on delete cascade,
  content    text        not null,
  embedding  vector(1536),           -- OpenAI text-embedding-3-small dimension
  metadata   jsonb       not null default '{}',
  created_at timestamptz not null default now()
);

create index knowledge_chunks_embedding_idx on knowledge_chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Função RPC para busca semântica (usada em searchKnowledge)
create or replace function match_chunks(
  query_embedding vector(1536),
  match_count     int default 10,
  source_ids      uuid[] default null
)
returns table (
  id         uuid,
  source_id  uuid,
  file_id    uuid,
  content    text,
  metadata   jsonb,
  similarity float
)
language sql stable as $$
  select
    kc.id, kc.source_id, kc.file_id, kc.content, kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  from knowledge_chunks kc
  where
    kc.embedding is not null
    and (source_ids is null or kc.source_id = any(source_ids))
  order by kc.embedding <=> query_embedding
  limit match_count;
$$;

-- ─── workflows ───────────────────────────────────────────────────────────────

create table workflows (
  id                 uuid            primary key default gen_random_uuid(),
  name               text            not null,
  description        text            not null default '',
  area               text            not null default '',
  area_color         text            not null default '#6366f1',
  icon               text            not null default '⚡',
  steps              jsonb           not null default '[]',
  status             workflow_status not null default 'active',
  estimated_minutes  integer         not null default 0,
  steps_count        integer         not null default 0,
  runs               integer         not null default 0,
  last_run_at        timestamptz,
  created_at         timestamptz     not null default now(),
  updated_at         timestamptz     not null default now()
);

-- ─── workflow_runs ───────────────────────────────────────────────────────────

create table workflow_runs (
  id          uuid               primary key default gen_random_uuid(),
  workflow_id uuid               not null references workflows on delete cascade,
  user_id     uuid               references auth.users on delete set null,
  values      jsonb              not null default '{}',
  status      workflow_run_state not null default 'pending',
  result      text,
  duration_ms integer,
  created_at  timestamptz        not null default now()
);

create index workflow_runs_workflow_id_idx on workflow_runs (workflow_id, created_at desc);

-- ─── skills ──────────────────────────────────────────────────────────────────

create table skills (
  id              uuid              primary key default gen_random_uuid(),
  name            text              not null,
  description     text              not null default '',
  icon            text              not null default '⚡',
  color           text              not null default '#6366f1',
  category        text              not null default '',
  prompt_template text              not null default '',
  status          automation_status not null default 'active',
  usage_count     integer           not null default 0,
  last_used_at    timestamptz,
  created_at      timestamptz       not null default now()
);

-- ─── schedules ───────────────────────────────────────────────────────────────

create table schedules (
  id              uuid              primary key default gen_random_uuid(),
  name            text              not null,
  description     text              not null default '',
  agent_id        uuid              not null references agents on delete cascade,
  frequency       schedule_freq     not null default 'daily',
  cron_expression text              not null default '0 8 * * *',
  next_run_at     timestamptz       not null default now(),
  last_run_at     timestamptz,
  status          automation_status not null default 'active',
  payload         jsonb             not null default '{}',
  created_at      timestamptz       not null default now()
);

-- ─── watchers ────────────────────────────────────────────────────────────────

create table watchers (
  id              uuid              primary key default gen_random_uuid(),
  name            text              not null,
  description     text              not null default '',
  trigger_type    watcher_trigger   not null,
  trigger_config  jsonb             not null default '{}',
  action_type     text              not null default '',
  action_config   jsonb             not null default '{}',
  status          automation_status not null default 'active',
  triggers_count  integer           not null default 0,
  last_trigger_at timestamptz,
  created_at      timestamptz       not null default now()
);

-- ─── api_connections ─────────────────────────────────────────────────────────

create table api_connections (
  id             uuid           primary key default gen_random_uuid(),
  provider       api_provider   not null,
  name           text           not null,
  status         api_conn_status not null default 'disconnected',
  config         jsonb          not null default '{}',  -- encrypted at rest via Vault
  last_tested_at timestamptz,
  created_at     timestamptz    not null default now(),
  updated_at     timestamptz    not null default now(),
  unique (provider)
);

-- ─── activity_logs ───────────────────────────────────────────────────────────

create table activity_logs (
  id         uuid           primary key default gen_random_uuid(),
  user_id    uuid           references auth.users on delete set null,
  event_type log_event_type not null,
  action     text           not null,
  detail     text           not null default '',
  metadata   jsonb          not null default '{}',
  created_at timestamptz    not null default now()
);

create index activity_logs_created_at_idx on activity_logs (created_at desc);
create index activity_logs_user_id_idx    on activity_logs (user_id);

-- ─── updated_at triggers ─────────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at            before update on profiles            for each row execute function set_updated_at();
create trigger agents_updated_at              before update on agents              for each row execute function set_updated_at();
create trigger agent_model_configs_updated_at before update on agent_model_configs for each row execute function set_updated_at();
create trigger projects_updated_at            before update on projects            for each row execute function set_updated_at();
create trigger tasks_updated_at               before update on tasks               for each row execute function set_updated_at();
create trigger workflows_updated_at           before update on workflows           for each row execute function set_updated_at();
create trigger api_connections_updated_at     before update on api_connections     for each row execute function set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────

alter table profiles         enable row level security;
alter table companies        enable row level security;
alter table agents           enable row level security;
alter table agent_model_configs enable row level security;
alter table agent_runs       enable row level security;
alter table sessions         enable row level security;
alter table messages         enable row level security;
alter table projects         enable row level security;
alter table tasks            enable row level security;
alter table sources          enable row level security;
alter table source_files     enable row level security;
alter table knowledge_chunks enable row level security;
alter table workflows        enable row level security;
alter table workflow_runs    enable row level security;
alter table skills           enable row level security;
alter table schedules        enable row level security;
alter table watchers         enable row level security;
alter table api_connections  enable row level security;
alter table activity_logs    enable row level security;

-- Policies: usuários autenticados têm acesso completo (ajuste por role depois)

create policy "authenticated full access" on profiles         for all to authenticated using (true) with check (true);
create policy "authenticated full access" on companies        for all to authenticated using (true) with check (true);
create policy "authenticated full access" on agents           for all to authenticated using (true) with check (true);
create policy "authenticated full access" on agent_model_configs for all to authenticated using (true) with check (true);
create policy "authenticated full access" on agent_runs       for all to authenticated using (true) with check (true);
create policy "authenticated full access" on sessions         for all to authenticated using (true) with check (true);
create policy "authenticated full access" on messages         for all to authenticated using (true) with check (true);
create policy "authenticated full access" on projects         for all to authenticated using (true) with check (true);
create policy "authenticated full access" on tasks            for all to authenticated using (true) with check (true);
create policy "authenticated full access" on sources          for all to authenticated using (true) with check (true);
create policy "authenticated full access" on source_files     for all to authenticated using (true) with check (true);
create policy "authenticated full access" on knowledge_chunks for all to authenticated using (true) with check (true);
create policy "authenticated full access" on workflows        for all to authenticated using (true) with check (true);
create policy "authenticated full access" on workflow_runs    for all to authenticated using (true) with check (true);
create policy "authenticated full access" on skills           for all to authenticated using (true) with check (true);
create policy "authenticated full access" on schedules        for all to authenticated using (true) with check (true);
create policy "authenticated full access" on watchers         for all to authenticated using (true) with check (true);
create policy "authenticated full access" on api_connections  for all to authenticated using (true) with check (true);
create policy "authenticated full access" on activity_logs    for all to authenticated using (true) with check (true);
