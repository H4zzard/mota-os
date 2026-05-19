-- ═══════════════════════════════════════════════════════════════════════════════
-- Mota OS — Tasks Patches
-- Migration: 20260511000005
-- O que faz:
--   1. Converte task_status e task_priority de enum para text+CHECK
--      (ALTER TYPE ADD VALUE não pode rodar em transação — conversão evita o problema)
--   2. Migra valores antigos: inprogress→doing, review→waiting_approval
--   3. Migra prioridades:     high→alta, medium→media, low→baixa
--   4. Adiciona colunas:      company_id, assignee_name, archived
--   5. Cria índice para filtrar tarefas não arquivadas
-- ATENÇÃO: aplicar via Supabase Dashboard → SQL Editor (não via CLI)
-- ═══════════════════════════════════════════════════════════════════════════════


-- ─── 1. Remover defaults para permitir a conversão de tipo ───────────────────

ALTER TABLE tasks
  ALTER COLUMN status   DROP DEFAULT,
  ALTER COLUMN priority DROP DEFAULT;


-- ─── 2. Converter task_status enum → text ────────────────────────────────────

ALTER TABLE tasks
  ALTER COLUMN status TYPE text USING status::text;

UPDATE tasks SET status = 'doing'            WHERE status = 'inprogress';
UPDATE tasks SET status = 'waiting_approval' WHERE status = 'review';

ALTER TABLE tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('backlog', 'todo', 'doing', 'waiting_approval', 'done'));


-- ─── 3. Converter task_priority enum → text ──────────────────────────────────

ALTER TABLE tasks
  ALTER COLUMN priority TYPE text USING priority::text;

UPDATE tasks SET priority = 'alta'  WHERE priority = 'high';
UPDATE tasks SET priority = 'media' WHERE priority = 'medium';
UPDATE tasks SET priority = 'baixa' WHERE priority = 'low';

ALTER TABLE tasks
  ADD CONSTRAINT tasks_priority_check
  CHECK (priority IN ('baixa', 'media', 'alta', 'urgente'));


-- ─── 4. Novas colunas ─────────────────────────────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS company_id    text,
  ADD COLUMN IF NOT EXISTS assignee_name text,
  ADD COLUMN IF NOT EXISTS archived      boolean NOT NULL DEFAULT false;


-- ─── 5. Índice para filtrar tarefas não arquivadas ───────────────────────────

CREATE INDEX IF NOT EXISTS tasks_archived_status_idx
  ON tasks (archived, status, position);
