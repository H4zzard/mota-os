-- ─── Etapa D.2 — Fontes de conhecimento por empresa ──────────────────────────

-- ─── 1. knowledge_sources ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  company_slug NOT NULL REFERENCES companies(slug) ON DELETE CASCADE,
  name        text         NOT NULL,
  description text,
  type        text         NOT NULL
              CHECK (type IN (
                'playbook','faq','script','product_info','brand_voice',
                'offer','objection','competitor','internal_process',
                'document','link','manual_note'
              )),
  status      text         NOT NULL DEFAULT 'active'
              CHECK (status IN ('active','archived')),
  content     text,
  metadata    jsonb        NOT NULL DEFAULT '{}',
  created_by  uuid         REFERENCES auth.users ON DELETE SET NULL,
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS knowledge_sources_updated_at ON knowledge_sources;
CREATE TRIGGER knowledge_sources_updated_at
  BEFORE UPDATE ON knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS knowledge_sources_company_id_idx
  ON knowledge_sources (company_id);
CREATE INDEX IF NOT EXISTS knowledge_sources_company_type_status_idx
  ON knowledge_sources (company_id, type, status);

ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "knowledge_sources: read"  ON knowledge_sources;
DROP POLICY IF EXISTS "knowledge_sources: write" ON knowledge_sources;

-- Leitura: membro ativo da empresa ou admin global
CREATE POLICY "knowledge_sources: read" ON knowledge_sources
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = knowledge_sources.company_id
        AND company_members.user_id    = auth.uid()
        AND company_members.status     = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id   = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Escrita: owner/admin/manager da empresa ou admin global
CREATE POLICY "knowledge_sources: write" ON knowledge_sources
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = knowledge_sources.company_id
        AND company_members.user_id    = auth.uid()
        AND company_members.status     = 'active'
        AND company_members.role       IN ('owner','admin','manager')
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id   = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_members
      WHERE company_members.company_id = knowledge_sources.company_id
        AND company_members.user_id    = auth.uid()
        AND company_members.status     = 'active'
        AND company_members.role       IN ('owner','admin','manager')
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id   = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ─── 2. session_sources ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_sources (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid        NOT NULL REFERENCES sessions(id)           ON DELETE CASCADE,
  source_id  uuid        NOT NULL REFERENCES knowledge_sources(id)  ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, source_id)
);

CREATE INDEX IF NOT EXISTS session_sources_session_id_idx ON session_sources (session_id);
CREATE INDEX IF NOT EXISTS session_sources_source_id_idx  ON session_sources (source_id);

ALTER TABLE session_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "session_sources: all" ON session_sources;

-- Dono da sessão controla seus session_sources
CREATE POLICY "session_sources: all" ON session_sources
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id      = session_sources.session_id
        AND sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions
      WHERE sessions.id      = session_sources.session_id
        AND sessions.user_id = auth.uid()
    )
  );

-- ─── 3. Colunas adicionais em source_files ──────────────────────────────────

ALTER TABLE source_files
  ADD COLUMN IF NOT EXISTS company_id     company_slug,
  ADD COLUMN IF NOT EXISTS user_id        uuid        REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS knowledge_source_id uuid   REFERENCES knowledge_sources(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_name      text,
  ADD COLUMN IF NOT EXISTS file_type      text,
  ADD COLUMN IF NOT EXISTS file_size      bigint,
  ADD COLUMN IF NOT EXISTS storage_path   text,
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS upload_status  text        NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS metadata       jsonb       NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS updated_at     timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS source_files_updated_at ON source_files;
CREATE TRIGGER source_files_updated_at
  BEFORE UPDATE ON source_files
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS source_files_company_id_idx
  ON source_files (company_id);
CREATE INDEX IF NOT EXISTS source_files_knowledge_source_id_idx
  ON source_files (knowledge_source_id);

-- ─── 4. Verificações finais ─────────────────────────────────────────────────

-- knowledge_sources: empresa, tipo, status, created_by
-- session_sources:   session_id + source_id (unique), RLS por owner da sessão
-- source_files:      colunas novas via ADD COLUMN IF NOT EXISTS
