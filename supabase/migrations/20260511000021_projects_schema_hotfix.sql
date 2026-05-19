-- ─── Etapa E.1 — Hotfix: garantir todas as colunas de projects ───────────────
-- Idempotente: usa ADD COLUMN IF NOT EXISTS em tudo.
-- Cobre o caso de a migration 000020 ter rodado parcialmente,
-- e o caso do hotfix manual aplicado pelo usuário no Supabase.

-- ─── 1. Colunas que o hotfix manual adicionou ────────────────────────────────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS name       text,
  ADD COLUMN IF NOT EXISTS owner_id   uuid REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date   date;

-- ─── 2. Colunas da migration E.1 (000020) — re-aplica com IF NOT EXISTS ──────

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS priority    text        DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS budget_used numeric,
  ADD COLUMN IF NOT EXISTS objectives  text,
  ADD COLUMN IF NOT EXISTS metadata    jsonb        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by  uuid        REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at  timestamptz;

-- ─── 3. Sincronizar dados entre colunas antigas ↔ novas ─────────────────────

-- name  ← title (alias nova para o campo principal)
UPDATE projects SET name     = title          WHERE name     IS NULL AND title          IS NOT NULL;
-- owner_id ← responsible_id (alias nova)
UPDATE projects SET owner_id = responsible_id WHERE owner_id IS NULL AND responsible_id IS NOT NULL;
-- due_date ← end_date (alias nova)
UPDATE projects SET due_date = end_date::date  WHERE due_date IS NULL AND end_date       IS NOT NULL;
-- priority default
UPDATE projects SET priority = 'medium'        WHERE priority IS NULL;

-- ─── 4. Constraints de check (idempotentes) ──────────────────────────────────

DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT projects_priority_check
    CHECK (priority IN ('low','medium','high','urgent'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Converte status para text se ainda for enum
ALTER TABLE projects ALTER COLUMN status TYPE text USING status::text;
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'planning';
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;
DO $$ BEGIN
  ALTER TABLE projects ADD CONSTRAINT projects_status_check
    CHECK (status IN ('planning','active','paused','completed','archived'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 5. tasks — colunas adicionadas na E.1 ───────────────────────────────────

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by   uuid REFERENCES auth.users ON DELETE SET NULL;

-- ─── 6. project_files — recria se não existir ────────────────────────────────

CREATE TABLE IF NOT EXISTS project_files (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id     uuid        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_id     text,
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

ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_files: all" ON project_files;
CREATE POLICY "project_files: all" ON project_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 7. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS projects_company_status_idx  ON projects (company_id, status);
CREATE INDEX IF NOT EXISTS projects_company_updated_idx ON projects (company_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx         ON tasks    (project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS tasks_project_status_idx     ON tasks    (project_id, status) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS project_files_project_id_idx ON project_files (project_id);
