-- ═══════════════════════════════════════════════════════════════════════════════
-- Mota OS — Schema Patches
-- Migration: 20260511000002
-- O que faz:
--   1. Adiciona status + error_message na tabela messages
--   2. Torna sessions.agent_id nullable (nova sessão antes de escolher agente)
--   3. Adiciona trigger de atualização automática de sessions (last_message_at, message_count)
--   4. Cria trigger de auto-criação de profile no primeiro login
--   5. Substitui políticas RLS genéricas por políticas por usuário
--   6. Cria função get_dashboard_stats(user_id) para métricas agregadas
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. messages: adicionar status e error_message ───────────────────────────

-- Enum para status de mensagem
do $$ begin
  create type message_status as enum ('pending', 'streaming', 'done', 'error');
exception
  when duplicate_object then null;
end $$;

alter table messages
  add column if not exists status        message_status not null default 'done',
  add column if not exists error_message text;

-- Índice para buscar mensagens pendentes/com erro
create index if not exists messages_status_idx on messages (session_id, status)
  where status in ('pending', 'streaming', 'error');


-- ─── 2. sessions: agent_id pode ser null ─────────────────────────────────────

alter table sessions
  alter column agent_id drop not null;


-- ─── 3. Trigger: atualiza sessions.last_message_at e message_count ───────────

create or replace function update_session_on_message()
returns trigger language plpgsql security definer as $$
begin
  update sessions
  set
    last_message_at = new.created_at,
    message_count   = message_count + 1
  where id = new.session_id;
  return new;
end;
$$;

drop trigger if exists on_message_inserted on messages;
create trigger on_message_inserted
  after insert on messages
  for each row execute function update_session_on_message();


-- ─── 4. Trigger: cria profile automaticamente no primeiro login ───────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(split_part(new.email, '@', 1), 'Usuário')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ─── 5. RLS: substituir políticas genéricas por políticas por usuário ─────────
--
-- Estratégia:
--   • Dados pessoais (sessions, messages, agent_runs, workflow_runs, activity_logs,
--     profiles): apenas o próprio usuário
--   • Dados compartilhados de equipe (agents, companies, workflows, skills,
--     schedules, watchers, sources): todos autenticados leem; apenas admin escreve
--     (por ora mantemos escrita aberta para time pequeno — ajustar quando houver roles)
--   • Projetos e tarefas: toda equipe autenticada (colaboração)
-- ─────────────────────────────────────────────────────────────────────────────

-- profiles ────────────────────────────────────────────────────────────────────
drop policy if exists "authenticated full access" on profiles;

create policy "profiles: own read"   on profiles for select to authenticated using (id = auth.uid());
create policy "profiles: own write"  on profiles for all    to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- sessions ────────────────────────────────────────────────────────────────────
drop policy if exists "authenticated full access" on sessions;

create policy "sessions: own all" on sessions
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- messages ────────────────────────────────────────────────────────────────────
drop policy if exists "authenticated full access" on messages;

create policy "messages: own sessions only" on messages
  for all to authenticated
  using (
    exists (
      select 1 from sessions s
      where s.id = messages.session_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from sessions s
      where s.id = messages.session_id
        and s.user_id = auth.uid()
    )
  );

-- agent_runs ──────────────────────────────────────────────────────────────────
drop policy if exists "authenticated full access" on agent_runs;

create policy "agent_runs: own all" on agent_runs
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- workflow_runs ───────────────────────────────────────────────────────────────
drop policy if exists "authenticated full access" on workflow_runs;

create policy "workflow_runs: own all" on workflow_runs
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- activity_logs ───────────────────────────────────────────────────────────────
drop policy if exists "authenticated full access" on activity_logs;

create policy "activity_logs: own all" on activity_logs
  for all to authenticated
  using  (coalesce(user_id, auth.uid()) = auth.uid())
  with check (user_id = auth.uid());

-- companies (compartilhado, somente leitura) ──────────────────────────────────
drop policy if exists "authenticated full access" on companies;

create policy "companies: team read"  on companies for select to authenticated using (true);
create policy "companies: team write" on companies for all    to authenticated using (true) with check (true);

-- agents (compartilhado, somente leitura) ─────────────────────────────────────
drop policy if exists "authenticated full access" on agents;

create policy "agents: team read"  on agents for select to authenticated using (true);
create policy "agents: team write" on agents for all    to authenticated using (true) with check (true);

-- agent_model_configs (compartilhado) ─────────────────────────────────────────
drop policy if exists "authenticated full access" on agent_model_configs;
create policy "agent_model_configs: team all" on agent_model_configs for all to authenticated using (true) with check (true);

-- projects (colaboração de equipe) ────────────────────────────────────────────
drop policy if exists "authenticated full access" on projects;
create policy "projects: team all" on projects for all to authenticated using (true) with check (true);

