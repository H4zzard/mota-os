-- ─── J.1 Hotfix — Garantir schema completo de workflows + workflow_runs ────────
-- Ordem: colunas → dados → enum → policies → índices
-- Usa ADD COLUMN IF NOT EXISTS para ser idempotente em qualquer estado do banco.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. COLUNAS — workflows
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS company_id        text,
  ADD COLUMN IF NOT EXISTS category          text         DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS input_schema      jsonb        NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS steps             jsonb        NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS prompt_template   text,
  ADD COLUMN IF NOT EXISTS default_agent_id  uuid         REFERENCES agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS output_type       text         NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS metadata          jsonb        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by        uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at       timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at        timestamptz;

-- updated_at: adicionado apenas se não existir (init.sql já o cria com trigger)
ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS updated_at        timestamptz  NOT NULL DEFAULT now();

-- Tornar company_id nullable (workflows globais têm company_id = null)
ALTER TABLE workflows
  ALTER COLUMN company_id DROP NOT NULL;

-- Preencher category a partir de area para rows que existem sem category
UPDATE workflows
  SET category = area
WHERE category IS NULL AND area IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. COLUNAS — workflow_runs
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE workflow_runs
  ADD COLUMN IF NOT EXISTS workflow_name  text,
  ADD COLUMN IF NOT EXISTS workflow_slug  text,
  ADD COLUMN IF NOT EXISTS company_id     text,
  ADD COLUMN IF NOT EXISTS error_message  text,
  ADD COLUMN IF NOT EXISTS completed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS input          jsonb        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS output         text,
  ADD COLUMN IF NOT EXISTS output_json    jsonb        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS agent_id       uuid         REFERENCES agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider       text,
  ADD COLUMN IF NOT EXISTS model_used     text,
  ADD COLUMN IF NOT EXISTS input_tokens   integer,
  ADD COLUMN IF NOT EXISTS output_tokens  integer,
  ADD COLUMN IF NOT EXISTS started_at     timestamptz,
  ADD COLUMN IF NOT EXISTS metadata       jsonb        NOT NULL DEFAULT '{}';

-- Tornar workflow_id nullable (runs legados referenciam mock slugs)
ALTER TABLE workflow_runs
  ALTER COLUMN workflow_id DROP NOT NULL;

-- status: converter de enum para text se ainda for enum (para aceitar novos valores)
DO $$
BEGIN
  -- Só converte se o tipo da coluna ainda for o enum workflow_run_state
  IF EXISTS (
    SELECT 1
    FROM   information_schema.columns
    WHERE  table_name   = 'workflow_runs'
      AND  column_name  = 'status'
      AND  udt_name     = 'workflow_run_state'
  ) THEN
    ALTER TABLE workflow_runs ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE workflow_runs ALTER COLUMN status TYPE text USING status::text;
    ALTER TABLE workflow_runs ALTER COLUMN status SET DEFAULT 'pending';
  END IF;
END $$;

-- Garantir check constraint com todos os valores aceitos
ALTER TABLE workflow_runs
  DROP CONSTRAINT IF EXISTS workflow_runs_status_check;

ALTER TABLE workflow_runs
  ADD CONSTRAINT workflow_runs_status_check
  CHECK (status IN ('pending','running','done','error','completed','failed','canceled'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. MIGRAÇÃO DE DADOS
-- ══════════════════════════════════════════════════════════════════════════════

-- Migrar values → input para runs legados
UPDATE workflow_runs
  SET input = values
WHERE input = '{}' AND values IS NOT NULL;

-- Migrar result → output para runs que já têm resultado
UPDATE workflow_runs
  SET output = result
WHERE output IS NULL AND result IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RLS — workflows
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

-- Remover policy permissiva original (criada no init.sql sem prefixo)
DROP POLICY IF EXISTS "authenticated full access" ON workflows;
-- Remover versão com prefixo caso já exista de tentativa anterior
DROP POLICY IF EXISTS "workflows: authenticated full access" ON workflows;

-- Leitura: qualquer usuário autenticado vê workflows não deletados
DROP POLICY IF EXISTS "workflows: authenticated read" ON workflows;
CREATE POLICY "workflows: authenticated read" ON workflows
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Escrita: apenas admin
DROP POLICY IF EXISTS "workflows: admin write" ON workflows;
CREATE POLICY "workflows: admin write" ON workflows
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. ÍNDICES
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS workflows_company_status_idx
  ON workflows (company_id, status);

CREATE INDEX IF NOT EXISTS workflows_category_idx
  ON workflows (category);

CREATE INDEX IF NOT EXISTS workflows_deleted_idx
  ON workflows (deleted_at)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS workflow_runs_workflow_idx
  ON workflow_runs (workflow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS workflow_runs_company_idx
  ON workflow_runs (company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS workflow_runs_status_idx
  ON workflow_runs (status);

CREATE INDEX IF NOT EXISTS workflow_runs_status_company_idx
  ON workflow_runs (company_id, status, created_at DESC);
