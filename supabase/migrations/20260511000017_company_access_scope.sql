-- ─── Etapa D.1 — Escopo por empresa e permissões por colaborador ──────────────

-- ─── 1. Tabela company_members ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS company_members (
  id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id company_slug NOT NULL REFERENCES companies(slug) ON DELETE CASCADE,
  user_id    uuid         NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role       text         NOT NULL DEFAULT 'member'
             CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
  status     text         NOT NULL DEFAULT 'active'
             CHECK (status IN ('active', 'inactive')),
  created_at timestamptz  NOT NULL DEFAULT now(),
  updated_at timestamptz  NOT NULL DEFAULT now(),
  UNIQUE (company_id, user_id)
);

-- Trigger updated_at
DROP TRIGGER IF EXISTS company_members_updated_at ON company_members;
CREATE TRIGGER company_members_updated_at
  BEFORE UPDATE ON company_members
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Índices
CREATE INDEX IF NOT EXISTS company_members_company_id_idx ON company_members (company_id);
CREATE INDEX IF NOT EXISTS company_members_user_id_idx    ON company_members (user_id);

-- ─── 2. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE company_members ENABLE ROW LEVEL SECURITY;

-- Usuário vê apenas suas próprias associações; admin vê todas
CREATE POLICY "company_members: read" ON company_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Apenas admin global escreve
CREATE POLICY "company_members: write" ON company_members
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ─── 3. Seed: todos usuários existentes entram em Grupo Mota ──────────────────
-- Garante que nenhum usuário fica sem empresa após a migration

INSERT INTO company_members (company_id, user_id, role)
SELECT 'grupo', id, 'member'
FROM profiles
ON CONFLICT (company_id, user_id) DO NOTHING;

-- ─── 4. company_id em workflows (se não existir) ─────────────────────────────

ALTER TABLE workflows
  ADD COLUMN IF NOT EXISTS company_id company_slug NOT NULL DEFAULT 'grupo';

-- ─── 5. Verificações finais ───────────────────────────────────────────────────
-- sessions já tem company_id (init.sql)
-- projects já tem company_id (init.sql)
-- tasks já tem company_id (migration 5)
-- sources já tem company_id (init.sql)
-- activity_logs já tem company_id (migration 14/16)