-- tasks (colaboração de equipe) ───────────────────────────────────────────────
drop policy if exists "authenticated full access" on tasks;
create policy "tasks: team all" on tasks for all to authenticated using (true) with check (true);

-- sources (compartilhado) ─────────────────────────────────────────────────────
drop policy if exists "authenticated full access" on sources;
create policy "sources: team all" on sources for all to authenticated using (true) with check (true);

-- source_files (compartilhado) ────────────────────────────────────────────────
drop policy if exists "authenticated full access" on source_files;
create policy "source_files: team all" on source_files for all to authenticated using (true) with check (true);

-- knowledge_chunks (compartilhado) ────────────────────────────────────────────
drop policy if exists "authenticated full access" on knowledge_chunks;
create policy "knowledge_chunks: team all" on knowledge_chunks for all to authenticated using (true) with check (true);

-- workflows (compartilhado) ───────────────────────────────────────────────────
drop policy if exists "authenticated full access" on workflows;
create policy "workflows: team all" on workflows for all to authenticated using (true) with check (true);

-- skills (compartilhado) ──────────────────────────────────────────────────────
drop policy if exists "authenticated full access" on skills;
create policy "skills: team all" on skills for all to authenticated using (true) with check (true);

-- schedules (compartilhado) ───────────────────────────────────────────────────
drop policy if exists "authenticated full access" on schedules;
create policy "schedules: team all" on schedules for all to authenticated using (true) with check (true);

-- watchers (compartilhado) ────────────────────────────────────────────────────
drop policy if exists "authenticated full access" on watchers;
create policy "watchers: team all" on watchers for all to authenticated using (true) with check (true);

-- api_connections (compartilhado) ─────────────────────────────────────────────
drop policy if exists "authenticated full access" on api_connections;
create policy "api_connections: team all" on api_connections for all to authenticated using (true) with check (true);


-- ─── 6. Função: get_dashboard_stats(p_user_id) ───────────────────────────────
--
-- Retorna métricas agregadas para o dashboard.
-- Usada pelo Server Component de /dashboard via supabase.rpc('get_dashboard_stats').
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function get_dashboard_stats(p_user_id uuid)
returns jsonb
language sql stable security definer as $$
  select jsonb_build_object(

    -- Sessões
    'total_sessions',     (select count(*)        from sessions where user_id = p_user_id),
    'sessions_today',     (select count(*)        from sessions where user_id = p_user_id and created_at >= current_date),
    'sessions_this_week', (select count(*)        from sessions where user_id = p_user_id and created_at >= current_date - interval '6 days'),

    -- Mensagens
    'total_messages',     (
      select count(*) from messages m
      join sessions s on s.id = m.session_id
      where s.user_id = p_user_id
    ),
    'messages_today',     (
      select count(*) from messages m
      join sessions s on s.id = m.session_id
      where s.user_id = p_user_id and m.created_at >= current_date and m.role = 'user'
    ),

    -- Tarefas
    'tasks_open',         (select count(*) from tasks where status != 'done'),
    'tasks_done',         (select count(*) from tasks where status = 'done'),
    'tasks_total',        (select count(*) from tasks),

    -- Workflows
    'workflows_active',   (select count(*) from workflows where status = 'active'),
    'workflow_runs_week', (
      select count(*) from workflow_runs
      where user_id = p_user_id and created_at >= current_date - interval '6 days'
    ),

    -- Agentes
    'agents_active',      (select count(*) from agents where status = 'active'),

    -- Gráfico: sessões por dia nos últimos 7 dias
    'sessions_by_day',    (
      select coalesce(jsonb_agg(row_data order by (row_data->>'date')), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'date',  to_char(d::date, 'DD/MM'),
          'count', coalesce(cnt, 0)
        ) as row_data
        from generate_series(
          current_date - interval '6 days',
          current_date,
          interval '1 day'
        ) as d
        left join (
          select date_trunc('day', created_at)::date as day, count(*) as cnt
          from sessions
          where user_id = p_user_id
          group by day
        ) s on s.day = d::date
      ) sub
    ),

    -- Top 5 agentes mais usados pelo usuário
    'top_agents',         (
      select coalesce(jsonb_agg(row_data order by (row_data->>'count') desc), '[]'::jsonb)
      from (
        select jsonb_build_object(
          'agent_id',   a.id,
          'name',       a.short_name,
          'color',      a.color,
          'count',      count(s.id)
        ) as row_data
        from sessions s
        join agents a on a.id = s.agent_id
        where s.user_id = p_user_id
        group by a.id, a.short_name, a.color
        order by count(s.id) desc
        limit 5
      ) sub
    )
  )
$$;

-- Permissão para usuários autenticados chamarem a função
grant execute on function get_dashboard_stats(uuid) to authenticated;
