-- ─── Etapa E.1 — Projetos 100% funcionais ────────────────────────────────────

-- ─── 1. Converter projects.status de ENUM para TEXT ──────────────────────────
-- project_status enum só tem 'active','paused','completed','planning'.
-- Precisamos de 'archived'. ALTER TYPE ADD VALUE não funciona em transaction,
-- então convertemos a coluna para text e aplicamos CHECK constraint.

ALTER TABLE projects ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'planning';
DROP CONSTRAINT IF EXISTS projects_status_check;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT projects_status_check
    CHECK (status IN ('planning','active','paused','completed','archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. Adicionar colunas faltantes em projects ───────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS priority    text        DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS budget_used numeric,
  ADD COLUMN IF NOT EXISTS objectives  text,
  ADD COLUMN IF NOT EXISTS metadata    jsonb       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by  uuid        REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

UPDATE projects SET priority = 'medium' WHERE priority IS NULL;
ALTER TABLE projects ALTER COLUMN priority SET NOT NULL;
ALTER TABLE projects ALTER COLUMN priority SET DEFAULT 'medium';

DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT projects_priority_check
    CHECK (priority IN ('low','medium','high','urgent'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 3. Adicionar colunas faltantes em tasks ─────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by   uuid REFERENCES auth.users ON DELETE SET NULL;

-- ─── 4. Criar tabela project_files ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS project_files (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id     company_slug,
  uploaded_by    uuid        REFERENCES auth.users ON DELETE SET NULL,
  file_name      text        NOT NULL,
  file_type      text        NOT NULL,
  file_size      bigint      NOT NULL DEFAULT 0,
  storage_path   text        NOT NULL,
  extracted_text text,
  status         text        NOT NULL DEFAULT 'uploaded',
  metadata       jsonb       NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── 5. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS projects_company_status_idx
  ON projects (company_id, status);
CREATE INDEX IF NOT EXISTS projects_company_updated_idx
  ON projects (company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx
  ON tasks (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_project_status_idx
  ON tasks (project_id, status) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS project_files_project_id_idx
  ON project_files (project_id);

-- ─── 6. RLS em project_files ─────────────────────────────────────────────────

ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "project_files: all" ON project_files;
CREATE POLICY "project_files: all" ON project_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 7. Verificações finais ───────────────────────────────────────────────────
-- projects: status(text/check), priority(text/check), budget_used, objectives,
--           metadata, created_by, archived_at, deleted_at
-- tasks:    completed_at, created_by adicionados
-- project_files: nova tabela com FK → projects, RLS aberta (API verifica)
