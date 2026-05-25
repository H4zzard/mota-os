-- ─── M.2 — Hierarquia e permissões ────────────────────────────────────────────

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Expandir user_role enum com manager e member
--    (admin/editor/viewer já existem; editor é legado = member)
-- ══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'manager';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'member';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Adicionar coluna department em profiles
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT '';

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Índice para lookup rápido por role
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles (role);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RLS: company_members — bloquear acesso ao grupo para não-admin
--    (nível extra além da verificação server-side, defense-in-depth)
-- ══════════════════════════════════════════════════════════════════════════════

-- Reaplicar policy de leitura para company_members de modo que
-- somente admin pode ver vínculos do slug 'grupo'
DROP POLICY IF EXISTS "company_members: read" ON company_members;
CREATE POLICY "company_members: read" ON company_members
  FOR SELECT TO authenticated
  USING (
    -- Membros podem ver vínculos de empresas que não sejam grupo
    (
      company_id::text != 'grupo'
      AND user_id = auth.uid()
    )
    -- Ou: admin pode ver tudo
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id   = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- Policy de escrita: apenas admin
DROP POLICY IF EXISTS "company_members: write" ON company_members;
CREATE POLICY "company_members: write" ON company_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id   = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id   = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. RLS: dashboard_metrics e dashboard_snapshots — apenas admin/grupo
--    (reforço; M.1 já criou, mas garantir admin-only na escrita)
-- ══════════════════════════════════════════════════════════════════════════════

-- Já definido em M.1; não recriar para não quebrar.
-- Se quiser refinar permissão de leitura para não-admin (apenas empresa própria):
DROP POLICY IF EXISTS "dashboard_metrics: read" ON dashboard_metrics;
CREATE POLICY "dashboard_metrics: read" ON dashboard_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id   = auth.uid()
        AND profiles.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "dashboard_snapshots: read" ON dashboard_snapshots;
CREATE POLICY "dashboard_snapshots: read" ON dashboard_snapshots
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id   = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Queries de auditoria (run manually when needed)
-- ══════════════════════════════════════════════════════════════════════════════

-- A) Perfis:
-- SELECT id, email, name, role, job_title, department, default_company_id
-- FROM profiles ORDER BY created_at DESC;

-- B) Vínculos:
-- SELECT p.email, p.role AS global_role, c.slug, c.name, cm.role AS company_role, cm.status
-- FROM company_members cm
-- JOIN profiles p ON p.id = cm.user_id
-- JOIN companies c ON c.slug = cm.company_id
-- ORDER BY p.email, c.slug;

-- C) Acessos indevidos ao grupo:
-- SELECT p.email, p.role, cm.company_id, cm.status
-- FROM company_members cm
-- JOIN profiles p ON p.id = cm.user_id
-- WHERE cm.company_id = 'grupo' AND p.role <> 'admin' AND cm.status = 'active';

-- D) Leituras de novidades:
-- SELECT a.title, p.email, ar.read_at
-- FROM announcement_reads ar
-- JOIN announcements a ON a.id = ar.announcement_id
-- JOIN profiles p ON p.id = ar.user_id
-- ORDER BY ar.read_at DESC LIMIT 30;
