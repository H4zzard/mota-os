-- ─── Etapa E.2 — Agentes 100% configuráveis ──────────────────────────────────
-- Idempotente: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT EXISTS,
-- CREATE INDEX IF NOT EXISTS. Não apaga dados existentes.

-- ─── 1. Colunas adicionais na tabela agents ───────────────────────────────────

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS role_description text,
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS tools            jsonb        NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS metadata         jsonb        NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by       uuid         REFERENCES auth.users ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archived_at      timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_at       timestamptz;

-- Garante que updated_at exista (muitos schemas já têm, mas some não)
ALTER TABLE agents ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Garante que status tenha o valor correto
UPDATE agents SET status = 'active' WHERE status IS NULL;

-- Sincroniza role_description ← long_description (campo legado)
UPDATE agents
  SET role_description = long_description
  WHERE role_description IS NULL AND long_description IS NOT NULL;

-- Categoria a partir do slug
UPDATE agents SET category = CASE
  WHEN slug = 'marketing'   THEN 'marketing'
  WHEN slug = 'traffic'     THEN 'traffic'
  WHEN slug = 'content'     THEN 'content'
  WHEN slug = 'commercial'  THEN 'sales'
  WHEN slug = 'launches'    THEN 'launch'
  WHEN slug = 'support'     THEN 'support'
  WHEN slug = 'management'  THEN 'management'
  WHEN slug = 'competitors' THEN 'research'
  WHEN slug = 'landing'     THEN 'landing_page'
  ELSE 'management'
END WHERE category IS NULL;

-- ─── 2. Tabela agent_companies ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_companies (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  company_id text        NOT NULL,
  status     text        NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agent_id, company_id)
);

ALTER TABLE agent_companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_companies: all" ON agent_companies;
CREATE POLICY "agent_companies: all" ON agent_companies
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Migra dados do campo companies[] legado → agent_companies
DO $$
DECLARE
  rec    RECORD;
  slug   text;
  all_slugs text[] := ARRAY['grupo','cppem','unicive','colegio','everton'];
BEGIN
  FOR rec IN SELECT id, companies FROM agents WHERE companies IS NOT NULL LOOP
    BEGIN
      -- Tenta como text[] primeiro
      IF 'all' = ANY(rec.companies::text[]) THEN
        FOREACH slug IN ARRAY all_slugs LOOP
          INSERT INTO agent_companies(agent_id, company_id)
          VALUES(rec.id, slug) ON CONFLICT DO NOTHING;
        END LOOP;
      ELSE
        FOREACH slug IN ARRAY (rec.companies::text[]) LOOP
          IF slug IS NOT NULL AND slug <> '' THEN
            INSERT INTO agent_companies(agent_id, company_id)
            VALUES(rec.id, slug) ON CONFLICT DO NOTHING;
          END IF;
        END LOOP;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Tenta como jsonb
      BEGIN
        IF 'all' IN (SELECT jsonb_array_elements_text(rec.companies::jsonb)) THEN
          FOREACH slug IN ARRAY all_slugs LOOP
            INSERT INTO agent_companies(agent_id, company_id)
            VALUES(rec.id, slug) ON CONFLICT DO NOTHING;
          END LOOP;
        ELSE
          FOR slug IN SELECT jsonb_array_elements_text(rec.companies::jsonb) LOOP
            INSERT INTO agent_companies(agent_id, company_id)
            VALUES(rec.id, slug) ON CONFLICT DO NOTHING;
          END LOOP;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        NULL; -- Ignora campos não parseáveis
      END;
    END;
  END LOOP;
END;
$$;

-- ─── 3. Tabela agent_files ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_files (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
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

ALTER TABLE agent_files ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_files: all" ON agent_files;
CREATE POLICY "agent_files: all" ON agent_files
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 4. Tabela agent_change_logs ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS agent_change_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   uuid        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  user_id    uuid        REFERENCES auth.users ON DELETE SET NULL,
  action     text        NOT NULL,
  before     jsonb,
  after      jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agent_change_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "agent_change_logs: read" ON agent_change_logs;
CREATE POLICY "agent_change_logs: read" ON agent_change_logs
  FOR SELECT TO authenticated USING (true);

-- ─── 5. Índices ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS agents_status_idx          ON agents         (status)   WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS agents_slug_idx            ON agents         (slug);
CREATE INDEX IF NOT EXISTS agent_companies_agent_idx  ON agent_companies(agent_id);
CREATE INDEX IF NOT EXISTS agent_companies_co_idx     ON agent_companies(company_id);
CREATE INDEX IF NOT EXISTS agent_files_agent_idx      ON agent_files    (agent_id);
CREATE INDEX IF NOT EXISTS agent_change_logs_agent_idx ON agent_change_logs(agent_id);

-- ─── 6. Trigger updated_at em agents ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_agents_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_agents_updated_at ON agents;
CREATE TRIGGER trg_agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_agents_updated_at();
